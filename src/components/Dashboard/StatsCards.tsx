import React from 'react';
import { 
  Star, 
  GitFork, 
  Code2, 
  BookOpen, 
  GitPullRequest, 
  Bug 
} from 'lucide-react';
import type { OrgStats } from './types';

interface StatsCardsProps {
  stats: OrgStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    { 
      title: 'Total Repositories', 
      value: stats.totalRepos, 
      icon: BookOpen, 
      color: 'text-blue-500', 
      bg: 'bg-blue-50' 
    },
    { 
      title: 'Total Stars', 
      value: stats.totalStars.toLocaleString(), 
      icon: Star, 
      color: 'text-yellow-500', 
      bg: 'bg-yellow-50' 
    },
    { 
      title: 'Total Forks', 
      value: stats.totalForks.toLocaleString(), 
      icon: GitFork, 
      color: 'text-purple-500', 
      bg: 'bg-purple-50' 
    },
    { 
      title: 'Open Issues', 
      value: stats.totalOpenIssues.toLocaleString(), 
      icon: Bug, 
      color: 'text-red-500', 
      bg: 'bg-red-50' 
    },
    { 
      title: 'Pull Requests', 
      value: stats.totalPRs.toLocaleString(), 
      icon: GitPullRequest, 
      color: 'text-green-500', 
      bg: 'bg-green-50' 
    },
    { 
      title: 'Languages Used', 
      value: stats.languageCount, 
      icon: Code2, 
      color: 'text-indigo-500', 
      bg: 'bg-indigo-50' 
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
      {cards.map((card) => (
        <div key={card.title} className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center space-x-4 transition-colors">
          <div className={`${card.bg} dark:bg-gray-800 p-3 rounded-lg`}>
            <card.icon className={`w-6 h-6 ${card.color}`} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.title}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
