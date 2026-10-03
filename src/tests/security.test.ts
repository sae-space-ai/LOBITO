import { describe, it, expect } from 'vitest';
import {
  validateCreateCommand,
  validateApproveCommand,
  authenticateRequest,
  authorizeAction,
} from '../server/api';

describe('Validación de Entradas - API', () => {
  describe('validateCreateCommand', () => {
    it('debe validar una orden correcta', () => {
      const result = validateCreateCommand({
        input: 'Analiza este texto',
        userId: 'user-1',
        source: 'chat',
      });
      expect(result).not.toBeNull();
      expect(result!.input).toBe('Analiza este texto');
      expect(result!.userId).toBe('user-1');
    });

    it('debe rechazar input vacío', () => {
      const result = validateCreateCommand({ input: '' });
      expect(result).toBeNull();
    });

    it('debe rechazar input solo espacios', () => {
      const result = validateCreateCommand({ input: '   ' });
      expect(result).toBeNull();
    });

    it('debe rechazar body nulo', () => {
      const result = validateCreateCommand(null);
      expect(result).toBeNull();
    });

    it('debe rechazar input demasiado largo', () => {
      const result = validateCreateCommand({ input: 'a'.repeat(10001) });
      expect(result).toBeNull();
    });

    it('debe limitar prioridad entre 1 y 10', () => {
      const result = validateCreateCommand({ input: 'test', priority: 15 });
      expect(result).not.toBeNull();
      expect(result!.priority).toBe(10);
    });

    it('debe establecer valores por defecto', () => {
      const result = validateCreateCommand({ input: 'test' });
      expect(result).not.toBeNull();
      expect(result!.source).toBe('api');
      expect(result!.priority).toBe(1);
    });
  });

  describe('validateApproveCommand', () => {
    it('debe validar una aprobación correcta', () => {
      const result = validateApproveCommand({
        approved: true,
        userId: 'user-1',
        comment: 'Aprobado',
      });
      expect(result).not.toBeNull();
      expect(result!.approved).toBe(true);
      expect(result!.userId).toBe('user-1');
    });

    it('debe rechazar sin userId', () => {
      const result = validateApproveCommand({ approved: true });
      expect(result).toBeNull();
    });

    it('debe rechazar approved no booleano', () => {
      const result = validateApproveCommand({ approved: 'yes', userId: 'user-1' });
      expect(result).toBeNull();
    });

    it('debe truncar comentarios largos', () => {
      const result = validateApproveCommand({
        approved: true,
        userId: 'user-1',
        comment: 'a'.repeat(1000),
      });
      expect(result).not.toBeNull();
      expect(result!.comment!.length).toBe(500);
    });
  });
});

describe('Autenticación y Autorización', () => {
  describe('authenticateRequest', () => {
    it('debe rechazar sin header de autorización', () => {
      const result = authenticateRequest({});
      expect(result).toBeNull();
    });

    it('debe rechazar token vacío', () => {
      const result = authenticateRequest({ authorization: 'Bearer ' });
      expect(result).toBeNull();
    });

    it('debe aceptar token válido', () => {
      const result = authenticateRequest({ authorization: 'Bearer valid-token-12345' });
      expect(result).not.toBeNull();
      expect(result!.role).toBe('operator');
    });
  });

  describe('authorizeAction', () => {
    it('admin debe tener todos los permisos', () => {
      const ctx = { userId: 'admin-1', role: 'admin' as const, permissions: [] };
      expect(authorizeAction(ctx, 'read')).toBe(true);
      expect(authorizeAction(ctx, 'write')).toBe(true);
      expect(authorizeAction(ctx, 'execute')).toBe(true);
      expect(authorizeAction(ctx, 'approve')).toBe(true);
      expect(authorizeAction(ctx, 'delete')).toBe(true);
      expect(authorizeAction(ctx, 'admin')).toBe(true);
    });

    it('operator debe tener permisos limitados', () => {
      const ctx = { userId: 'op-1', role: 'operator' as const, permissions: [] };
      expect(authorizeAction(ctx, 'read')).toBe(true);
      expect(authorizeAction(ctx, 'write')).toBe(true);
      expect(authorizeAction(ctx, 'execute')).toBe(true);
      expect(authorizeAction(ctx, 'admin')).toBe(false);
      expect(authorizeAction(ctx, 'delete')).toBe(false);
    });

    it('viewer solo debe tener permiso de lectura', () => {
      const ctx = { userId: 'view-1', role: 'viewer' as const, permissions: [] };
      expect(authorizeAction(ctx, 'read')).toBe(true);
      expect(authorizeAction(ctx, 'write')).toBe(false);
      expect(authorizeAction(ctx, 'execute')).toBe(false);
    });

    it('auditor debe tener permisos de lectura y auditoría', () => {
      const ctx = { userId: 'aud-1', role: 'auditor' as const, permissions: [] };
      expect(authorizeAction(ctx, 'read')).toBe(true);
      expect(authorizeAction(ctx, 'audit')).toBe(true);
      expect(authorizeAction(ctx, 'write')).toBe(false);
    });
  });
});
