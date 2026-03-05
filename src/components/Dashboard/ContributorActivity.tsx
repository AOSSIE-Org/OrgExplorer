import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface ActivityData {
  week: string;
  commits: number;
}

interface ContributorActivityProps {
  data: ActivityData[];
  name: string;
}

export const ContributorActivity: React.FC<ContributorActivityProps> = ({ data, name }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-[300px]">
      <h3 className="text-sm font-semibold mb-4 text-gray-800 dark:text-gray-100">
        Commit Activity for <span className="text-blue-500">{name}</span>
      </h3>
      <ResponsiveContainer width="100%" height="80%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis 
            dataKey="week" 
            tick={{ fontSize: 10 }} 
            stroke="#9ca3af"
          />
          <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              borderRadius: '8px', 
              border: 'none',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="commits" 
            stroke="#3b82f6" 
            strokeWidth={2} 
            dot={{ r: 3, fill: '#3b82f6' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
