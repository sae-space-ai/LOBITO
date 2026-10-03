import { describe, it, expect } from 'vitest';
import { textAnalyzerTool } from '../tools/textAnalyzer';
import { calculatorTool } from '../tools/calculator';
import { knowledgeBaseTool } from '../tools/knowledgeBase';
import { systemMonitorTool } from '../tools/systemMonitor';

describe('Herramienta: Analizador de Texto', () => {
  it('debe analizar texto y devolver estadísticas', async () => {
    const result = await textAnalyzerTool.execute({
      text: 'La inteligencia artificial está transformando el mundo de la tecnología.',
      analysisType: 'full',
    });
    expect(result.status).toBe('success');
    expect(result.tool).toBe('text_analyzer');
    expect(result.data).toBeDefined();
    expect(result.summary).toContain('palabras');
  });

  it('debe contar palabras correctamente', async () => {
    const result = await textAnalyzerTool.execute({
      text: 'uno dos tres cuatro cinco',
    });
    expect(result.status).toBe('success');
    const data = result.data as any;
    expect(data.statistics.words).toBe(5);
  });

  it('debe detectar sentimiento positivo', async () => {
    const result = await textAnalyzerTool.execute({
      text: 'Este es un excelente resultado, todo es perfecto y genial.',
    });
    const data = result.data as any;
    expect(data.sentiment).toBe('positivo');
  });

  it('debe detectar sentimiento negativo', async () => {
    const result = await textAnalyzerTool.execute({
      text: 'Esto es terrible, un error horrible y un problema difícil.',
    });
    const data = result.data as any;
    expect(data.sentiment).toBe('negativo');
  });

  it('debe manejar texto vacío con error', async () => {
    const result = await textAnalyzerTool.execute({ text: '' });
    expect(result.status).toBe('error');
  });

  it('debe extraer palabras más frecuentes', async () => {
    const result = await textAnalyzerTool.execute({
      text: 'gato perro gato gato perro gato',
    });
    const data = result.data as any;
    expect(data.topWords.length).toBeGreaterThan(0);
    expect(data.topWords[0].word).toBe('gato');
  });

  it('debe medir duración de ejecución', async () => {
    const result = await textAnalyzerTool.execute({ text: 'Texto de prueba' });
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.executedAt).toBeDefined();
  });
});

describe('Herramienta: Calculadora', () => {
  it('debe calcular suma de números', async () => {
    const result = await calculatorTool.execute({
      expression: 'suma 10 20 30',
      entities: [
        { type: 'number', value: '10' },
        { type: 'number', value: '20' },
        { type: 'number', value: '30' },
      ],
    });
    expect(result.status).toBe('success');
    const data = result.data as any;
    expect(data.result).toBe(60);
  });

  it('debe calcular promedio', async () => {
    const result = await calculatorTool.execute({
      expression: 'calcula el promedio de 80 90 100',
      entities: [
        { type: 'number', value: '80' },
        { type: 'number', value: '90' },
        { type: 'number', value: '100' },
      ],
    });
    expect(result.status).toBe('success');
    const data = result.data as any;
    expect(data.result).toBe(90);
  });

  it('debe calcular producto', async () => {
    const result = await calculatorTool.execute({
      expression: 'multiplicar 5 4 3',
      entities: [
        { type: 'number', value: '5' },
        { type: 'number', value: '4' },
        { type: 'number', value: '3' },
      ],
    });
    expect(result.status).toBe('success');
    const data = result.data as any;
    expect(data.result).toBe(60);
  });

  it('debe calcular máximo', async () => {
    const result = await calculatorTool.execute({
      expression: 'encuentra el máximo de 15 42 8',
      entities: [
        { type: 'number', value: '15' },
        { type: 'number', value: '42' },
        { type: 'number', value: '8' },
      ],
    });
    expect(result.status).toBe('success');
    const data = result.data as any;
    expect(data.result).toBe(42);
  });

  it('debe devolver estadísticas completas', async () => {
    const result = await calculatorTool.execute({
      expression: 'analiza 10 20 30 40 50',
      entities: [
        { type: 'number', value: '10' },
        { type: 'number', value: '20' },
        { type: 'number', value: '30' },
        { type: 'number', value: '40' },
        { type: 'number', value: '50' },
      ],
    });
    expect(result.status).toBe('success');
    const data = result.data as any;
    expect(data.statistics).toBeDefined();
    expect(data.statistics.mean).toBe(30);
    expect(data.statistics.median).toBe(30);
  });
});

describe('Herramienta: Base de Conocimiento', () => {
  it('debe encontrar información sobre IA', async () => {
    const result = await knowledgeBaseTool.execute({
      query: 'inteligencia artificial',
    });
    expect(result.status).toBe('success');
    const data = result.data as any;
    expect(data.results.length).toBeGreaterThan(0);
  });

  it('debe encontrar información sobre agentes', async () => {
    const result = await knowledgeBaseTool.execute({
      query: 'agentes autónomos',
    });
    expect(result.status).toBe('success');
    const data = result.data as any;
    expect(data.results.length).toBeGreaterThan(0);
  });

  it('debe devolver warning si no hay resultados', async () => {
    const result = await knowledgeBaseTool.execute({
      query: 'xyzabc123notinexistent',
    });
    expect(result.status).toBe('warning');
  });

  it('debe incluir metadata en los resultados', async () => {
    const result = await knowledgeBaseTool.execute({
      query: 'seguridad',
    });
    const data = result.data as any;
    if (data.results.length > 0) {
      expect(data.results[0].topic).toBeDefined();
      expect(data.results[0].content).toBeDefined();
    }
  });
});

describe('Herramienta: Monitor del Sistema', () => {
  it('debe devolver estado de componentes', async () => {
    const result = await systemMonitorTool.execute({ checkAll: true });
    expect(result.status).toBe('success');
    const data = result.data as any;
    expect(data.components).toBeDefined();
    expect(data.components.interpreter.status).toBe('operational');
    expect(data.components.planner.status).toBe('operational');
    expect(data.components.executor.status).toBe('operational');
  });

  it('debe listar todas las herramientas', async () => {
    const result = await systemMonitorTool.execute({ checkAll: true });
    const data = result.data as any;
    expect(Object.keys(data.components.tools).length).toBe(7);
  });

  it('debe incluir métricas del sistema', async () => {
    const result = await systemMonitorTool.execute({ checkAll: true });
    const data = result.data as any;
    expect(data.systemMetrics).toBeDefined();
    expect(data.systemMetrics.uptime).toBe('active');
  });
});
