import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { LanguageStat } from '../../types';

interface Props {
  languages: LanguageStat[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: LanguageStat }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0]!.payload;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius)',
      padding: '8px 12px',
      fontSize: 12,
    }}>
      <span style={{ color: item.color }}>● </span>
      <strong>{item.name}</strong>
      <span style={{ color: 'var(--fg-muted)' }}> — {item.percentage}% ({item.count} repos)</span>
    </div>
  );
}

export default function LanguageChart({ languages }: Props) {
  if (languages.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--fg-muted)', fontSize: 13 }}>
        No language data available
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={languages}
            dataKey="percentage"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={72}
            paddingAngle={2}
            strokeWidth={0}
          >
            {languages.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="language-legend">
        {languages.slice(0, 6).map((lang) => (
          <div key={lang.name} className="language-legend__item">
            <div className="language-legend__name">
              <span style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: lang.color,
                flexShrink: 0,
              }} />
              {lang.name}
            </div>
            <div className="language-legend__bar-wrap">
              <div
                className="language-legend__bar"
                style={{ width: `${lang.percentage}%`, background: lang.color }}
              />
            </div>
            <span className="language-legend__pct">{lang.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
