// ============================================================
// HERRAMIENTA: GENERADOR DE REPORTES
// Genera reportes estructurados a partir de datos y análisis
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { TaskResult, Tool } from '../types';

function generateReport(input: string): Record<string, unknown> {
  const timestamp = new Date().toISOString();
  const wordCount = input.split(/\s+/).filter(w => w.length > 0).length;
  
  // Generar estructura del reporte
  const report = {
    metadata: {
      generatedAt: timestamp,
      agent: 'AI Agent Core v1.0',
      reportId: uuidv4(),
      version: '1.0.0',
    },
    executiveSummary: {
      title: 'Reporte de Operación',
      inputAnalyzed: input.substring(0, 200),
      inputLength: input.length,
      wordCount,
      processingStatus: 'completed',
    },
    analysis: {
      contentType: wordCount > 50 ? 'documento extenso' : wordCount > 10 ? 'texto medio' : 'texto breve',
      complexity: wordCount > 100 ? 'alta' : wordCount > 30 ? 'media' : 'baja',
      language: 'es',
      keyTopics: extractTopics(input),
    },
    recommendations: generateRecommendations(wordCount, input),
    metrics: {
      processingTime: 'N/A',
      toolsUsed: ['report_generator'],
      dataPoints: wordCount,
    },
  };

  return report;
}

function extractTopics(text: string): string[] {
  const topics: string[] = [];
  const topicKeywords: Record<string, string[]> = {
    'tecnología': ['tecnología', 'software', 'sistema', 'digital', 'computadora', 'programa'],
    'inteligencia artificial': ['inteligencia', 'artificial', 'ia', 'ai', 'machine learning', 'modelo'],
    'datos': ['datos', 'información', 'base de datos', 'análisis', 'estadística'],
    'seguridad': ['seguridad', 'protección', 'autenticación', 'cifrado', 'acceso'],
    'negocios': ['negocio', 'empresa', 'cliente', 'mercado', 'venta', 'proyecto'],
    'educación': ['educación', 'aprendizaje', 'estudio', 'curso', 'formación'],
  };

  const lowerText = text.toLowerCase();
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      topics.push(topic);
    }
  }

  return topics.length > 0 ? topics : ['general'];
}

function generateRecommendations(wordCount: number, input: string): string[] {
  const recommendations: string[] = [];
  
  if (wordCount < 20) {
    recommendations.push('Proporcionar más contexto para un análisis más detallado');
  }
  if (wordCount > 200) {
    recommendations.push('Considerar dividir el contenido en secciones para mejor procesamiento');
  }
  if (!input.includes('?')) {
    recommendations.push('Formular preguntas específicas para obtener respuestas más precisas');
  }
  
  recommendations.push('Utilizar el sistema de memoria para conservar resultados relevantes');
  recommendations.push('Exportar los resultados en el formato más adecuado para su uso posterior');

  return recommendations;
}

export const reportGeneratorTool: Tool = {
  id: 'report_generator',
  name: 'Generador de Reportes',
  description: 'Genera reportes estructurados con resumen ejecutivo, análisis, métricas y recomendaciones.',
  status: 'available',
  parameters: [
    { name: 'input', type: 'string', required: true, description: 'Contenido base para el reporte' },
    { name: 'format', type: 'string', required: false, description: 'Formato del reporte: structured, brief, detailed' },
  ],
  execute: async (params: Record<string, unknown>): Promise<TaskResult> => {
    const startTime = Date.now();
    const input = (params.input as string) || '';

    if (!input.trim()) {
      return {
        taskId: uuidv4(),
        tool: 'report_generator',
        status: 'error',
        data: null,
        summary: 'Error: No se proporcionó contenido para generar el reporte',
        executedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
    }

    const report = generateReport(input);

    return {
      taskId: uuidv4(),
      tool: 'report_generator',
      status: 'success',
      data: report,
      summary: `Reporte generado exitosamente. ID: ${(report.metadata as any).reportId.substring(0, 8)}...`,
      executedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  },
};
