import { Order, OperationLog } from '../types';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Trash2, Activity } from 'lucide-react';

interface TaskPanelProps {
  orders: Order[];
  logs: OperationLog[];
  onClear: () => void;
}

export function TaskPanel({ orders, logs, onClear }: TaskPanelProps) {
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const failedOrders = orders.filter(o => o.status === 'failed').length;
  const pendingOrders = orders.filter(o => ['pending', 'interpreting', 'planning', 'executing', 'awaiting_approval'].includes(o.status)).length;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Panel de Seguimiento
          </h2>
          {orders.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Limpiar
            </button>
          )}
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-green-700">{completedOrders}</p>
            <p className="text-[10px] text-green-600">Completadas</p>
          </div>
          <div className="bg-red-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-red-700">{failedOrders}</p>
            <p className="text-[10px] text-red-600">Fallidas</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-blue-700">{pendingOrders}</p>
            <p className="text-[10px] text-blue-600">En curso</p>
          </div>
        </div>
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Sin operaciones registradas</p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))
        )}
      </div>

      {/* Recent logs */}
      <div className="border-t border-gray-200 p-3">
        <h3 className="text-xs font-medium text-gray-600 mb-2">Operaciones recientes</h3>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {logs.slice(-5).reverse().map((log) => (
            <div key={log.id} className="flex items-center gap-2 text-[10px]">
              {log.status === 'success' && <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />}
              {log.status === 'error' && <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
              {log.status === 'warning' && <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
              {log.status === 'info' && <Clock className="w-3 h-3 text-blue-500 flex-shrink-0" />}
              <span className="text-gray-500 truncate">{log.message}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-[10px] text-gray-400">Sin registros</p>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const statusIcons: Record<string, React.ReactNode> = {
    completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    failed: <XCircle className="w-4 h-4 text-red-500" />,
    cancelled: <XCircle className="w-4 h-4 text-gray-400" />,
    awaiting_approval: <AlertTriangle className="w-4 h-4 text-orange-500" />,
    executing: <Activity className="w-4 h-4 text-purple-500 animate-pulse" />,
    planning: <Clock className="w-4 h-4 text-blue-500" />,
    interpreting: <Clock className="w-4 h-4 text-yellow-500" />,
    pending: <Clock className="w-4 h-4 text-gray-400" />,
  };

  const timeAgo = getTimeAgo(order.createdAt);

  return (
    <div className="border border-gray-100 rounded-lg p-2.5 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-2">
        {statusIcons[order.status]}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-800 truncate">
            {order.rawInput.substring(0, 60)}{order.rawInput.length > 60 ? '...' : ''}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-gray-400">{order.id.substring(0, 8)}</span>
            <span className="text-[10px] text-gray-300">•</span>
            <span className="text-[10px] text-gray-400">{timeAgo}</span>
            {order.interpretation && (
              <>
                <span className="text-[10px] text-gray-300">•</span>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                  {order.interpretation.intent.replace(/_/g, ' ')}
                </span>
              </>
            )}
          </div>
          {order.results && (
            <div className="mt-1">
              {order.results.map((r, i) => (
                <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded mr-1 ${
                  r.status === 'success' ? 'bg-green-50 text-green-700' :
                  r.status === 'error' ? 'bg-red-50 text-red-700' :
                  'bg-yellow-50 text-yellow-700'
                }`}>
                  {r.tool}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  
  if (diff < 60000) return 'ahora';
  if (diff < 3600000) return `hace ${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)}h`;
  return `hace ${Math.floor(diff / 86400000)}d`;
}
