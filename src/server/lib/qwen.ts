// ============================================================
// SERVICIO QWEN - Backend Serverless
// Usa QWEN_API_KEY (variable PRIVADA del servidor)
// NUNCA se expone al navegador
// ============================================================

export interface QwenMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface QwenResponse {
  id: string;
  model: string;
  content: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  timestamp: string;
}

const SYSTEM_PROMPT = `Eres el núcleo de interpretación de un agente de inteligencia artificial autónomo.
Tu función es analizar órdenes en lenguaje natural y devolver una respuesta estructurada en JSON.

Para cada orden, debes devolver un objeto JSON con la siguiente estructura:
{
  "intent": "string - tipo de operación (text_analysis, calculation, search, report_generation, export, system_status, memory_operation, list_operations, destructive_operation, external_action, general)",
  "entities": [{"type": "string", "value": "string"}],
  "confidence": 0.0-1.0,
  "requiredTools": ["string - IDs de herramientas necesarias"],
  "needsApproval": boolean,
  "approvalReason": "string - razón si necesita aprobación",
  "plan": {
    "tasks": [{
      "name": "string",
      "description": "string",
      "tool": "string - ID de herramienta",
      "parameters": {},
      "priority": 1
    }]
  }
}

Herramientas disponibles:
- text_analyzer: Analiza texto (estadísticas, palabras, sentimiento, idioma)
- calculator: Operaciones matemáticas y estadísticas
- knowledge_base: Búsqueda en base de conocimiento
- report_generator: Genera reportes estructurados
- system_monitor: Diagnóstico del sistema
- memory_store: Gestión de memoria persistente
- exporter: Exporta datos en JSON, CSV, HTML, texto

Responde SOLO con el JSON, sin texto adicional. No incluyas markdown ni bloques de código.`;

export function isQwenConfigured(): boolean {
  const apiKey = process.env.QWEN_API_KEY;
  return !!apiKey && apiKey.length > 10;
}

export function getQwenConfig() {
  return {
    apiKey: process.env.QWEN_API_KEY || '',
    endpoint: process.env.QWEN_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: process.env.QWEN_MODEL || 'qwen-turbo',
    maxTokens: parseInt(process.env.QWEN_MAX_TOKENS || '2000'),
    temperature: parseFloat(process.env.QWEN_TEMPERATURE || '0.3'),
    timeout: parseInt(process.env.QWEN_TIMEOUT || '30000'),
  };
}

export async function callQwen(
  messages: QwenMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<QwenResponse> {
  const config = getQwenConfig();
  
  if (!config.apiKey) {
    throw new Error('QWEN_API_KEY no configurada en el servidor');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: options?.maxTokens || config.maxTokens,
        temperature: options?.temperature ?? config.temperature,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Qwen API Error ${response.status}: ${errorBody.substring(0, 200)}`);
    }

    const data = await response.json();
    
    return {
      id: data.id || 'unknown',
      model: data.model || config.model,
      content: data.choices?.[0]?.message?.content || '',
      finishReason: data.choices?.[0]?.finish_reason || 'unknown',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      throw new Error('Timeout: La llamada a Qwen excedió el tiempo máximo');
    }
    throw error;
  }
}

export async function interpretOrder(input: string): Promise<{
  intent: string;
  entities: Array<{ type: string; value: string }>;
  confidence: number;
  requiredTools: string[];
  needsApproval: boolean;
  approvalReason?: string;
  plan?: {
    tasks: Array<{
      name: string;
      description: string;
      tool: string;
      parameters: Record<string, unknown>;
      priority: number;
    }>;
  };
  rawResponse: string;
} | null> {
  if (!isQwenConfigured()) return null;

  const messages: QwenMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Orden: ${input}` },
  ];

  try {
    const response = await callQwen(messages);
    const parsed = parseJSON(response.content);
    
    if (!parsed) {
      return {
        intent: 'general',
        entities: [],
        confidence: 0.3,
        requiredTools: ['text_analyzer'],
        needsApproval: false,
        rawResponse: response.content,
      };
    }

    return {
      intent: (parsed.intent as string) || 'general',
      entities: (parsed.entities as Array<{ type: string; value: string }>) || [],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      requiredTools: (parsed.requiredTools as string[]) || ['text_analyzer'],
      needsApproval: !!parsed.needsApproval,
      approvalReason: parsed.approvalReason as string | undefined,
      plan: parsed.plan as any,
      rawResponse: response.content,
    };
  } catch (error) {
    console.error('[Qwen] Error en interpretación:', error);
    return null;
  }
}

function parseJSON(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch { /* ignore */ }
    }
    return null;
  }
}

export async function healthCheck(): Promise<{
  configured: boolean;
  connected: boolean;
  model: string;
  latency: number;
  error: string | null;
}> {
  const config = getQwenConfig();
  const start = Date.now();
  
  if (!isQwenConfigured()) {
    return {
      configured: false,
      connected: false,
      model: config.model,
      latency: 0,
      error: 'QWEN_API_KEY no configurada',
    };
  }

  try {
    const response = await callQwen(
      [{ role: 'user', content: 'Responde solo con: {"status":"ok"}' }],
      { maxTokens: 20 }
    );
    return {
      configured: true,
      connected: true,
      model: response.model,
      latency: Date.now() - start,
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      model: config.model,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}
