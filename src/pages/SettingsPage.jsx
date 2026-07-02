import React, { useState, useEffect, useRef } from 'react'
import { FiEye, FiEyeOff, FiTrash2, FiSave, FiRefreshCw } from 'react-icons/fi'
import { useApp } from '../context/AppContext'
import { C } from '../components/UI'
import { cacheClear } from '../services/github'
import { AiOutlineInfoCircle } from "react-icons/ai";
export default function SettingsPage() {
  const { pat, savePat, rateLimit, refreshRateLimit } = useApp()
  const [draft, setDraft] = useState(pat)
  const [show, setShow] = useState(false)
  const [saved, setSaved] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState(false)
  const handleSave = () => {
    savePat(draft.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDelete = () => {
    savePat('')
    setDraft('')
  }

  const handleClear = async () => {
    await cacheClear()
    setCleared(true)
    setTimeout(() => setCleared(false), 2000)
  }

  const rateColor = rateLimit
    ? rateLimit.remaining / rateLimit.limit > 0.3 ? 'var(--green)' : 'var(--red)'
    : 'var(--text2)'

  const [open, setOpen] = useState(false)
  const infoRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (infoRef.current && !infoRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto' }} className="fade-up">
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 24 }}>Settings</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* GitHub Authentication */}
          <div style={C.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div
                  ref={infoRef}
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <p>GitHub Authentication</p>

                  <button
                    onMouseEnter={()=> setOpen(true)}
                    onMouseLeave={()=> setOpen(false)}
                    className="p-2 rounded-full hover:bg-(--bg) transition"
                  >
                    <AiOutlineInfoCircle className="text-(--text) cursor-pointer" />
                  </button>

                  {open && (
                    <div
                      style={{
                        ...C.card,
                        position: 'absolute',
                        top: '130%',
                        left: 0,
                        width: '340px',
                        zIndex: 100,
                      }}
                    >
                      <h4 className='mb-2 text-(--accent) font-semibold'>
                        PAT Security
                      </h4>

                      <div className="mb-4 color-(--text) text-xs">
                        <p>
                          Your Personal Access Token (PAT) is stored locally on your device and is never sent to any server. OrgExplorer is a purely static page served to your browser via GitHub Pages and it has no servers.
                        </p>

                        <ul className="list-disc ml-5 text-(--text) mt-1 text-xs">
                          <li>Stored only in your browser.</li>
                          <li>Used exclusively for GitHub API authentication.</li>
                          <li>Never shared with third parties.</li>
                          <li>Can be removed at any time from Settings.</li>
                        </ul>

                        <p className='text-(--text2) text-xs mt-2'>
                          Using a PAT increases GitHub API limits and allows access to
                          repositories you are authorized to view.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Personal Access Token (PAT)</div>
              </div>
              {pat && (
                <span style={C.pill('var(--green)', 'rgba(34,197,94,.12)')}>AUTHENTICATED</span>
              )}
            </div>

            <div style={{ fontSize: 11, color: 'var(--text2)', letterSpacing: '.06em', marginBottom: 6 }}>
              PRIVATE TOKEN KEY
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                type={show ? 'text' : 'password'}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                style={{ ...C.input, flex: 1 }}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
              <button
                onClick={() => setShow(s => !s)}
                style={{ ...C.btn('ghost'), padding: '8px 10px', display: 'flex', alignItems: 'center' }}
              >
                {show ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSave}
                disabled={!draft.trim()}
                style={{ ...C.btn('primary'), display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}
              >
                <FiSave size={13} /> {saved ? 'Saved' : 'Save'}
              </button>
              <button
                onClick={handleDelete}
                disabled={!draft.trim()}
                style={{ ...C.btn('danger'), display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}
              >
                <FiTrash2 size={13} /> Delete
              </button>
            </div>
          </div>

          {/* How to create a PAT */}
          <div style={C.card}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>How to create a PAT</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['01', 'Go to GitHub Settings → Developer settings → Personal access tokens'],
                ['02', 'Click "Generate new token" and choose "Fine-grained token"'],
                ['03', 'Give your token a name(e.g. "OrgExplorer PAT"), select an expiration, and verify yourself'],
                ['04', 'Choose "Public repositories" access and grant Read-only permissions'],
                ['05', 'Generate the token and copy it'],
                ['06', 'Paste the token above and click Save'],
              ].map(([n, text]) => (
                <div key={n} style={{ background: 'var(--surface2)', borderRadius: 6, padding: '10px 12px' }}>
                  <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{n}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Cache */}
          <div style={C.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Data Cache</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>IndexedDB · 1-hour TTL per entry</div>
              </div>
              <button
                onClick={handleClear}
                style={{ ...C.btn('danger'), fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <FiTrash2 size={13} /> {cleared ? 'Cleared' : 'Clear All'}
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
              All API responses are cached in IndexedDB with a 1-hour TTL. Cache keys are namespaced per org and per resource type — enabling partial cache hits across paginated fetches. Clearing forces fresh API calls on the next explore.
            </p>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* API Quota */}
          <div style={C.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '.03em' }}>API Quota</div>
              <button
                type="button"
                disabled={isRefreshing}
                onClick={async () => {
                  if (isRefreshing) return;
                  setIsRefreshing(true);
                  setRefreshError(false);
                  try {
                    const success = await refreshRateLimit();
                    if (!success) {
                      setRefreshError(true);
                      setTimeout(() => setRefreshError(false), 2000);
                    }
                  } finally {
                    setTimeout(() => setIsRefreshing(false), 500); // Minimum spin duration for visual feedback
                  }
                }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  padding: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px'
                }}
                aria-label="Refresh API Quota"
                title={refreshError ? "Failed to refresh" : "Refresh API Quota"}
                className="hover:bg-(--bg) transition"
              >
                <FiRefreshCw 
                  size={14} 
                  color={refreshError ? "var(--red)" : "var(--text2)"} 
                  style={{ transition: 'transform 0.3s ease', transform: isRefreshing ? 'rotate(180deg)' : 'none' }} 
                />
              </button>
            </div>

            {rateLimit ? (
              <>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: rateColor }}>
                    {rateLimit.remaining.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--text2)', marginLeft: 4 }}>
                    / {rateLimit.limit.toLocaleString()}
                  </span>
                </div>
                <div style={{ ...C.label, marginBottom: 10 }}>Requests Remaining</div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, marginBottom: 10 }}>
                  <div style={{
                    width: `${rateLimit.remaining / rateLimit.limit * 100}%`,
                    height: '100%', background: rateColor, borderRadius: 3,
                  }} />
                </div>
                {!pat && (
                  <div style={{ fontSize: 12, color: 'var(--text2)', padding: '8px 10px', background: 'rgba(245,197,24,.06)', borderRadius: 4 }}>
                    Add a PAT above to unlock 5,000 req/hr instead of 60.
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                Explore an organization to see your live API quota status.
              </div>
            )}
          </div>

          {/* Technical Information */}
          <div style={C.card}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16, letterSpacing: '.03em' }}>Technical Information</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {[
                ['Version', 'v1.0.0-stable'],
                ['Architecture', 'Client-side only, no backend'],
                ['API strategy', '60 req/hr unauthenticated'],
                ['Cache', 'IndexedDB + React Context'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text2)' }}>{k}</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ ...C.label, marginBottom: 10 }}>Stack Integrity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['React 18 + Vite', 'React Router v6', 'D3.js v7 (network graph)', 'Recharts 2 (time-series)', 'IndexedDB cache'].map(s => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text2)' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
