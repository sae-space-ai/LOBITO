import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { Order } from '../types';

interface ChatInterfaceProps {
  onSubmit: (input: string) => Promise<void>;
  isProcessing: boolean;
  currentResult: Order | null;
  orders: Order[];
}

const EXAMPLE_ORDERS = [
  'Analiza el siguiente texto: La inteligencia artificial está transformando el mundo',
  'Calcula el promedio de 85, 92, 78, 95, 88',
  'Busca información sobre agentes autónomos',
  'Genera un reporte sobre seguridad en sistemas de IA',
  'Verifica el estado del sistema',
  'Muestra el historial de operaciones',
  'Recordar que el proyecto principal es el agente IA',
];

export function ChatInterface({ onSubmit, isProcessing, currentResult, orders }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [orders, currentResult]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    await onSubmit(input);
    setInput('');
    inputRef.current?.focus();
  };

  const handleExample = async (example: string) => {
    if (isProcessing) return;
    await onSubmit(example);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {orders.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Agente de IA - Núcleo Operativo</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
              Introduce una orden en lenguaje natural. El agente la interpretará, planificará su ejecución, 
              seleccionará las herramientas necesarias y devolverá resultados verificables.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg mx-auto">
              {EXAMPLE_ORDERS.slice(0, 4).map((example, i) => (
                <button
                  key={i}
                  onClick={() => handleExample(example)}
                  className="text-left text-xs p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-colors text-gray-600 hover:text-blue-700"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {orders.map((order) => (
          <div key={order.id} className="space-y-2">
            {/* User message */}
            <div className="flex items-start gap-3 justify-end">
              <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-br-sm max-w-[80%]">
                <p className="text-sm">{order.rawInput}</p>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            </div>

            {/* Agent response */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-sm max-w-[80%]">
                <OrderResponse order={order} />
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Procesando orden...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Introduce una orden..."
            disabled={isProcessing}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-sm"
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {EXAMPLE_ORDERS.slice(4).map((example, i) => (
            <button
              key={i}
              onClick={() => handleExample(example)}
              disabled={isProcessing}
              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full whitespace-nowrap transition-colors disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderResponse({ order }: { order: Order }) {
  const statusColors: Record<string, string> = {
    pending: 'text-gray-500',
    interpreting: 'text-yellow-600',
    planning: 'text-blue-600',
    executing: 'text-purple-600',
    awaiting_approval: 'text-orange-600',
    completed: 'text-green-600',
    failed: 'text-red-600',
    cancelled: 'text-gray-400',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    interpreting: 'Interpretando...',
    planning: 'Planificando...',
    executing: 'Ejecutando...',
    awaiting_approval: 'Esperando aprobación',
    completed: 'Completada',
    failed: 'Error',
    cancelled: 'Cancelada',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${statusColors[order.status]}`}>
          {statusLabels[order.status]}
        </span>
        <span className="text-xs text-gray-400">•</span>
        <span className="text-xs text-gray-400">{order.id.substring(0, 8)}</span>
      </div>

      {order.interpretation && (
        <div className="text-xs space-y-1">
          <p className="text-gray-600">
            <span className="font-medium">Intención:</span> {order.interpretation.intent.replace(/_/g, ' ')}
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Confianza:</span> {(order.interpretation.confidence * 100).toFixed(0)}%
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Herramientas:</span> {order.interpretation.requiredTools.join(', ')}
          </p>
          {order.interpretation.needsApproval && (
            <p className="text-orange-600 font-medium">
              ⚠️ {order.interpretation.approvalReason}
            </p>
          )}
        </div>
      )}

      {order.plan && (
        <div className="text-xs">
          <p className="text-gray-600">
            <span className="font-medium">Plan:</span> {order.plan.tasks.length} tarea(s)
          </p>
          <ul className="mt-1 space-y-0.5">
            {order.plan.tasks.map((task) => (
              <li key={task.id} className="text-gray-500 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  task.status === 'completed' ? 'bg-green-500' :
                  task.status === 'running' ? 'bg-blue-500 animate-pulse' :
                  task.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
                }`} />
                {task.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {order.results && order.results.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          {order.results.map((result, i) => (
            <div key={i} className="text-xs space-y-1">
              <p className={`font-medium ${result.status === 'success' ? 'text-green-700' : result.status === 'error' ? 'text-red-700' : 'text-yellow-700'}`}>
                {result.summary}
              </p>
              {result.data !== null && result.data !== undefined && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                    Ver datos completos
                  </summary>
                  <pre className="mt-1 p-2 bg-gray-50 rounded text-[10px] overflow-x-auto max-h-40 overflow-y-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {order.errors && order.errors.length > 0 && (
        <div className="text-xs text-red-600 mt-1">
          {order.errors.map((err, i) => (
            <p key={i}>❌ {err.message}</p>
          ))}
        </div>
      )}
    </div>
  );
}
