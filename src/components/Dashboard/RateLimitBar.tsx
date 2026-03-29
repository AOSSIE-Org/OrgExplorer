import type { RateLimit } from '../../types';

interface Props {
  rateLimit: RateLimit;
}

function getColor(pct: number): string {
  if (pct > 0.5) return '#3fb950';
  if (pct > 0.2) return '#d29922';
  return '#f78166';
}

export default function RateLimitBar({ rateLimit }: Props) {
  const pct = rateLimit.limit > 0 ? rateLimit.remaining / rateLimit.limit : 0;
  const color = getColor(pct);
  const resetTime = new Date(rateLimit.reset * 1000).toLocaleTimeString();

  return (
    <div className="rate-limit-widget" title={`Resets at ${resetTime}`}>
      <span style={{ color }}>⬡</span>
      <span>
        <span style={{ color, fontWeight: 600 }}>{rateLimit.remaining.toLocaleString()}</span>
        <span style={{ opacity: 0.6 }}>/{rateLimit.limit.toLocaleString()}</span>
      </span>
      <div className="rate-limit-widget__bar">
        <div
          className="rate-limit-widget__fill"
          style={{ width: `${pct * 100}%`, background: color }}
        />
      </div>
      <span style={{ opacity: 0.6, fontSize: 11 }}>↺ {resetTime}</span>
    </div>
  );
}
