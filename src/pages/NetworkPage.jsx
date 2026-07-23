import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useApp } from '../context/AppContext'
import { C, PageTitle } from '../components/UI'
import EmptyStateCard from '../components/EmptyStateCard'
import { FiDatabase } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import AnalysisBanner from '../components/AnalysisBanner'
import { NetworkSkeleton } from '../components/Orgexplorerskeletons'

export default function NetworkPage() {
  const { model, isComplete, loading, runFullExplore } = useApp()
  const svgRef   = useRef(null)
  const simRef   = useRef(null)
  const [tooltip,      setTooltip]      = useState(null)
  const [showRepos,    setShowRepos]    = useState(true)
  const [showContribs, setShowContribs] = useState(true)

  useEffect(() => {
    if (!svgRef.current || !model?.allRepos.length) return

    const el  = svgRef.current
    const W   = el.clientWidth || 860
    const H   = 580
    const now = Date.now()

    const svg = d3.select(el)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${W} ${H}`)

    // Top repos and contributors for performance
    const topRepos    = model.allRepos.slice(0, 30)
    const topContribs = model.contributors

    const nodes = []
    if (showRepos)    topRepos.forEach(r => nodes.push({ id: `repo:${r.name}`,    type: 'repo',        data: r, ts: new Date(r.pushed_at).getTime(), healthScore: r.healthScore }))
    if (showContribs) topContribs.forEach(c => nodes.push({ id: `user:${c.login}`, type: 'contributor', data: c, ts: c.lastActive ? new Date(c.lastActive).getTime() : 0, healthScore: c.healthScore }))

    const nodeSet = new Set(nodes.map(n => n.id))
    const links   = []
    topContribs.forEach(c => {
      c.repos.slice(0, 5).forEach(repo => {
        const s = `user:${c.login}`, t = `repo:${repo.name}`
        if (nodeSet.has(s) && nodeSet.has(t)) links.push({ source: s, target: t, weight: repo.count })
      })
    })

    // Scales
    const recencyY    = d3.scaleLinear().domain([now - 365 * 86_400_000, now]).range([H * 0.83, H * 0.14]).clamp(true)
    const repoRadius  = d3.scaleSqrt().domain([0, d3.max(topRepos, r => r.stargazers_count) || 1]).range([5, 22])
    const contribR    = d3.scaleSqrt().domain([0, d3.max(topContribs, c => c.totalContribs) || 1]).range([4, 14])
    const edgeW       = d3.scaleLinear().domain([1, d3.max(links, l => l.weight) || 1]).range([1, 6])
    const healthColor = h => h >= 70 ? '#22c55e' : h >= 40 ? '#f59e0b' : '#ef4444'

    const g    = svg.append('g')
    const zoom = d3.zoom().scaleExtent([0.2, 4]).on('zoom', e => g.attr('transform', e.transform))
    svg.call(zoom)

    // Draw edges
    const link = g.append('g')
      .selectAll('line').data(links).join('line')
      .attr('stroke', '#2a2a2a')
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', d => edgeW(d.weight))

    // Draw nodes
    const node = g.append('g')
      .selectAll('g').data(nodes).join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y })
          .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )
      .on('mouseover', (event, d) => {
        link
          .attr('stroke',         l => (l.source.id === d.id || l.target.id === d.id) ? '#f5c518' : '#2a2a2a')
          .attr('stroke-opacity', l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.08)
        const rect = el.getBoundingClientRect()
        setTooltip({ x: event.clientX - rect.left + 14, y: event.clientY - rect.top - 14, node: d })
      })
      .on('mouseout', () => {
        link.attr('stroke', '#2a2a2a').attr('stroke-opacity', 0.8)
        setTooltip(null)
      })

    node.each(function(d) {
      const el = d3.select(this)
      if (d.type === 'repo') {
        const r = repoRadius(d.data.stargazers_count || 0)
        el.append('rect')
          .attr('width', r * 2).attr('height', r * 2)
          .attr('x', -r).attr('y', -r).attr('rx', 3)
          .attr('fill', healthColor(d.data.healthScore || 0))
          .attr('stroke', '#0d0d0d').attr('stroke-width', 1.5)
      } else {
        const r = contribR(d.data.totalContribs || 1)

        const clipId = `avatar-clip-${d.id}`

        svg.append('defs')
          .append('clipPath')
          .attr('id', clipId)
          .append('circle')
          .attr('r', r)
          .attr('cx', 0)
          .attr('cy', 0)

        // Avatar image
        el.append('image')
          .attr('href', d.data.avatar_url)
          .attr('x', -r)
          .attr('y', -r)
          .attr('width', r * 2)
          .attr('height', r * 2)
          .attr('clip-path', `url(#${clipId})`)

        // Border around avatar
        el.append('circle')
          .attr('r', r)
          .attr('fill', 'none')
          .attr('stroke', d.data.isConnector ? '#f5c518' : '#555')
          .attr('stroke-width', 2)
      }
      const labelY = d.type === 'repo'
        ? repoRadius(d.data.stargazers_count || 0) + 11
        : contribR(d.data.totalContribs || 1) + 11
      const raw = d.type === 'repo' ? d.data.name : d.data.login
      el.append('text')
        .text(raw.length > 14 ? raw.slice(0, 12) + '..' : raw)
        .attr('text-anchor', 'middle').attr('dy', labelY)
        .attr('font-size', 9).attr('fill', '#666')
        .attr('pointer-events', 'none')
    })

    // Force simulation with y-force for recency (Section 3.2.7)
    const sim = d3.forceSimulation(nodes)
      .force('link',    d3.forceLink(links).id(d => d.id).distance(75).strength(0.4))
      .force('charge',  d3.forceManyBody().strength(-170))
      .force('center',  d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide(d => d.type === 'repo' ? repoRadius(d.data.stargazers_count || 0) + 8 : 16))
      .force('y',       d3.forceY(d => recencyY(d.ts || 0)).strength(0.05))

    simRef.current = sim

    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => sim.stop()
  }, [model, showRepos, showContribs])

  const navigate = useNavigate()
  if(loading) return <NetworkSkeleton />
  
  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }} className="fade-up">
      <AnalysisBanner
          page="network"
          description="Network relationships are computed from a representative subset to balance speed and API usage. Connect a PAT to analyze every repository and access complete results."
          analysisStatus={isComplete ? 'complete' : 'standard'}
          loading={loading}
          onRun={runFullExplore}
      />
      <PageTitle
        title="Contributor-Repository Network"
        subtitle="Visual map of how contributors connect across repositories. Edge thickness = contribution volume. Position encodes recency — recently active nodes rise to the top."
      />

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['Repositories', showRepos, setShowRepos], ['Contributors', showContribs, setShowContribs]].map(([label, val, set]) => (
            <button key={label} onClick={() => set(v => !v)} style={{ ...C.btn(val ? 'primary' : 'ghost'), fontSize: 12, padding: '5px 14px' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text2)', flexWrap: 'wrap' }}>
          <span>Square = Repository node (color = health score)</span>
          <span>Circle yellow = Cross-repo connector</span>
          <span>Circle gray = Regular contributor</span>
          <span>Edge thickness = contribution volume</span>
          <span style={{ color: 'var(--text3)' }}>Recently active nodes float upward</span>
        </div>
      </div>

      {/* Canvas */}
      {model.allRepos?.length ? (
    <>
        <div style={{ ...C.card, padding: 0, overflow: 'hidden', position: 'relative' }}>
        <svg ref={svgRef} style={{ width: '100%', height: 580, display: 'block', background: 'var(--bg)' }} />

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'absolute', left: tooltip.x, top: tooltip.y,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '10px 14px', fontSize: 12,
            pointerEvents: 'none', zIndex: 10, minWidth: 170,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 5 }}>
              {tooltip.node.data.name || tooltip.node.data.login}
            </div>
            {tooltip.node.type === 'repo' ? (
              <>
                <div style={{ color: 'var(--text2)', marginBottom: 2 }}>
                  Health: <strong style={{ color: tooltip.node.data.healthScore >= 70 ? 'var(--green)' : tooltip.node.data.healthScore >= 40 ? 'var(--amber)' : 'var(--red)' }}>
                    {tooltip.node.data.healthScore}
                  </strong>
                </div>
                <div style={{ color: 'var(--text2)', marginBottom: 2 }}>Stars: {tooltip.node.data.stargazers_count?.toLocaleString()}</div>
                <div style={{ color: 'var(--text2)' }}>Lifecycle: {tooltip.node.data.lifecycle}</div>
              </>
            ) : (
              <>
                <div style={{ color: 'var(--text2)', marginBottom: 2 }}>
                  Contributions: <strong>{tooltip.node.data.totalContribs?.toLocaleString()}</strong>
                </div>
                <div style={{ color: 'var(--text2)', marginBottom: 2 }}>Repos: {tooltip.node.data.repos?.length}</div>
                {tooltip.node.data.isConnector && <div style={{ color: 'var(--accent)', fontWeight: 600, marginTop: 4 }}>Cross-repo connector</div>}
                {tooltip.node.data.isCrossOrg  && <div style={{ color: 'var(--purple)', fontWeight: 600 }}>Cross-org contributor</div>}
              </>
            )}
          </div>
        )}

        <div style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 11, color: 'var(--text3)' }}>
          Drag nodes to reposition — scroll to zoom
        </div>
      </div>
    </>) :
    (
      <>
      <div
        style={{
          padding: '32px 24px',
          maxWidth: 900,
          margin: '0 auto',
        }}
      >
        <EmptyStateCard
          SvgIcon={<FiDatabase size={36} color='var(--accent)'/>}
          title="No repositories found"
          description="We couldn't find any repositories in this organization."
          buttonText="Go to Home"
          onButtonClick={() => navigate('/')}
        />
      </div>
      </>
    )}
    </div>
  )
}
