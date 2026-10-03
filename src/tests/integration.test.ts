import { describe, it, expect } from 'vitest';
import { agentEngine } from '../core/engine';

describe('Prueba Integral - Ciclo Completo del Agente', () => {
  it('debe procesar una orden de análisis de texto de principio a fin', async () => {
    // 1. Recibir orden
    const input = 'Analiza el siguiente texto: La inteligencia artificial transforma el mundo';
    const order = await agentEngine.submitOrder(input);

    // 2. Verificar que la orden fue creada
    expect(order).toBeDefined();
    expect(order.id).toBeDefined();
    expect(order.rawInput).toBe(input);

    // 3. Verificar interpretación
    expect(order.interpretation).toBeDefined();
    expect(order.interpretation!.intent).toBe('text_analysis');
    expect(order.interpretation!.confidence).toBeGreaterThan(0);
    expect(order.interpretation!.requiredTools).toContain('text_analyzer');

    // 4. Verificar plan
    expect(order.plan).toBeDefined();
    expect(order.plan!.tasks.length).toBeGreaterThan(0);
    expect(order.plan!.tasks[0].tool).toBe('text_analyzer');

    // 5. Verificar ejecución
    expect(order.status).toBe('completed');
    expect(order.results).toBeDefined();
    expect(order.results!.length).toBeGreaterThan(0);
    expect(order.results![0].status).toBe('success');
    expect(order.results![0].tool).toBe('text_analyzer');
    expect(order.results![0].data).toBeDefined();

    // 6. Verificar que se puede recuperar la orden
    const retrieved = agentEngine.getOrder(order.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(order.id);
    expect(retrieved!.status).toBe('completed');
  });

  it('debe procesar una orden de cálculo correctamente', async () => {
    const input = 'Calcula el promedio de 85, 92, 78, 95';
    const order = await agentEngine.submitOrder(input);

    expect(order.status).toBe('completed');
    expect(order.interpretation!.intent).toBe('calculation');
    expect(order.results).toBeDefined();
    expect(order.results![0].status).toBe('success');
    expect(order.results![0].tool).toBe('calculator');
  });

  it('debe procesar una consulta a la base de conocimiento', async () => {
    const input = 'Busca información sobre inteligencia artificial';
    const order = await agentEngine.submitOrder(input);

    expect(order.status).toBe('completed');
    expect(order.interpretation!.intent).toBe('search');
    expect(order.results).toBeDefined();
    expect(order.results![0].status).toBe('success');
    expect(order.results![0].tool).toBe('knowledge_base');
  });

  it('debe requerir aprobación para operaciones destructivas', async () => {
    const input = 'Eliminar todos los datos del sistema';
    const order = await agentEngine.submitOrder(input);

    expect(order.status).toBe('awaiting_approval');
    expect(order.interpretation!.needsApproval).toBe(true);
    expect(order.results).toBeUndefined();
  });

  it('debe aprobar y ejecutar una orden pendiente', async () => {
    const input = 'Eliminar datos temporales';
    const order = await agentEngine.submitOrder(input);
    
    expect(order.status).toBe('awaiting_approval');

    // Aprobar la orden
    const approved = await agentEngine.approveOrder(order.id);
    expect(approved).toBeDefined();
    expect(approved!.status).toBe('completed');
    expect(approved!.results).toBeDefined();
  });

  it('debe rechazar una orden pendiente', async () => {
    const input = 'Enviar notificación externa';
    const order = await agentEngine.submitOrder(input);
    
    expect(order.status).toBe('awaiting_approval');

    // Rechazar la orden
    const rejected = agentEngine.rejectOrder(order.id);
    expect(rejected).toBeDefined();
    expect(rejected!.status).toBe('cancelled');
  });

  it('debe verificar el estado del sistema', async () => {
    const input = 'Verifica el estado del sistema';
    const order = await agentEngine.submitOrder(input);

    expect(order.status).toBe('completed');
    expect(order.interpretation!.intent).toBe('system_status');
    expect(order.results![0].tool).toBe('system_monitor');
    const data = order.results![0].data as any;
    expect(data.components).toBeDefined();
  });

  it('debe mantener el estado del agente actualizado', () => {
    const state = agentEngine.getState();
    expect(state.orders.length).toBeGreaterThan(0);
    expect(state.tools.length).toBe(7);
    expect(state.operationLogs.length).toBeGreaterThan(0);
  });

  it('debe registrar operaciones en el log', () => {
    const logs = agentEngine.getState().operationLogs;
    expect(logs.length).toBeGreaterThan(0);
    
    // Verificar que los logs tienen la estructura correcta
    const lastLog = logs[logs.length - 1];
    expect(lastLog.id).toBeDefined();
    expect(lastLog.tool).toBeDefined();
    expect(lastLog.action).toBeDefined();
    expect(lastLog.status).toBeDefined();
    expect(lastLog.timestamp).toBeDefined();
  });

  it('debe limpiar el historial de órdenes', () => {
    agentEngine.clearOrders();
    const state = agentEngine.getState();
    expect(state.orders.length).toBe(0);
    expect(state.currentOrderId).toBeNull();
  });
});

describe('Adaptador Qwen', () => {
  it('debe reportar estado no configurado sin API key', async () => {
    const { QwenAdapter } = await import('../core/qwenAdapter');
    const adapter = new QwenAdapter();
    const status = adapter.getStatus();
    // Sin credenciales configuradas en el entorno de test
    expect(status.connected).toBe(false);
  });

  it('debe permitir configurar credenciales', async () => {
    const { QwenAdapter } = await import('../core/qwenAdapter');
    const adapter = new QwenAdapter();
    adapter.configure({
      apiKey: 'sk-test-key-123456789',
      endpoint: 'https://test.example.com/v1/chat/completions',
      model: 'qwen-turbo',
    });
    const status = adapter.getStatus();
    expect(status.configured).toBe(true);
    expect(status.model).toBe('qwen-turbo');
  });

  it('debe devolver null en interpretación sin credenciales', async () => {
    const { QwenAdapter } = await import('../core/qwenAdapter');
    const adapter = new QwenAdapter();
    // Sin configurar
    const result = await adapter.interpret('test');
    expect(result).toBeNull();
  });
});
