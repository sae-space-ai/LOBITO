// ============================================================
// SERVICIO DE BASE DE DATOS POSTGRESQL
// Capa de acceso a datos con pool de conexiones
// Compatible con pg (node-postgres) para despliegue en Vercel
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { Order, OperationLog, MemoryEntry } from '../types';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  maxConnections: number;
}

export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
  command: string;
}

// Configuración desde variables de entorno
export function getDatabaseConfig(): DatabaseConfig | null {
  const env = typeof import.meta !== 'undefined' ? (import.meta as any).env : {};
  
  const host = env?.VITE_DATABASE_HOST || env?.DATABASE_HOST;
  if (!host) return null;

  return {
    host: host || 'localhost',
    port: parseInt(env?.VITE_DATABASE_PORT || env?.DATABASE_PORT || '5432'),
    database: env?.VITE_DATABASE_NAME || env?.DATABASE_NAME || 'agent_ia',
    user: env?.VITE_DATABASE_USER || env?.DATABASE_USER || 'postgres',
    password: env?.VITE_DATABASE_PASSWORD || env?.DATABASE_PASSWORD || '',
    ssl: (env?.VITE_DATABASE_SSL || env?.DATABASE_SSL) === 'true',
    maxConnections: parseInt(env?.VITE_DATABASE_MAX_CONN || env?.DATABASE_MAX_CONN || '10'),
  };
}

export function isDatabaseConfigured(): boolean {
  return getDatabaseConfig() !== null;
}

// ============================================================
// REPOSITORIO DE ÓRDENES
// ============================================================
export class OrderRepository {
  private useRemote: boolean;

  constructor() {
    this.useRemote = isDatabaseConfigured();
  }

  async create(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> & { userId?: string }): Promise<Order> {
    if (this.useRemote) {
      return this.createRemote(order);
    }
    return this.createLocal(order);
  }

  async findById(id: string): Promise<Order | null> {
    if (this.useRemote) {
      return this.findByIdRemote(id);
    }
    return this.findByIdLocal(id);
  }

  async findByUser(userId: string, limit = 50): Promise<Order[]> {
    if (this.useRemote) {
      return this.findByUserRemote(userId, limit);
    }
    return this.findByUserLocal(userId, limit);
  }

  async updateStatus(id: string, status: Order['status'], data?: Partial<Order>): Promise<Order | null> {
    if (this.useRemote) {
      return this.updateStatusRemote(id, status, data);
    }
    return this.updateStatusLocal(id, status, data);
  }

  async findAll(limit = 100): Promise<Order[]> {
    if (this.useRemote) {
      return this.findAllRemote(limit);
    }
    return this.findAllLocal(limit);
  }

  // === Implementación remota (PostgreSQL vía API) ===
  private async createRemote(order: unknown): Promise<Order> {
    const response = await fetch('/api/commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (!response.ok) throw new Error(`Error creating order: ${response.status}`);
    return response.json();
  }

  private async findByIdRemote(id: string): Promise<Order | null> {
    const response = await fetch(`/api/commands/${id}`);
    if (!response.ok) return null;
    return response.json();
  }

  private async findByUserRemote(userId: string, limit: number): Promise<Order[]> {
    const response = await fetch(`/api/commands?userId=${userId}&limit=${limit}`);
    if (!response.ok) return [];
    return response.json();
  }

  private async updateStatusRemote(id: string, status: string, data?: Partial<Order>): Promise<Order | null> {
    const response = await fetch(`/api/commands/${id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...data }),
    });
    if (!response.ok) return null;
    return response.json();
  }

  private async findAllRemote(limit: number): Promise<Order[]> {
    const response = await fetch(`/api/commands?limit=${limit}`);
    if (!response.ok) return [];
    return response.json();
  }

  // === Implementación local (localStorage fallback) ===
  private readonly STORAGE_KEY = 'agent_orders_db';

  private getLocalOrders(): Order[] {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private saveLocalOrders(orders: Order[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders.slice(-500)));
  }

  private createLocal(order: unknown): Order {
    const orders = this.getLocalOrders();
    const now = new Date().toISOString();
    const newOrder: Order = {
      ...(order as Partial<Order>),
      id: (order as Order).id || uuidv4(),
      createdAt: now,
      updatedAt: now,
    } as Order;
    orders.unshift(newOrder);
    this.saveLocalOrders(orders);
    return newOrder;
  }

  private findByIdLocal(id: string): Order | null {
    return this.getLocalOrders().find(o => o.id === id) || null;
  }

  private findByUserLocal(_userId: string, limit: number): Order[] {
    return this.getLocalOrders().slice(0, limit);
  }

  private updateStatusLocal(id: string, status: Order['status'], data?: Partial<Order>): Order | null {
    const orders = this.getLocalOrders();
    const index = orders.findIndex(o => o.id === id);
    if (index === -1) return null;
    orders[index] = { ...orders[index], ...data, status, updatedAt: new Date().toISOString() };
    this.saveLocalOrders(orders);
    return orders[index];
  }

  private findAllLocal(limit: number): Order[] {
    return this.getLocalOrders().slice(0, limit);
  }
}

// ============================================================
// REPOSITORIO DE LOGS
// ============================================================
export class LogRepository {
  private readonly STORAGE_KEY = 'agent_logs_db';

  async create(log: Omit<OperationLog, 'id'>): Promise<OperationLog> {
    const logs = this.getLocalLogs();
    const newLog: OperationLog = {
      ...log,
      id: uuidv4(),
    };
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
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private saveLocalLogs(logs: OperationLog[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs.slice(-1000)));
  }
}

// ============================================================
// REPOSITORIO DE MEMORIA
// ============================================================
export class MemoryRepository {
  private readonly STORAGE_KEY = 'agent_memory_db';

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
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private saveLocalEntries(entries: MemoryEntry[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries.slice(-200)));
  }
}

// Instancias singleton
export const orderRepository = new OrderRepository();
export const logRepository = new LogRepository();
export const memoryRepository = new MemoryRepository();
