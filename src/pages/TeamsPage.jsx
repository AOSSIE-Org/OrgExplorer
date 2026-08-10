import React, { useState, useEffect, useMemo, useRef } from 'react'
import * as d3 from 'd3'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { C, PageTitle, Spinner } from '../components/UI'
import { 
  FiUsers, FiDatabase, FiExternalLink, FiPlus, FiArrowLeft, 
  FiAlertCircle, FiLock, FiInfo, FiTrash2, FiUserPlus, FiAlertTriangle
} from 'react-icons/fi'
import { fetchOrgTeams, fetchTeamMembers, fetchTeamRepos, updateTeamMembership } from '../services/github'
import AnalysisBanner from '../components/AnalysisBanner'

export default function TeamsPage() {
  const navigate = useNavigate()
  const { model, orgs, pat, isComplete, loading: appLoading, runFullExplore } = useApp()

  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Selection/Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeamSlug, setSelectedTeamSlug] = useState(null)
  
  // Graph rendering variables
  const svgRef = useRef(null)
  const simRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  // Drag-and-drop assign modal state
  const [assignModal, setAssignModal] = useState(null)
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')

  // Resolve primary organization name
  const orgName = useMemo(() => {
    return orgs[0]?.login || ''
  }, [orgs])

  // Lazy load organization teams
  useEffect(() => {
    if (!orgName) return

    let ignore = false
    setLoading(true)
    setError('')
    
    fetchOrgTeams(orgName, pat)
      .then(async (fetchedTeams) => {
        if (ignore) return
        if (!fetchedTeams || !fetchedTeams.length) {
          setTeams([])
          setLoading(false)
          return
        }

        // Fetch members and repos for each team in concurrency-limited batches of 5
        const enriched = []
        const batchSize = 5
        for (let i = 0; i < fetchedTeams.length; i += batchSize) {
          if (ignore) return
          const batch = fetchedTeams.slice(i, i + batchSize)
          const results = await Promise.all(
            batch.map(async (team) => {
              let members = []
              let repos = []
              let partialError = null

              try {
                members = await fetchTeamMembers(orgName, team.slug, pat)
              } catch (e) {
                partialError = e.message || 'Failed to load members'
              }

              try {
                repos = await fetchTeamRepos(orgName, team.slug, pat)
              } catch (e) {
                partialError = partialError || e.message || 'Failed to load repositories'
              }

              return { ...team, members, repos, partialError }
            })
          )
          enriched.push(...results)
        }

        if (ignore) return
        setTeams(enriched)
        setLoading(false)
      })
      .catch((err) => {
        if (ignore) return
        console.error('Failed to load org teams:', err)
        if (err.message === 'RATE_LIMIT') {
          setError('GitHub rate limit exceeded. Please check Settings.')
        } else if (err.message === 'FORBIDDEN') {
          setError('Access denied. Please ensure your Personal Access Token (PAT) has the "read:org" scope enabled.')
        } else {
          setError('Failed to load organization teams. Verify your Personal Access Token and settings.')
        }
        setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [orgName, pat])

  // Filtered teams list based on search
  const filteredTeams = useMemo(() => {
    return teams.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }, [teams, searchQuery])

  // Generate D3 Force Graph Nodes and Links
  useEffect(() => {
    if (!svgRef.current || teams.length === 0) return

    const el = svgRef.current
    const W = el.clientWidth || 800
    const H = 550
    const svg = d3.select(el)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${W} ${H}`)

    // 1. Construct nodes & links mapping
    const nodesMap = new Map()
    const links = []

    // Build teams
    teams.forEach(team => {
      // Ignore teams not matched by search query if a search is active
      const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (team.description && team.description.toLowerCase().includes(searchQuery.toLowerCase()))
      if (searchQuery && !matchesSearch) return

      const teamId = `team:${team.slug}`
      nodesMap.set(teamId, {
        id: teamId,
        type: 'team',
        label: team.name,
        color: 'var(--purple)',
        size: 24,
        data: team
      })

      // Add members nodes and connections
      team.members.forEach(member => {
        const memberId = `member:${member.login}`
        if (!nodesMap.has(memberId)) {
          nodesMap.set(memberId, {
            id: memberId,
            type: 'member',
            label: member.login,
            avatar: member.avatar_url,
            size: 14,
            data: member
          })
        }
        links.push({ source: memberId, target: teamId })
      })

      // Add repos nodes and connections
      team.repos.forEach(repo => {
        const repoId = `repo:${repo.name}`
        if (!nodesMap.has(repoId)) {
          // Look up in the analytical model totalRepos list to resolve computed scores
          const modelRepo = model?.totalRepos?.find(r => r.name === repo.name)
          const score = repo.healthScore ?? modelRepo?.healthScore ?? 65
          const healthColor = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'

          nodesMap.set(repoId, {
            id: repoId,
            type: 'repo',
            label: repo.name,
            color: healthColor,
            size: 14,
            data: {
              ...repo,
              healthScore: score,
              forks_count: modelRepo?.forks_count ?? repo.forks_count ?? 0,
              stargazers_count: modelRepo?.stargazers_count ?? repo.stargazers_count ?? 0
            }
          })
        }
        links.push({ source: repoId, target: teamId })
      })
    })

    const nodes = Array.from(nodesMap.values())

    const g = svg.append('g')
    const zoom = d3.zoom().scaleExtent([0.15, 3]).on('zoom', (e) => g.attr('transform', e.transform))
    svg.call(zoom)

    // Draw link edges
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'var(--border)')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.5)

    // Draw nodes g wrapper
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag()
          .on('start', (e, d) => {
            if (!e.active) sim.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (e, d) => {
            d.fx = e.x
            d.fy = e.y
          })
          .on('end', (e, d) => {
            if (!e.active) sim.alphaTarget(0)
            d.fx = null
            d.fy = null

            // Drag and drop assignment logic: dropped close to a team node
            if (d.type === 'member') {
              const threshold = 50
              let targetTeam = null
              let minDistance = Infinity

              nodes.forEach(n => {
                if (n.type === 'team') {
                  const dx = e.x - n.x
                  const dy = e.y - n.y
                  const dist = Math.sqrt(dx * dx + dy * dy)
                  if (dist < threshold && dist < minDistance) {
                    minDistance = dist
                    targetTeam = n.data
                  }
                }
              })

              if (targetTeam) {
                // Check if already in target team
                const isMember = targetTeam.members.some(m => m.login === d.data.login)
                if (!isMember) {
                  setAssignError('')
                  setAssignModal({
                    username: d.data.login,
                    teamName: targetTeam.name,
                    teamSlug: targetTeam.slug,
                    avatar: d.data.avatar_url
                  })
                }
              }
            }
          })
      )
      .on('mouseover', (event, d) => {
        // Highlight links
        link
          .attr('stroke', l => (l.source.id === d.id || l.target.id === d.id) ? 'var(--accent)' : 'var(--border)')
          .attr('stroke-opacity', l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.08)

        // Show Tooltip
        const rect = el.getBoundingClientRect()
        setTooltip({
          x: event.clientX - rect.left + 15,
          y: event.clientY - rect.top - 15,
          node: d
        })
      })
      .on('mouseout', () => {
        link.attr('stroke', 'var(--border)').attr('stroke-opacity', 0.6)
        setTooltip(null)
      })
      .on('click', (e, d) => {
        if (d.type === 'team') {
          setSelectedTeamSlug(d.data.slug)
        }
      })

    // Draw customized layouts for nodes depending on type
    node.each(function(d) {
      const selection = d3.select(this)

      if (d.type === 'team') {
        // Render Team Node as shield/polygons or distinct shapes
        selection.append('polygon')
          .attr('points', '-16,-20 16,-20 22,0 0,25 -22,0')
          .attr('fill', d.color)
          .attr('stroke', 'var(--bg)')
          .attr('stroke-width', 2)
          
        selection.append('text')
          .text('T')
          .attr('text-anchor', 'middle')
          .attr('dy', 5)
          .attr('fill', '#fff')
          .attr('font-weight', 'bold')
          .attr('font-size', 12)
          .attr('pointer-events', 'none')

      } else if (d.type === 'member') {
        // Render Member Node as circular avatar
        const r = d.size
        const clipId = `avatar-clip-${d.id}`

        svg.append('defs')
          .append('clipPath')
          .attr('id', clipId)
          .append('circle')
          .attr('r', r)
          .attr('cx', 0)
          .attr('cy', 0)

        selection.append('image')
          .attr('href', d.avatar)
          .attr('x', -r)
          .attr('y', -r)
          .attr('width', r * 2)
          .attr('height', r * 2)
          .attr('clip-path', `url(#${clipId})`)

        selection.append('circle')
          .attr('r', r)
          .attr('fill', 'none')
          .attr('stroke', 'var(--text2)')
          .attr('stroke-width', 1.5)

      } else if (d.type === 'repo') {
        // Render Repository Node as rectangular blocks
        selection.append('rect')
          .attr('x', -10)
          .attr('y', -10)
          .attr('width', 20)
          .attr('height', 20)
          .attr('rx', 3)
          .attr('fill', d.color)
          .attr('stroke', 'var(--bg)')
          .attr('stroke-width', 1.5)
      }

      // Add node titles
      const labelY = d.type === 'team' ? 32 : 22
      selection.append('text')
        .text(d.label.length > 14 ? d.label.slice(0, 12) + '..' : d.label)
        .attr('text-anchor', 'middle')
        .attr('dy', labelY)
        .attr('font-size', 9)
        .attr('fill', 'var(--text2)')
        .attr('pointer-events', 'none')
    })

    // Setup force simulation
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(80).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide(d => d.type === 'team' ? 32 : 18))

    simRef.current = sim

    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)
      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => sim.stop()
  }, [teams, searchQuery])

  // Trigger Team Membership Assignment
  const handleAssignMembership = async () => {
    if (!assignModal || assigning) return

    setAssigning(true)
    setAssignError('')

    try {
      await updateTeamMembership(orgName, assignModal.teamSlug, assignModal.username, pat)
      
      // Update local state to inject new member in team orbits dynamically
      setTeams(prevTeams => 
        prevTeams.map(t => {
          if (t.slug === assignModal.teamSlug) {
            return {
              ...t,
              members: [...t.members, { login: assignModal.username, avatar_url: assignModal.avatar }]
            }
          }
          return t
        })
      )

      setAssignModal(null)
    } catch (err) {
      console.error('Failed to assign team member:', err)
      setAssignError(err.message || 'Action failed. Verify your account has administrator permission on this team.')
    } finally {
      setAssigning(false)
    }
  }

  // Visual layout checks
  if (appLoading) return <Spinner />
  if (!model) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <Spinner size={36} />
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>Please select an organization on the homepage first...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }} className="fade-up">
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => navigate('/contributors')}
          style={{
            background: 'none', border: 'none', color: 'var(--text2)',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
            cursor: 'pointer', padding: '6px 0', marginBottom: 12
          }}
          className="hover:text-(--text) transition"
        >
          <FiArrowLeft size={14} /> Back to Contributor Intelligence
        </button>
      </div>

      <PageTitle
        title="Teams Explorer"
        subtitle="INTERACTIVE ORGANIZATION TEAMS GRAPH AND PERMISSION MANAGEMENT"
      />

      <AnalysisBanner
        page="teams"
        description="GitHub Teams data requires an active Personal Access Token (PAT). Connect a PAT in Settings to explore and manage organization teams."
        analysisStatus={isComplete ? 'complete' : 'standard'}
        loading={appLoading}
        onRun={runFullExplore}
      />

      {/* Warning if no PAT is set */}
      {!pat && (
        <div style={{
          background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)',
          borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center',
          gap: 12, marginBottom: 24, fontSize: 13, color: 'var(--red)'
        }}>
          <FiAlertTriangle size={16} />
          <span>No PAT token configured. Organization Team configurations are private and require an authenticated token to read or write.</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
          <Spinner size={32} />
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>Retrieving organization teams and relationships...</p>
        </div>
      ) : error ? (
        <div style={{ ...C.card, padding: 32, textAlign: 'center', color: 'var(--text2)' }}>
          <FiAlertCircle size={36} color="var(--red)" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 500 }}>{error}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>
          
          {/* Left panel: Teams lists */}
          <div style={{ ...C.card, padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiUsers size={16} color="var(--accent)" />
              <span>Org Teams List</span>
              <span style={{ fontSize: 10, background: 'var(--border)', padding: '2px 6px', borderRadius: 10, color: 'var(--text2)' }}>
                {filteredTeams.length}
              </span>
            </div>

            <input
              type="text"
              placeholder="Filter teams..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ ...C.input, width: '100%', padding: '6px 12px', fontSize: 12, marginBottom: 14 }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
              {filteredTeams.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '16px 0' }}>No teams found.</p>
              ) : (
                filteredTeams.map(t => {
                  const active = selectedTeamSlug === t.slug
                  return (
                    <div
                      key={t.slug}
                      onClick={() => setSelectedTeamSlug(active ? null : t.slug)}
                      style={{
                        padding: 12, border: '1px solid var(--border)', borderRadius: 6,
                        cursor: 'pointer', background: active ? 'rgba(168,85,247,.08)' : 'transparent',
                        borderColor: active ? 'var(--purple)' : 'var(--border)',
                        transition: 'all 0.2s'
                      }}
                      className="hover:bg-(--surface2)"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 12, color: active ? 'var(--purple)' : 'var(--text)' }}>{t.name}</span>
                        {t.privacy === 'secret' && <FiLock size={11} color="var(--text3)" title="Secret team" />}
                      </div>
                      {t.description && <p style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 8, lineHeight: 1.3 }}>{t.description}</p>}
                      <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text3)' }}>
                        <span>{t.members?.length || 0} Members</span>
                        <span>•</span>
                        <span>{t.repos?.length || 0} Repos</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right panel: D3 canvas force graph visualizer */}
          <div style={{ ...C.card, padding: 0, overflow: 'hidden', position: 'relative' }}>
            {/* Keyboard Assignment Helper for accessibility */}
            <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>ACCESSIBILITY ASSIGNMENT:</span>
              <select 
                id="kbd-assign-member"
                aria-label="Select contributor to assign"
                style={{ ...C.input, padding: '4px 8px', fontSize: 11, width: 140, background: 'var(--surface)' }}
              >
                <option value="">-- Choose Member --</option>
                {(model?.contributors || []).map(c => <option key={c.login} value={c.login}>{c.login}</option>)}
              </select>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>to</span>
              <select 
                id="kbd-assign-team"
                aria-label="Select target team"
                style={{ ...C.input, padding: '4px 8px', fontSize: 11, width: 140, background: 'var(--surface)' }}
              >
                <option value="">-- Choose Team --</option>
                {teams.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
              </select>
              <button 
                type="button" 
                onClick={() => {
                  const userVal = document.getElementById('kbd-assign-member').value
                  const teamVal = document.getElementById('kbd-assign-team').value
                  if (!userVal || !teamVal) return

                  const selectedMember = (model?.contributors || []).find(c => c.login === userVal)
                  const targetTeam = teams.find(t => t.slug === teamVal)

                  if (selectedMember && targetTeam) {
                    const isMember = targetTeam.members.some(m => m.login === userVal)
                    if (isMember) {
                      alert(`@${userVal} is already a member of ${targetTeam.name}`)
                      return
                    }
                    setAssignError('')
                    setAssignModal({
                      username: userVal,
                      teamName: targetTeam.name,
                      teamSlug: targetTeam.slug,
                      avatar: selectedMember.avatar_url || 'https://github.com/identicons/temp.png'
                    })
                  }
                }}
                style={{ ...C.btn('primary'), padding: '4px 12px', fontSize: 11 }}
              >
                Assign via Keyboard
              </button>
            </div>

            <svg ref={svgRef} style={{ width: '100%', height: 550, display: 'block', background: 'var(--bg)' }} />

            {/* D3 tooltip element */}
            {tooltip && (
              <div style={{
                position: 'absolute', left: tooltip.x, top: tooltip.y,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '10px 14px', fontSize: 11,
                pointerEvents: 'none', zIndex: 10, minWidth: 180,
                boxShadow: '0 4px 12px rgba(0,0,0,.15)'
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                  {tooltip.node.label}
                </div>
                <div style={{ fontSize: 9, color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
                  {tooltip.node.type}
                </div>

                {tooltip.node.type === 'team' && (
                  <>
                    <div style={{ color: 'var(--text2)', marginBottom: 4, fontStyle: 'italic', lineHeight: 1.3 }}>
                      {tooltip.node.data.description || 'No description provided.'}
                    </div>
                    <div style={{ color: 'var(--text2)' }}>Members: <strong>{tooltip.node.data.members?.length || 0}</strong></div>
                    <div style={{ color: 'var(--text2)' }}>Repos: <strong>{tooltip.node.data.repos?.length || 0}</strong></div>
                  </>
                )}

                {tooltip.node.type === 'member' && (
                  <>
                    <div style={{ color: 'var(--text2)' }}>Login: <strong>@{tooltip.node.data.login}</strong></div>
                    <a href={tooltip.node.data.html_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                      GitHub profile <FiExternalLink size={10} />
                    </a>
                  </>
                )}

                {tooltip.node.type === 'repo' && (
                  <>
                    <div style={{ color: 'var(--text2)' }}>Health Score: <strong>{tooltip.node.data.healthScore ?? 'Unknown'}</strong></div>
                    <div style={{ color: 'var(--text2)' }}>Forks: {tooltip.node.data.forks_count ?? 0}</div>
                    <div style={{ color: 'var(--text2)' }}>Stars: {tooltip.node.data.stargazers_count ?? 0}</div>
                  </>
                )}
              </div>
            )}

            <div style={{ position: 'absolute', bottom: 12, left: 16, fontSize: 11, color: 'var(--text3)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>🔮 Hexagon = Team | Circle = Contributor | Square = Repository</span>
              <span>👉 Drag & drop a contributor onto a team hexagon to update memberships visually</span>
            </div>
          </div>
        </div>
      )}

      {/* DND assign modal */}
      {assignModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            ...C.card, width: '100%', maxWidth: 450, padding: 24,
            display: 'flex', flexDirection: 'column', gap: 16,
            boxShadow: '0 10px 30px rgba(0,0,0,.3)', border: '1px solid var(--border)'
          }} className="fade-up">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FiUserPlus size={20} color="var(--accent)" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Assign Team Membership</h3>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>
              Are you sure you want to add <strong>@{assignModal.username}</strong> as a member of <strong>{assignModal.teamName}</strong>?
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--surface2)', borderRadius: 6 }}>
              <img src={assignModal.avatar} alt={assignModal.username} style={{ width: 32, height: 32, borderRadius: '50%' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{assignModal.username}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Adding to {assignModal.teamSlug}</div>
              </div>
            </div>

            {assignError && (
              <div style={{ fontSize: 12, color: 'var(--red)', background: 'rgba(239,68,68,.08)', padding: '8px 12px', borderRadius: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
                <FiAlertCircle size={14} />
                <span>{assignError}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button 
                onClick={() => setAssignModal(null)} 
                disabled={assigning}
                style={{ ...C.btn('ghost'), fontSize: 12 }}
              >
                Cancel
              </button>
              <button 
                onClick={handleAssignMembership} 
                disabled={assigning}
                style={{ ...C.btn('primary'), fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {assigning ? <Spinner size={12} /> : null} Add to Team
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
