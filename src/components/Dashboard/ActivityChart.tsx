import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { RepoData } from '../../types';

interface Props {
  repos: RepoData[];
}

interface MonthPoint {
  month: string;
  repos: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildActivityData(repos: RepoData[]): MonthPoint[] {
  // Build last 7 months of "repos updated" counts
  const now = new Date();
  const months: MonthPoint[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: MONTH_NAMES[d.getMonth()]!,
      repos: 0,
    });
  }

  repos.forEach((repo) => {
    const updated = new Date(repo.updated_at);
    const monthsAgo =
      (now.getFullYear() - updated.getFullYear()) * 12 +
      (now.getMonth() - updated.getMonth());

    if (monthsAgo >= 0 && monthsAgo < 7) {
      const idx = 6 - monthsAgo;
      if (months[idx]) {
        months[idx].repos += 1;
      }
    }
  });

  return months;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius)',
      padding: '10px 14px',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--fg-muted)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function ActivityChart({ repos }: Props) {
  const data = buildActivityData(repos);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
        <XAxis
          dataKey="month"
          tick={{ fill: 'var(--fg-subtle)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--fg-subtle)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value) => <span style={{ color: 'var(--fg-muted)' }}>{value}</span>}
        />
        <Line
          type="monotone"
          dataKey="repos"
          name="Updated Repos"
          stroke="#58a6ff"
          strokeWidth={2}
          dot={{ fill: '#58a6ff', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
