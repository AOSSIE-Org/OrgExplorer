import ForceGraph2D from "react-force-graph-2d";
import { useEffect, useState, useRef } from "react";
import { fetchRepoContributors } from "../../services/githubService";
import * as d3 from "d3-force";

export default function NetworkGraph({ repos }: any) {
  const [graphData, setGraphData] = useState<any>({
    nodes: [],
    links: []
  });

  const fgRef = useRef<any>(null);

  //  IMAGE CACHE
  const imageCache = useRef<{ [key: string]: HTMLImageElement }>({});

  //  BUILD GRAPH
  useEffect(() => {
    const buildGraph = async () => {
      const nodes: any[] = [];
      const links: any[] = [];
      const addedUsers = new Set();

      for (let repo of repos.slice(0, 6)) {
        nodes.push({
          id: repo.name,
          type: "repo",
          stars: repo.stargazers_count
        });

        try {
          const contributors = await fetchRepoContributors(repo.contributors_url);

          contributors.slice(0, 5).forEach((c: any) => {
            if (!addedUsers.has(c.login)) {
              addedUsers.add(c.login);

              nodes.push({
                id: c.login,
                type: "user",
                contributions: c.contributions,
                avatar: c.avatar_url
              });
            }

            links.push({
              source: c.login,
              target: repo.name,
              weight: c.contributions
            });
          });

        } catch (e) {
          console.error(e);
        }
      }

      setGraphData({ nodes, links });
    };

    if (repos.length) buildGraph();
  }, [repos]);

  // FORCE SETTINGS
  useEffect(() => {
    if (!fgRef.current) return;

    fgRef.current.d3Force("center", d3.forceCenter(0, 0));
    fgRef.current.d3Force("charge", d3.forceManyBody().strength(-100));
    fgRef.current.d3Force("link", d3.forceLink().distance(70));

    fgRef.current.d3Force(
      "radial",
      d3.forceRadial((node: any) => {
        return node.type === "repo" ? 80 : 180;
      }).strength(0.8)
    );

  }, [graphData]);

  useEffect(() => {
  if (!fgRef.current) return;

  //  trigger render after mount
  setTimeout(() => {
    fgRef.current.zoomToFit(400);
  }, 300);
}, [graphData]);

  return (
    <div className="h-[650px] relative overflow-hidden bg-[#020617] rounded-xl mt-6 border border-gray-800">

      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        backgroundColor="#020617"

        enableZoomInteraction={true}
        enablePanInteraction={true}
        enableNodeDrag={false}
        autoPauseRedraw={false}

        minZoom={0.5}
        maxZoom={2}

        onZoomEnd={({k, x, y}) => {
          const limit = 200;

          if(Math.abs(x) > limit || Math.abs(y) > limit) {
            fgRef.current.centerAt(0, 0, 400);
          }
        }}
        // AUTO CENTER + FREEZE
        onEngineStop={() => {
          fgRef.current.centerAt(0, 0, 400);
          fgRef.current?.zoomToFit(400);

          graphData.nodes.forEach((node: any) => {
            node.fx = node.x;
            node.fy = node.y;
          });

          fgRef.current?.pauseAnimation();
        }}

        d3VelocityDecay={0.3}
        d3AlphaDecay={0.02}
        cooldownTicks={100}
        warmupTicks={100}

        // TOOLTIP
        nodeLabel={(node: any) =>
          node.type === "repo"
            ? `📦 ${node.id} (⭐ ${node.stars})`
            : `👤 ${node.id} (${node.contributions})`
        }

        // NODE RENDER (FIXED AVATAR)
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const size =
            node.type === "repo"
              ? 10 + Math.log(node.stars + 1)
              : 5; 

          const fontSize = 9 / globalScale;

          if (node.type === "user" && node.avatar) {
            let img = imageCache.current[node.avatar];

            if (!img) {
              img = new Image();
              img.src = node.avatar;
              imageCache.current[node.avatar] = img;
            }

            ctx.save();
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.clip();

            if (img.complete) {
              ctx.drawImage(
                img,
                node.x - size,
                node.y - size,
                size * 2,
                size * 2
              );
            }

            ctx.restore();

            // white border
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.stroke();

          } else {
            // repo node
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
            ctx.fillStyle = "#22c55e";
            ctx.fill();
          }

          // label
          ctx.font = `${fontSize}px Inter`;
          ctx.fillStyle = "#e2e8f0";
          ctx.fillText(node.id, node.x + size + 2, node.y + size / 2);
        }}

        // EDGE DESIGN (VISIBLE)
        linkWidth={(link: any) =>
          Math.max(1, Math.log(link.weight + 1))
        }

        linkColor={() => "rgba(200,200,200,0.6)"} 

        linkDirectionalParticles={1}
        linkDirectionalParticleSpeed={0.002}

        // HOVER
        onNodeHover={(node) => {
          document.body.style.cursor = node ? "pointer" : "default";
        }}
      />
    </div>
  );
}