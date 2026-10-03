// ============================================================
// ENDPOINT: GET /api/health
// Estado de salud del sistema
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { healthCheck as dbHealth } from '../src/server/lib/database';
import { healthCheck as qwenHealth } from '../src/server/lib/qwen';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();

  try {
    const [dbStatus, qwenStatus] = await Promise.all([
      dbHealth(),
      qwenHealth(),
    ]);

    const overallHealthy = dbStatus.connected || qwenStatus.connected;

    return res.status(overallHealthy ? 200 : 503).json({
      success: true,
      data: {
        status: overallHealthy ? 'healthy' : 'degraded',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        components: {
          api: { status: 'operational', latency: Date.now() - startTime },
          database: {
            status: dbStatus.connected ? 'operational' : 'unavailable',
            latency: dbStatus.latency,
            version: dbStatus.version,
          },
          qwen: {
            status: qwenStatus.connected ? 'operational' : qwenStatus.configured ? 'degraded' : 'unconfigured',
            configured: qwenStatus.configured,
            connected: qwenStatus.connected,
            model: qwenStatus.model,
            latency: qwenStatus.latency,
          },
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error('[GET /api/health] Error:', error);
    return res.status(500).json({
      success: false,
      data: { status: 'error', timestamp: new Date().toISOString() },
      error: { code: 'HEALTH_CHECK_FAILED', message: 'Error en verificación de salud' },
    });
  }
}
