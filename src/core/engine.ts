// ============================================================
// MOTOR PRINCIPAL DEL AGENTE (v2 - Con integración Qwen)
// Orquesta interpretación, planificación y ejecución
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { Order, OrderStatus, AgentState, TaskResult, Interpretation } from '../types';
import { interpreter } from './interpreter';
import { planner } from './planner';
import { executor } from './executor';
import { qwenAdapter, QwenConnectionStatus } from './qwenAdapter';
import { orderRepository, logRepository } from '../server/database';

const ORDERS_KEY = 'agent_orders';

export interface AgentEngineState extends AgentState {
  qwenStatus: QwenConnectionStatus;
  databaseConnected: boolean;
}

export class AgentEngine {
  private state: AgentEngineState;
  private listeners: Set<(state: AgentEngineState) => void> = new Set();

  constructor() {
    this.state = {
      orders: this.loadOrders(),
      currentOrderId: null,
      operationLogs: executor.getLogs(),
      tools: executor.getTools(),
      memory: [],
      qwenStatus: qwenAdapter.getStatus(),
      databaseConnected: false,
    };
  }

  subscribe(listener: (state: AgentEngineState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.state = {
      ...this.state,
      operationLogs: executor.getLogs(),
      tools: executor.getTools(),
      qwenStatus: qwenAdapter.getStatus(),
    };
    this.listeners.forEach(l => l(this.state));
  }

  getState(): AgentEngineState {
    return this.state;
  }

  getQwenStatus(): QwenConnectionStatus {
    return qwenAdapter.getStatus();
  }

  configureQwen(config: { apiKey: string; endpoint?: string; model?: string }): void {
    qwenAdapter.configure(config);
    this.notify();
  }

  async checkQwenHealth(): Promise<QwenConnectionStatus> {
    const status = await qwenAdapter.healthCheck();
    this.notify();
    return status;
  }

  async submitOrder(rawInput: string): Promise<Order> {
    const orderId = uuidv4();
    const now = new Date().toISOString();

    const order: Order = {
      id: orderId,
      rawInput,
      status: 'interpreting',
      createdAt: now,
      updatedAt: now,
    };

    this.state.orders.unshift(order);
    this.state.currentOrderId = orderId;
    this.notify();

    // Log: orden recibida
    await logRepository.create({
      orderId,
      tool: 'engine',
      action: 'order_received',
      status: 'info',
      message: `Orden recibida: "${rawInput.substring(0, 100)}"`,
      timestamp: now,
    });

    try {
      // ============================================
      // PASO 1: INTERPRETAR (Qwen o fallback local)
      // ============================================
      let interpretation: Interpretation;
      let usedQwen = false;

      // Intentar con Qwen primero
      if (qwenAdapter.isConfigured()) {
        const qwenResult = await qwenAdapter.interpret(rawInput);
        if (qwenResult) {
          interpretation = {
            intent: qwenResult.intent,
            entities: qwenResult.entities.map(e => ({
              type: e.type,
              value: e.value,
              position: [0, 0] as [number, number],
            })),
            confidence: qwenResult.confidence,
            requiredTools: qwenResult.requiredTools,
            needsApproval: qwenResult.needsApproval,
            approvalReason: qwenResult.approvalReason,
          };
          usedQwen = true;

          await logRepository.create({
            orderId,
            tool: 'qwen',
            action: 'interpretation',
            status: 'success',
            message: `Qwen interpretó: intent=${qwenResult.intent}, confianza=${(qwenResult.confidence * 100).toFixed(0)}%`,
            timestamp: new Date().toISOString(),
          });
        } else {
          // Qwen configurado pero falló - usar fallback
          interpretation = interpreter.interpret(rawInput);
          await logRepository.create({
            orderId,
            tool: 'interpreter',
            action: 'interpretation_fallback',
            status: 'warning',
            message: 'Qwen no disponible, usando intérprete local',
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        // Qwen no configurado - usar intérprete local
        interpretation = interpreter.interpret(rawInput);
        await logRepository.create({
          orderId,
          tool: 'interpreter',
          action: 'interpretation',
          status: 'info',
          message: `Intérprete local: intent=${interpretation.intent}, confianza=${(interpretation.confidence * 100).toFixed(0)}%`,
          timestamp: new Date().toISOString(),
        });
      }

      order.interpretation = interpretation;
      order.status = 'planning';
      order.updatedAt = new Date().toISOString();
      this.notify();

      // ============================================
      // PASO 2: VERIFICAR APROBACIÓN
      // ============================================
      if (interpretation.needsApproval) {
        order.status = 'awaiting_approval';
        order.updatedAt = new Date().toISOString();
        this.notify();
        this.saveOrders();

        await logRepository.create({
          orderId,
          tool: 'engine',
          action: 'approval_required',
          status: 'warning',
          message: interpretation.approvalReason || 'Aprobación requerida',
          timestamp: new Date().toISOString(),
        });

        return order;
      }

      // ============================================
      // PASO 3: PLANIFICAR
      // ============================================
      let plan: ReturnType<typeof planner.createPlan> | undefined;

      // Si Qwen generó un plan, usarlo
      if (usedQwen) {
        const qwenResult = await qwenAdapter.interpret(rawInput);
        if (qwenResult?.plan?.tasks && qwenResult.plan.tasks.length > 0) {
          plan = {
            id: uuidv4(),
            orderId,
            tasks: qwenResult.plan.tasks.map(t => ({
              id: uuidv4(),
              planId: '',
              orderId,
              name: t.name,
              description: t.description,
              tool: t.tool,
              parameters: t.parameters,
              status: 'pending' as const,
              priority: t.priority,
              dependencies: [],
            })),
            createdAt: new Date().toISOString(),
          };
          plan.tasks.forEach(t => { t.planId = plan!.id; });
        }
      }

      // Fallback al planificador local
      if (!plan) {
        plan = planner.createPlan(orderId, interpretation, rawInput);
      }

      order.plan = plan;
      order.status = 'executing';
      order.updatedAt = new Date().toISOString();
      this.notify();

      await logRepository.create({
        orderId,
        tool: 'planner',
        action: 'plan_created',
        status: 'info',
        message: `Plan generado: ${plan?.tasks.length || 0} tarea(s)`,
        timestamp: new Date().toISOString(),
      });

      // ============================================
      // PASO 4: EJECUTAR
      // ============================================
      const results = await executor.executePlan(plan.tasks);
      order.results = results;
      order.status = results.some(r => r.status === 'error') ? 'failed' : 'completed';
      order.updatedAt = new Date().toISOString();
      
      if (results.some(r => r.status === 'error')) {
        order.errors = results
          .filter(r => r.status === 'error')
          .map(r => ({
            code: 'EXECUTION_ERROR',
            message: r.summary,
            timestamp: r.executedAt,
            taskId: r.taskId,
          }));
      }

      this.notify();
      this.saveOrders();

      await logRepository.create({
        orderId,
        tool: 'executor',
        action: 'execution_complete',
        status: order.status === 'completed' ? 'success' : 'error',
        message: `Ejecución completada: ${results.filter(r => r.status === 'success').length}/${results.length} exitosas`,
        timestamp: new Date().toISOString(),
      });

      // Persistir en repositorio (PostgreSQL si está disponible)
      await orderRepository.create(order);

      return order;
    } catch (error) {
      order.status = 'failed';
      order.errors = [{
        code: 'SYSTEM_ERROR',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString(),
      }];
      order.updatedAt = new Date().toISOString();
      this.notify();
      this.saveOrders();

      await logRepository.create({
        orderId,
        tool: 'engine',
        action: 'system_error',
        status: 'error',
        message: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString(),
      });

      return order;
    }
  }

  async approveOrder(orderId: string): Promise<Order | null> {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order || order.status !== 'awaiting_approval') return null;

    order.status = 'executing';
    order.updatedAt = new Date().toISOString();
    this.notify();

    await logRepository.create({
      orderId,
      tool: 'engine',
      action: 'order_approved',
      status: 'info',
      message: 'Orden aprobada por el usuario',
      timestamp: new Date().toISOString(),
    });

    try {
      if (order.interpretation && !order.plan) {
        const plan = planner.createPlan(orderId, order.interpretation, order.rawInput);
        order.plan = plan;
      }

      if (order.plan) {
        const results = await executor.executePlan(order.plan.tasks);
        order.results = results;
        order.status = results.some(r => r.status === 'error') ? 'failed' : 'completed';
      } else {
        order.status = 'failed';
      }
    } catch (error) {
      order.status = 'failed';
      order.errors = [{
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Error en ejecución aprobada',
        timestamp: new Date().toISOString(),
      }];
    }

    order.updatedAt = new Date().toISOString();
    this.notify();
    this.saveOrders();
    return order;
  }

  rejectOrder(orderId: string): Order | null {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return null;

    order.status = 'cancelled';
    order.updatedAt = new Date().toISOString();
    this.notify();
    this.saveOrders();

    logRepository.create({
      orderId,
      tool: 'engine',
      action: 'order_rejected',
      status: 'warning',
      message: 'Orden rechazada por el usuario',
      timestamp: new Date().toISOString(),
    });

    return order;
  }

  getOrder(orderId: string): Order | undefined {
    return this.state.orders.find(o => o.id === orderId);
  }

  clearOrders(): void {
    this.state.orders = [];
    this.state.currentOrderId = null;
    this.notify();
    this.saveOrders();
  }

  private saveOrders(): void {
    const serialized = this.state.orders.map(o => ({
      ...o,
      plan: o.plan ? { ...o.plan, tasks: o.plan.tasks.map(t => ({ ...t, result: t.result })) } : undefined,
    }));
    localStorage.setItem(ORDERS_KEY, JSON.stringify(serialized));
  }

  private loadOrders(): Order[] {
    try {
      return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const agentEngine = new AgentEngine();
