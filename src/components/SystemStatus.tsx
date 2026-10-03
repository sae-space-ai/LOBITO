import { AgentEngineState } from '../core/engine';
import { Database, Server, Wrench, Shield, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { isDatabaseConfigured } from '../server/database';

interface SystemStatusProps {
  state: AgentEngineState;
}

export function SystemStatus({ state }: SystemStatusProps) {
  const dbConfigured = isDatabaseConfigured();
  const qwenStatus = state.qwenStatus;
  const toolsAvailable = state.tools.filter(t => t.status === 'available').length;
  const totalTools = state.tools.length;

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white">
      <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
        <Server className="w-4 h-4 text-blue-600" />
        Estado del Sistema
      </h3>

      <div className="space-y-2">
        {/* Qwen Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              qwenStatus.connected ? 'bg-green-500' : 
              qwenStatus.configured ? 'bg-yellow-500' : 'bg-red-400'
            }`} />
            <span className="text-xs text-gray-700">Qwen IA</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded ${
            qwenStatus.connected ? 'bg-green-50 text-green-700' :
            qwenStatus.configured ? 'bg-yellow-50 text-yellow-700' :
            'bg-red-50 text-red-600'
          }`}>
            {qwenStatus.connected ? 'Conectado' : 
             qwenStatus.configured ? 'Pendiente' : 'Sin configurar'}
          </span>
        </div>

        {/* Database Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${dbConfigured ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-xs text-gray-700">PostgreSQL</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded ${
            dbConfigured ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
          }`}>
            {dbConfigured ? 'Conectado' : 'Modo local'}
          </span>
        </div>

        {/* Tools Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              toolsAvailable === totalTools ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            <span className="text-xs text-gray-700">Herramientas</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700">
            {toolsAvailable}/{totalTools}
          </span>
        </div>

        {/* Security Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-gray-700">Seguridad</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-green-50 text-green-700">
            Activa
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-800">{state.orders.length}</p>
          <p className="text-[10px] text-gray-500">Órdenes</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-800">{state.operationLogs.length}</p>
          <p className="text-[10px] text-gray-500">Operaciones</p>
        </div>
      </div>
    </div>
  );
}
