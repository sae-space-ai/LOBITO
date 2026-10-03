// ============================================================
// HERRAMIENTA: BASE DE CONOCIMIENTO
// Sistema de búsqueda en conocimiento local del agente
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { TaskResult, Tool } from '../types';

interface KnowledgeEntry {
  id: string;
  topic: string;
  content: string;
  tags: string[];
  source: string;
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: 'kb-001',
    topic: 'Inteligencia Artificial',
    content: 'La inteligencia artificial (IA) es la simulación de procesos de inteligencia humana por parte de sistemas informáticos. Incluye aprendizaje automático, procesamiento de lenguaje natural, visión por computadora y robótica.',
    tags: ['ia', 'inteligencia artificial', 'machine learning', 'tecnología'],
    source: 'Enciclopedia Tecnológica',
  },
  {
    id: 'kb-002',
    topic: 'Agentes Autónomos',
    content: 'Un agente autónomo de IA es un sistema capaz de percibir su entorno, tomar decisiones y ejecutar acciones para alcanzar objetivos específicos sin intervención humana continua. Utiliza planificación, memoria y herramientas para completar tareas complejas.',
    tags: ['agente', 'autónomo', 'ia', 'planificación', 'autonomía'],
    source: 'Manual de Sistemas Autónomos',
  },
  {
    id: 'kb-003',
    topic: 'Arquitectura de Software Modular',
    content: 'La arquitectura modular divide un sistema en componentes independientes que se comunican mediante interfaces bien definidas. Permite desarrollo paralelo, mantenimiento simplificado y escalabilidad. Principios: alta cohesión, bajo acoplamiento.',
    tags: ['arquitectura', 'modular', 'software', 'diseño', 'patrones'],
    source: 'Patrones de Arquitectura',
  },
  {
    id: 'kb-004',
    topic: 'Procesamiento de Lenguaje Natural',
    content: 'El PLN (NLP) es una rama de la IA que permite a las máquinas comprender, interpretar y generar lenguaje humano. Técnicas principales: tokenización, análisis sintáctico, embeddings, transformers, modelos de lenguaje grandes (LLMs).',
    tags: ['nlp', 'pln', 'lenguaje natural', 'transformers', 'llm'],
    source: 'Fundamentos de NLP',
  },
  {
    id: 'kb-005',
    topic: 'Seguridad en Sistemas de IA',
    content: 'La seguridad en sistemas de IA incluye: autenticación y autorización, validación de entradas, protección de datos sensibles, aislamiento de ejecución, registro de auditoría, y supervisión humana para operaciones críticas.',
    tags: ['seguridad', 'autenticación', 'autorización', 'auditoría', 'protección'],
    source: 'Guía de Seguridad IA',
  },
  {
    id: 'kb-006',
    topic: 'Bases de Datos',
    content: 'Las bases de datos son sistemas organizados para almacenar, gestionar y recuperar información. Tipos principales: relacionales (PostgreSQL, MySQL), documentos (MongoDB), grafos (Neo4j), y vectoriales (Pinecone, Weaviate) para IA.',
    tags: ['base de datos', 'postgresql', 'mongodb', 'almacenamiento', 'datos'],
    source: 'Fundamentos de Datos',
  },
  {
    id: 'kb-007',
    topic: 'APIs y Servicios Web',
    content: 'Una API (Application Programming Interface) define cómo diferentes componentes de software se comunican. REST, GraphQL y gRPC son los protocolos más comunes. Las APIs permiten la integración entre servicios y la construcción de sistemas distribuidos.',
    tags: ['api', 'rest', 'graphql', 'servicios', 'integración'],
    source: 'Desarrollo de APIs',
  },
  {
    id: 'kb-008',
    topic: 'Modelos de Lenguaje (LLMs)',
    content: 'Los Large Language Models son redes neuronales entrenadas con grandes volúmenes de texto. Qwen, GPT, Claude y Llama son ejemplos. Pueden generar texto, responder preguntas, traducir, resumir y razonar sobre información compleja.',
    tags: ['llm', 'qwen', 'gpt', 'claude', 'modelo de lenguaje', 'generación'],
    source: 'Estado del Arte en IA',
  },
];

function searchKnowledge(query: string): { results: KnowledgeEntry[]; score: number } {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  const scored = KNOWLEDGE_BASE.map(entry => {
    let score = 0;
    
    // Coincidencia en topic
    if (entry.topic.toLowerCase().includes(queryLower)) score += 3;
    
    // Coincidencia en tags
    entry.tags.forEach(tag => {
      if (queryLower.includes(tag) || tag.includes(queryLower)) score += 2;
      queryWords.forEach(word => {
        if (tag.includes(word)) score += 1;
      });
    });
    
    // Coincidencia en contenido
    queryWords.forEach(word => {
      if (entry.content.toLowerCase().includes(word)) score += 1;
    });
    
    return { entry, score };
  });

  const results = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.entry);

  const maxScore = scored.reduce((max, s) => Math.max(max, s.score), 0);

  return { results, score: maxScore > 0 ? Math.min(maxScore / 5, 1) : 0 };
}

export const knowledgeBaseTool: Tool = {
  id: 'knowledge_base',
  name: 'Base de Conocimiento',
  description: 'Sistema de búsqueda en la base de conocimiento local del agente. Contiene información sobre IA, arquitectura, seguridad y más.',
  status: 'available',
  parameters: [
    { name: 'query', type: 'string', required: true, description: 'Consulta de búsqueda' },
    { name: 'entities', type: 'array', required: false, description: 'Entidades para refinar la búsqueda' },
  ],
  execute: async (params: Record<string, unknown>): Promise<TaskResult> => {
    const startTime = Date.now();
    const query = (params.query as string) || '';

    const { results, score } = searchKnowledge(query);

    if (results.length === 0) {
      return {
        taskId: uuidv4(),
        tool: 'knowledge_base',
        status: 'warning',
        data: { results: [], query, message: 'No se encontraron resultados en la base de conocimiento' },
        summary: `Búsqueda completada sin resultados para: "${query}"`,
        executedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
    }

    return {
      taskId: uuidv4(),
      tool: 'knowledge_base',
      status: 'success',
      data: { results, query, totalResults: results.length, relevanceScore: score },
      summary: `Búsqueda completada: ${results.length} resultado(s) encontrado(s) para "${query.substring(0, 50)}"`,
      executedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  },
};
