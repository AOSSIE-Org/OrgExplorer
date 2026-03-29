import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  variant?: 'blue' | 'green' | 'purple' | 'orange';
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function StatCard({ label, value, sub, icon, variant = 'blue' }: StatCardProps) {
  const displayValue = typeof value === 'number' ? formatNumber(value) : value;
  return (
    <div className={`stat-card stat-card--${variant}`}>
      <div className={`stat-card__icon stat-card__icon--${variant}`}>{icon}</div>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{displayValue}</div>
      {sub && <div className="stat-card__sub">{sub}</div>}
    </div>
  );
}
