import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface IssueChartProps {
  data: { name: string; value: number }[];
}

const COLORS = ['#ef4444', '#10b981']; // Red for open, Green for closed

export const IssueChart: React.FC<IssueChartProps> = ({ data }) => {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 h-[400px]">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Issue Analytics</h3>
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
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
