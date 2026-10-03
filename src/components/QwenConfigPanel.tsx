import { useState } from 'react';
import { QwenConnectionStatus } from '../core/qwenAdapter';
import { Settings, CheckCircle2, XCircle, AlertCircle, Loader2, Key, Globe, Cpu } from 'lucide-react';

interface QwenConfigPanelProps {
  status: QwenConnectionStatus;
  onConfigure: (config: { apiKey: string; endpoint?: string; model?: string }) => void;
  onHealthCheck: () => Promise<QwenConnectionStatus>;
}

export function QwenConfigPanel({ status, onConfigure, onHealthCheck }: QwenConfigPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');
  const [model, setModel] = useState('qwen-turbo');
  const [isChecking, setIsChecking] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSave = () => {
    if (!apiKey.trim()) return;
    onConfigure({ apiKey: apiKey.trim(), endpoint, model });
    setShowForm(false);
    setApiKey('');
  };

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
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <Settings className="w-3 h-3" />
          Configurar
        </button>
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
          {status.connected ? 'Conectado' : 
           status.configured ? 'Configurado - Verificar conexión' : 
           'Sin configurar'}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1 text-[10px] text-gray-500">
        <p><span className="font-medium">Modelo:</span> {status.model || 'No definido'}</p>
        <p><span className="font-medium">Endpoint:</span> {status.endpoint ? new URL(status.endpoint).hostname : 'No definido'}</p>
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
      {status.configured && (
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
      )}

      {/* Configuration form */}
      {showForm && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <div>
            <label className="text-[10px] font-medium text-gray-600 flex items-center gap-1">
              <Key className="w-3 h-3" /> API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-600 flex items-center gap-1">
              <Globe className="w-3 h-3" /> Endpoint
            </label>
            <input
              type="url"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-600">Modelo</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full mt-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="qwen-turbo">Qwen Turbo</option>
              <option value="qwen-plus">Qwen Plus</option>
              <option value="qwen-max">Qwen Max</option>
              <option value="qwen2.5-72b-instruct">Qwen 2.5 72B</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="flex-1 px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              Guardar
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
          </div>
          <p className="text-[9px] text-gray-400">
            Las credenciales se almacenan localmente. Para producción, configure VITE_QWEN_API_KEY en el servidor.
          </p>
        </div>
      )}
    </div>
  );
}
