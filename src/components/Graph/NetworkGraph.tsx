import ForceGraph2D from "react-force-graph-2d";
import { useEffect, useState, useRef } from "react";
import { fetchRepoContributors } from "../../services/githubService";

export default function NetworkGraph({ repos }: any) {

  const [graphData, setGraphData] = useState<any>({
    nodes: [],
    links: []
  });

  const fgRef = useRef<any>(null); //  FIX

  useEffect(() => {
    const buildGraph = async () => {
      const nodes: any[] = [];
      const links: any[] = [];
      const userMap = new Map();

      for (let repo of repos.slice(0, 10)) {

        //  Repo node
        nodes.push({
          id: repo.name,
          type: "repo",
          stars: repo.stargazers_count
        });

        try {
          const contributors = await fetchRepoContributors(repo.contributors_url);

          contributors.slice(0, 10).forEach((c: any) => {

            // USER NODE (unique)
            if (!userMap.has(c.login)) {
              userMap.set(c.login, true);

              nodes.push({
                id: c.login,
                type: "user",
                img: c.avatar_url,
                contributions: c.contributions
              });
            }

            //LINK repo-user
            links.push({
              source: c.login,
              target: repo.name,
              weight: c.contributions
            });

            //  USER ↔ USER CONNECTION (dense graph)
            contributors.slice(0, 5).forEach((other: any) => {
              if (other.login !== c.login) {
                links.push({
                  source: c.login,
                  target: other.login,
                  weight: 1
                });
              }
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

  useEffect(() => {
      if (!fgRef.current) return;

      const fg = fgRef.current;

      //  Charge force (node spread)
      fg.d3Force("charge").strength(-120);

      // Link distance
      fg.d3Force("link").distance(80);

      // Centering
      fg.d3Force("center", null);
    }, [graphData]);

  return (
    <div className="w-full h-[calc(100vh-80px)] bg-[#020617] rounded-xl mt-6 border border-gray-800">

      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}

        backgroundColor="#020617"

        //  DISABLE DRAG (static feel)
        enableNodeDrag={false}

        //  DISABLE PAN (no movement)
        enablePanInteraction={false}

        //  ONLY ZOOM allowed
        enableZoomInteraction={true}

        //  REMOVE AUTO MOVE
        cooldownTicks={0}

        //  STOP physics after load
        onEngineStop={() => {
          fgRef.current?.zoomToFit(400);
        }}

        d3VelocityDecay={0.9} // fast stop
        d3AlphaDecay={0.1}    // instant stable

        nodeLabel={(node: any) =>
          node.type === "repo"
            ? `📦 ${node.id}`
            : `👤 ${node.id}`
        }

        //  NODE DRAW (DP + NAME)
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const size =
            node.type === "repo"
              ? 10
              : 6;

          const fontSize = 10 / globalScale;

          if (node.type === "user" && node.img) {
            const img = new Image();
            img.src = node.img;

            ctx.save();
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, node.x - size, node.y - size, size * 2, size * 2);
            ctx.restore();
          } else {
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
            ctx.fillStyle = "#22c55e";
            ctx.fill();
          }

          // 🏷 NAME
          ctx.font = `${fontSize}px Inter`;
          ctx.fillStyle = "#e2e8f0";
          ctx.fillText(node.id, node.x + size + 2, node.y);
        }}

        // 🔗 LINKS
        linkWidth={(link: any) => Math.log(link.weight + 1)}

        linkColor={() => "#22c55e"}

        linkDirectionalParticles={1}
        linkDirectionalParticleSpeed={0.002}
        linkDirectionalParticleWidth={1}
        linkDirectionalParticleColor={() => "#22c55e"}
      />
    </div>
  );
}