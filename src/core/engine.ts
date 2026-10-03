// ============================================================
// MOTOR PRINCIPAL DEL AGENTE
// Orquesta interpretación, planificación y ejecución
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { Order, OrderStatus, AgentState, TaskResult } from '../types';
import { interpreter } from './interpreter';
import { planner } from './planner';
import { executor } from './executor';

const ORDERS_KEY = 'agent_orders';

export class AgentEngine {
  private state: AgentState;
  private listeners: Set<(state: AgentState) => void> = new Set();

  constructor() {
    this.state = {
      orders: this.loadOrders(),
      currentOrderId: null,
      operationLogs: executor.getLogs(),
      tools: executor.getTools(),
      memory: [],
    };
  }

  subscribe(listener: (state: AgentState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.state = {
      ...this.state,
      operationLogs: executor.getLogs(),
      tools: executor.getTools(),
    };
    this.listeners.forEach(l => l(this.state));
  }

  getState(): AgentState {
    return this.state;
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

    try {
      // Paso 1: Interpretar
      await this.delay(300);
      const interpretation = interpreter.interpret(rawInput);
      order.interpretation = interpretation;
      order.status = 'planning';
      order.updatedAt = new Date().toISOString();
      this.notify();

      // Paso 2: Verificar si necesita aprobación
      if (interpretation.needsApproval) {
        order.status = 'awaiting_approval';
        order.updatedAt = new Date().toISOString();
        this.notify();
        this.saveOrders();
        return order;
      }

      // Paso 3: Planificar
      await this.delay(300);
      const plan = planner.createPlan(orderId, interpretation, rawInput);
      order.plan = plan;
      order.status = 'executing';
      order.updatedAt = new Date().toISOString();
      this.notify();

      // Paso 4: Ejecutar
      await this.delay(200);
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
      return order;
    }
  }

  async approveOrder(orderId: string): Promise<Order | null> {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order || order.status !== 'awaiting_approval') return null;

    order.status = 'executing';
    order.updatedAt = new Date().toISOString();
    this.notify();

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
