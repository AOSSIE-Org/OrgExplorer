import { useState, useMemo, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useContributors } from '../../hooks/useContributors';
import type { RepoData, Contributor } from '../../types';

interface Props {
  orgName: string;
  repos: RepoData[];
}

interface NodeData {
  id: string;
  name: string;
  group: 'repo' | 'contributor';
  val: number; // For node sizing
  color: string;
  data: RepoData | Contributor;
}

interface LinkData {
  source: string;
  target: string;
  value: number; // For link thickness
}

interface GraphData {
  nodes: NodeData[];
  links: LinkData[];
}

export default function NetworkTab({ orgName, repos }: Props) {
  const { contributors, loading, error, fromCache } = useContributors(orgName, repos);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const imgCache = useRef<Record<string, HTMLImageElement>>({});
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Handle resize safely
  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDimensions({ width: rect.width, height: rect.height });
    }
    
    // Simple window resize listener instead of aggressive ResizeObserver
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const graphData = useMemo<GraphData>(() => {
    if (!contributors.length || !repos.length) return { nodes: [], links: [] };

    const nodes: NodeData[] = [];
    const links: LinkData[] = [];
    const repoSet = new Set<string>();

    // We take more contributors now since the limits were increased
    const topContributors = contributors.slice(0, 150);

    // Build contributor nodes and links
    topContributors.forEach((c) => {
      const contrId = `user:${c.login}`;
      nodes.push({
        id: contrId,
        name: c.login,
        group: 'contributor',
        val: Math.max(5, Math.log10(c.contributions + 1) * 3),
        color: '#f08030', // Orange-ish for contributors
        data: c,
      });

      c.repos.forEach((repoName) => {
        repoSet.add(repoName);
        links.push({
          source: contrId,
          target: `repo:${repoName}`,
          value: Math.max(0.5, c.contributions / Math.max(1, c.repos.length) / 10),
        });
      });
    });

    // Build repo nodes for all repos that have links
    repos.forEach((r) => {
      if (repoSet.has(r.name)) {
        nodes.push({
          id: `repo:${r.name}`,
          name: r.name,
          group: 'repo',
          val: Math.max(4, Math.log10(r.stargazers_count + 1) * 2), // Size by stars
          color: '#388bfd', // Blue-ish for repos
          data: r,
        });
      }
    });

    return { nodes, links };
  }, [contributors, repos]);

  // Center the graph after load and adjust physics
  useEffect(() => {
    if (graphRef.current) {
      try {
        // Explode the graph physics to aggressively solve overlapping
        // since nodes are manually drawn much larger than the default d3 particles
        graphRef.current.d3Force('charge')?.strength(-4000);
        graphRef.current.d3Force('charge')?.distanceMax(2500);
        graphRef.current.d3Force('link')?.distance(250);
      } catch (e) {
        console.error("Force configuration error", e);
      }
    }

    if (graphData.nodes.length > 0) {
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 20);
      }, 500);
    }
  }, [graphData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--fg-muted)', gap: 10 }}>
        <div className="spinner" />
        Loading network data…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, background: 'rgba(248,81,73,0.1)', borderRadius: 'var(--radius)', border: '1px solid rgba(248,81,73,0.3)', color: '#f85149' }}>
        Failed to load network data: {error}
      </div>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--fg-muted)' }}>No network data available</div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {fromCache && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-muted)' }}>
          <span style={{
            background: 'rgba(56,139,253,0.1)',
            color: 'var(--accent)',
            border: '1px solid rgba(56,139,253,0.3)',
            borderRadius: 12,
            padding: '2px 10px',
            fontSize: 11,
            fontWeight: 600,
          }}>
            Data cached locally
          </span>
        </div>
      )}
      
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ borderBottom: '1px solid var(--border-default)', padding: '16px' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--fg-default)' }}>
            Contributor & Repository Ecosystem
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--fg-muted)' }}>
            Nodes interact physically. Draggable elements. Colors: 
            <span style={{ color: '#388bfd', fontWeight: 'bold', marginLeft: 6 }}>Repos</span> vs 
            <span style={{ color: '#f08030', fontWeight: 'bold', marginLeft: 6 }}>Contributors</span>
          </p>
        </div>
        
        <div ref={containerRef} style={{ width: '100%', height: '600px', backgroundColor: 'var(--bg-default)' }}>
          <ForceGraph2D
            ref={graphRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
              nodeLabel={() => ''} /* Disable default tooltip since we draw text natively */
              nodeRelSize={1}
              linkColor={() => '#a0d911'}
              linkWidth={(link: any) => Math.min(6, Math.max(1, Math.log10(link.value + 1) * 3))}
              nodeCanvasObject={(node: any, ctx) => {
              const isRepo = node.group === 'repo';
              const label = node.name;
              
              const width = isRepo ? 110 : 90;
              const height = isRepo ? 56 : 85;

              // Card Background
              ctx.fillStyle = '#101418';
              ctx.beginPath();
              (ctx as any).roundRect(node.x - width/2, node.y - height/2, width, height, 6);
              ctx.fill();
              
              // Card Border
              ctx.strokeStyle = '#30363d';
              ctx.lineWidth = 1;
              ctx.stroke();

              ctx.textAlign = 'center';

              if (isRepo) {
                // Repo Icon (</>) Placeholder
                ctx.fillStyle = '#f0c040'; // yellow box
                ctx.beginPath();
                (ctx as any).roundRect(node.x - 12, node.y - height/2 + 6, 24, 16, 4);
                ctx.strokeStyle = '#f0c040';
                ctx.stroke();
                ctx.fillStyle = '#101418';
                ctx.fill();
                ctx.fillStyle = '#f0c040';
                ctx.font = '10px Sans-Serif';
                ctx.textBaseline = 'middle';
                ctx.fillText('</>', node.x, node.y - height/2 + 15);

                // Repo Name
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Sans-Serif';
                ctx.fillText(label, node.x, node.y + 2);

                // Repo Stats
                ctx.fillStyle = '#8b949e';
                ctx.font = '10px Sans-Serif';
                const stats = `★${node.data.stargazers_count}   ⑂${node.data.forks_count}   !${node.data.open_issues_count}`;
                ctx.fillText(stats, node.x, node.y + 16);
              } else {
                // Contributor Layout
                const url = node.data.avatar_url;
                if (!imgCache.current[url]) {
                  const img = new Image();
                  img.src = url;
                  imgCache.current[url] = img;
                }
                const img = imgCache.current[url];
                if (img && img.complete && img.naturalHeight) {
                  ctx.save();
                  ctx.beginPath();
                  (ctx as any).roundRect(node.x - 16, node.y - height/2 + 8, 32, 32, 4);
                  ctx.clip();
                  ctx.drawImage(img, node.x - 16, node.y - height/2 + 8, 32, 32);
                  ctx.restore();
                  ctx.strokeStyle = '#3fb950'; // green border around image
                  ctx.lineWidth = 1.5;
                  ctx.stroke();
                }

                // Name
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 11px Sans-Serif';
                ctx.textBaseline = 'middle';
                // Trim long names
                const displayName = label.length > 12 ? label.substring(0, 10) + '..' : label;
                ctx.fillText(displayName, node.x, node.y + 13);

                // Commits Badge
                const commits = node.data.contributions;
                const badgeWidth = 60;
                const badgeHeight = 16;
                ctx.fillStyle = 'rgba(63, 185, 80, 0.1)';
                ctx.beginPath();
                (ctx as any).roundRect(node.x - badgeWidth/2, node.y + 24, badgeWidth, badgeHeight, 4);
                ctx.fill();
                ctx.strokeStyle = '#3fb950';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = '#3fb950';
                ctx.font = '9px Sans-Serif';
                ctx.fillText(`${commits} commits`, node.x, node.y + 24 + badgeHeight/2);
              }
            }}
            nodePointerAreaPaint={(node: any, color, ctx) => {
              const width = node.group === 'repo' ? 110 : 90;
              const height = node.group === 'repo' ? 56 : 85;
              ctx.fillStyle = color;
              ctx.fillRect(node.x - width/2, node.y - height/2, width, height);
            }}
              enableNodeDrag={true}
              enablePanInteraction={true}
              enableZoomInteraction={true}
              onNodeClick={(node: any) => {
                if (node.group === 'contributor') {
                  window.open((node.data as Contributor).html_url, '_blank');
                } else if (node.group === 'repo') {
                  window.open((node.data as RepoData).html_url, '_blank');
                }
              }}
            />
        </div>
      </div>
    </div>
  );
}
