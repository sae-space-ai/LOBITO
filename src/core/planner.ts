// ============================================================
// PLANIFICADOR DE TAREAS
// Descompone órdenes interpretadas en tareas ejecutables
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { Interpretation, Plan, Task } from '../types';

interface TaskTemplate {
  tool: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  priority: number;
  dependencies: string[];
}

export class Planner {
  createPlan(orderId: string, interpretation: Interpretation, rawInput: string): Plan {
    const planId = uuidv4();
    const tasks = this.generateTasks(planId, orderId, interpretation, rawInput);

    return {
      id: planId,
      orderId,
      tasks,
      createdAt: new Date().toISOString(),
      estimatedDuration: this.estimateDuration(tasks),
    };
  }

  private generateTasks(
    planId: string,
    orderId: string,
    interpretation: Interpretation,
    rawInput: string
  ): Task[] {
    const templates = this.selectTemplates(interpretation, rawInput);
    
    return templates.map((template, index) => ({
      id: uuidv4(),
      planId,
      orderId,
      name: template.name,
      description: template.description,
      tool: template.tool,
      parameters: { ...template.parameters, _rawInput: rawInput, _orderId: orderId },
      status: 'pending' as const,
      priority: template.priority,
      dependencies: template.dependencies,
    }));
  }

  private selectTemplates(interpretation: Interpretation, rawInput: string): TaskTemplate[] {
    const templates: TaskTemplate[] = [];

    switch (interpretation.intent) {
      case 'text_analysis':
        templates.push({
          tool: 'text_analyzer',
          name: 'Análisis de texto',
          description: `Analizar el contenido proporcionado: "${this.truncate(rawInput, 100)}"`,
          parameters: { text: rawInput, analysisType: 'full' },
          priority: 1,
          dependencies: [],
        });
        break;

      case 'calculation':
        templates.push({
          tool: 'calculator',
          name: 'Operación matemática',
          description: `Ejecutar cálculo solicitado: "${this.truncate(rawInput, 100)}"`,
          parameters: { expression: rawInput, entities: interpretation.entities },
          priority: 1,
          dependencies: [],
        });
        break;

      case 'search':
        templates.push({
          tool: 'knowledge_base',
          name: 'Consulta de base de conocimiento',
          description: `Buscar información: "${this.truncate(rawInput, 100)}"`,
          parameters: { query: rawInput, entities: interpretation.entities },
          priority: 1,
          dependencies: [],
        });
        break;

      case 'report_generation':
        templates.push(
          {
            tool: 'report_generator',
            name: 'Generación de reporte',
            description: `Generar reporte basado en: "${this.truncate(rawInput, 100)}"`,
            parameters: { input: rawInput, format: 'structured' },
            priority: 1,
            dependencies: [],
          }
        );
        break;

      case 'system_status':
        templates.push({
          tool: 'system_monitor',
          name: 'Diagnóstico del sistema',
          description: 'Verificar estado de todos los componentes del agente',
          parameters: { checkAll: true },
          priority: 1,
          dependencies: [],
        });
        break;

      case 'list_operations':
        templates.push({
          tool: 'operation_logger',
          name: 'Consulta de operaciones',
          description: 'Listar operaciones y tareas registradas',
          parameters: { action: 'list_all' },
          priority: 1,
          dependencies: [],
        });
        break;

      case 'memory_operation':
        templates.push({
          tool: 'memory_store',
          name: 'Operación de memoria',
          description: `Gestionar memoria: "${this.truncate(rawInput, 100)}"`,
          parameters: { input: rawInput, entities: interpretation.entities },
          priority: 1,
          dependencies: [],
        });
        break;

      case 'export':
        templates.push({
          tool: 'exporter',
          name: 'Exportación de datos',
          description: `Exportar resultados: "${this.truncate(rawInput, 100)}"`,
          parameters: { input: rawInput, format: 'json' },
          priority: 1,
          dependencies: [],
        });
        break;

      case 'destructive_operation':
        templates.push({
          tool: 'data_manager',
          name: 'Operación destructiva',
          description: `Ejecutar operación destructiva: "${this.truncate(rawInput, 100)}"`,
          parameters: { action: 'delete', input: rawInput },
          priority: 1,
          dependencies: [],
        });
        break;

      default:
        templates.push({
          tool: 'text_analyzer',
          name: 'Procesamiento genérico',
          description: `Procesar orden: "${this.truncate(rawInput, 100)}"`,
          parameters: { text: rawInput, analysisType: 'generic' },
          priority: 1,
          dependencies: [],
        });
    }

    return templates;
  }

  private estimateDuration(tasks: Task[]): number {
    // Estimación simple: 500ms por tarea + overhead
    return tasks.length * 500 + 200;
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

export const planner = new Planner();
