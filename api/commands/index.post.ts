// ============================================================
// ENDPOINT: POST /api/commands
// Crear una nueva orden
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, authorize, validateInput } from '../../src/server/lib/auth';
import { isDatabaseAvailable, query, withTransaction } from '../../src/server/lib/database';
import { interpretOrder, isQwenConfigured } from '../../src/server/lib/qwen';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Solo POST' } });
  }

  // Autenticación
  const auth = authenticate(req.headers as Record<string, string>);
  if (!auth) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Autenticación requerida' } });
  }

  if (!authorize(auth, 'write')) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Permisos insuficientes' } });
  }

  // Validación
  const input = validateInput(req.body?.input);
  if (!input) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Campo "input" requerido (string, 1-10000 caracteres)' },
    });
  }

  const startTime = Date.now();
  const orderId = uuidv4();

  try {
    // Intentar con Qwen si está configurado
    let interpretation = null;
    let usedQwen = false;

    if (isQwenConfigured()) {
      interpretation = await interpretOrder(input);
      if (interpretation) usedQwen = true;
    }

    // Fallback al intérprete local (importado dinámicamente)
    if (!interpretation) {
      const { interpreter } = await import('../../src/core/interpreter');
      interpretation = interpreter.interpret(input);
    }

    // Persistir en PostgreSQL si está disponible
    if (isDatabaseAvailable()) {
      await query(
        `INSERT INTO orders (id, user_id, raw_input, status, interpretation, source, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, auth.userId, input, 'pending', JSON.stringify(interpretation), 'api', req.body?.priority || 1]
      );

      await query(
        `INSERT INTO operation_logs (id, order_id, user_id, tool, action, status, message)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuidv4(), orderId, auth.userId, 'engine', 'order_received', 'info', `Orden recibida: "${input.substring(0, 100)}"`]
      );
    }

    return res.status(201).json({
      success: true,
      data: {
        id: orderId,
        rawInput: input,
        status: interpretation?.needsApproval ? 'awaiting_approval' : 'pending',
        interpretation,
        usedQwen,
        createdAt: new Date().toISOString(),
      },
      meta: {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error('[POST /api/commands] Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Error interno' },
    });
  }
}
