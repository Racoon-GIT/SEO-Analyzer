'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AGENTS, WORKFLOW } from '@/lib/agents';

export default function MultiAgentSystem({ gscData }) {
  // State
  const [projectConfig, setProjectConfig] = useState({
    domain: 'racoon-lab.it',
    niche: 'scarpe personalizzate custom sneakers',
    brandName: 'Racoon Lab'
  });
  const [products, setProducts] = useState([]);
  const [agentStates, setAgentStates] = useState({});
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [results, setResults] = useState({});
  const [activeTab, setActiveTab] = useState('dashboard');
  const [totalTokens, setTotalTokens] = useState({ input: 0, output: 0 });

  const logsEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Add log entry
  const addLog = useCallback((agentId, message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('it-IT');
    setLogs(prev => [...prev, { timestamp, agentId, message, type }]);
  }, []);

  // Update agent state
  const updateAgentState = useCallback((agentId, state) => {
    setAgentStates(prev => ({ ...prev, [agentId]: state }));
  }, []);

  // Parse CSV file
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const parsed = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = values[i]?.replace(/"/g, '').trim() || '';
        });
        return obj;
      });
      
      setProducts(parsed);
      addLog('system', `✅ Caricati ${parsed.length} prodotti dal CSV`, 'success');
    };
    reader.readAsText(file);
  }, [addLog]);

  // Execute single agent via API
  const executeAgent = useCallback(async (agentId, context) => {
    const agent = AGENTS[agentId];
    updateAgentState(agentId, 'running');
    setCurrentAgent(agentId);
    addLog(agentId, `Avvio ${agent.name}...`, 'info');

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          context,
          projectConfig,
          products: (agentId === 'strategist' || agentId === 'contentWriter') ? products : null,
          gscData: agentId === 'technicalAuditor' ? gscData : null
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Errore sconosciuto');
      }

      updateAgentState(agentId, 'completed');
      addLog(agentId, `✅ ${agent.name} completato (${data.toolsUsed || 0} web search)`, 'success');
      
      // Track token usage
      if (data.usage) {
        setTotalTokens(prev => ({
          input: prev.input + (data.usage.inputTokens || 0),
          output: prev.output + (data.usage.outputTokens || 0)
        }));
      }

      return data.result;

    } catch (error) {
      updateAgentState(agentId, 'error');
      addLog(agentId, `❌ Errore: ${error.message}`, 'error');
      return null;
    }
  }, [projectConfig, products, gscData, addLog, updateAgentState]);

  // Run full workflow
  const runWorkflow = useCallback(async () => {
    setIsRunning(true);
    setLogs([]);
    setResults({});
    setAgentStates({});
    setTotalTokens({ input: 0, output: 0 });
    
    addLog('system', '🚀 Avvio workflow multi-agente...', 'info');

    const collectedResults = {};

    for (const step of WORKFLOW) {
      const { agentId, dependsOn } = step;
      
      // Gather results from dependencies
      const previousResults = {};
      for (const depId of dependsOn) {
        if (collectedResults[depId]) {
          previousResults[depId] = collectedResults[depId];
        }
      }

      // Execute agent
      const result = await executeAgent(agentId, { previousResults });
      
      if (result) {
        collectedResults[agentId] = result;
        setResults(prev => ({ ...prev, [agentId]: result }));
      }

      // Small delay between agents
      await new Promise(r => setTimeout(r, 1000));
    }

    setIsRunning(false);
    setCurrentAgent(null);
    addLog('system', '🎉 Workflow completato!', 'success');
  }, [executeAgent, addLog]);

  // Run single agent
  const runSingleAgent = useCallback(async (agentId) => {
    setIsRunning(true);
    addLog('system', `🔄 Esecuzione singola: ${AGENTS[agentId].name}`, 'info');
    
    const result = await executeAgent(agentId, { previousResults: results });
    
    if (result) {
      setResults(prev => ({ ...prev, [agentId]: result }));
    }
    
    setIsRunning(false);
    setCurrentAgent(null);
  }, [executeAgent, results, addLog]);

  // Export results
  const exportResults = useCallback(() => {
    const data = JSON.stringify(results, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seo-analysis-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  // Estimate cost
  const estimatedCost = ((totalTokens.input * 0.003 + totalTokens.output * 0.015) / 1000).toFixed(4);

  return (
    <div className="p-6">
      {/* Controls Bar */}
      <div className="flex items-center justify-between mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-competitor/20 border border-competitor/50 rounded-lg text-competitor text-sm hover:bg-competitor/30 transition-colors"
          >
            📄 Carica CSV Prodotti
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {products.length > 0 && (
            <span className="text-sm text-gray-400">
              {products.length} prodotti caricati
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {Object.keys(results).length > 0 && (
            <button
              onClick={exportResults}
              className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-gray-300 text-sm hover:bg-white/10 transition-colors"
            >
              💾 Esporta Risultati
            </button>
          )}
          
          <button
            onClick={runWorkflow}
            disabled={isRunning}
            className={`px-6 py-2 rounded-lg text-white text-sm font-semibold transition-all ${
              isRunning
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-discovery to-strategist hover:shadow-lg hover:shadow-discovery/25'
            }`}
          >
            {isRunning ? '⏳ In esecuzione...' : '🚀 Avvia Workflow Completo'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6">
        {['dashboard', 'config', 'results'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm capitalize transition-all ${
              activeTab === tab
                ? 'bg-discovery/20 text-discovery border border-discovery/50'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab === 'dashboard' && '📊 '}
            {tab === 'config' && '⚙️ '}
            {tab === 'results' && '📋 '}
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Panel - Main Content */}
        <div className="col-span-2">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              {/* Agent Pipeline */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <h2 className="text-lg font-semibold text-discovery mb-4">
                  🔄 Workflow Pipeline
                </h2>
                
                <div className="space-y-3">
                  {WORKFLOW.map(({ agentId }) => {
                    const agent = AGENTS[agentId];
                    const state = agentStates[agentId];
                    const isActive = currentAgent === agentId;
                    
                    return (
                      <div
                        key={agentId}
                        className={`agent-card flex items-center gap-4 p-4 rounded-xl transition-all ${
                          isActive
                            ? 'bg-white/10 border-2'
                            : 'bg-white/[0.02] border border-white/5 hover:border-white/20'
                        }`}
                        style={{ borderColor: isActive ? agent.color : undefined }}
                      >
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                          style={{ 
                            background: `linear-gradient(135deg, ${agent.color}33, ${agent.color}11)`,
                            border: `1px solid ${agent.color}44`
                          }}
                        >
                          {agent.icon}
                        </div>
                        
                        <div className="flex-1">
                          <div className="font-semibold" style={{ color: agent.color }}>
                            {agent.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {agent.description}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {state === 'running' && (
                            <div 
                              className="w-3 h-3 rounded-full animate-pulse"
                              style={{ backgroundColor: agent.color }}
                            />
                          )}
                          {state === 'completed' && (
                            <span className="text-green-400">✓</span>
                          )}
                          {state === 'error' && (
                            <span className="text-red-400">✗</span>
                          )}
                          
                          <button
                            onClick={() => runSingleAgent(agentId)}
                            disabled={isRunning}
                            className="px-3 py-1.5 text-xs rounded-lg border transition-all hover:bg-white/10 disabled:opacity-50"
                            style={{ 
                              borderColor: agent.color,
                              color: agent.color
                            }}
                          >
                            Esegui
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-discovery/10 border border-discovery/30 rounded-xl p-4">
                  <div className="text-3xl font-bold text-discovery">{products.length}</div>
                  <div className="text-xs text-gray-400 mt-1">Prodotti caricati</div>
                </div>
                <div className="bg-competitor/10 border border-competitor/30 rounded-xl p-4">
                  <div className="text-3xl font-bold text-competitor">{Object.keys(results).length}</div>
                  <div className="text-xs text-gray-400 mt-1">Agenti completati</div>
                </div>
                <div className="bg-strategist/10 border border-strategist/30 rounded-xl p-4">
                  <div className="text-3xl font-bold text-strategist">
                    {results.contentWriter?.optimized_products?.length || 0}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Contenuti ottimizzati</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="text-3xl font-bold text-gray-300">${estimatedCost}</div>
                  <div className="text-xs text-gray-400 mt-1">Costo API stimato</div>
                </div>
              </div>
            </div>
          )}

          {/* Config Tab */}
          {activeTab === 'config' && (
            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-discovery mb-4">
                ⚙️ Configurazione Progetto
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Dominio</label>
                  <input
                    type="text"
                    value={projectConfig.domain}
                    onChange={e => setProjectConfig(p => ({ ...p, domain: e.target.value }))}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-discovery/50 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Nicchia / Keywords Seed</label>
                  <input
                    type="text"
                    value={projectConfig.niche}
                    onChange={e => setProjectConfig(p => ({ ...p, niche: e.target.value }))}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-discovery/50 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Brand Name</label>
                  <input
                    type="text"
                    value={projectConfig.brandName}
                    onChange={e => setProjectConfig(p => ({ ...p, brandName: e.target.value }))}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-discovery/50 transition-colors"
                  />
                </div>

                {gscData && (
                  <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                      <span>✓</span>
                      <span className="font-semibold">Dati GSC caricati</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      I dati di Google Search Console sono stati importati dal GSC Navigator
                      e verranno utilizzati dall'agente Technical Auditor.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-discovery mb-4">
                📋 Risultati Agenti
              </h2>
              
              {Object.keys(results).length === 0 ? (
                <p className="text-gray-500">
                  Nessun risultato ancora. Avvia il workflow per vedere i risultati.
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(results).map(([agentId, result]) => {
                    const agent = AGENTS[agentId];
                    return (
                      <details
                        key={agentId}
                        className="bg-black/20 rounded-xl overflow-hidden"
                        style={{ border: `1px solid ${agent.color}33` }}
                      >
                        <summary 
                          className="px-4 py-3 cursor-pointer font-semibold flex items-center gap-2"
                          style={{ color: agent.color }}
                        >
                          <span>{agent.icon}</span>
                          <span>{agent.name}</span>
                        </summary>
                        <pre className="px-4 py-3 text-xs text-gray-400 overflow-auto max-h-96 border-t border-white/5">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </details>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Live Logs */}
        <div className="bg-black/40 rounded-xl border border-white/10 flex flex-col h-[600px]">
          <div className="px-4 py-3 border-b border-white/10 font-semibold text-gray-400 flex items-center gap-2">
            <span>📟</span>
            <span>Live Console</span>
            {isRunning && (
              <div className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            )}
          </div>
          
          <div className="flex-1 overflow-auto p-3 space-y-1">
            {logs.length === 0 ? (
              <p className="text-center text-gray-600 text-sm mt-8">
                I log appariranno qui...
              </p>
            ) : (
              logs.map((log, i) => {
                const agent = AGENTS[log.agentId];
                return (
                  <div
                    key={i}
                    className={`log-entry px-3 py-2 rounded-lg text-xs ${
                      log.type === 'error'
                        ? 'bg-red-500/10'
                        : log.type === 'success'
                        ? 'bg-green-500/10'
                        : 'bg-transparent'
                    }`}
                    style={{ borderLeft: `3px solid ${agent?.color || '#888'}` }}
                  >
                    <span className="text-gray-500">{log.timestamp}</span>
                    {' '}
                    <span style={{ color: agent?.color || '#888' }}>
                      [{log.agentId}]
                    </span>
                    {' '}
                    <span className="text-gray-300">{log.message}</span>
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
