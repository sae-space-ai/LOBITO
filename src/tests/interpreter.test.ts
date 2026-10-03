import { describe, it, expect } from 'vitest';
import { interpreter } from '../core/interpreter';

describe('Intérprete de Lenguaje Natural', () => {
  it('debe identificar intención de análisis de texto', () => {
    const result = interpreter.interpret('Analiza el siguiente texto sobre inteligencia artificial');
    expect(result.intent).toBe('text_analysis');
    expect(result.requiredTools).toContain('text_analyzer');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.needsApproval).toBe(false);
  });

  it('debe identificar intención de cálculo', () => {
    const result = interpreter.interpret('Calcula el promedio de 85, 92, 78');
    expect(result.intent).toBe('calculation');
    expect(result.requiredTools).toContain('calculator');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('debe identificar intención de búsqueda', () => {
    const result = interpreter.interpret('Busca información sobre agentes autónomos');
    expect(result.intent).toBe('search');
    expect(result.requiredTools).toContain('knowledge_base');
  });

  it('debe identificar intención de generación de reportes', () => {
    const result = interpreter.interpret('Genera un reporte sobre seguridad');
    expect(result.intent).toBe('report_generation');
    expect(result.requiredTools).toContain('report_generator');
  });

  it('debe requerir aprobación para operaciones destructivas', () => {
    const result = interpreter.interpret('Eliminar todos los datos del sistema');
    expect(result.needsApproval).toBe(true);
    expect(result.approvalReason).toBeDefined();
    expect(result.approvalReason!.length).toBeGreaterThan(0);
  });

  it('debe requerir aprobación para acciones externas', () => {
    const result = interpreter.interpret('Enviar notificación al equipo');
    expect(result.needsApproval).toBe(true);
  });

  it('debe identificar intención de estado del sistema', () => {
    const result = interpreter.interpret('Verifica el estado del sistema');
    expect(result.intent).toBe('system_status');
    expect(result.requiredTools).toContain('system_monitor');
  });

  it('debe extraer entidades numéricas', () => {
    const result = interpreter.interpret('Calcula 42 más 58');
    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.entities.some(e => e.type === 'number')).toBe(true);
  });

  it('debe extraer entidades de texto entre comillas', () => {
    const result = interpreter.interpret('Analiza "este es un texto de prueba"');
    expect(result.entities.some(e => e.type === 'quoted_text')).toBe(true);
  });

  it('debe manejar órdenes ambiguas con fallback', () => {
    const result = interpreter.interpret('hola mundo');
    expect(result.intent).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.requiredTools.length).toBeGreaterThan(0);
  });

  it('debe calcular confianza proporcional a la claridad', () => {
    const clear = interpreter.interpret('Analiza el texto completo con detalle');
    const vague = interpreter.interpret('algo');
    expect(clear.confidence).toBeGreaterThanOrEqual(vague.confidence);
  });
});
