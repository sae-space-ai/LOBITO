import { describe, it, expect } from 'vitest';
import { planner } from '../core/planner';
import { Interpretation } from '../types';

describe('Planificador de Tareas', () => {
  const baseInterpretation: Interpretation = {
    intent: 'text_analysis',
    entities: [],
    confidence: 0.8,
    requiredTools: ['text_analyzer'],
    needsApproval: false,
  };

  it('debe crear un plan con al menos una tarea', () => {
    const plan = planner.createPlan('order-1', baseInterpretation, 'Analiza este texto');
    expect(plan).toBeDefined();
    expect(plan.id).toBeDefined();
    expect(plan.orderId).toBe('order-1');
    expect(plan.tasks.length).toBeGreaterThan(0);
    expect(plan.createdAt).toBeDefined();
  });

  it('debe asignar herramientas correctas según la intención', () => {
    const interpretation: Interpretation = {
      ...baseInterpretation,
      intent: 'calculation',
      requiredTools: ['calculator'],
    };
    const plan = planner.createPlan('order-2', interpretation, 'Calcula 5 + 3');
    expect(plan.tasks[0].tool).toBe('calculator');
  });

  it('debe generar plan para búsqueda en base de conocimiento', () => {
    const interpretation: Interpretation = {
      ...baseInterpretation,
      intent: 'search',
      requiredTools: ['knowledge_base'],
    };
    const plan = planner.createPlan('order-3', interpretation, 'Busca sobre IA');
    expect(plan.tasks[0].tool).toBe('knowledge_base');
  });

  it('debe generar plan para diagnóstico del sistema', () => {
    const interpretation: Interpretation = {
      ...baseInterpretation,
      intent: 'system_status',
      requiredTools: ['system_monitor'],
    };
    const plan = planner.createPlan('order-4', interpretation, 'Estado del sistema');
    expect(plan.tasks[0].tool).toBe('system_monitor');
  });

  it('debe establecer prioridades en las tareas', () => {
    const plan = planner.createPlan('order-5', baseInterpretation, 'Analiza texto');
    plan.tasks.forEach(task => {
      expect(task.priority).toBeGreaterThanOrEqual(1);
    });
  });

  it('debe incluir el input original en los parámetros', () => {
    const input = 'Analiza este texto específico';
    const plan = planner.createPlan('order-6', baseInterpretation, input);
    expect(plan.tasks[0].parameters._rawInput).toBe(input);
    expect(plan.tasks[0].parameters._orderId).toBe('order-6');
  });

  it('debe estimar duración del plan', () => {
    const plan = planner.createPlan('order-7', baseInterpretation, 'Analiza texto');
    expect(plan.estimatedDuration).toBeGreaterThan(0);
  });

  it('debe generar IDs únicos para cada tarea', () => {
    const plan = planner.createPlan('order-8', baseInterpretation, 'Analiza texto');
    const ids = plan.tasks.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
