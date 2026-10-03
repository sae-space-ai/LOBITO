// ============================================================
// EJECUTOR DE HERRAMIENTAS
// Gestiona la ejecución de herramientas con validación y registro
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { Tool, Task, TaskResult, OperationLog, OperationError } from '../types';
import { textAnalyzerTool } from '../tools/textAnalyzer';
import { calculatorTool } from '../tools/calculator';
import { knowledgeBaseTool } from '../tools/knowledgeBase';
import { reportGeneratorTool } from '../tools/reportGenerator';
import { systemMonitorTool } from '../tools/systemMonitor';
import { memoryStoreTool } from '../tools/memoryStore';
import { exporterTool } from '../tools/exporter';

const LOGS_KEY = 'agent_logs';

export class Executor {
  private tools: Map<string, Tool> = new Map();
  private logs: OperationLog[] = [];

  constructor() {
    this.registerTool(textAnalyzerTool);
    this.registerTool(calculatorTool);
    this.registerTool(knowledgeBaseTool);
    this.registerTool(reportGeneratorTool);
    this.registerTool(systemMonitorTool);
    this.registerTool(memoryStoreTool);
    this.registerTool(exporterTool);
    this.loadLogs();
  }

  registerTool(tool: Tool): void {
    this.tools.set(tool.id, tool);
  }

  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getTool(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  async executeTask(task: Task): Promise<TaskResult> {
    const tool = this.tools.get(task.tool);

    if (!tool) {
      const error: TaskResult = {
        taskId: task.id,
        tool: task.tool,
        status: 'error',
        data: null,
        summary: `Error: Herramienta "${task.tool}" no encontrada`,
        executedAt: new Date().toISOString(),
        duration: 0,
      };
      this.logOperation(task.orderId, task.id, task.tool, 'execute', 'error', error.summary);
      return error;
    }

    if (tool.status !== 'available') {
      const error: TaskResult = {
        taskId: task.id,
        tool: task.tool,
        status: 'error',
        data: null,
        summary: `Error: Herramienta "${tool.name}" no disponible (estado: ${tool.status})`,
        executedAt: new Date().toISOString(),
        duration: 0,
      };
      this.logOperation(task.orderId, task.id, task.tool, 'execute', 'error', error.summary);
      return error;
    }

    this.logOperation(task.orderId, task.id, task.tool, 'start', 'info', `Iniciando ejecución: ${task.name}`);

    try {
      const result = await tool.execute(task.parameters);
      result.taskId = task.id;
      
      this.logOperation(
        task.orderId,
        task.id,
        task.tool,
        'complete',
        result.status,
        result.summary
      );

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      const result: TaskResult = {
        taskId: task.id,
        tool: task.tool,
        status: 'error',
        data: { error: errorMsg },
        summary: `Error ejecutando ${tool.name}: ${errorMsg}`,
        executedAt: new Date().toISOString(),
        duration: 0,
      };
      this.logOperation(task.orderId, task.id, task.tool, 'error', 'error', errorMsg);
      return result;
    }
  }

  async executePlan(tasks: Task[]): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    
    // Ordenar por prioridad
    const sortedTasks = [...tasks].sort((a, b) => a.priority - b.priority);

    for (const task of sortedTasks) {
      // Verificar dependencias
      const unmetDeps = task.dependencies.filter(depId => {
        const depResult = results.find(r => r.taskId === depId);
        return !depResult || depResult.status === 'error';
      });

      if (unmetDeps.length > 0) {
        results.push({
          taskId: task.id,
          tool: task.tool,
          status: 'error',
          data: null,
          summary: `Dependencias no satisfechas: ${unmetDeps.join(', ')}`,
          executedAt: new Date().toISOString(),
          duration: 0,
        });
        continue;
      }

      const result = await this.executeTask(task);
      results.push(result);
    }

    return results;
  }

  getLogs(): OperationLog[] {
    return [...this.logs];
  }

  getLogsForOrder(orderId: string): OperationLog[] {
    return this.logs.filter(l => l.orderId === orderId);
  }

  private logOperation(
    orderId: string,
    taskId: string | undefined,
    tool: string,
    action: string,
    status: OperationLog['status'],
    message: string
  ): void {
    const log: OperationLog = {
      id: uuidv4(),
      orderId,
      taskId,
      tool,
      action,
      status,
      message,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(log);
    this.saveLogs();
  }

  private loadLogs(): void {
    try {
      this.logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    } catch {
      this.logs = [];
    }
  }

  private saveLogs(): void {
    // Mantener solo los últimos 500 logs
    const recentLogs = this.logs.slice(-500);
    localStorage.setItem(LOGS_KEY, JSON.stringify(recentLogs));
  }
}

export const executor = new Executor();
