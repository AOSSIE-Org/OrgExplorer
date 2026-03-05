import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PRChartProps {
  data: { name: string; value: number }[];
}

const COLORS = ['#22c55e', '#8b5cf6', '#ef4444']; // Green for open, Purple for merged, Red for closed

export const PRChart: React.FC<PRChartProps> = ({ data }) => {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 h-[400px]">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Pull Request Analytics</h3>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
             contentStyle={{ 
               backgroundColor: 'rgba(255, 255, 255, 0.9)', 
               borderRadius: '8px', 
               border: 'none',
               boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
             }}
          />
          <Legend 
            layout="horizontal" 
            verticalAlign="bottom" 
            align="center"
            wrapperStyle={{ paddingTop: '20px' }}
            tick={{ fill: '#9ca3af' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
