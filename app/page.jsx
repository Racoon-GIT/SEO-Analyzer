'use client';

import { useState } from 'react';
import MultiAgentSystem from '@/components/MultiAgentSystem';
import GSCNavigator from '@/components/GSCNavigator';

export default function Home() {
  const [activeView, setActiveView] = useState('agents'); // 'agents' or 'gsc'
  const [gscData, setGscData] = useState(null);

  // When GSC Navigator completes, pass data to main system
  const handleGSCComplete = (data) => {
    setGscData(data);
    setActiveView('agents');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-dark-400 via-dark-100 to-dark-400">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-discovery to-strategist flex items-center justify-center text-2xl">
                🤖
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">
                  SEO Multi-Agent System
                </h1>
                <p className="text-sm text-gray-500">
                  Orchestratore AI per ottimizzazione e-commerce
                </p>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2 bg-white/5 p-1 rounded-lg">
              <button
                onClick={() => setActiveView('agents')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeView === 'agents'
                    ? 'bg-discovery/20 text-discovery border border-discovery/50'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🤖 Agenti SEO
              </button>
              <button
                onClick={() => setActiveView('gsc')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeView === 'gsc'
                    ? 'bg-gsc/20 text-gsc border border-gsc/50'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📊 GSC Navigator
              </button>
            </div>

            {/* Status indicator */}
            {gscData && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-400">Dati GSC caricati</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {activeView === 'agents' ? (
          <MultiAgentSystem gscData={gscData} />
        ) : (
          <GSCNavigator onComplete={handleGSCComplete} />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-auto py-4 text-center text-xs text-gray-600">
        <p>SEO Multi-Agent System v1.0 • Built for Racoon Lab</p>
      </footer>
    </main>
  );
}
