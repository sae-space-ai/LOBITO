import { useState } from 'react';
import { useAgent } from './hooks/useAgent';
import { ChatInterface } from './components/ChatInterface';
import { TaskPanel } from './components/TaskPanel';
import { ToolsPanel } from './components/ToolsPanel';
import { Bot, PanelRightOpen, PanelRightClose, Cpu, Shield, Zap } from 'lucide-react';

type Tab = 'chat' | 'tools' | 'logs';

export default function App() {
  const { state, isProcessing, currentResult, submitOrder, clearHistory } = useAgent();
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Agente IA - Núcleo Operativo</h1>
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                v1.0.0
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Supervisión activa
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {state.tools.length} herramientas
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile tabs */}
          <div className="flex md:hidden bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                activeTab === 'chat' ? 'bg-white shadow text-blue-700' : 'text-gray-500'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                activeTab === 'tools' ? 'bg-white shadow text-blue-700' : 'text-gray-500'
              }`}
            >
              Tools
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                activeTab === 'logs' ? 'bg-white shadow text-blue-700' : 'text-gray-500'
              }`}
            >
              Logs
            </button>
          </div>

          {/* Desktop toggle */}
          <button
            onClick={() => setShowSidePanel(!showSidePanel)}
            className="hidden md:flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {showSidePanel ? (
              <>
                <PanelRightClose className="w-4 h-4" />
                <span>Ocultar panel</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="w-4 h-4" />
                <span>Mostrar panel</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat area (main) */}
        <div className={`flex-1 flex flex-col ${activeTab !== 'chat' ? 'hidden md:flex' : ''}`}>
          <ChatInterface
            onSubmit={async (input: string) => { await submitOrder(input); }}
            isProcessing={isProcessing}
            currentResult={currentResult}
            orders={state.orders}
          />
        </div>

        {/* Side panel */}
        <div className={`${
          showSidePanel ? 'w-80 lg:w-96' : 'w-0'
        } ${activeTab === 'chat' ? 'hidden md:block' : ''} border-l border-gray-200 bg-white overflow-hidden transition-all flex-shrink-0`}>
          {activeTab === 'tools' ? (
            <ToolsPanel tools={state.tools} />
          ) : (
            <TaskPanel
              orders={state.orders}
              logs={state.operationLogs}
              onClear={clearHistory}
            />
          )}
        </div>

        {/* Mobile tools view */}
        {activeTab === 'tools' && (
          <div className="flex-1 md:hidden">
            <ToolsPanel tools={state.tools} />
          </div>
        )}

        {/* Mobile logs view */}
        {activeTab === 'logs' && (
          <div className="flex-1 md:hidden">
            <TaskPanel
              orders={state.orders}
              logs={state.operationLogs}
              onClear={clearHistory}
            />
          </div>
        )}
      </div>

      {/* Footer status bar */}
      <footer className="bg-white border-t border-gray-200 px-4 py-1.5 flex items-center justify-between text-[10px] text-gray-400 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span>Órdenes: {state.orders.length}</span>
          <span>Operaciones: {state.operationLogs.length}</span>
          <span>Herramientas: {state.tools.filter(t => t.status === 'available').length}/{state.tools.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span>Sistema operativo</span>
        </div>
      </footer>
    </div>
  );
}
