import React from 'react'

export default function RadialGauge({ score, size = 80, strokeWidth = 7 }) {
  const center = size / 2
  const radius = center - strokeWidth
  const circumference = 2 * Math.PI * radius

  const validScore = typeof score === 'number' && !isNaN(score) ? Math.min(100, Math.max(0, score)) : null
  const offset = validScore !== null ? circumference - (validScore / 100) * circumference : circumference

  let color = 'var(--text3)'
  let bgStroke = 'var(--border)'

  if (validScore !== null) {
    if (validScore >= 70) color = 'var(--green, #22c55e)'
    else if (validScore >= 40) color = 'var(--amber, #f59e0b)'
    else color = 'var(--red, #ef4444)'
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={bgStroke}
          strokeWidth={strokeWidth}
        />
        {/* Foreground progress */}
        {validScore !== null && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
          />
        )}
      </svg>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 700, color: validScore !== null ? color : 'var(--text2)', lineHeight: 1 }}>
          {validScore !== null ? validScore : 'N/A'}
        </span>
        {validScore !== null && (
          <span style={{ fontSize: size * 0.13, color: 'var(--text3)', marginTop: 2, fontWeight: 500 }}>
            / 100
          </span>
        )}
      </div>
    </div>
  )
}
