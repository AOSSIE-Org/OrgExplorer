import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrophy } from "react-icons/fa";

const TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

export default function TopContributors({ repos }: any) {
    const [contributors, setContributors] = useState<any[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        console.log("Fetching data for:", repos);

        const fetchData = async () => {
            const map: any = {};

            //  GROUPING START
            const groupedRepos: any = {};

            repos.forEach((repo: any) => {
                const org = repo.full_name.split("/")[0];

                if (!groupedRepos[org]) {
                    groupedRepos[org] = [];
                }

                groupedRepos[org].push(repo);
            });

            //  EACH ORG SE LIMIT
            let finalRepos: any[] = [];

            Object.values(groupedRepos).forEach((orgRepos: any) => {
                finalRepos.push(...orgRepos.slice(0, 10));
            });
            //  DEBUG
            console.log(
                "Repos being used:",
                finalRepos.map((r: any) => r.full_name)
            );

            //  MAIN LOOP (IMPORTANT)
            for (let repo of finalRepos) {
                try {
                    const res = await fetch(repo.contributors_url, {
                        headers: {
                            Authorization: `token ${TOKEN}`
                        }
                    });

                    const data = await res.json();

                    if (!Array.isArray(data)) {
                        console.error("GitHub API Error:", data);
                        continue;
                    }

                    data.forEach((c: any) => {
                        if (!map[c.login]) {
                            map[c.login] = {
                                login: c.login,
                                avatar: c.avatar_url,
                                contributions: 0,
                                url: c.html_url
                            };
                        }

                        map[c.login].contributions += c.contributions;
                    });

                } catch (e) {
                    console.error("Fetch error:", e);
                }
            }

            const sorted = Object.values(map)
                .sort((a: any, b: any) => b.contributions - a.contributions)
                .slice(0, 5);

            setContributors(sorted);
        };

        if (repos.length) fetchData();
    }, [repos]);

    return (
        <div className="mt-10">
            <h3 className="text-gray-400 mb-3 text-lg">
                <FaTrophy />
                Top Contributors
            </h3>

            {/*  Horizontal Scroll */}
            <div className="flex gap-4 overflow-x-auto pb-2">

                {contributors.map((c, i) => (
                    <div
                        key={c.login}
                        onClick={() =>
                            navigate(`/contributor/${c.login}`, { state: c })
                        }
                        className="min-w-[220px] bg-[#111827] p-4 rounded-lg cursor-pointer hover:bg-gray-800 transition border border-gray-700"
                    >
                        <img
                            src={c.avatar}
                            className="w-12 h-12 rounded-full mb-2"
                        />

                        <p className="text-white font-semibold">
                            #{i + 1} {c.login}
                        </p>

                        <p className="text-gray-400 text-sm">
                            {c.contributions} contributions
                        </p>
                    </div>
                ))}

            </div>
        </div>
    );
}