import { Tool } from '../types';
import { Wrench, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface ToolsPanelProps {
  tools: Tool[];
}

export function ToolsPanel({ tools }: ToolsPanelProps) {
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-blue-600" />
          Herramientas Disponibles
        </h2>
        <p className="text-[10px] text-gray-400 mt-1">
          {tools.length} herramientas registradas
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {tool.status === 'available' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                {tool.status === 'busy' && <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />}
                {tool.status === 'error' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                {tool.status === 'disabled' && <XCircle className="w-3.5 h-3.5 text-gray-400" />}
                <span className="text-xs font-medium text-gray-800">{tool.name}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                tool.status === 'available' ? 'bg-green-50 text-green-700' :
                tool.status === 'busy' ? 'bg-yellow-50 text-yellow-700' :
                'bg-red-50 text-red-700'
              }`}>
                {tool.status}
              </span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1 ml-5">{tool.description}</p>
            <div className="flex flex-wrap gap-1 mt-2 ml-5">
              {tool.parameters.map((param) => (
                <span
                  key={param.name}
                  className={`text-[9px] px-1.5 py-0.5 rounded ${
                    param.required ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {param.name}{param.required ? '*' : ''}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
