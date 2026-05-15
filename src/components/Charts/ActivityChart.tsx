import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { GoAlert, GoCheckbox } from "react-icons/go";


const TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

export default function ActivityChart({ orgs }: { orgs: string[] }) {

  const [data, setData] = useState<any[]>([]);
  const [filter, setFilter] = useState("30");
  const [loading, setLoading] = useState(false);

  const getDays = () => (filter === "7" ? 7 : 30);

  useEffect(() => {
    if (!orgs || orgs.length === 0) return;

    const timer = setTimeout(() => {
      fetchData();
    }, 500); 

    return () => clearTimeout(timer);

  }, [filter, orgs]);


  const fetchAllPages = async (url: string) => {
    let results: any[] = [];
    let page = 1;

    while (page <= 3) { //  limit pages (safe for rate limit)
      const res = await fetch(`${url}&page=${page}`, {
        headers: { Authorization: `token ${TOKEN}` }
      });

      const data = await res.json();

      if (!data.items || data.items.length === 0) break;

      results.push(...data.items);
      page++;
    }

    return results;
  };

  const updateChart = (prs: any[], issues: any[]) => {
    const days = getDays();
    const now = new Date();

    setData(prev => {
      const map: any = {};

      prev.forEach(d => {
        map[d.date] = { ...d };
      });

      prs.forEach((pr: any) => {
        const date = new Date(pr.created_at);
        const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

        if (diff <= days) {
          const key = date.toISOString().split("T")[0];
          if (!map[key]) return;

          map[key].prCreated += 1;
          if (pr.state === "closed") map[key].prMerged += 1;
        }
      });

      issues.forEach((issue: any) => {
        const date = new Date(issue.created_at);
        const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

        if (diff <= days) {
          const key = date.toISOString().split("T")[0];
          if (!map[key]) return;

          map[key].issuesCreated += 1;
          if (issue.state === "closed") map[key].issuesClosed += 1;
        }
      });

      return Object.values(map);
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setData(
        Array.from({ length: getDays() + 1 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (getDays() - i));
          const key = d.toISOString().split("T")[0];

          return {
            date: key,
            prCreated: 0,
            prMerged: 0,
            issuesCreated: 0,
            issuesClosed: 0
          };
        })
      );

      const days = getDays();
      const now = new Date();

      let allPRs: any[] = [];
      let allIssues: any[] = [];

      //  MULTI ORG + PAGINATION
      const orgPromises = orgs.map(async (org) => {

        const prs = await fetchAllPages(
          `https://api.github.com/search/issues?q=org:${org}+type:pr&per_page=100`
        );

        const issues = await fetchAllPages(
          `https://api.github.com/search/issues?q=org:${org}+type:issue&per_page=100`
        );

        return { prs, issues };
      });

      // const results = await Promise.all(orgPromises);

      orgs.forEach(async (org) => {
        try {
          const prs = await fetchAllPages(
            `https://api.github.com/search/issues?q=org:${org}+type:pr&per_page=100`
          );

          const issues = await fetchAllPages(
            `https://api.github.com/search/issues?q=org:${org}+type:issue&per_page=100`
          );

          //  update chart immediately for THIS org
          updateChart(prs, issues);

        } catch (err) {
          console.error(err);
        }
      });

      // results.forEach(r => {
      //   allPRs.push(...r.prs);
      //   allIssues.push(...r.issues);
      // });

      const chartMap: any = {};

      // PR DATA
      allPRs.forEach((pr: any) => {
        const date = new Date(pr.created_at);
        const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

        if (diff <= days) {
          const key = date.toISOString().split("T")[0];

          if (!chartMap[key]) {
            chartMap[key] = {
              date: key,
              prCreated: 0,
              prMerged: 0,
              issuesCreated: 0,
              issuesClosed: 0
            };
          }

          chartMap[key].prCreated++;
          if (pr.state === "closed") chartMap[key].prMerged++;
        }
      });

      // ISSUE DATA
      allIssues.forEach((issue: any) => {
        const date = new Date(issue.created_at);
        const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

        if (diff <= days) {
          const key = date.toISOString().split("T")[0];

          if (!chartMap[key]) {
            chartMap[key] = {
              date: key,
              prCreated: 0,
              prMerged: 0,
              issuesCreated: 0,
              issuesClosed: 0
            };
          }

          chartMap[key].issuesCreated++;
          if (issue.state === "closed") chartMap[key].issuesClosed++;
        }
      });

      //  FILL DAYS (NO BREAK LINES)
      const result: any[] = [];

      for (let i = days; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);

        const key = d.toISOString().split("T")[0];

        result.push({
          date: key,
          prCreated: chartMap[key]?.prCreated || 0,
          prMerged: chartMap[key]?.prMerged || 0,
          issuesCreated: chartMap[key]?.issuesCreated || 0,
          issuesClosed: chartMap[key]?.issuesClosed || 0
        });
      }

      console.log("FINAL COMBINED:", result);

      setData(result);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // INSIGHT
  const totalPR = data.reduce((a, b) => a + b.prCreated, 0);
  const mergedPR = data.reduce((a, b) => a + b.prMerged, 0);
  const mergeRate = totalPR ? Math.round((mergedPR / totalPR) * 100) : 0;

  return (
    <div className="mt-6">

      {/* TITLE */}
      <h2 className="text-white text-lg mb-2">
        {orgs.length > 1
          ? `Combined Analytics (${orgs.length} Organizations)`
          : ` Activity (${orgs[0]})`}
      </h2>

      {/* FILTER */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter("7")} className="bg-gray-700 px-3 py-1 rounded">7D</button>
        <button onClick={() => setFilter("30")} className="bg-gray-700 px-3 py-1 rounded">30D</button>
      </div>

      {/* LOADING */}
      {loading && (
        <p className="text-blue-400 mb-2">Loading data...</p>
      )}

      {/* INSIGHT */}
      <p className="text-gray-400 mb-4">
        {mergeRate > 70
          ? (<span className="flex items-center gap-2 text-green-400"> <GoCheckbox /> PR merge rate is strong</span>)
          : ( <span className="flex items-center gap-2 text-yellow-400"> <GoAlert /> PR merge rate dropped recently</span>)}
      </p>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* AREA CHART */}
        <div className="bg-gray-900 p-4 rounded-xl h-[320px]">
          <h3 className="mb-3 text-white">PR Trend</h3>

          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <XAxis dataKey="date" stroke="#aaa" tickFormatter={formatDate} />
              <YAxis stroke="#aaa" />
              <Tooltip />
              <Legend />

              <Area type="monotone" dataKey="prCreated" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.2} />
              <Area type="monotone" dataKey="prMerged" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* BAR CHART */}
        <div className="bg-gray-900 p-4 rounded-xl h-[320px]">
          <h3 className="mb-3 text-white">Issues Activity</h3>

          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="date" stroke="#aaa" tickFormatter={formatDate} />
              <YAxis stroke="#aaa" />
              <Tooltip />
              <Legend />

              <Bar dataKey="issuesCreated" fill="#facc15" />
              <Bar dataKey="issuesClosed" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}