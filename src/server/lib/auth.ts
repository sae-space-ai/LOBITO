// ============================================================
// SERVICIO DE AUTENTICACIÓN Y AUTORIZACIÓN
// ============================================================

import * as crypto from 'crypto';

export interface AuthContext {
  userId: string;
  role: 'admin' | 'operator' | 'viewer' | 'auditor';
  permissions: string[];
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['read', 'write', 'execute', 'approve', 'delete', 'admin'],
  operator: ['read', 'write', 'execute'],
  viewer: ['read'],
  auditor: ['read', 'audit'],
};

export function authenticate(headers: Record<string, string | string[] | undefined>): AuthContext | null {
  // En producción: verificar JWT con JWT_SECRET
  // Por ahora: autenticación básica con API key
  const authHeader = headers['authorization'] || headers['Authorization'];
  if (!authHeader) return null;

  const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const bearerToken = token.replace('Bearer ', '').trim();
  
  if (!bearerToken || bearerToken.length < 10) return null;

  // Validar contra API_KEY del servidor (si está configurada)
  const serverApiKey = process.env.API_KEY;
  if (serverApiKey && bearerToken !== serverApiKey) {
    return null;
  }

  // En producción: extraer userId y role del JWT
  return {
    userId: 'system',
    role: 'operator',
    permissions: ROLE_PERMISSIONS['operator'],
  };
}

export function authorize(ctx: AuthContext, action: string): boolean {
  const permissions = ROLE_PERMISSIONS[ctx.role] || [];
  return permissions.includes(action);
}

export function generateToken(userId: string, role: string): string {
  // En producción: usar JWT con JWT_SECRET
  const payload = `${userId}:${role}:${Date.now()}`;
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function validateInput(input: unknown, maxLength = 10000): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  
  // Sanitizar: eliminar caracteres de control potencialmente peligrosos
  return trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}
