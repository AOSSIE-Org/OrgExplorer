import React from 'react';
import { X, Mail, ExternalLink, User } from 'lucide-react';
import type { ContributorData } from './types';

interface ContributorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  contributors: ContributorData[];
}

export const ContributorModal: React.FC<ContributorModalProps> = ({ isOpen, onClose, title, contributors }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold dark:text-white">{title}</h2>
            <p className="text-sm text-gray-500">{contributors.length} contributors found</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contributors.map((c) => (
              <div key={c.name} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400">
                    {c.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm dark:text-gray-200">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.commits} commits</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                   <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-blue-500"><Mail className="w-4 h-4" /></button>
                   <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-blue-500"><ExternalLink className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 text-center">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
