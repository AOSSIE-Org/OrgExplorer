import { useState, useEffect } from "react";
import OrgInput from "../components/Input/OrgInput";
import InsightPanel from "../components/Insights/Insightpanel";
import ActivityChart from "../components/Charts/ActivityChart";
import { fetchOrgRepos } from "../services/githubService";
import { mergeRepos } from "../utils/mergeOrgs";
import { getInsights } from "../utils/insightEngine";
import HealthScore from "../components/HealthScore";
import { calculateOrgHealthScore } from "../utils/calculateScore";
import type { Repo, Insight } from "../types/github";
import { generateInsights } from "../utils/insights";


//  PROPS TYPE
type Props = {
  orgInput: string;
  setOrgInput: React.Dispatch<React.SetStateAction<string>>;
};

export default function Overview({ orgInput, setOrgInput }: Props) {

  const [repos, setRepos] = useState<Repo[]>([]);
  const [data, setData] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);

  const { score, label } = calculateOrgHealthScore(repos);

  // RESTORE DATA
  useEffect(() => {
    const savedRepos = localStorage.getItem("repos");
    const savedInput = localStorage.getItem("orgInput");

    if (savedRepos) {
      const parsed: Repo[] = JSON.parse(savedRepos);
      setRepos(parsed);
      setData(getInsights(parsed));
    }

    if (savedInput) {
      setOrgInput(savedInput); //  sync with topbar
    }
  }, [setOrgInput]);

  // ANALYZE
  const handleSubmit = async (input: string) => {
    setLoading(true);
    try {
      setOrgInput(input); // GLOBAL UPDATE

      const orgs = input.split(",").map(o => o.trim());

      const results = await Promise.all(orgs.map(fetchOrgRepos));
      const merged: Repo[] = mergeRepos(results);

      console.log("TOTAL REPOS:", merged.length);

      setRepos(merged);

      localStorage.setItem("repos", JSON.stringify(merged));
      localStorage.setItem("orgInput", input);

      const insights: Insight = getInsights(merged);
      setData(insights);

    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  };

  const insights = generateInsights(repos);

  return (
    <div className="h-full overflow-y-auto pr-2">

      {/*  INPUT */}
      <OrgInput
        onSubmit={handleSubmit}
        value={orgInput}
        setValue={setOrgInput}
      />

      {/*  LOADING */}
      {loading && <p className="text-gray-400">Loading...</p>}

      {data && <InsightPanel data={data} />}

      <div className="mt-6 bg-[#0B1220] p-4 rounded-xl border border-gray-800">
        <h3 className="text-lg font-semibold mb-3 text-green-400">
          Insights
        </h3>

        <ul className="space-y-2 text-sm text-gray-300">
          {insights.map((insight, i) => (
            <li key={i}>• {insight}</li>
          ))}
        </ul>
      </div>

      <div className="mb-10 mt-24">
        <HealthScore score={score} label={label} />
      </div>


      {/* CHART + EXPORT */}
      {repos.length > 0 && (
        <div className="mt-4">

          {/* CHART */}
          <ActivityChart repos={repos} />

        </div>
      )}

    </div>
  );
}
