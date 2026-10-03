// ============================================================
// ADAPTADOR QWEN - Frontend (v3 - SEGURIDAD)
// NUNCA llama directamente a Qwen. Usa el endpoint del backend.
// Las credenciales (QWEN_API_KEY) están SOLO en el servidor.
// ============================================================

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
}

const API_BASE = '/api';

export class QwenAdapter {
  private status: QwenConnectionStatus;

  constructor() {
    this.status = {
      connected: false,
      configured: false,
      lastCheck: null,
      error: null,
      model: null,
      endpoint: null,
    };
  }

  getStatus(): QwenConnectionStatus {
    return { ...this.status };
  }

  isConfigured(): boolean {
    return this.status.configured;
  }

  /**
   * Verifica el estado de Qwen mediante el endpoint del backend.
   * NUNCA expone ni recibe la API key.
   */
  async healthCheck(): Promise<QwenConnectionStatus> {
    try {
      const response = await fetch(`${API_BASE}/qwen/interpret`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        this.status = {
          ...this.status,
          connected: false,
          configured: false,
          lastCheck: new Date().toISOString(),
          error: `Backend no disponible (${response.status})`,
        };
        return this.status;
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        this.status = {
          connected: result.data.connected,
          configured: result.data.configured,
          lastCheck: new Date().toISOString(),
          error: result.data.error,
          model: result.data.model,
          endpoint: '/api/qwen/interpret', // Proxy del backend
        };
      } else {
        this.status = {
          ...this.status,
          connected: false,
          configured: false,
          lastCheck: new Date().toISOString(),
          error: result.error?.message || 'Respuesta inválida del backend',
        };
      }
    } catch (error) {
      this.status = {
        ...this.status,
        connected: false,
        configured: false,
        lastCheck: new Date().toISOString(),
        error: 'Backend no accesible. Verifique que el servidor esté corriendo.',
      };
    }

    return this.status;
  }

  /**
   * Interpreta una orden mediante el endpoint del backend.
   * La API key está SOLO en el servidor.
   */
  async interpret(input: string): Promise<QwenInterpretationResult | null> {
    try {
      const response = await fetch(`${API_BASE}/qwen/interpret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        if (response.status === 503) {
          // Qwen no configurado en el servidor
          this.status = { ...this.status, configured: false, connected: false };
          return null;
        }
        throw new Error(`Error ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        this.status = {
          ...this.status,
          connected: true,
          configured: true,
          lastCheck: new Date().toISOString(),
          error: null,
        };
        return result.data as QwenInterpretationResult;
      }

      return null;
    } catch (error) {
      console.error('[QwenAdapter] Error en interpretación:', error);
      return null;
    }
  }

  /**
   * Método obsoleto - ya no se configura desde el frontend.
   * La API key está SOLO en el servidor.
   */
  configure(_config: unknown): void {
    console.warn('[QwenAdapter] configure() es obsoleto. Las credenciales se gestionan en el servidor.');
    // No-op: la configuración ahora está solo en el backend
  }
}

export const qwenAdapter = new QwenAdapter();
