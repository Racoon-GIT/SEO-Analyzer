'use client';

import { useState, useRef, useEffect } from 'react';
import { GSC_ANALYSIS_FRAMEWORK } from '@/lib/agents';

export default function GSCNavigator({ onComplete }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [currentPhase, setCurrentPhase] = useState(0);
  const [currentQuery, setCurrentQuery] = useState(0);
  const [collectedData, setCollectedData] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add message helper
  const addMessage = (role, content, data = null) => {
    setMessages(prev => [...prev, { 
      id: Date.now(), 
      role, 
      content, 
      data,
      timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  // Start the conversation
  const startConversation = () => {
    setMessages([]);
    setCurrentPhase(0);
    setCurrentQuery(0);
    setCollectedData({});
    setIsComplete(false);
    
    addMessage('agent', `👋 Ciao! Sono il **GSC Navigator Agent**.

Ti guiderò attraverso un'analisi completa di Google Search Console per identificare:
- 🎯 Quick wins e opportunità immediate
- ⚠️ Problemi tecnici da risolvere
- 📈 Aree di crescita per il tuo e-commerce

L'analisi è divisa in **${GSC_ANALYSIS_FRAMEWORK.phases.length} fasi**. Per ogni fase ti chiederò dati specifici da GSC — tu dovrai solo:
1. Seguire le mie istruzioni
2. Esportare/copiare i dati
3. Incollarli qui

Pronto? Iniziamo! 🚀`);

    setTimeout(() => {
      askNextQuestion();
    }, 1500);
  };

  // Ask the next question in the sequence
  const askNextQuestion = () => {
    const phase = GSC_ANALYSIS_FRAMEWORK.phases[currentPhase];
    if (!phase) {
      generateFinalReport();
      return;
    }

    const query = phase.queries[currentQuery];
    if (!query) {
      // Move to next phase
      const nextPhaseIndex = currentPhase + 1;
      setCurrentPhase(nextPhaseIndex);
      setCurrentQuery(0);
      
      const nextPhase = GSC_ANALYSIS_FRAMEWORK.phases[nextPhaseIndex];
      if (nextPhase) {
        addMessage('agent', `✅ **Fase "${phase.name}" completata!**

---

Passiamo alla fase successiva: **${nextPhase.name}**
_${nextPhase.description}_`);
        
        setTimeout(() => {
          const nextQuery = nextPhase.queries[0];
          addMessage('agent', `📋 **${nextQuery.question}**

_Scopo: ${nextQuery.purpose}_`, { isQuestion: true, queryId: nextQuery.id });
        }, 1000);
      } else {
        generateFinalReport();
      }
      return;
    }

    // Ask this question
    if (currentQuery === 0 && currentPhase === 0) {
      // First question ever
      addMessage('agent', `## Fase 1: ${phase.name}
_${phase.description}_

---

📋 **${query.question}**

_Scopo: ${query.purpose}_`, { isQuestion: true, queryId: query.id });
    } else {
      addMessage('agent', `📋 **${query.question}**

_Scopo: ${query.purpose}_`, { isQuestion: true, queryId: query.id });
    }
  };

  // Analyze data via API
  const analyzeData = async (type, data) => {
    try {
      const response = await fetch('/api/analyze-gsc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data })
      });
      
      const result = await response.json();
      return result.success ? result.analysis : { error: result.error };
    } catch (error) {
      return { error: error.message };
    }
  };

  // Handle user input
  const handleSubmit = async () => {
    if (!input.trim()) return;
    
    const userInput = input.trim();
    setInput('');
    
    // Show truncated message for large data
    addMessage('user', userInput.length > 500 
      ? `[Dati incollati: ${userInput.split('\n').length} righe]` 
      : userInput
    );

    const phase = GSC_ANALYSIS_FRAMEWORK.phases[currentPhase];
    const query = phase?.queries[currentQuery];

    if (!query) {
      addMessage('agent', 'Grazie per il feedback! Vuoi continuare con l\'analisi o hai domande specifiche?');
      return;
    }

    setIsAnalyzing(true);

    // Analyze the data
    const analysis = await analyzeData(query.analysis, userInput);
    
    // Store the data
    setCollectedData(prev => ({
      ...prev,
      [query.id]: { raw: userInput, analysis }
    }));

    // Generate response based on analysis
    if (analysis.error) {
      addMessage('agent', `⚠️ Non sono riuscito a parsare i dati. Assicurati di:
- Esportare da GSC in formato TSV o CSV
- Includere l'header (prima riga con nomi colonne)
- Copiare tutte le righe

Riprova a incollare i dati, oppure scrivi "skip" per saltare questo step.`);
    } else {
      let response = `### 📊 Analisi\n\n`;
      
      if (analysis.insights) {
        response += analysis.insights.join('\n\n') + '\n\n';
      }

      // Show top data points based on analysis type
      if (analysis.data?.quickWins?.length > 0) {
        response += `**Top 5 Quick Wins (keyword in 2a pagina):**\n`;
        analysis.data.quickWins.slice(0, 5).forEach((q, i) => {
          response += `${i + 1}. "${q.query}" — pos. ${q.position.toFixed(1)}, ${q.impressions.toLocaleString()} impression\n`;
        });
        response += '\n';
      }

      if (analysis.data?.opportunities?.length > 0) {
        response += `**Top 5 CTR Opportunities:**\n`;
        analysis.data.opportunities.slice(0, 5).forEach((q, i) => {
          response += `${i + 1}. "${q.query}" — CTR ${q.ctr.toFixed(1)}%, ${q.impressions.toLocaleString()} impression\n`;
        });
        response += '\n';
      }

      if (analysis.data?.topByClicks?.length > 0) {
        response += `**Top 5 Query per Click:**\n`;
        analysis.data.topByClicks.slice(0, 5).forEach((q, i) => {
          response += `${i + 1}. "${q.query}" — ${q.clicks} click, pos. ${q.position.toFixed(1)}\n`;
        });
        response += '\n';
      }

      if (analysis.data?.underperforming?.length > 0) {
        response += `**Pagine Underperforming:**\n`;
        analysis.data.underperforming.slice(0, 5).forEach((p, i) => {
          const pageName = p.page.split('/').filter(Boolean).pop() || p.page;
          response += `${i + 1}. ${pageName} — CTR ${p.ctr.toFixed(1)}%\n`;
        });
      }

      addMessage('agent', response, { analysis });

      // Move to next question
      setCurrentQuery(q => q + 1);
      setTimeout(() => {
        askNextQuestion();
      }, 2000);
    }

    setIsAnalyzing(false);
  };

  // Handle skip
  const handleSkip = () => {
    setInput('');
    addMessage('user', '[Saltato]');
    addMessage('agent', '⏭️ Ok, saltiamo questo step. Possiamo tornarci dopo se vuoi.');
    setCurrentQuery(q => q + 1);
    setTimeout(() => {
      askNextQuestion();
    }, 1000);
  };

  // Generate final report
  const generateFinalReport = () => {
    setIsComplete(true);
    
    let report = `# 🎉 Analisi GSC Completata!

## Executive Summary

`;

    const dataPoints = Object.keys(collectedData).length;
    report += `Ho analizzato **${dataPoints} aree** del tuo Google Search Console.\n\n`;

    // Aggregate insights
    let totalQuickWins = 0;
    let totalCTROpps = 0;

    Object.entries(collectedData).forEach(([key, value]) => {
      if (value.analysis?.data?.quickWins) {
        totalQuickWins += value.analysis.data.quickWins.length;
      }
      if (value.analysis?.data?.opportunities) {
        totalCTROpps += value.analysis.data.opportunities.length;
      }
    });

    if (totalQuickWins > 0) {
      report += `### 🎯 Quick Wins Identificati: ${totalQuickWins}\n`;
      report += `Keyword in seconda pagina che con poco sforzo possono salire in prima.\n\n`;
    }

    if (totalCTROpps > 0) {
      report += `### ⚠️ CTR Opportunities: ${totalCTROpps}\n`;
      report += `Query con alto volume ma CTR basso — servono title/meta migliori.\n\n`;
    }

    report += `---

## Prossimi Passi

I dati raccolti verranno passati al **Technical Auditor Agent** per un'analisi approfondita.

Clicca il pulsante qui sotto per tornare al sistema principale e continuare con l'ottimizzazione.`;

    addMessage('agent', report, { isFinal: true });
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.toLowerCase().trim() === 'skip') {
        handleSkip();
      } else {
        handleSubmit();
      }
    }
  };

  // Calculate progress
  const totalQueries = GSC_ANALYSIS_FRAMEWORK.phases.reduce((a, p) => a + p.queries.length, 0);
  const completedQueries = GSC_ANALYSIS_FRAMEWORK.phases.slice(0, currentPhase).reduce((a, p) => a + p.queries.length, 0) + currentQuery;
  const progress = Math.round((completedQueries / totalQueries) * 100);

  // Render markdown-like content
  const renderContent = (content) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-lg font-semibold mt-4 mb-2 text-gsc">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-base font-semibold mt-3 mb-1">{line.slice(4)}</h3>;
      }
      if (line.startsWith('---')) {
        return <hr key={i} className="border-white/10 my-4" />;
      }
      if (line.match(/^\d+\./)) {
        return <p key={i} className="ml-4 my-0.5 text-gray-300">{line}</p>;
      }
      
      // Bold text
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const rendered = parts.map((part, j) => 
        j % 2 === 1 ? <strong key={j} className="text-white">{part}</strong> : part
      );
      
      // Italic text
      const withItalics = rendered.map((part, j) => {
        if (typeof part === 'string') {
          const italicParts = part.split(/_(.*?)_/g);
          return italicParts.map((ip, k) => 
            k % 2 === 1 ? <em key={`${j}-${k}`} className="text-gray-400">{ip}</em> : ip
          );
        }
        return part;
      });
      
      return <p key={i} className="my-1">{withItalics}</p>;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Progress Header */}
      {messages.length > 0 && (
        <div className="px-6 py-3 bg-black/20 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {GSC_ANALYSIS_FRAMEWORK.phases.map((phase, i) => {
                const isCompleted = i < currentPhase;
                const isCurrent = i === currentPhase && !isComplete;
                return (
                  <div
                    key={phase.id}
                    className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all ${
                      isCompleted
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : isCurrent
                        ? 'bg-gsc/20 text-gsc border border-gsc/50'
                        : 'bg-white/5 text-gray-500 border border-white/10'
                    }`}
                  >
                    {isCompleted ? '✓ ' : isCurrent ? '● ' : '○ '}
                    {phase.name}
                  </div>
                );
              })}
            </div>
            
            <div className="flex items-center gap-3 ml-4">
              <span className="text-sm text-gray-400">{progress}%</span>
              <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-gsc to-green-400 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-6">📊</div>
            <h2 className="text-xl font-semibold mb-3">
              Analisi Guidata di Google Search Console
            </h2>
            <p className="text-gray-400 max-w-md mb-8">
              Ti guiderò passo passo nell'estrazione e analisi dei dati GSC 
              per identificare opportunità di crescita e problemi da risolvere.
            </p>
            <button
              onClick={startConversation}
              className="px-8 py-4 bg-gradient-to-r from-gsc to-green-500 rounded-xl text-white font-semibold shadow-lg shadow-gsc/30 hover:shadow-gsc/50 transition-all"
            >
              🚀 Inizia Analisi GSC
            </button>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`message-bubble flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] px-5 py-4 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-gsc to-blue-600 rounded-br-sm'
                    : 'bg-white/5 border border-white/10 rounded-bl-sm'
                }`}
              >
                {msg.role === 'agent' && (
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                    <span>🤖 GSC Navigator</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>
                )}
                <div className="text-sm leading-relaxed">
                  {renderContent(msg.content)}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isAnalyzing && (
          <div className="flex items-center gap-3 px-5 py-3 bg-gsc/10 rounded-xl">
            <div className="spinner w-5 h-5 text-gsc" />
            <span className="text-sm text-gsc">Analizzando i dati...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input / Complete Actions */}
      {messages.length > 0 && (
        <div className="px-6 py-4 border-t border-white/10 bg-black/30">
          {isComplete ? (
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  const data = JSON.stringify(collectedData, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'gsc-analysis.json';
                  a.click();
                }}
                className="px-6 py-3 bg-white/5 border border-white/20 rounded-xl text-gray-300 hover:bg-white/10 transition-colors"
              >
                💾 Scarica Analisi
              </button>
              <button
                onClick={() => onComplete?.(collectedData)}
                className="px-6 py-3 bg-gradient-to-r from-gsc to-green-500 rounded-xl text-white font-semibold hover:shadow-lg hover:shadow-gsc/30 transition-all"
              >
                ✓ Continua con gli Agenti SEO
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Incolla qui i dati esportati da GSC... (o scrivi 'skip' per saltare)"
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm resize-none focus:border-gsc/50 transition-colors"
                  style={{ minHeight: '56px', maxHeight: '150px' }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || isAnalyzing}
                  className="px-6 py-3 bg-gradient-to-r from-gsc to-green-500 rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Invia
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500 flex gap-4">
                <span>💡 Esporta da GSC in formato TSV o CSV</span>
                <span>•</span>
                <span>Scrivi "skip" per saltare uno step</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
