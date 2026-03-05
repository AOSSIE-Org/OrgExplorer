import React from 'react';
import { Github, BarChart3, Shield, Zap, Search } from 'lucide-react';

interface HomeProps {
  onStart: () => void;
}

export const Home: React.FC<HomeProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center px-4 overflow-hidden relative">
      {/* Background blobs for aesthetic */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>

      <div className="max-w-4xl w-full text-center relative z-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold mb-8 border border-blue-100 dark:border-blue-800">
          <Github className="w-3.5 h-3.5" />
          <span>Open Source Analytics Platform</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 dark:from-white dark:via-blue-400 dark:to-white">
          Decode Your GitHub <br />
          <span className="text-blue-600 dark:text-blue-500">Organization's Pulse.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          The ultimate developer analytics dashboard. Transform raw GitHub data into actionable insights with beautiful visualizations, contributor activity tracking, and intelligent repository auditing.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <button 
            onClick={onStart}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg transition-all transform hover:scale-105 shadow-xl shadow-blue-500/25 flex items-center space-x-3"
          >
            <Search className="w-5 h-5" />
            <span>Start Exploring</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-bold text-lg mb-2">Deep Visuals</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">High-fidelity charts for languages, stars, issues, and PR analytics.</p>
          </div>
          <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-bold text-lg mb-2">Instant Sync</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Lightning-fast data fetching with local IndexedDB caching.</p>
          </div>
          <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-bold text-lg mb-2">Contributor ROI</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Identify top talent and track commit frequency across your organization.</p>
          </div>
        </div>
      </div>
      
      <div className="mt-20 text-gray-400 text-[10px] uppercase tracking-[0.2em] font-bold">
        Built for Modern Engineering Teams
      </div>
    </div>
  );
};
