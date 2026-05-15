import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { fetchRepoDetail, getRepoHealth, getLanguageColor } from '../../lib/github';
import { useApp } from '../../context/AppContext';
import type { RepoData, RepoDetailData, RepoHealth } from '../../types';

interface Props {
  repo: RepoData;
  orgName: string;
  onClose: () => void;
}

const HEALTH_STYLE: Record<RepoHealth, { bg: string; text: string; label: string }> = {
  active: { bg: 'rgba(63,185,80,0.15)',  text: '#3fb950', label: 'Active' },
  stale:  { bg: 'rgba(210,153,34,0.15)', text: '#d2961e', label: 'Stale'  },
  dead:   { bg: 'rgba(248,81,73,0.15)',  text: '#f85149', label: 'Dead'   },
};

type PanelTab = 'activity' | 'contributors' | 'languages';

function formatWeekTick(unix: number): string {
  const d = new Date(unix * 1000);
  const prev = new Date((unix - 604800) * 1000);
  if (d.getMonth() !== prev.getMonth()) {
    return d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
  }
  return '';
}

function formatWeekLabel(unix: number): string {
  const d = new Date(unix * 1000);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function TooltipBox({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--fg-muted)', marginBottom: 4 }}>{typeof label === 'number' ? formatWeekLabel(label) : label}</div>
      <div style={{ color: '#3fb950', fontWeight: 700 }}>{payload[0]?.value ?? 0} commits</div>
    </div>
  );
}

export default function RepoDetailPanel({ repo, orgName, onClose }: Props) {
  const { token, incrementApiCallCount } = useApp();
  const [detail, setDetail] = useState<RepoDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<PanelTab>('activity');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const health = getRepoHealth(repo);
  const hs = HEALTH_STYLE[health];

  useEffect(() => {
    setLoading(true);
    setError(null);
    setDetail(null);
    setSelectedYear(null);

    fetchRepoDetail(orgName, repo.name, token ?? '', incrementApiCallCount)
      .then((d) => {
        setDetail(d);
        // Auto-select the most recent year with data
        if (d.commitWeeks.length > 0) {
          const maxYear = Math.max(...d.commitWeeks.map((w) => new Date(w.week * 1000).getFullYear()));
          setSelectedYear(maxYear);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [orgName, repo.name, token, incrementApiCallCount]);

  // All commit data as raw unix timestamps
  const allCommitData = detail?.commitWeeks.map((w) => ({
    week: w.week,
    commits: w.total,
  })) ?? [];

  // Available years from the data
  const availableYears = Array.from(
    new Set(allCommitData.map((w) => new Date(w.week * 1000).getFullYear()))
  ).sort((a, b) => a - b);

  // Filtered to selected year (or all if null)
  const commitData = selectedYear != null
    ? allCommitData.filter((w) => new Date(w.week * 1000).getFullYear() === selectedYear)
    : allCommitData;

  // language pie data
  const langTotal = Object.values(detail?.languages ?? {}).reduce((a, b) => a + b, 0) || 1;
  const langData = Object.entries(detail?.languages ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, bytes]) => ({
      name,
      value: bytes,
      pct: Math.round((bytes / langTotal) * 100),
      color: getLanguageColor(name),
    }));

  const panelTabs: Array<{ id: PanelTab; label: string }> = [
    { id: 'activity',     label: 'Commit Activity' },
    { id: 'contributors', label: 'Contributors'    },
    { id: 'languages',    label: 'Languages'       },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          zIndex: 1000, animation: 'fadeIn 0.15s ease',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 520, background: 'var(--bg-overlay, #161b22)',
        borderLeft: '1px solid var(--border-default)',
        zIndex: 1001, overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.2s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex', alignItems: 'flex-start', gap: 12,
          position: 'sticky', top: 0, background: 'var(--bg-overlay, #161b22)', zIndex: 1,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <a
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
                style={{ fontWeight: 700, fontSize: 17, color: 'var(--accent)', textDecoration: 'none' }}
              >
                {repo.name}
              </a>
              <span style={{
                background: hs.bg, color: hs.text,
                border: `1px solid ${hs.text}40`,
                borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 600,
              }}>
                {hs.label}
              </span>
              {repo.archived && (
                <span style={{ fontSize: 10, color: 'var(--fg-muted)', border: '1px solid var(--border-default)', borderRadius: 4, padding: '2px 6px' }}>archived</span>
              )}
            </div>
            {repo.description && (
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6, lineHeight: 1.5 }}>
                {repo.description}
              </div>
            )}
            {/* Topics */}
            {repo.topics && repo.topics.length > 0 && (
              <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                {repo.topics.map((t) => (
                  <span key={t} style={{
                    fontSize: 10, background: 'rgba(56,139,253,0.1)', color: 'var(--accent)',
                    border: '1px solid rgba(56,139,253,0.3)', borderRadius: 10, padding: '1px 7px',
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
            {/* Stat row */}
            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: 'var(--fg-muted)' }}>
              <span>⭐ {repo.stargazers_count.toLocaleString()}</span>
              <span>🍴 {repo.forks_count.toLocaleString()}</span>
              <span>🐛 {repo.open_issues_count.toLocaleString()} issues</span>
              {repo.language && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: getLanguageColor(repo.language), display: 'inline-block' }} />
                  {repo.language}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none', border: '1px solid var(--border-default)',
              borderRadius: 6, color: 'var(--fg-muted)', cursor: 'pointer',
              padding: '4px 8px', fontSize: 16, lineHeight: 1, flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Sub-tabs */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: '1px solid var(--border-default)',
          padding: '0 24px', flexShrink: 0,
        }}>
          {panelTabs.map((pt) => (
            <button
              key={pt.id}
              onClick={() => setTab(pt.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 14px', fontSize: 13, fontWeight: 500,
                color: tab === pt.id ? 'var(--fg-default)' : 'var(--fg-muted)',
                borderBottom: tab === pt.id ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1, transition: 'color 0.1s',
              }}
            >
              {pt.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: 24, flex: 1 }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, gap: 10, color: 'var(--fg-muted)' }}>
              <div className="spinner" /> Fetching commit history… (may take a few seconds)
            </div>
          )}
          {error && (
            <div style={{ padding: 14, background: 'rgba(248,81,73,0.1)', borderRadius: 6, border: '1px solid rgba(248,81,73,0.3)', color: '#f85149', fontSize: 13 }}>
              {error}
            </div>
          )}

          {!loading && !error && detail && (
            <>
              {/* ── Activity tab ── */}
              {tab === 'activity' && (
                <div>
                  {/* Year selector */}
                  {availableYears.length > 1 && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                      {availableYears.map((yr) => (
                        <button
                          key={yr}
                          onClick={() => setSelectedYear(yr === selectedYear ? null : yr)}
                          style={{
                            padding: '3px 10px', fontSize: 12, fontWeight: 600, borderRadius: 20,
                            border: '1px solid',
                            borderColor: selectedYear === yr ? 'var(--accent)' : 'var(--border-default)',
                            background: selectedYear === yr ? 'rgba(56,139,253,0.15)' : 'transparent',
                            color: selectedYear === yr ? 'var(--accent)' : 'var(--fg-muted)',
                            cursor: 'pointer',
                          }}
                        >
                          {yr}
                        </button>
                      ))}
                      {selectedYear != null && (
                        <button
                          onClick={() => setSelectedYear(null)}
                          style={{
                            padding: '3px 10px', fontSize: 12, fontWeight: 600, borderRadius: 20,
                            border: '1px solid var(--border-default)',
                            background: 'transparent',
                            color: 'var(--fg-muted)',
                            cursor: 'pointer',
                          }}
                        >
                          All
                        </button>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 12 }}>
                    Weekly commit count —{' '}
                    {selectedYear != null ? selectedYear : 'last 52 weeks'}
                  </div>
                  {commitData.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--fg-muted)', padding: 40 }}>No commit data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={commitData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                        <XAxis
                          dataKey="week"
                          tick={{ fontSize: 10, fill: 'var(--fg-muted)' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(unix: number) => formatWeekTick(unix)}
                          interval={0}
                        />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<TooltipBox />} />
                        <Bar dataKey="commits" fill="#3fb950" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {/* total commits in window */}
                  <div style={{ marginTop: 16, padding: 14, background: 'var(--bg-canvas)', borderRadius: 8, border: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                      Total commits ({selectedYear != null ? selectedYear : 'last 52 weeks'})
                    </span>
                    <span style={{ fontWeight: 700, color: '#3fb950' }}>
                      {commitData.reduce((s, w) => s + w.commits, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* ── Contributors tab ── */}
              {tab === 'contributors' && (
                <div>
                  {detail.contributors.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--fg-muted)', padding: 40 }}>No contributors found</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {detail.contributors.map((c, i) => (
                        <a key={c.login} href={c.html_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 14px', background: 'var(--bg-canvas)',
                            border: '1px solid var(--border-default)', borderRadius: 8,
                            transition: 'border-color 0.15s',
                          }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
                          >
                            <span style={{ width: 22, textAlign: 'center', fontSize: 12, fontWeight: 700, color: i < 3 ? '#f0c040' : 'var(--fg-muted)', flexShrink: 0 }}>
                              #{i + 1}
                            </span>
                            <img src={c.avatar_url} alt={c.login} width={32} height={32} style={{ borderRadius: '50%', flexShrink: 0 }} />
                            <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: 'var(--fg-default)' }}>{c.login}</span>
                            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>
                              {c.contributions.toLocaleString()} commits
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Languages tab ── */}
              {tab === 'languages' && (
                <div>
                  {langData.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--fg-muted)', padding: 40 }}>No language data</div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                        <PieChart width={220} height={220}>
                          <Pie data={langData} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                            {langData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={(val: any) => [`${((Number(val) / langTotal) * 100).toFixed(1)}%`]}
                            contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: 12 }}
                          />
                        </PieChart>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {langData.map((l) => (
                          <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 13, color: 'var(--fg-default)' }}>{l.name}</span>
                            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{l.pct}%</span>
                            {/* progress bar */}
                            <div style={{ width: 90, height: 4, background: 'var(--border-default)', borderRadius: 2 }}>
                              <div style={{ width: `${l.pct}%`, height: '100%', background: l.color, borderRadius: 2 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>
    </>
  );
}
