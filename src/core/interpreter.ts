// ============================================================
// MOTOR DE INTERPRETACIÓN DE LENGUAJE NATURAL
// Analiza órdenes en español e identifica intención, entidades y herramientas
// ============================================================

import { Interpretation, Entity } from '../types';

interface IntentPattern {
  keywords: string[];
  intent: string;
  tools: string[];
  needsApproval: boolean;
  approvalReason?: string;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    keywords: ['analizar', 'analiza', 'análisis', 'examinar', 'revisar texto', 'procesar texto'],
    intent: 'text_analysis',
    tools: ['text_analyzer'],
    needsApproval: false,
  },
  {
    keywords: ['calcular', 'calcula', 'suma', 'resta', 'multiplica', 'divide', 'matemáticas', 'estadística', 'promedio', 'media'],
    intent: 'calculation',
    tools: ['calculator'],
    needsApproval: false,
  },
  {
    keywords: ['buscar', 'busca', 'encontrar', 'consulta', 'investigar', 'información sobre'],
    intent: 'search',
    tools: ['knowledge_base'],
    needsApproval: false,
  },
  {
    keywords: ['generar reporte', 'genera reporte', 'informe', 'reporte', 'resumen ejecutivo'],
    intent: 'report_generation',
    tools: ['report_generator'],
    needsApproval: false,
  },
  {
    keywords: ['exportar', 'descargar', 'guardar como', 'convertir a'],
    intent: 'export',
    tools: ['exporter'],
    needsApproval: false,
  },
  {
    keywords: ['eliminar', 'borrar', 'destruir', 'limpiar todo'],
    intent: 'destructive_operation',
    tools: ['data_manager'],
    needsApproval: true,
    approvalReason: 'Operación destructiva: requiere confirmación antes de ejecutar',
  },
  {
    keywords: ['enviar', 'notificar', 'publicar', 'compartir'],
    intent: 'external_action',
    tools: ['notification_service'],
    needsApproval: true,
    approvalReason: 'Acción con efectos externos: requiere autorización',
  },
  {
    keywords: ['estado', 'estado del sistema', 'diagnóstico', 'verificar sistema', 'check'],
    intent: 'system_status',
    tools: ['system_monitor'],
    needsApproval: false,
  },
  {
    keywords: ['memoria', 'recordar', 'almacenar', 'guardar en memoria'],
    intent: 'memory_operation',
    tools: ['memory_store'],
    needsApproval: false,
  },
  {
    keywords: ['listar tareas', 'ver tareas', 'historial', 'operaciones', 'registro'],
    intent: 'list_operations',
    tools: ['operation_logger'],
    needsApproval: false,
  },
];

const ENTITY_PATTERNS = [
  { type: 'number', regex: /(\d+(?:\.\d+)?)/g },
  { type: 'quoted_text', regex: /"([^"]+)"|'([^']+)'/g },
  { type: 'date', regex: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g },
  { type: 'email', regex: /([\w.-]+@[\w.-]+\.\w+)/g },
  { type: 'percentage', regex: /(\d+(?:\.\d+)?%)/g },
];

export class Interpreter {
  interpret(input: string): Interpretation {
    const normalizedInput = input.toLowerCase().trim();
    
    // Identificar intención
    let bestMatch: IntentPattern | null = null;
    let maxMatches = 0;

    for (const pattern of INTENT_PATTERNS) {
      const matches = pattern.keywords.filter(kw => normalizedInput.includes(kw)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = pattern;
      }
    }

    // Si no hay coincidencia clara, intentar análisis genérico
    if (!bestMatch || maxMatches === 0) {
      bestMatch = this.fallbackAnalysis(normalizedInput);
    }

    // Extraer entidades
    const entities = this.extractEntities(input);

    // Calcular confianza
    const confidence = this.calculateConfidence(normalizedInput, bestMatch, entities.length);

    return {
      intent: bestMatch.intent,
      entities,
      confidence,
      requiredTools: bestMatch.tools,
      needsApproval: bestMatch.needsApproval,
      approvalReason: bestMatch.approvalReason,
    };
  }

  private fallbackAnalysis(input: string): IntentPattern {
    // Análisis heurístico para órdenes no reconocidas
    if (input.includes('?') || input.includes('qué') || input.includes('cómo') || input.includes('cuál')) {
      return {
        keywords: [],
        intent: 'search',
        tools: ['knowledge_base'],
        needsApproval: false,
      };
    }

    // Por defecto, tratar como análisis de texto
    return {
      keywords: [],
      intent: 'text_analysis',
      tools: ['text_analyzer'],
      needsApproval: false,
    };
  }

  private extractEntities(input: string): Entity[] {
    const entities: Entity[] = [];

    for (const pattern of ENTITY_PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match;
      while ((match = regex.exec(input)) !== null) {
        const value = match[1] || match[2] || match[0];
        entities.push({
          type: pattern.type,
          value,
          position: [match.index, match.index + match[0].length],
        });
      }
    }

    return entities;
  }

  private calculateConfidence(input: string, pattern: IntentPattern, entityCount: number): number {
    let confidence = 0.5; // Base

    // Más keywords encontrados = más confianza
    const keywordMatches = pattern.keywords.filter(kw => input.includes(kw)).length;
    confidence += keywordMatches * 0.15;

    // Más entidades = más contexto = más confianza
    confidence += Math.min(entityCount * 0.05, 0.2);

    // Longitud de la orden (órdenes más largas suelen ser más específicas)
    if (input.length > 20) confidence += 0.05;
    if (input.length > 50) confidence += 0.05;

    return Math.min(confidence, 0.99);
  }
}

export const interpreter = new Interpreter();
