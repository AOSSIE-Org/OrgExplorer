import type { Insight } from "../../types/github";
import StatCard from "../Cards/statCard";

export default function InsightPanel({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Repos" value={data.totalRepos} />
        <StatCard title="Stars" value={data.totalStars} />
        <StatCard title="Forks" value={data.totalForks} />
        <StatCard title="Inactive %" value={data.inactivePercent + "%"} />
      </div>

    </>
  );
}