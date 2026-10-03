// ============================================================
// HERRAMIENTA: ALMACÉN DE MEMORIA
// Gestiona la memoria operativa del agente
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { TaskResult, Tool, MemoryEntry } from '../types';

const MEMORY_KEY = 'agent_memory';

function getMemory(): MemoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(MEMORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveMemory(entries: MemoryEntry[]): void {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(entries));
}

function storeInMemory(key: string, value: unknown, tags: string[] = []): MemoryEntry {
  const entries = getMemory();
  const existing = entries.findIndex(e => e.key === key);
  
  const entry: MemoryEntry = {
    id: uuidv4(),
    key,
    value,
    createdAt: new Date().toISOString(),
    tags,
  };

  if (existing >= 0) {
    entries[existing] = entry;
  } else {
    entries.push(entry);
  }

  saveMemory(entries);
  return entry;
}

function recallFromMemory(key?: string): MemoryEntry[] {
  const entries = getMemory();
  if (!key) return entries;
  return entries.filter(e => 
    e.key.toLowerCase().includes(key.toLowerCase()) ||
    e.tags.some(t => t.toLowerCase().includes(key.toLowerCase()))
  );
}

function clearMemory(): number {
  const entries = getMemory();
  const count = entries.length;
  saveMemory([]);
  return count;
}

export const memoryStoreTool: Tool = {
  id: 'memory_store',
  name: 'Almacén de Memoria',
  description: 'Gestiona la memoria operativa del agente: almacenar, recuperar y limpiar datos persistentes.',
  status: 'available',
  parameters: [
    { name: 'input', type: 'string', required: true, description: 'Instrucción de memoria' },
    { name: 'entities', type: 'array', required: false, description: 'Entidades para la operación' },
  ],
  execute: async (params: Record<string, unknown>): Promise<TaskResult> => {
    const startTime = Date.now();
    const input = ((params.input as string) || '').toLowerCase();

    // Detectar acción
    if (input.includes('limpiar') || input.includes('borrar memoria') || input.includes('clear')) {
      const count = clearMemory();
      return {
        taskId: uuidv4(),
        tool: 'memory_store',
        status: 'success',
        data: { action: 'clear', entriesRemoved: count },
        summary: `Memoria limpiada. ${count} entrada(s) eliminada(s).`,
        executedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
    }

    if (input.includes('recordar') || input.includes('guardar') || input.includes('almacenar') || input.includes('store')) {
      // Extraer lo que se quiere guardar
      const content = (params.input as string).replace(/recordar|guardar|almacenar|store|en memoria/gi, '').trim();
      const entry = storeInMemory(
        content.substring(0, 50) || `entry_${Date.now()}`,
        content,
        ['user_stored']
      );
      return {
        taskId: uuidv4(),
        tool: 'memory_store',
        status: 'success',
        data: { action: 'store', entry },
        summary: `Dato almacenado en memoria con ID: ${entry.id.substring(0, 8)}...`,
        executedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
    }

    // Por defecto: listar/recuperar
    const entries = recallFromMemory();
    return {
      taskId: uuidv4(),
      tool: 'memory_store',
      status: 'success',
      data: { action: 'recall', entries, totalEntries: entries.length },
      summary: `Memoria consultada: ${entries.length} entrada(s) almacenada(s).`,
      executedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  },
};
