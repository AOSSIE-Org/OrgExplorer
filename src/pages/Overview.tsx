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
// import { generateInsights } from "../utils/insights";
import TopContributors from "../components/TopContributors";

type Props = {
  orgInput: string;
  setOrgInput: React.Dispatch<React.SetStateAction<string>>;
  setOrgLogo: React.Dispatch<React.SetStateAction<string>>;
};

export default function Overview({ orgInput, setOrgInput, setOrgLogo }: Props) {

  const [repos, setRepos] = useState<Repo[]>([]);
  const [data, setData] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);

  const { score, label } = calculateOrgHealthScore(repos);

  //  DEFAULT LOAD
  useEffect(() => {
    const savedRepos = localStorage.getItem("repos");
    const savedInput = localStorage.getItem("orgInput");
    const savedLogo = localStorage.getItem("orgLogo");

    if (!savedInput) {
      handleSubmit("AOSSIE-Org"); // default
      return;
    }

    if (savedRepos) {
      const parsed: Repo[] = JSON.parse(savedRepos);
      setRepos(parsed);
      setData(getInsights(parsed));
    }

    if (savedInput) {
      setOrgInput(savedInput);
    }

    if (savedLogo) {
      setOrgLogo(savedLogo); // GLOBAL SET
    }

  }, []);

  //  ANALYZE
  const handleSubmit = async (input: string) => {
    setLoading(true);

    try {
      setOrgInput(input);

      const orgs = input.split(",").map(o => o.trim()).filter(Boolean);

      //  FAST LOGO (NO WAIT)
      fetch(`https://api.github.com/orgs/${orgs[0]}`)
        .then(res => res.json())
        .then(data => {
          setOrgLogo(data.avatar_url);
          localStorage.setItem("orgLogo", data.avatar_url);
        })
        .catch(() => setOrgLogo(""));

      //  MULTI ORG DATA
      const results = await Promise.all(orgs.map(fetchOrgRepos));
      const merged: Repo[] = mergeRepos(results);

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

  return (
    <div className="h-full overflow-y-auto pr-2">

      <OrgInput
        onSubmit={handleSubmit}
        value={orgInput}
        setValue={setOrgInput}
      />

      {loading && <p className="text-gray-400">Loading...</p>}

      {data && <InsightPanel data={data} />}

      <div className="mb-10 mt-24">
        <HealthScore score={score} label={label} />
      </div>

      {/* CHART */}
      {repos.length > 0 && (
        <ActivityChart
          orgs={orgInput.split(",").map(o => o.trim()).filter(Boolean)}
        />
      )}

      {/* CONTRIBUTORS */}
      {repos.length > 0 && (
        <TopContributors repos={repos} />
      )}

    </div>
  );
}