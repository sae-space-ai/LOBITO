import { useState } from 'react';
import { useAgent } from './hooks/useAgent';
import { ChatInterface } from './components/ChatInterface';
import { TaskPanel } from './components/TaskPanel';
import { ToolsPanel } from './components/ToolsPanel';
import { QwenConfigPanel } from './components/QwenConfigPanel';
import { SystemStatus } from './components/SystemStatus';
import { Bot, PanelRightOpen, PanelRightClose, Cpu, Shield, Zap, Database } from 'lucide-react';

type SideTab = 'status' | 'tools' | 'logs';

export default function App() {
  const { state, isProcessing, currentResult, submitOrder, clearHistory, configureQwen, checkQwenHealth } = useAgent();
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [activeTab, setActiveTab] = useState<SideTab>('status');

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Agente IA - Núcleo Operativo v2</h1>
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                Qwen {state.qwenStatus.connected ? '●' : state.qwenStatus.configured ? '◐' : '○'}
              </span>
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                {state.qwenStatus.configured ? 'PG Ready' : 'Local'}
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Supervisión activa
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {state.tools.filter(t => t.status === 'available').length}/{state.tools.length} tools
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop toggle */}
          <button
            onClick={() => setShowSidePanel(!showSidePanel)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {showSidePanel ? (
              <>
                <PanelRightClose className="w-4 h-4" />
                <span className="hidden sm:inline">Ocultar</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Panel</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat area (main) */}
        <div className="flex-1 flex flex-col">
          <ChatInterface
            onSubmit={async (input: string) => { await submitOrder(input); }}
            isProcessing={isProcessing}
            currentResult={currentResult}
            orders={state.orders}
          />
        </div>

        {/* Side panel */}
        <div className={`${
          showSidePanel ? 'w-80 lg:w-[22rem]' : 'w-0'
        } border-l border-gray-200 bg-gray-50 overflow-hidden transition-all flex-shrink-0 flex flex-col`}>
          {/* Side panel tabs */}
          <div className="flex border-b border-gray-200 bg-white">
            <button
              onClick={() => setActiveTab('status')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'status' 
                  ? 'text-blue-700 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Estado
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'tools' 
                  ? 'text-blue-700 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Herramientas
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'logs' 
                  ? 'text-blue-700 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Registro
            </button>
          </div>

          {/* Side panel content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {activeTab === 'status' && (
              <>
                <QwenConfigPanel
                  status={state.qwenStatus}
                  onConfigure={configureQwen}
                  onHealthCheck={checkQwenHealth}
                />
                <SystemStatus state={state} />
              </>
            )}
            {activeTab === 'tools' && (
              <ToolsPanel tools={state.tools} />
            )}
            {activeTab === 'logs' && (
              <TaskPanel
                orders={state.orders}
                logs={state.operationLogs}
                onClear={clearHistory}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer status bar */}
      <footer className="bg-white border-t border-gray-200 px-4 py-1.5 flex items-center justify-between text-[10px] text-gray-400 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span>Órdenes: {state.orders.length}</span>
          <span>Logs: {state.operationLogs.length}</span>
          <span>Motor: {state.qwenStatus.connected ? 'Qwen' : state.qwenStatus.configured ? 'Qwen (offline)' : 'Local'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${
            state.qwenStatus.connected ? 'bg-green-500' : 'bg-yellow-500'
          } animate-pulse`} />
          <span>{state.qwenStatus.connected ? 'Qwen activo' : 'Modo local'}</span>
        </div>
      </footer>
    </div>
  );
}
