// ============================================================
// SERVICIO DE BASE DE DATOS - Frontend
// El frontend NUNCA tiene credenciales de BD.
// Todas las operaciones pasan por el backend (/api/*).
// localStorage solo para preferencias de UI y estados temporales.
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { Order, OperationLog, MemoryEntry } from '../types';

const API_BASE = '/api';

// Detectar si el backend está disponible
let backendAvailable: boolean | null = null;

export async function checkBackendAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`, { method: 'GET' });
    backendAvailable = response.ok;
    return backendAvailable;
  } catch {
    backendAvailable = false;
    return false;
  }
}

export function isBackendAvailable(): boolean {
  return backendAvailable === true;
}

// ============================================================
// REPOSITORIO DE ÓRDENES
// ============================================================
export class OrderRepository {
  private readonly LOCAL_KEY = 'agent_orders_local';

  async create(order: Partial<Order>): Promise<Order> {
    // Intentar backend primero
    if (backendAvailable) {
      try {
        const response = await fetch(`${API_BASE}/commands`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: order.rawInput }),
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            return result.data as Order;
          }
        }
      } catch { /* fallback a local */ }
    }
    return this.createLocal(order);
  }

  async findById(id: string): Promise<Order | null> {
    if (backendAvailable) {
      try {
        const response = await fetch(`${API_BASE}/commands/${id}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) return result.data as Order;
        }
      } catch { /* fallback */ }
    }
    return this.findByIdLocal(id);
  }

  async findAll(limit = 100): Promise<Order[]> {
    if (backendAvailable) {
      try {
        const response = await fetch(`${API_BASE}/commands?limit=${limit}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) return result.data as Order[];
        }
      } catch { /* fallback */ }
    }
    return this.findAllLocal(limit);
  }

  // === Local (fallback) ===
  private createLocal(order: Partial<Order>): Order {
    const orders = this.getLocalOrders();
    const now = new Date().toISOString();
    const newOrder: Order = {
      id: order.id || uuidv4(),
      rawInput: order.rawInput || '',
      status: order.status || 'pending',
      createdAt: now,
      updatedAt: now,
      ...order,
    } as Order;
    orders.unshift(newOrder);
    this.saveLocalOrders(orders);
    return newOrder;
  }

  private findByIdLocal(id: string): Order | null {
    return this.getLocalOrders().find(o => o.id === id) || null;
  }

  private findAllLocal(limit: number): Order[] {
    return this.getLocalOrders().slice(0, limit);
  }

  private getLocalOrders(): Order[] {
    try {
      return JSON.parse(localStorage.getItem(this.LOCAL_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private saveLocalOrders(orders: Order[]): void {
    localStorage.setItem(this.LOCAL_KEY, JSON.stringify(orders.slice(-500)));
  }
}

// ============================================================
// REPOSITORIO DE LOGS
// ============================================================
export class LogRepository {
  private readonly LOCAL_KEY = 'agent_logs_local';

  async create(log: Omit<OperationLog, 'id'>): Promise<OperationLog> {
    const logs = this.getLocalLogs();
    const newLog: OperationLog = { ...log, id: uuidv4() };
    logs.push(newLog);
    this.saveLocalLogs(logs);
    return newLog;
  }

  async findByOrder(orderId: string): Promise<OperationLog[]> {
    return this.getLocalLogs().filter(l => l.orderId === orderId);
  }

  async findRecent(limit = 100): Promise<OperationLog[]> {
    return this.getLocalLogs().slice(-limit);
  }

  private getLocalLogs(): OperationLog[] {
    try {
      return JSON.parse(localStorage.getItem(this.LOCAL_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private saveLocalLogs(logs: OperationLog[]): void {
    localStorage.setItem(this.LOCAL_KEY, JSON.stringify(logs.slice(-1000)));
  }
}

// ============================================================
// REPOSITORIO DE MEMORIA (solo preferencias UI y datos temporales)
// ============================================================
export class MemoryRepository {
  private readonly LOCAL_KEY = 'agent_memory_local';

  async store(key: string, value: unknown, tags: string[] = []): Promise<MemoryEntry> {
    const entries = this.getLocalEntries();
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

    this.saveLocalEntries(entries);
    return entry;
  }

  async recall(key?: string): Promise<MemoryEntry[]> {
    const entries = this.getLocalEntries();
    if (!key) return entries;
    return entries.filter(e => 
      e.key.toLowerCase().includes(key.toLowerCase()) ||
      e.tags.some(t => t.toLowerCase().includes(key.toLowerCase()))
    );
  }

  async clear(): Promise<number> {
    const entries = this.getLocalEntries();
    const count = entries.length;
    this.saveLocalEntries([]);
    return count;
  }

  private getLocalEntries(): MemoryEntry[] {
    try {
      return JSON.parse(localStorage.getItem(this.LOCAL_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private saveLocalEntries(entries: MemoryEntry[]): void {
    localStorage.setItem(this.LOCAL_KEY, JSON.stringify(entries.slice(-200)));
  }
}

// Instancias singleton
export const orderRepository = new OrderRepository();
export const logRepository = new LogRepository();
export const memoryRepository = new MemoryRepository();
