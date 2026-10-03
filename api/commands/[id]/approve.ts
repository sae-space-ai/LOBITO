// ============================================================
// ENDPOINT: POST /api/commands/[id]/approve
// Aprobar o rechazar una orden pendiente
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, authorize } from '../../../src/server/lib/auth';
import { isDatabaseAvailable, query } from '../../../src/server/lib/database';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Solo POST' } });
  }

  const auth = authenticate(req.headers as Record<string, string>);
  if (!auth) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Autenticación requerida' } });
  }

  if (!authorize(auth, 'approve')) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Se requiere permiso de aprobación' } });
  }

  const id = req.query.id as string;
  if (!id) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'ID requerido' } });
  }

  const approved = req.body?.approved;
  if (typeof approved !== 'boolean') {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Campo "approved" (boolean) requerido' } });
  }

  const comment = typeof req.body?.comment === 'string' ? req.body.comment.substring(0, 500) : null;

  try {
    if (!isDatabaseAvailable()) {
      return res.status(503).json({ success: false, error: { code: 'DB_UNAVAILABLE', message: 'Base de datos no disponible' } });
    }

    // Verificar orden
    const orderResult = await query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Orden no encontrada' } });
    }

    const order = orderResult.rows[0];
    if (order.status !== 'awaiting_approval') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: 'La orden no está pendiente de aprobación' } });
    }

    // Registrar aprobación
    const newStatus = approved ? 'approved' : 'rejected';
    await query(
      `INSERT INTO approvals (id, order_id, requested_by, approved_by, status, approval_comment)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), id, order.user_id, auth.userId, newStatus, comment]
    );

    // Actualizar estado de la orden
    await query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
      [approved ? 'executing' : 'cancelled', id]
    );

    // Log de auditoría
    await query(
      `INSERT INTO operation_logs (id, order_id, user_id, tool, action, status, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [uuidv4(), id, auth.userId, 'engine', approved ? 'order_approved' : 'order_rejected', 'info', comment || (approved ? 'Aprobada' : 'Rechazada')]
    );

    return res.status(200).json({
      success: true,
      data: { id, status: approved ? 'executing' : 'cancelled', approved },
    });
  } catch (error) {
    console.error('[POST /api/commands/:id/approve] Error:', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno' } });
  }
}
