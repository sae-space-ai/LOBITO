// ============================================================
// ENDPOINT: GET /api/commands
// Listar órdenes con filtros
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, authorize } from '../../src/server/lib/auth';
import { isDatabaseAvailable, query } from '../../src/server/lib/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Solo GET' } });
  }

  const auth = authenticate(req.headers as Record<string, string>);
  if (!auth) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Autenticación requerida' } });
  }

  if (!authorize(auth, 'read')) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Permisos insuficientes' } });
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  const status = req.query.status as string | undefined;

  try {
    if (isDatabaseAvailable()) {
      let sql = 'SELECT * FROM orders';
      const params: unknown[] = [];
      
      if (status) {
        sql += ' WHERE status = $1';
        params.push(status);
      }
      
      sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);

      const result = await query(sql, params);
      return res.status(200).json({
        success: true,
        data: result.rows,
        meta: { count: result.rowCount, limit, offset },
      });
    }

    // Fallback: sin base de datos
    return res.status(200).json({
      success: true,
      data: [],
      meta: { count: 0, limit, offset, message: 'PostgreSQL no configurado' },
    });
  } catch (error) {
    console.error('[GET /api/commands] Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Error interno' },
    });
  }
}
