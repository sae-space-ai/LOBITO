// ============================================================
// ENDPOINT: GET /api/tools
// Listar herramientas disponibles
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, authorize } from '../src/server/lib/auth';
import { isDatabaseAvailable, query } from '../src/server/lib/database';

const LOCAL_TOOLS = [
  { id: 'text_analyzer', name: 'Analizador de Texto', status: 'available', requiresApproval: false },
  { id: 'calculator', name: 'Calculadora y Estadísticas', status: 'available', requiresApproval: false },
  { id: 'knowledge_base', name: 'Base de Conocimiento', status: 'available', requiresApproval: false },
  { id: 'report_generator', name: 'Generador de Reportes', status: 'available', requiresApproval: false },
  { id: 'system_monitor', name: 'Monitor del Sistema', status: 'available', requiresApproval: false },
  { id: 'memory_store', name: 'Almacén de Memoria', status: 'available', requiresApproval: false },
  { id: 'exporter', name: 'Exportador de Datos', status: 'available', requiresApproval: false },
];

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

  try {
    if (isDatabaseAvailable()) {
      const result = await query('SELECT id, name, description, status, requires_approval FROM tool_registry ORDER BY name');
      return res.status(200).json({ success: true, data: result.rows });
    }

    return res.status(200).json({ success: true, data: LOCAL_TOOLS });
  } catch (error) {
    console.error('[GET /api/tools] Error:', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno' } });
  }
}
