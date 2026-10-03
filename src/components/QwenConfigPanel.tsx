import { useState } from 'react';
import { QwenConnectionStatus } from '../core/qwenAdapter';
import { Cpu, CheckCircle2, XCircle, AlertCircle, Loader2, Server, Shield } from 'lucide-react';

interface QwenConfigPanelProps {
  status: QwenConnectionStatus;
  onConfigure: (config: { apiKey: string; endpoint?: string; model?: string }) => void;
  onHealthCheck: () => Promise<QwenConnectionStatus>;
}

export function QwenConfigPanel({ status, onHealthCheck }: QwenConfigPanelProps) {
  const [isChecking, setIsChecking] = useState(false);

  const handleHealthCheck = async () => {
    setIsChecking(true);
    await onHealthCheck();
    setIsChecking(false);
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-600" />
          Motor Qwen (IA)
        </h3>
        <span className="text-[9px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">
          v3 Seguro
        </span>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 mb-3">
        {status.connected ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : status.configured ? (
          <AlertCircle className="w-4 h-4 text-yellow-500" />
        ) : (
          <XCircle className="w-4 h-4 text-red-400" />
        )}
        <span className={`text-xs font-medium ${
          status.connected ? 'text-green-700' : 
          status.configured ? 'text-yellow-700' : 'text-red-600'
        }`}>
          {status.connected ? 'Conectado vía backend' : 
           status.configured ? 'Configurado - Verificar conexión' : 
           'Sin configurar en el servidor'}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1 text-[10px] text-gray-500">
        <p><span className="font-medium">Modelo:</span> {status.model || 'No definido'}</p>
        <p><span className="font-medium">Endpoint:</span> {status.endpoint || 'No definido'}</p>
        {status.lastCheck && (
          <p><span className="font-medium">Última verificación:</span> {new Date(status.lastCheck).toLocaleTimeString()}</p>
        )}
        {status.error && (
          <p className="text-red-500 mt-1 p-1.5 bg-red-50 rounded">
            ⚠️ {status.error}
          </p>
        )}
      </div>

      {/* Health check button */}
      <button
        onClick={handleHealthCheck}
        disabled={isChecking}
        className="mt-3 w-full px-3 py-1.5 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50 flex items-center justify-center gap-1"
      >
        {isChecking ? (
          <><Loader2 className="w-3 h-3 animate-spin" /> Verificando...</>
        ) : (
          <>Verificar conexión</>
        )}
      </button>

      {/* Security notice */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-[10px] text-gray-600 space-y-1">
            <p className="font-medium text-green-700">Seguridad activa</p>
            <p>Las credenciales de Qwen están <strong>exclusivamente en el servidor</strong> (variable QWEN_API_KEY). Nunca se exponen al navegador.</p>
            <p className="flex items-center gap-1 text-gray-500">
              <Server className="w-3 h-3" />
              Configure en el servidor: <code className="bg-gray-100 px-1 rounded">QWEN_API_KEY</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
