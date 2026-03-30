import { useState } from "react";

export default function RepoTable({ repos }: any) {
  const [sortKey, setSortKey] = useState("stars");

  const sorted = [...repos].sort((a, b) => {
    if (sortKey === "stars") return b.stargazers_count - a.stargazers_count;
    if (sortKey === "forks") return b.forks_count - a.forks_count;
    return 0;
  });

  return (
    <div className="bg-[#1F2937] p-6 rounded-xl shadow-lg border border-gray-800">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">
          Repository List
        </h3>

        {/* SORT BUTTONS */}
        <div className="flex gap-2">
          <button
            onClick={() => setSortKey("stars")}
            className={`px-3 py-1 rounded text-sm ${
              sortKey === "stars"
                ? "bg-green-500 text-white"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            ⭐ Stars
          </button>

          <button
            onClick={() => setSortKey("forks")}
            className={`px-3 py-1 rounded text-sm ${
              sortKey === "forks"
                ? "bg-blue-500 text-white"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            🍴 Forks
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">

          <thead className="bg-gray-800 text-gray-300">
            <tr>
              <th className="p-3">Repository</th>
              <th className="p-3">Stars</th>
              <th className="p-3">Forks</th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((r: any) => (
              <tr
                key={r.id}
                className="border-t border-gray-700 hover:bg-gray-800 transition"
              >
                <td className="p-3 text-white">{r.name}</td>
                <td className="p-3 text-green-400">
                  {r.stargazers_count}
                </td>
                <td className="p-3 text-blue-400">
                  {r.forks_count}
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </div>
  );
}