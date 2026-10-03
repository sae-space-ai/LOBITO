// ============================================================
// ADAPTADOR QWEN - Motor de Inteligencia Artificial
// Compatible con API de DashScope (Alibaba Cloud) y servidores OpenAI-compatible
// ============================================================

export interface QwenConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

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

export interface QwenConnectionStatus {
  connected: boolean;
  configured: boolean;
  lastCheck: string | null;
  error: string | null;
  model: string | null;
  endpoint: string | null;
}

export interface QwenInterpretationResult {
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
}

const DEFAULT_CONFIG: QwenConfig = {
  apiKey: '',
  endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  model: 'qwen-turbo',
  maxTokens: 2000,
  temperature: 0.3,
  timeout: 30000,
};

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

export class QwenAdapter {
  private config: QwenConfig;
  private status: QwenConnectionStatus;
  private lastResponse: QwenResponse | null = null;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.status = {
      connected: false,
      configured: false,
      lastCheck: null,
      error: null,
      model: null,
      endpoint: null,
    };
    this.loadConfig();
  }

  private loadConfig(): void {
    // Cargar desde variables de entorno o almacenamiento local
    const apiKey = typeof import.meta !== 'undefined' 
      ? (import.meta as any).env?.VITE_QWEN_API_KEY || ''
      : '';
    
    const storedConfig = localStorage.getItem('qwen_config');
    if (storedConfig) {
      try {
        const parsed = JSON.parse(storedConfig);
        this.config = { ...this.config, ...parsed };
      } catch { /* ignore */ }
    }

    if (apiKey && !this.config.apiKey) {
      this.config.apiKey = apiKey;
    }

    this.updateStatus();
  }

  private updateStatus(): void {
    this.status = {
      connected: false, // Se actualiza tras health check
      configured: !!this.config.apiKey && this.config.apiKey.length > 10,
      lastCheck: this.status.lastCheck,
      error: this.status.error,
      model: this.config.model,
      endpoint: this.config.endpoint,
    };
  }

  configure(config: Partial<QwenConfig>): void {
    this.config = { ...this.config, ...config };
    localStorage.setItem('qwen_config', JSON.stringify(this.config));
    this.updateStatus();
    this.status.connected = false;
    this.status.lastCheck = null;
  }

  getStatus(): QwenConnectionStatus {
    return { ...this.status };
  }

  isConfigured(): boolean {
    return this.status.configured;
  }

  async healthCheck(): Promise<QwenConnectionStatus> {
    if (!this.config.apiKey) {
      this.status = {
        ...this.status,
        connected: false,
        configured: false,
        lastCheck: new Date().toISOString(),
        error: 'API Key no configurada. Configure VITE_QWEN_API_KEY o use el panel de configuración.',
      };
      return this.status;
    }

    try {
      // Hacer una llamada mínima para verificar conexión
      const response = await this.callAPI([
        { role: 'user', content: 'Responde solo con: {"status":"ok"}' }
      ], 50);

      this.status = {
        ...this.status,
        connected: true,
        configured: true,
        lastCheck: new Date().toISOString(),
        error: null,
        model: response.model,
      };
    } catch (error) {
      this.status = {
        ...this.status,
        connected: false,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Error de conexión desconocido',
      };
    }

    return this.status;
  }

  async interpret(input: string): Promise<QwenInterpretationResult | null> {
    if (!this.isConfigured()) {
      return null; // No simular - devolver null indica que Qwen no está disponible
    }

    const messages: QwenMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Orden: ${input}` },
    ];

    try {
      const response = await this.callAPI(messages);
      this.lastResponse = response;

      // Parsear respuesta JSON
      const parsed = this.parseJSON(response.content);
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
        plan: parsed.plan as QwenInterpretationResult['plan'],
        rawResponse: response.content,
      };
    } catch (error) {
      console.error('[QwenAdapter] Error en interpretación:', error);
      return null;
    }
  }

  async generatePlan(input: string, interpretation: QwenInterpretationResult): Promise<QwenInterpretationResult['plan'] | null> {
    if (!this.isConfigured()) return null;

    const messages: QwenMessage[] = [
      { 
        role: 'system', 
        content: 'Eres un planificador de tareas para un agente de IA. Genera un plan estructurado en JSON con la lista de tareas a ejecutar. Responde SOLO con JSON.' 
      },
      { 
        role: 'user', 
        content: `Orden original: ${input}\n\nInterpretación: ${JSON.stringify(interpretation)}\n\nGenera un plan con tareas usando las herramientas disponibles: text_analyzer, calculator, knowledge_base, report_generator, system_monitor, memory_store, exporter.` 
      },
    ];

    try {
      const response = await this.callAPI(messages);
      const parsed = this.parseJSON(response.content);
      if (!parsed) return null;
      const plan = (parsed.plan || parsed) as QwenInterpretationResult['plan'];
      return plan;
    } catch {
      return null;
    }
  }

  getLastResponse(): QwenResponse | null {
    return this.lastResponse;
  }

  getConfig(): QwenConfig {
    return { ...this.config };
  }

  private async callAPI(messages: QwenMessage[], maxTokens?: number): Promise<QwenResponse> {
    if (!this.config.apiKey) {
      throw new Error('API Key no configurada');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          max_tokens: maxTokens || this.config.maxTokens,
          temperature: this.config.temperature,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API Error ${response.status}: ${errorBody.substring(0, 200)}`);
      }

      const data = await response.json();
      
      return {
        id: data.id || 'unknown',
        model: data.model || this.config.model,
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

  private parseJSON(content: string): Record<string, unknown> | null {
    try {
      // Intentar parsear directamente
      return JSON.parse(content);
    } catch {
      // Intentar extraer JSON de markdown o texto
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch { /* ignore */ }
      }
      return null;
    }
  }
}

// Instancia singleton
export const qwenAdapter = new QwenAdapter();
