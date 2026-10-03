// ============================================================
// TIPOS BASE DEL AGENTE DE INTELIGENCIA ARTIFICIAL
// ============================================================

export type OrderStatus = 'pending' | 'interpreting' | 'planning' | 'executing' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type ToolStatus = 'available' | 'busy' | 'error' | 'disabled';

export type OperationStatus = 'success' | 'error' | 'warning' | 'info';

export interface Order {
  id: string;
  rawInput: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  interpretation?: Interpretation;
  plan?: Plan;
  results?: TaskResult[];
  errors?: OperationError[];
}

export interface Interpretation {
  intent: string;
  entities: Entity[];
  confidence: number;
  requiredTools: string[];
  needsApproval: boolean;
  approvalReason?: string;
}

export interface Entity {
  type: string;
  value: string;
  position: [number, number];
}

export interface Plan {
  id: string;
  orderId: string;
  tasks: Task[];
  createdAt: string;
  estimatedDuration?: number;
}

export interface Task {
  id: string;
  planId: string;
  orderId: string;
  name: string;
  description: string;
  tool: string;
  parameters: Record<string, unknown>;
  status: TaskStatus;
  priority: number;
  dependencies: string[];
  result?: TaskResult;
  startedAt?: string;
  completedAt?: string;
}

export interface TaskResult {
  taskId: string;
  tool: string;
  status: OperationStatus;
  data: unknown;
  summary: string;
  executedAt: string;
  duration: number;
}

export interface OperationError {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
  taskId?: string;
}

export interface OperationLog {
  id: string;
  orderId: string;
  taskId?: string;
  tool: string;
  action: string;
  status: OperationStatus;
  message: string;
  data?: unknown;
  timestamp: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  status: ToolStatus;
  parameters: ToolParameter[];
  execute: (params: Record<string, unknown>) => Promise<TaskResult>;
}

export interface ToolParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface AgentState {
  orders: Order[];
  currentOrderId: string | null;
  operationLogs: OperationLog[];
  tools: Tool[];
  memory: MemoryEntry[];
}

export interface MemoryEntry {
  id: string;
  key: string;
  value: unknown;
  createdAt: string;
  expiresAt?: string;
  tags: string[];
}

export interface ExportFormat {
  type: 'json' | 'csv' | 'text' | 'html';
  label: string;
  mimeType: string;
}
