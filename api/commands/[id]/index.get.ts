// ============================================================
// ENDPOINT: GET /api/commands/[id]
// Obtener una orden específica
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, authorize } from '../../../src/server/lib/auth';
import { isDatabaseAvailable, query } from '../../../src/server/lib/database';

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

  const id = req.query.id as string;
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ID inválido' } });
  }

  try {
    if (isDatabaseAvailable()) {
      const result = await query('SELECT * FROM orders WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Orden no encontrada' } });
      }
      return res.status(200).json({ success: true, data: result.rows[0] });
    }

    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Base de datos no disponible' } });
  } catch (error) {
    console.error('[GET /api/commands/:id] Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno' },
    });
  }
}
