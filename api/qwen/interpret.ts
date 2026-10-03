// ============================================================
// ENDPOINT: POST /api/qwen/interpret
// PROXY SEGURO: El frontend NUNCA llama directamente a Qwen.
// La API key está SOLO en el servidor (QWEN_API_KEY).
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, authorize, validateInput } from '../../src/server/lib/auth';
import { interpretOrder, isQwenConfigured, healthCheck as qwenHealth } from '../../src/server/lib/qwen';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Health check (GET)
  if (req.method === 'GET') {
    const health = await qwenHealth();
    // IMPORTANTE: NUNCA devolver la API key al cliente
    return res.status(200).json({
      success: true,
      data: {
        configured: health.configured,
        connected: health.connected,
        model: health.model,
        latency: health.latency,
        error: health.error,
      },
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Solo POST o GET' } });
  }

  // Autenticación
  const auth = authenticate(req.headers as Record<string, string>);
  if (!auth) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Autenticación requerida' } });
  }

  if (!authorize(auth, 'execute')) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Permisos insuficientes' } });
  }

  // Validación
  const input = validateInput(req.body?.input);
  if (!input) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Campo "input" requerido' },
    });
  }

  // Verificar que Qwen está configurado
  if (!isQwenConfigured()) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'QWEN_NOT_CONFIGURED',
        message: 'El motor Qwen no está configurado en el servidor. Configure QWEN_API_KEY.',
      },
    });
  }

  const startTime = Date.now();

  try {
    const interpretation = await interpretOrder(input);

    if (!interpretation) {
      return res.status(502).json({
        success: false,
        error: { code: 'QWEN_ERROR', message: 'Qwen no devolvió una respuesta válida' },
      });
    }

    // IMPORTANTE: NUNCA incluir la API key, headers sensibles o tokens en la respuesta
    return res.status(200).json({
      success: true,
      data: {
        intent: interpretation.intent,
        entities: interpretation.entities,
        confidence: interpretation.confidence,
        requiredTools: interpretation.requiredTools,
        needsApproval: interpretation.needsApproval,
        approvalReason: interpretation.approvalReason,
        plan: interpretation.plan,
        // NO incluir rawResponse completo para evitar fuga de información del modelo
        processedAt: new Date().toISOString(),
      },
      meta: {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        model: 'qwen', // No exponer el nombre exacto del modelo
      },
    });
  } catch (error) {
    console.error('[POST /api/qwen/interpret] Error:', error);
    
    // NO exponer detalles internos del error al cliente
    const message = error instanceof Error ? error.message : 'Error interno';
    const safeMessage = message.includes('API Error') 
      ? 'Error en el servicio de IA. Intente nuevamente.'
      : message.includes('Timeout')
      ? 'El servicio de IA tardó demasiado en responder.'
      : 'Error interno del servidor';

    return res.status(500).json({
      success: false,
      error: { code: 'QWEN_ERROR', message: safeMessage },
    });
  }
}
