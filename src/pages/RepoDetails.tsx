import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer
} from "recharts";
import { FaCodeBranch, FaGithub } from "react-icons/fa";
import { IoIosStarOutline } from "react-icons/io";
import { MdOutlineReportGmailerrorred } from "react-icons/md";
;

const TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

export default function RepoDetails() {
    const { state } = useLocation();
    const repo = state;

    const [contributors, setContributors] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        if (!repo) return;

        fetchContributors();
        fetchActivity();
    }, []);

    // CONTRIBUTORS
    const fetchContributors = async () => {
        const res = await fetch(repo.contributors_url, {
            headers: { Authorization: `token ${TOKEN}` }
        });
        const data = await res.json();
        setContributors(data.slice(0, 4));
    };

    //  ACTIVITY CHART
    const fetchActivity = async () => {
        const res = await fetch(
            `https://api.github.com/repos/${repo.full_name}/issues?per_page=100`,
            { headers: { Authorization: `token ${TOKEN}` } }
        );

        const data = await res.json();

        const map: any = {};

        data.forEach((item: any) => {
            const d = new Date(item.created_at)
                .toISOString()
                .split("T")[0];

            if (!map[d]) map[d] = { date: d, issues: 0 };

            map[d].issues++;
        });

        const result = Object.values(map);
        setChartData(result);
    };

    if (!repo) {
        return <p className="text-white">No repo data</p>;
    }

    const formatDate = (date: string) => {
        const d = new Date(date);
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    };

    return (
        <div className="p-6 text-white h-full overflow-y-auto">

            {/* TITLE */}
            <h1 className="text-2xl font-bold mb-4">
                {repo.name}
            </h1>

            {/*  STAT CARDS */}
            <div className="grid grid-cols-3 gap-4 mb-6">

                {/* STARS */}
                <div className="bg-gray-800 p-4 rounded flex items-center gap-3">
                    <IoIosStarOutline className="text-yellow-400 text-xl" />
                    <div>
                        <p className="text-sm text-gray-400">Stars</p>
                        <p className="text-lg font-bold">{repo.stargazers_count}</p>
                    </div>
                </div>

                {/* FORKS */}
                <div className="bg-gray-800 p-4 rounded flex items-center gap-3">
                    <FaCodeBranch className="text-blue-400 text-xl" />
                    <div>
                        <p className="text-sm text-gray-400">Forks</p>
                        <p className="text-lg font-bold">{repo.forks_count}</p>
                    </div>
                </div>

                {/* ISSUES */}
                <div
                    className="bg-gray-800 p-4 rounded flex items-center gap-3 cursor-pointer hover:bg-gray-700"
                    onClick={() =>
                        window.open(repo.html_url + "/issues", "_blank")
                    }
                >
                    <MdOutlineReportGmailerrorred className="text-red-400 text-xl" />
                    <div>
                        <p className="text-sm text-gray-400">Issues</p>
                        <p className="text-lg font-bold">{repo.open_issues_count}</p>
                    </div>
                </div>

            </div>

            {/*  AREA CHART */}
            <div className="bg-gray-900 p-4 rounded mb-6">
                <h3 className="mb-2"> Issues Activity</h3>

                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData}>
                        <XAxis dataKey="date" tick />
                        <YAxis />
                        <Tooltip />

                        <Area
                            type="monotone"
                            dataKey="issues"
                            stroke="#22c55e"
                            fill="#22c55e"
                            fillOpacity={0.2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/*  CONTRIBUTORS */}
            <div className="bg-gray-900 p-4 rounded mb-6">
                <h3 className="mb-3">Top Contributors</h3>

                <div className="grid grid-cols-2 gap-4">
                    {contributors.map((c: any) => (

                        <div
                            key={c.id}
                            onClick={() => window.open(c.html_url, "_blank")}
                            className="flex items-center gap-3 bg-gray-800 p-3 rounded cursor-pointer hover:bg-gray-700 transition"
                        >
                            <img
                                src={c.avatar_url}
                                className="w-10 h-10 rounded-full"
                            />

                            <div>
                                <p>{c.login}</p>
                                <p className="text-sm text-gray-400">
                                    Contributions: {c.contributions}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/*  GITHUB LINK */}
            <button
                onClick={() => window.open(repo.html_url, "_blank")}
                className="bg-green-500 px-3 py-3 rounded flex items-center gap-2 hover:bg-green-600 transition"
            >
                <FaGithub /> Open on GitHub
            </button>

        </div>
    );
}