import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import type { Repository } from './types';

interface RepoTableProps {
  repos: Repository[];
}

type SortKey = 'stargazers_count' | 'forks_count' | 'updated_at';

export const RepoTable: React.FC<RepoTableProps> = ({ repos }) => {
  const [sortKey, setSortKey] = useState<SortKey>('stargazers_count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedRepos = [...repos].sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];

    if (sortKey === 'updated_at') {
      valA = new Date(valA as string).getTime();
      valB = new Date(valB as string).getTime();
    }

    if (valA! < valB!) return sortOrder === 'asc' ? -1 : 1;
    if (valA! > valB!) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
      <div className="p-6 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Repositories</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-6 py-4 font-semibold">Repository</th>
              <th 
                className="px-6 py-4 font-semibold cursor-pointer"
                onClick={() => handleSort('stargazers_count')}
              >
                <div className="flex items-center space-x-1">
                  <span>Stars</span>
                  <SortIcon column="stargazers_count" />
                </div>
              </th>
              <th 
                className="px-6 py-4 font-semibold cursor-pointer"
                onClick={() => handleSort('forks_count')}
              >
                <div className="flex items-center space-x-1">
                  <span>Forks</span>
                  <SortIcon column="forks_count" />
                </div>
              </th>
              <th className="px-6 py-4 font-semibold">Language</th>
              <th className="px-6 py-4 font-semibold">Open Issues</th>
              <th 
                className="px-6 py-4 font-semibold cursor-pointer"
                onClick={() => handleSort('updated_at')}
              >
                <div className="flex items-center space-x-1">
                  <span>Last Updated</span>
                  <SortIcon column="updated_at" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {sortedRepos.map((repo) => (
              <tr key={repo.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4">
                  <a 
                    href={repo.html_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-medium hover:underline"
                  >
                    <span className="text-sm">{repo.name}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{repo.stargazers_count.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{repo.forks_count.toLocaleString()}</td>
                <td className="px-6 py-4">
                  {repo.language ? (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] rounded-full">
                      {repo.language}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{repo.open_issues_count}</td>
                <td className="px-6 py-4 text-gray-400 text-xs">
                  {new Date(repo.updated_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
