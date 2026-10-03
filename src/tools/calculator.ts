// ============================================================
// HERRAMIENTA: CALCULADORA Y ESTADÍSTICAS
// Ejecuta operaciones matemáticas y análisis estadístico
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { TaskResult, Tool } from '../types';

function safeEvaluate(expression: string): { result: number; steps: string[] } {
  const steps: string[] = [];
  
  // Extraer números de la expresión
  const numbers = expression.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  
  if (numbers.length === 0) {
    throw new Error('No se encontraron números en la expresión');
  }

  // Detectar operación solicitada
  const lowerExpr = expression.toLowerCase();
  
  if (lowerExpr.includes('promedio') || lowerExpr.includes('media') || lowerExpr.includes('average')) {
    const sum = numbers.reduce((a, b) => a + b, 0);
    const avg = sum / numbers.length;
    steps.push(`Números encontrados: [${numbers.join(', ')}]`);
    steps.push(`Suma: ${numbers.join(' + ')} = ${sum}`);
    steps.push(`Promedio: ${sum} / ${numbers.length} = ${avg}`);
    return { result: avg, steps };
  }
  
  if (lowerExpr.includes('suma') || lowerExpr.includes('sumar') || lowerExpr.includes('total')) {
    const sum = numbers.reduce((a, b) => a + b, 0);
    steps.push(`Números encontrados: [${numbers.join(', ')}]`);
    steps.push(`Suma: ${numbers.join(' + ')} = ${sum}`);
    return { result: sum, steps };
  }
  
  if (lowerExpr.includes('producto') || lowerExpr.includes('multiplicar') || lowerExpr.includes('multiplica')) {
    const product = numbers.reduce((a, b) => a * b, 1);
    steps.push(`Números encontrados: [${numbers.join(', ')}]`);
    steps.push(`Producto: ${numbers.join(' × ')} = ${product}`);
    return { result: product, steps };
  }

  if (lowerExpr.includes('máximo') || lowerExpr.includes('maximo') || lowerExpr.includes('mayor')) {
    const max = Math.max(...numbers);
    steps.push(`Números encontrados: [${numbers.join(', ')}]`);
    steps.push(`Máximo: ${max}`);
    return { result: max, steps };
  }

  if (lowerExpr.includes('mínimo') || lowerExpr.includes('minimo') || lowerExpr.includes('menor')) {
    const min = Math.min(...numbers);
    steps.push(`Números encontrados: [${numbers.join(', ')}]`);
    steps.push(`Mínimo: ${min}`);
    return { result: min, steps };
  }

  if (lowerExpr.includes('desviación') || lowerExpr.includes('std') || lowerExpr.includes('varianza')) {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
    const stdDev = Math.sqrt(variance);
    steps.push(`Números encontrados: [${numbers.join(', ')}]`);
    steps.push(`Media: ${mean}`);
    steps.push(`Varianza: ${variance.toFixed(4)}`);
    steps.push(`Desviación estándar: ${stdDev.toFixed(4)}`);
    return { result: stdDev, steps };
  }

  // Operación aritmética básica con operadores
  try {
    // Sanitizar la expresión
    const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '');
    if (sanitized.trim().length === 0) {
      throw new Error('Expresión no válida');
    }
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${sanitized})`)() as number;
    steps.push(`Expresión: ${sanitized}`);
    steps.push(`Resultado: ${result}`);
    return { result, steps };
  } catch {
    // Si falla, hacer suma por defecto
    const sum = numbers.reduce((a, b) => a + b, 0);
    steps.push(`Números encontrados: [${numbers.join(', ')}]`);
    steps.push(`Operación por defecto (suma): ${sum}`);
    return { result: sum, steps };
  }
}

function computeStatistics(numbers: number[]): Record<string, unknown> {
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = numbers.reduce((a, b) => a + b, 0);
  const mean = sum / numbers.length;
  const variance = numbers.reduce((s, n) => s + Math.pow(n - mean, 2), 0) / numbers.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  return {
    count: numbers.length,
    sum: Math.round(sum * 1000) / 1000,
    mean: Math.round(mean * 1000) / 1000,
    median: Math.round(median * 1000) / 1000,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    range: sorted[sorted.length - 1] - sorted[0],
    variance: Math.round(variance * 1000) / 1000,
    stdDev: Math.round(Math.sqrt(variance) * 1000) / 1000,
    sorted,
  };
}

export const calculatorTool: Tool = {
  id: 'calculator',
  name: 'Calculadora y Estadísticas',
  description: 'Ejecuta operaciones matemáticas y análisis estadístico sobre conjuntos de números.',
  status: 'available',
  parameters: [
    { name: 'expression', type: 'string', required: true, description: 'Expresión matemática o descripción de la operación' },
    { name: 'entities', type: 'array', required: false, description: 'Entidades numéricas extraídas' },
  ],
  execute: async (params: Record<string, unknown>): Promise<TaskResult> => {
    const startTime = Date.now();
    const expression = (params.expression as string) || '';
    const entities = (params.entities as Array<{ type: string; value: string }>) || [];

    try {
      // Extraer números de entidades o de la expresión
      const numbers = entities
        .filter(e => e.type === 'number')
        .map(e => parseFloat(e.value));

      const { result, steps } = safeEvaluate(expression);

      const stats = numbers.length > 1 ? computeStatistics(numbers) : null;

      return {
        taskId: uuidv4(),
        tool: 'calculator',
        status: 'success',
        data: { result, steps, statistics: stats },
        summary: `Cálculo completado. Resultado: ${Math.round(result * 1000) / 1000}${stats ? `. Estadísticas: media=${(stats as any).mean}, mediana=${(stats as any).median}` : ''}`,
        executedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        taskId: uuidv4(),
        tool: 'calculator',
        status: 'error',
        data: { error: (error as Error).message },
        summary: `Error en cálculo: ${(error as Error).message}`,
        executedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
    }
  },
};
