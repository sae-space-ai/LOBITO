// ============================================================
// ENDPOINTS DEL BACKEND - API del Agente IA
// Diseño para Vercel Serverless Functions (Node.js)
// ============================================================
// NOTA: Este archivo documenta la estructura de los endpoints.
// Para despliegue real en Vercel, estos handlers se convertirían
// en archivos individuales en /api/*.ts con el runtime de Vercel.
// ============================================================

import { Order, OperationLog } from '../types';

// ============================================================
// TIPOS DE REQUEST/RESPONSE
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    duration: number;
  };
}

export interface CreateCommandRequest {
  input: string;
  userId?: string;
  source?: string;
  priority?: number;
}

export interface ExecuteCommandRequest {
  status?: string;
  force?: boolean;
}

export interface ApproveCommandRequest {
  approved: boolean;
  comment?: string;
  userId: string;
}

// ============================================================
// VALIDADORES
// ============================================================

export function validateCreateCommand(body: unknown): CreateCommandRequest | null {
  if (!body || typeof body !== 'object') return null;
  const { input, userId, source, priority } = body as Record<string, unknown>;
  
  if (!input || typeof input !== 'string' || input.trim().length === 0) return null;
  if (input.length > 10000) return null; // Límite de tamaño
  
  return {
    input: input.trim(),
    userId: typeof userId === 'string' ? userId : undefined,
    source: typeof source === 'string' ? source : 'api',
    priority: typeof priority === 'number' ? Math.min(Math.max(priority, 1), 10) : 1,
  };
}

export function validateApproveCommand(body: unknown): ApproveCommandRequest | null {
  if (!body || typeof body !== 'object') return null;
  const { approved, comment, userId } = body as Record<string, unknown>;
  
  if (typeof approved !== 'boolean') return null;
  if (!userId || typeof userId !== 'string') return null;
  
  return {
    approved,
    comment: typeof comment === 'string' ? comment.substring(0, 500) : undefined,
    userId,
  };
}

// ============================================================
// HANDLERS DE ENDPOINTS (referencia para implementación en Vercel)
// ============================================================

/**
 * POST /api/commands
 * Crear una nueva orden
 */
export async function handleCreateCommand(
  body: unknown,
  _headers: Record<string, string>
): Promise<ApiResponse<Order>> {
  const startTime = Date.now();
  const validated = validateCreateCommand(body);
  
  if (!validated) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Campo "input" es requerido y debe ser un string no vacío (máx 10000 caracteres)',
      },
      meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID(), duration: Date.now() - startTime },
    };
  }

  // En implementación real: insertar en PostgreSQL y devolver la orden creada
  // Por ahora, delegamos al engine del frontend
  return {
    success: true,
    data: undefined as unknown as Order,
    meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID(), duration: Date.now() - startTime },
  };
}

/**
 * GET /api/commands
 * Listar órdenes con filtros
 */
export async function handleListCommands(
  query: Record<string, string>,
  _headers: Record<string, string>
): Promise<ApiResponse<Order[]>> {
  const limit = Math.min(parseInt(query.limit || '50'), 200);
  const offset = parseInt(query.offset || '0');
  const status = query.status;
  const userId = query.userId;

  // En implementación real: SELECT FROM orders WHERE ... LIMIT ... OFFSET ...
  return {
    success: true,
    data: [],
    meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID(), duration: 0 },
  };
}

/**
 * GET /api/commands/:id
 * Obtener una orden específica
 */
export async function handleGetCommand(
  id: string,
  _headers: Record<string, string>
): Promise<ApiResponse<Order>> {
  if (!id || typeof id !== 'string') {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'ID de orden inválido' },
      meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID(), duration: 0 },
    };
  }

  // En implementación real: SELECT FROM orders WHERE id = $1
  return {
    success: true,
    data: undefined as unknown as Order,
    meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID(), duration: 0 },
  };
}

/**
 * POST /api/commands/:id/execute
 * Ejecutar una orden
 */
export async function handleExecuteCommand(
  id: string,
  body: unknown,
  _headers: Record<string, string>
): Promise<ApiResponse<Order>> {
  if (!id) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'ID de orden requerido' },
      meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID(), duration: 0 },
    };
  }

  // En implementación real: ejecutar herramientas en el servidor
  return {
    success: true,
    data: undefined as unknown as Order,
    meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID(), duration: 0 },
  };
}

/**
 * POST /api/commands/:id/approve
 * Aprobar o rechazar una orden pendiente
 */
export async function handleApproveCommand(
  id: string,
  body: unknown,
  _headers: Record<string, string>
): Promise<ApiResponse<Order>> {
  const validated = validateApproveCommand(body);
  
  if (!validated) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Campos "approved" (boolean) y "userId" (string) son requeridos' },
      meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID(), duration: 0 },
    };
  }

  // En implementación real: UPDATE orders SET status = ... WHERE id = $1
  return {
    success: true,
    data: undefined as unknown as Order,
    meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID(), duration: 0 },
  };
}

/**
 * GET /api/tools
 * Listar herramientas disponibles
 */
export async function handleListTools(
  _headers: Record<string, string>
): Promise<ApiResponse> {
  // En implementación real: SELECT FROM tool_registry WHERE status = 'available'
  return {
    success: true,
    data: [],
    meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID(), duration: 0 },
  };
}

/**
 * GET /api/health
 * Estado de salud del sistema
 */
export async function handleHealthCheck(): Promise<ApiResponse> {
  const checks = {
    api: true,
    database: false, // Se actualiza con conexión real
    qwen: false,     // Se actualiza con health check del adaptador
    timestamp: new Date().toISOString(),
  };

  return {
    success: true,
    data: checks,
    meta: { timestamp: new Date().toISOString(), requestId: crypto.randomUUID(), duration: 0 },
  };
}

// ============================================================
// MIDDLEWARE DE AUTENTICACIÓN (referencia)
// ============================================================

export interface AuthContext {
  userId: string;
  role: 'admin' | 'operator' | 'viewer' | 'auditor';
  permissions: string[];
}

export function authenticateRequest(headers: Record<string, string>): AuthContext | null {
  const authHeader = headers['authorization'] || headers['Authorization'];
  if (!authHeader) return null;

  // En implementación real: verificar JWT, session, API key
  // Por ahora, extraer de header simplificado
  const token = authHeader.replace('Bearer ', '');
  if (!token || token.length < 10) return null;

  return {
    userId: 'system', // Se extraería del token
    role: 'operator',
    permissions: ['read', 'write', 'execute'],
  };
}

export function authorizeAction(ctx: AuthContext, action: string): boolean {
  const permissionMap: Record<string, string[]> = {
    'admin': ['read', 'write', 'execute', 'approve', 'delete', 'admin'],
    'operator': ['read', 'write', 'execute'],
    'viewer': ['read'],
    'auditor': ['read', 'audit'],
  };

  const permissions = permissionMap[ctx.role] || [];
  return permissions.includes(action);
}
