import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend
} from "recharts";
import { FaCodeBranch, FaGithub } from "react-icons/fa";
import { FaCodeMerge } from "react-icons/fa6";
import { GoIssueOpened, GoIssueClosed,GoCheckCircleFill, GoXCircle, GoAlert, GoStar, GoGitMerge, GoTrophy, GoPeople  } from "react-icons/go";
// import { MdOutlineReportGmailerrorred } from "react-icons/md";


const TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

export default function ContributorDetail() {
    const { username } = useParams();

    const [user, setUser] = useState<any>(null);
    const [prs, setPrs] = useState<any[]>([]);
    const [issues, setIssues] = useState<any[]>([]);
    const [sortKey, setSortKey] = useState("prCreated");
    const [sortOrder, setSortOrder] = useState("desc");
    const [events, setEvents] = useState<any[]>([]);
    const [filter, setFilter] = useState("7");

    useEffect(() => {
        
        if (!username) return;

        const fetchData = async () => {
            // console.log("Repos coming:", repos.map(r => r.full_name));
            try {
                //  USER
                const userRes = await fetch(`https://api.github.com/users/${username}`, {
                    headers: { Authorization: `token ${TOKEN}` }
                });
                const userData = await userRes.json();
                setUser(userData);

                //  PRs
                const prRes = await fetch(
                    `https://api.github.com/search/issues?q=author:${username}+type:pr`,
                    { headers: { Authorization: `token ${TOKEN}` } }
                );
                const prData = await prRes.json();
                setPrs(prData.items || []);

                //  Issues
                const issueRes = await fetch(
                    `https://api.github.com/search/issues?q=author:${username}+type:issue`,
                    { headers: { Authorization: `token ${TOKEN}` } }
                );
                const issueData = await issueRes.json();
                setIssues(issueData.items || []);

                //  EVENTS (Recent Activity)
                const eventRes = await fetch(
                    `https://api.github.com/users/${username}/events`,
                    { headers: { Authorization: `token ${TOKEN}` } }
                );
                const eventData = await eventRes.json();
                setEvents(eventData || []);
                console.log("events", eventData);

            } catch (err) {
                console.error(err);
            }
        };

        fetchData();


    }, [username]);

    function timeAgo(date: string) {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

        const intervals: any = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60,
        };

        for (let key in intervals) {
            const interval = Math.floor(seconds / intervals[key]);
            if (interval > 1) return `${interval} ${key}s ago`;
            if (interval === 1) return `1 ${key} ago`;
        }

        return "just now";
    }

    const filteredEvents = events.filter((e: any) => {
        const days = filter === "7" ? 7 : 30;
        const eventDate = new Date(e.created_at);
        const now = new Date();

        return (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24) <= days;
    });

    if (!user) return <p className="text-white">Loading...</p>;

    //  CALCULATIONS
    const totalPR = prs.length;
    const mergedPR = prs.filter(p => p.pull_request?.merged_at).length;
    const mergeRate = totalPR ? Math.round((mergedPR / totalPR) * 100) : 0;
    const totalIssues = issues.length;

    const score = Math.round(
        0.5 * mergeRate +
        0.3 * Math.min(totalIssues * 5, 100) +
        0.2 * 70
    );

    //  REPO-WISE STATS
    const repoStats: any = {};

    // PR data
    prs.forEach((pr: any) => {
        // const repo = pr.repository_url.split("/").pop();
        const parts = pr.repository_url.split("/");
        const repo = parts[parts.length - 2] + "/" + parts[parts.length - 1];

        if (!repoStats[repo]) {
            repoStats[repo] = {
                repo,
                prCreated: 0,
                prMerged: 0,
                issuesSolved: 0,
            };
        }

        repoStats[repo].prCreated++;

        if (pr.pull_request?.merged_at) {
            repoStats[repo].prMerged++;
        }
    });

    // Issue data
    issues.forEach((issue: any) => {
        // const repo = issue.repository_url.split("/").pop();
        const parts = issue.repository_url.split("/");
        const repo = parts[parts.length - 2] + "/" + parts[parts.length - 1];

        if (!repoStats[repo]) {
            repoStats[repo] = {
                repo,
                prCreated: 0,
                prMerged: 0,
                issuesSolved: 0,
            };
        }

        repoStats[repo].issuesSolved++;
    });

    const repoList = Object.values(repoStats);
    const sortedRepos = [...repoList].sort((a: any, b: any) => {
        const valA = a[sortKey];
        const valB = b[sortKey];

        if (sortOrder === "asc") return valA - valB;
        return valB - valA;
    });

    const chartData = repoList.map((r: any) => ({
        name: r.repo.split("/")[1], // sirf repo name
        created: r.prCreated,
        merged: r.prMerged
    }));

    return (
        <div className="p-6 text-white space-y-8 h-[calc(100vh-120px)] overflow-y-auto pr-2">

            {/*  TOP SECTION */}
            <div className="bg-[#111827] p-6 rounded-xl flex items-center gap-6 border border-gray-800">

                <img
                    src={user.avatar_url}
                    className="w-24 h-24 rounded-full border-2 border-green-400"
                />

                <div>
                    <h1 className="text-3xl font-bold">{user.login}</h1>

                    <p className="flex items-center gap-2 text-green-400 text-lg mt-1">
                        <GoStar className="text-yellow-400" />Quality Score: {score}/100
                    </p>

                    <p className="flex items-center gap-2 text-blue-400">
                        <GoGitMerge className="text-blue-400" /> Merge Rate: {mergeRate}%
                    </p>

                    <p className={`flex items-center gap-2 mt-2 font-semibold ${score > 80 ? "text-green-400" :
                        score > 50 ? "text-yellow-400" :
                            "text-red-400"
                        }`}>
                        {score > 80 ? (<span className="flex items-center gap-2"><GoTrophy className="text-yellow-600" /> High Quality Contributor</span>)  :
                            score > 50 ? (<span className="flex items-center gap-2"><GoStar className="text-blue-400" /> Medium Quality Contributor</span>) :
                                (<span className="flex items-center gap-2"><GoXCircle className="text-red-400:" />Low Quality Contributor</span>)}
                    </p>
                </div>
            </div>

            {/* STATS CARDS */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#1F2937] p-4 rounded-xl text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-2">
                        <FaCodeBranch />
                        <span>PR</span>
                    </div>
                    <h2 className="text-2xl text-green-400">{totalPR}</h2>
                </div>

                <div className="bg-[#1F2937] p-4 rounded-xl text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-2">
                        <FaCodeMerge />
                        <span className="text-gray-400 text-sm">PR Merged</span>
                    </div>

                    <h2 className="text-2xl text-blue-400">{mergedPR}</h2>
                </div>

                <div className="bg-[#1F2937] p-4 rounded-xl text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-2">
                        <GoIssueOpened />
                        <p className="text-gray-400 text-sm">Issues Solved</p>
                    </div>
                    <h2 className="text-2xl text-yellow-400">{totalIssues}</h2>
                </div>

                <div className="bg-[#1F2937] p-4 rounded-xl text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-2">
                        <GoIssueClosed />
                        <p className="text-gray-400 text-sm">Issues Created</p>
                    </div>
                    <h2 className="text-2xl text-red-400">{totalIssues}</h2>
                </div>
            </div>

            <div className="bg-[#111827] p-6 rounded-xl mt-6 border border-gray-800">

                <h3 className="text-lg font-semibold mb-4 text-green-400">
                    PR Activity (Created vs Merged)
                </h3>

                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>

                        <defs>
                            <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>

                            <linearGradient id="colorMerged" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />

                        <XAxis dataKey="name" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />

                        <Tooltip />

                        <Legend />

                        <Area
                            type="monotone"
                            dataKey="created"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorCreated)"
                            name="PR Created"

                        />

                        <Area
                            type="monotone"
                            dataKey="merged"
                            stroke="#22c55e"
                            fillOpacity={1}
                            fill="url(#colorMerged)"
                            name="PR Merged"
                        />

                    </AreaChart>
                </ResponsiveContainer>

            </div>

        
            {/*  REPOSITORIES TABLE */}
            <div className="bg-[#111827] p-6 rounded-xl mt-6 border border-gray-800">

                <h3 className="text-lg font-semibold mb-4 text-green-400">
                    Repository Contributions
                </h3>

                {repoList.length === 0 ? (
                    <p className="text-gray-400">No repository data found</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">

                            <thead className="bg-gray-800 text-gray-300">
                                <tr>

                                    <th className="p-3 text-left">Repo</th>
                                    <th
                                        className="p-3 cursor-pointer"
                                        onClick={() => {
                                            setSortKey("prCreated");
                                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                        }}
                                    >
                                        PR {sortKey === "prCreated" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                                    </th>

                                    <th
                                        className="p-3 cursor-pointer"
                                        onClick={() => {
                                            setSortKey("prMerged");
                                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                        }}
                                    >
                                        PR Merged {sortKey === "prMerged" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                                    </th>

                                    <th className="p-3">Merge %</th>

                                    <th
                                        className="p-3 cursor-pointer"
                                        onClick={() => {
                                            setSortKey("issuesSolved");
                                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                                        }}
                                    >
                                        Issues Solved {sortKey === "issuesSolved" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                                    </th>

                                </tr>
                            </thead>

                            {/* BODY */}
                            <tbody>
                                {sortedRepos.map((r: any) => {
                                    const mergeRate =
                                        r.prCreated > 0
                                            ? Math.round((r.prMerged / r.prCreated) * 100)
                                            : 0;

                                    return (
                                        <tr
                                            key={r.repo}
                                            className="border-t border-gray-700 hover:bg-gray-800 transition">
                                            <td className="p-3">
                                                <a
                                                    href={`https://github.com/${r.repo}`}
                                                    target="_blank"
                                                    className="text-blue-400 hover:underline"
                                                >
                                                    {r.repo}
                                                </a>
                                            </td>

                                            <td className="p-3">{r.prCreated}</td>

                                            <td className="p-3 text-green-400">
                                                {r.prMerged}
                                            </td>

                                            <td className="p-3 font-semibold">
                                                {mergeRate}%
                                            </td>

                                            <td className="p-3 text-yellow-400">
                                                {r.issuesSolved}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>

                        </table>
                    </div>
                )}
            </div>

            {/*  INSIGHTS */}
            <div className="bg-[#111827] p-6 rounded-xl border border-gray-800">
                <h3 className="text-green-400 mb-3">Insights</h3>

                <ul className="space-y-2 text-sm text-gray-300">
                    {mergeRate > 70 && (
                        <li><GoCheckCircleFill /> High merge rate indicates quality work</li>
                    )}
                    {mergeRate < 40 && (
                        <li><GoAlert className="text-yellow-400"/> Low merge rate suggests PR issues</li>
                    )}
                    {totalPR < 5 && (
                        <li><GoPeople className="text-red-400"/> Limited contributions</li>
                    )}
                </ul>
            </div>


            {/*  Recent Activity */}
            <div className="mt-8 bg-gray-900 p-5 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold"> Recent Activity</h3>

                    {/* Filter */}
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-gray-800 p-2 rounded"
                    >
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                    </select>
                </div>

                {/* Events */}
                {filteredEvents.length === 0 ? (
                    <p className="text-gray-400">No recent activity</p>
                ) : (
                    <div className="space-y-2">
                        {filteredEvents.slice(0, 10).map((e: any, index: number) => {
                            const isLatest = index === 0;

                            let text = "";
                            let link = "#";

                            //  PR Created
                            if (e.type === "PullRequestEvent" && e.payload.action === "opened") {
                                const prNumber = e.payload?.pull_request?.number || "";
                                text = ` Created PR #${prNumber} in ${e.repo.name}`;
                                link = e.payload?.pull_request?.html_url;
                            }

                            //  PR Merged
                            else if (e.type === "PullRequestEvent" && e.payload?.pull_request?.merged) {
                                const prNumber = e.payload?.pull_request?.number || "";
                                text = ` PR #${prNumber} merged in ${e.repo.name}`;
                                link = e.payload?.pull_request?.html_url;
                            }

                            //  Issue Opened
                            else if (e.type === "IssuesEvent" && e.payload.action === "opened") {
                                const issueNumber = e.payload?.issue?.number || "";
                                text = ` Opened issue #${issueNumber} in ${e.repo.name}`;
                                link = e.payload?.issue?.html_url;
                            }

                            //  Issue Closed
                            else if (e.type === "IssuesEvent" && e.payload.action === "closed") {
                                const issueNumber = e.payload?.issue?.number || "";
                                text = ` Closed issue #${issueNumber} in ${e.repo.name}`;
                                link = e.payload?.issue?.html_url;
                            }
                            // Push
                            else if (e.type === "PushEvent") {
                                text = ` Pushed code to ${e.repo.name}`;
                                link = `https://github.com/${e.repo.name}`;
                            }

                            else return null;

                            return (
                                <a
                                    key={index}
                                    href={link}
                                    target="_blank"
                                    className={`block p-3 rounded-lg border border-gray-700 hover:bg-gray-800 ${isLatest ? "bg-gray-800 font-bold" : ""
                                        }`}
                                >
                                    {text}
                                    <span className="text-gray-400 ml-2">
                                        ({timeAgo(e.created_at)})
                                    </span>
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>



            {/*  GITHUB */}
            <a
                href={user.html_url}
                target="_blank"
                className="text-blue-400 block inline-flex items-center gap-2 mb-8"
            >
                <FaGithub /> Open On Github
            </a>

        </div>
    );
}