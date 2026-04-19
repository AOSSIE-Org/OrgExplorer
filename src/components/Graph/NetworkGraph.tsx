import ForceGraph2D from "react-force-graph-2d";
import { useEffect, useRef, useState } from "react";
import { fetchRepoContributors } from "../../services/githubService";
import { exportCSV } from "../../utils/exportCSV";
import { GoPeople, GoRepo, GoGitBranch, GoLink } from "react-icons/go";
import { FaLink } from "react-icons/fa";
import { IoPeople } from "react-icons/io5";


type NodeType = {
  id: string;
  type: "repo" | "user";
  label: string;
  img?: string;

  stars?: number;
  forks?: number;
  issues?: number;

  contributions?: number;
  activity?: number;

  size?: number;
  org?: string;
};

type LinkType = {
  source: string;
  target: string;
  weight: number;
};

export default function NetworkGraph({ repos }: any) {
  const fgRef = useRef<any>(null);

  const [graphData, setGraphData] = useState<{
    nodes: NodeType[];
    links: LinkType[];
  }>({ nodes: [], links: [] });

  const [selectedNode, setSelectedNode] = useState<NodeType | null>(null);
  const [stats, setStats] = useState({
    users: 0,
    repos: 0,
    edges: 0,
  });
  const [hoverNode, setHoverNode] = useState<any>(null);
  const [focusNode, setFocusNode] = useState<NodeType | null>(null);

  /* ───────── BUILD GRAPH (MULTI ORG FIX) ───────── */
  useEffect(() => {
    if (!repos?.length) return;

    const build = async () => {
      const nodes: NodeType[] = [];
      const links: LinkType[] = [];
      const userMap = new Map();

      //  GROUP BY ORG
      const orgGrouped: Record<string, any[]> = {};

      repos.forEach((repo: any) => {
        const org = repo.full_name.split("/")[0];
        if (!orgGrouped[org]) orgGrouped[org] = [];
        orgGrouped[org].push(repo);
      });

      //  TAKE 4 REPOS PER ORG
      const selectedRepos: any[] = [];
      Object.values(orgGrouped).forEach((list: any[]) => {
        selectedRepos.push(...list.slice(0, 4));
      });

      for (const repo of selectedRepos) {
        const org = repo.full_name.split("/")[0];

        //  REPO NODE
        nodes.push({
          id: repo.full_name,
          type: "repo",
          label: repo.name,
          org,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          issues: repo.open_issues_count,
          activity: new Date(repo.updated_at).getTime(),
          size:
            Math.log((repo.stargazers_count || 1) + 1) * 4 +
            Math.log((repo.forks_count || 1) + 1) * 2 +
            8,
        });

        try {
          const contributors = await fetchRepoContributors(
            `${repo.contributors_url}?per_page=30`
          );

          contributors.slice(0, 15).forEach((c: any) => {
            if (!c?.login) return;

            if (!userMap.has(c.login)) {
              userMap.set(c.login, true);

              nodes.push({
                id: c.login,
                type: "user",
                label: c.login,
                img: c.avatar_url,
                contributions: c.contributions,
                activity: c.contributions,
                size: Math.log((c.contributions || 1) + 1) * 3 + 6,
              });
            }

            links.push({
              source: c.login,
              target: repo.full_name,
              weight: c.contributions || 1,
            });
          });
        } catch (err) {
          console.log(err);
        }
      }
      setStats({
        users: nodes.filter(n => n.type === "user").length,
        repos: nodes.filter(n => n.type === "repo").length,
        edges: links.length,
      });
      setGraphData({ nodes, links });
    };


    build();
  }, [repos]);


  /* ───────── FORCE LAYOUT (MULTI ORG FIXED) ───────── */
  useEffect(() => {
    if (!fgRef.current) return;

    const fg = fgRef.current;

    fg.d3Force("charge").strength(-320);

    fg.d3Force("link").distance((l: any) =>
      Math.max(80, 200 - Math.log2(l.weight + 1) * 25)
    );

    //  ORGS
    const orgs: string[] = Array.from(
      new Set(
        graphData.nodes
          .filter((n) => n.type === "repo" && n.org)
          .map((n) => n.org as string)
      )
    );

    const orgMap: Record<string, number> = {};
    const gap = 400;

    orgs.forEach((org, i) => {
      orgMap[org] = (i - (orgs.length - 1) / 2) * gap;
    });

    //  X FORCE
    fg.d3Force("x", (node: any) => {
      if (node.type === "repo") {
        return node.org ? orgMap[node.org] ?? 0 : 0;
      }

      const linked = graphData.links.find((l) => l.source === node.id);

      if (!linked) return 0;

      const repoNode = graphData.nodes.find(
        (n) => n.id === linked.target
      ) as NodeType | undefined;

      if (!repoNode || !repoNode.org) return 0;

      return orgMap[repoNode.org] ?? 0;
    });

    //  Y FORCE (activity)
    fg.d3Force("y", (node: any) => {
      const act = node.activity || 1;
      const norm = Math.min(1, Math.log(act + 1) / 10);

      return node.type === "repo"
        ? -300 * norm
        : 300 * (1 - norm);
    });
  }, [graphData]);

  // ========================================================================================
  const isConnectedToFocus = (nodeId: string) => {
    if (!focusNode) return true;

    const focusId = focusNode.id;

    return graphData.links.some((l: any) => {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;

      return (
        (s === nodeId && t === focusId) ||
        (t === nodeId && s === focusId)
      );
    });
  };
  // =======================================================
  /* ───────── NODE DRAW ───────── */

  const drawNode = (node: any, ctx: CanvasRenderingContext2D, scale: number) => {
    const padding = 6;

    //  dynamic width based on text
    const label = node.label || "";
    ctx.font = `${9 / scale}px Arial`;
    const textWidth = ctx.measureText(label).width;

    const width = Math.max(80, textWidth + 40); // auto width
    const height = 52;

    const x = node.x - width / 2;
    const y = node.y - height / 2;

    //  helper for id (IMPORTANT FIX)
    const getId = (val: any) =>
      typeof val === "object" ? val.id : val;

    let opacity = 1;

    //  PRIORITY: FOCUS MODE
    if (focusNode) {
      const isConnected = isConnectedToFocus(node.id);

      if (node.id !== focusNode.id && !isConnected) {
        opacity = 0.1;
      }
    }

    //  SECOND: HOVER MODE
    else if (hoverNode) {
      const getId = (val: any) =>
        typeof val === "object" ? val.id : val;

      const isConnected = graphData.links.some((l: any) => {
        const s = getId(l.source);
        const t = getId(l.target);

        return (
          (s === node.id && t === hoverNode.id) ||
          (t === node.id && s === hoverNode.id)
        );
      });

      if (node.id !== hoverNode.id && !isConnected) {
        opacity = 0.1;
      }
    }

    ctx.globalAlpha = opacity;

    //  CARD BACKGROUND (glass style)
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.strokeStyle = node.type === "repo" ? "#facc15" : "#22c55e";
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 10);
    ctx.fill();
    ctx.stroke();

    // avatar
    if (node.img) {
      const img = new Image();
      img.src = node.img;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x + padding, y + padding, 22, 22, 4);
      ctx.clip();
      ctx.drawImage(img, x + padding, y + padding, 22, 22);
      ctx.restore();
    }

    // TEXT CLIP (IMPORTANT — no overflow)
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 30, y + 5, width - 35, 20);
    ctx.clip();

    ctx.fillStyle = "#e5e7eb";
    ctx.fillText(label, x + 30, y + 18);
    ctx.restore();

    // 📊 contributions / stats
    if (node.contributions) {
      ctx.fillStyle = "#22c55e";
      ctx.font = `${8 / scale}px Arial`;
      ctx.fillText(`${node.contributions} commits`, x + 30, y + 35);
    }

    if (node.type === "repo") {
      ctx.fillStyle = "#facc15";
      ctx.font = `${8 / scale}px Arial`;
      ctx.fillText("repo", x + 30, y + 35);
    }

    ctx.globalAlpha = 1;

    if (focusNode) {
      const isConnected = isConnectedToFocus(node.id);

      if (node.id !== focusNode.id && !isConnected) {
        opacity = 0.1; //  dim others
      }
    }
  };
  /* ───────── LINK DRAW ───────── */

  const topContributor = graphData.nodes
    .filter(n => n.type === "user")
    .sort((a, b) => (b.contributions || 0) - (a.contributions || 0))[0];

  const mostActiveRepo = graphData.nodes
    .filter(n => n.type === "repo")
    .sort((a, b) => (b.activity || 0) - (a.activity || 0))[0];

  const strongestLink = graphData.links
    .sort((a, b) => b.weight - a.weight)[0];

  const getId = (val: any) =>
    typeof val === "object" ? val.id : val;

  //  TOTAL UNIQUE CONTRIBUTORS
  const totalUniqueContributors = new Set(
    graphData.nodes
      .filter(n => n.type === "user")
      .map(n => n.id)
  ).size;


  //  SHARED CONTRIBUTORS
  const contributorOrgs: Record<string, Set<string>> = {};

  graphData.links.forEach((l: any) => {
    const user = typeof l.source === "object" ? l.source.id : l.source;
    const repo = graphData.nodes.find(n => n.id === l.target);

    if (!repo?.org) return;

    if (!contributorOrgs[user]) {
      contributorOrgs[user] = new Set();
    }

    contributorOrgs[user].add(repo.org);
  });

  const sharedContributors = Object.values(contributorOrgs).filter(
    (orgSet) => orgSet.size > 1
  ).length;

  const drawLink = (link: any, ctx: CanvasRenderingContext2D) => {
    const getId = (val: any) =>
      typeof val === "object" ? val.id : val;

    const s = link.source;
    const t = link.target;

    if (!s?.x || !t?.x) return;

    let opacity = 0.3;

    if (focusNode) {
      const sourceId = getId(link.source);
      const targetId = getId(link.target);

      if (sourceId === focusNode.id || targetId === focusNode.id) {
        opacity = 1;
      } else {
        opacity = 0.05;
      }
    } else if (hoverNode) {
      const sourceId = getId(link.source);
      const targetId = getId(link.target);

      if (sourceId === hoverNode.id || targetId === hoverNode.id) {
        opacity = 1;
      } else {
        opacity = 0.05;
      }
    }

    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(t.x, t.y);

    ctx.strokeStyle = `rgba(34,197,94,${opacity})`;
    ctx.lineWidth = Math.max(1, Math.log2(link.weight + 1));

    ctx.stroke();
  };
  /* ───────── UI ───────── */

  return (
    <div className="relative w-full h-[100vh] bg-[#020617] rounded-xl overflow-hidden">

      <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-center">

        {/* LEFT SIDE (FULL WIDTH STATS) */}
        <div className="flex gap-4 items-center 
    w-full mr-4
    bg-[#020617]/80 backdrop-blur-md 
    border border-gray-700 px-5 py-3 
    rounded-xl shadow-lg 
    text-base font-medium 
    whitespace-nowrap overflow-x-auto">

          <div className="bg-gray-900 px-3 py-1 rounded border border-gray-700">
            <GoPeople /> {stats.users} Contributors
          </div>

          <div className="bg-gray-900 px-3 py-1 rounded border border-gray-700">
            <GoRepo /> {stats.repos} Repos
          </div>

          <div className="bg-gray-900 px-3 py-1 rounded border border-gray-700">
            <GoGitBranch /> {stats.edges} Links
          </div>

          <div className="bg-purple-900/30 px-3 py-1 rounded border border-purple-500/30">
            <IoPeople /> {totalUniqueContributors} Total
          </div>

          <div className="bg-pink-900/30 px-3 py-1 rounded border border-pink-500/30">
            <FaLink /> {sharedContributors} Shared
          </div>

          <div className="bg-green-900/30 px-3 py-1 rounded border border-green-500/30">
            Top Contributor : {topContributor?.label}
          </div>

          <div className="bg-yellow-900/30 px-3 py-1 rounded border border-yellow-500/30">
            Most Active Repo : {mostActiveRepo?.label}
          </div>

          <div className="bg-blue-900/30 px-3 py-1 rounded border border-blue-500/30">
            <GoLink /> {getId(strongestLink?.source)} → {getId(strongestLink?.target)}
          </div>

        </div>

        {/* RIGHT SIDE BUTTON */}
        <button
          onClick={() => exportCSV(graphData)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg whitespace-nowrap"
        >
          ⬇ Export CSV
        </button>

      </div>

      {selectedNode && (
        <div className="absolute right-6 top-20 w-72 bg-[#0f172a] border border-green-500 p-4 rounded-xl text-white shadow-xl z-50">

          <button onClick={() => setSelectedNode(null)} className="absolute top-2 right-3 text-gray-400 hover:text-white">
            ✕
          </button>

          <div className="flex items-center gap-3 mb-3">
            {selectedNode.img && (
              <img src={selectedNode.img} className="w-12 h-12 rounded-lg" />
            )}
            <div>
              <h3 className="font-bold text-lg">{selectedNode.label}</h3>
              <p className="text-green-400 text-sm">
                {selectedNode.type === "user" ? "Contributor" : "Repository"}
              </p>
            </div>
          </div>

          {selectedNode.type === "user" ? (
            <>
              <p>Commits: {selectedNode.contributions}</p>
            </>
          ) : (
            <>
              <p>⭐ Stars: {selectedNode.stars}</p>
              <p>🍴 Forks: {selectedNode.forks}</p>
            </>
          )}

          <a
            href={`https://github.com/${selectedNode.id}`}
            target="_blank"
            className="block mt-4 text-center bg-green-600 py-2 rounded"
          >
            Open GitHub →
          </a>
        </div>


      )}

      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={window.innerWidth}
        height={window.innerHeight * 0.8}
        backgroundColor="#020617"

        nodeCanvasObject={drawNode}
        linkCanvasObject={drawLink}

        //  FIX: BIGGER HOVER AREA
        nodePointerAreaPaint={(node: any, color, ctx) => {
          const width = 100;
          const height = 60;

          ctx.fillStyle = color;
          ctx.fillRect(
            node.x - width / 2,
            node.y - height / 2,
            width,
            height
          );
        }}

        onNodeHover={(node: any) => {
          setHoverNode(node);
          document.body.style.cursor = node ? "pointer" : "default";
        }}

        onNodeClick={(node: any) => {
          setSelectedNode(node);
          setFocusNode(node);
        }}

        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.004}

        onEngineStop={() => fgRef.current?.zoomToFit(400)}
      />
    </div>
  );
}
