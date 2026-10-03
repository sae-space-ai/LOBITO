// ============================================================
// HERRAMIENTA: EXPORTADOR
// Exporta datos en múltiples formatos (JSON, CSV, HTML, texto)
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { TaskResult, Tool } from '../types';

function toJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

function toCSV(data: unknown): string {
  if (Array.isArray(data)) {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0] as object);
    const rows = data.map(row => 
      headers.map(h => {
        const val = (row as Record<string, unknown>)[h];
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : String(val ?? '');
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }
  // Si no es array, convertir a single-row CSV
  const obj = data as Record<string, unknown>;
  const headers = Object.keys(obj);
  const values = headers.map(h => {
    const val = obj[h];
    return typeof val === 'string' && (val as string).includes(',') ? `"${val}"` : String(val ?? '');
  });
  return [headers.join(','), values.join(',')].join('\n');
}

function toHTML(data: unknown, title: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #1e40af; }
    pre { background: #f1f5f9; padding: 16px; border-radius: 8px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generado: ${new Date().toLocaleString('es-ES')}</p>
  <pre>${JSON.stringify(data, null, 2)}</pre>
</body>
</html>`;
}

function toPlainText(data: unknown): string {
  return `=== REPORTE DEL AGENTE IA ===
Fecha: ${new Date().toLocaleString('es-ES')}
${'='.repeat(40)}

${JSON.stringify(data, null, 2)}

${'='.repeat(40)}
Fin del reporte`;
}

export const exporterTool: Tool = {
  id: 'exporter',
  name: 'Exportador de Datos',
  description: 'Exporta datos y resultados en formatos JSON, CSV, HTML y texto plano.',
  status: 'available',
  parameters: [
    { name: 'input', type: 'string', required: true, description: 'Datos o instrucción de exportación' },
    { name: 'format', type: 'string', required: false, description: 'Formato: json, csv, html, text' },
  ],
  execute: async (params: Record<string, unknown>): Promise<TaskResult> => {
    const startTime = Date.now();
    const input = (params.input as string) || '';
    const format = ((params.format as string) || 'json').toLowerCase();

    // Obtener datos para exportar (órdenes recientes)
    let data: unknown;
    try {
      const orders = JSON.parse(localStorage.getItem('agent_orders') || '[]');
      const logs = JSON.parse(localStorage.getItem('agent_logs') || '[]');
      data = { orders: orders.slice(-10), logs: logs.slice(-20), exportedAt: new Date().toISOString() };
    } catch {
      data = { message: input, exportedAt: new Date().toISOString() };
    }

    let exported: string;
    let mimeType: string;

    switch (format) {
      case 'csv':
        exported = toCSV(data);
        mimeType = 'text/csv';
        break;
      case 'html':
        exported = toHTML(data, 'Reporte del Agente IA');
        mimeType = 'text/html';
        break;
      case 'text':
        exported = toPlainText(data);
        mimeType = 'text/plain';
        break;
      default:
        exported = toJSON(data);
        mimeType = 'application/json';
    }

    // Crear blob y URL para descarga
    const blob = new Blob([exported], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const filename = `agent_export_${Date.now()}.${format === 'text' ? 'txt' : format}`;

    return {
      taskId: uuidv4(),
      tool: 'exporter',
      status: 'success',
      data: { format, mimeType, filename, url, preview: exported.substring(0, 500), size: exported.length },
      summary: `Exportación completada en formato ${format.toUpperCase()}. Archivo: ${filename} (${exported.length} bytes)`,
      executedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  },
};
