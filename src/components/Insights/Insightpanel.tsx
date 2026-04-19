
import StatCard from "../Cards/statCard";
import { IoIosStarOutline } from "react-icons/io"
import { GoRepo } from "react-icons/go";
import { useNavigate } from "react-router-dom";

export default function InsightPanel({ data }: { data: any }) {
  const navigate = useNavigate();
  return (
    <>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Repos" value={data.totalRepos} />
        <StatCard title="Stars" value={data.totalStars} />
        <StatCard title="Forks" value={data.totalForks} />
        <StatCard title="Inactive %" value={data.inactivePercent + "%"} />
      </div>
<div className="bg-[#111827] p-4 rounded-lg mt-4">
         <h3 className="text-sm text-gray-400 mb-3">High Activity Repositories</h3>

         <div className="space-y-2">
        

          {data.topRepos.map((repo: any, i: number) => (
            <div
              key={repo.id}
              onClick={() => navigate(`/repo/${repo.name}`, { state: repo })}
              className="flex justify-between items-center p-2 rounded hover:bg-gray-800 transition cursor-pointer"
            >
            <span className="text-white">
              {repo.name}
            </span>

            <span className="text-grey-400 text-sm inline-flex items-center gap-1">
              <IoIosStarOutline /> {repo.stargazers_count}
            </span>
          </div> 
         ))}
        </div>
      </div>

      <div className="bg-[#111827] p-4 rounded-lg mt-4">
  <h3 className="text-lg text-gray-200 mb-3">
    Key Insights
  </h3>

  <div className="space-y-2">
    {data.insights.map((insight: string, i: number) => (
      <div
        key={i}
        className="text-sm text-gray-300 bg-gray-900/50 p-2 rounded"
      >
        {insight}
      </div>
    ))}
  </div>
</div>
    </>
  );
}
