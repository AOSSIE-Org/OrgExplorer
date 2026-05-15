import { useState } from "react";
import { FaCodeBranch } from "react-icons/fa";
import { MdOutlineReportGmailerrorred } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { IoIosStarOutline } from "react-icons/io";
import { GoXCircle, GoCheckCircleFill } from "react-icons/go";

console.log("Rendering RepoTable component...");
export default function RepoTable({ repos }: any) {
  const [sortKey, setSortKey] = useState("stars");
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("all");

  const navigate = useNavigate();

  //  UNIQUE LANGUAGES
  const languages = [
    "all",
    ...new Set(repos.map((r: any) => r.language).filter(Boolean)),
  ];

  // FILTER + SEARCH
  const filtered = repos.filter((r: any) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.language || "").toLowerCase().includes(search.toLowerCase());

    const matchLang =
      language === "all" || r.language === language;

    return matchSearch && matchLang;
  });

  //  SORT
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "stars") return b.stargazers_count - a.stargazers_count;
    if (sortKey === "forks") return b.forks_count - a.forks_count;
    if (sortKey === "issues") return b.open_issues_count - a.open_issues_count;
    return 0;
  });

  //  STATUS
  const getStatus = (updated_at: string) => {
    const days =
      (Date.now() - new Date(updated_at).getTime()) /
      (1000 * 60 * 60 * 24);

    return days < 30 ? "Active" : "Inactive";
  };

  return (
    <div className="bg-[#1F2937] p-6 rounded-xl shadow-lg border border-gray-800">

      {/*  TOP BAR */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">

        {/* TITLE */}
        <h3 className="text-lg font-semibold text-white">
          Repositories ({sorted.length})
        </h3>

        {/* SEARCH */}
        <input
          type="text"
          placeholder="Search repo or language..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-600"
        />

        {/* LANGUAGE FILTER */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-600"
        >
          {languages.map((lang: any, i: number) => (
            <option key={i} value={lang}>
              {lang || "Unknown"}
            </option>
          ))}
        </select>
      </div>

      {/* SORT BUTTONS */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSortKey("stars")}
          className={`px-3 py-1 rounded text-sm ${sortKey === "stars" ? "bg-green-500" : "bg-gray-700"
            }`}
        >
            Stars
        </button>

        <button
          onClick={() => setSortKey("forks")}
          className={`px-3 py-1 rounded text-sm ${sortKey === "forks" ? "bg-blue-500" : "bg-gray-700"
            }`}
        >
           Forks
        </button>

        <button
          onClick={() => setSortKey("issues")}
          className={`px-3 py-1 rounded text-sm ${sortKey === "issues" ? "bg-yellow-500" : "bg-gray-700"
            }`}
        >
           Issues
        </button>
      </div>

      {/*  TABLE */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="min-w-[900px] w-full text-sm text-left">

          <thead className="bg-gray-800 text-gray-300 ">
            <tr>
              <th className="p-3">Repository</th>
              <th className="p-3"> Stars</th>
              <th className="p-3"> Forks</th>
              <th className="p-3"> Issues</th>
              <th className="p-3">Language</th>
              <th className="p-3">Last Updated</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>

       <tbody>
  {sorted.map((r: any) => (
    <tr
      key={r.id}
      onClick={() => navigate(`/repo/${r.name}`, { state: r })}
      className="border-t border-gray-700 hover:bg-gray-800 transition cursor-pointer"
    >
      {/* 1. REPO */}
      <td className="p-3 text-green-400 font-semibold">
        {r.name}
        <div className="text-xs text-gray-400">
          {r.description || "No description"}
        </div>
      </td>

      {/* 2. STARS */}
      <td className="p-3 text-grey-400">
        <div className="flex items-center gap-1">
          <IoIosStarOutline /> {r.stargazers_count}
        </div>
      </td>

      {/* 3. FORKS */}
      <td className="p-3 text-grey-400">
        <div className="flex items-center gap-1">
          <FaCodeBranch /> {r.forks_count}
        </div>
      </td>

      {/* 4. ISSUES */}
      <td className="p-3 text-grey-400">
        <div className="flex items-center gap-1">
          <MdOutlineReportGmailerrorred /> {r.open_issues_count || 0}
        </div>
      </td>

      {/* 5. LANGUAGE */}
      <td className="p-3">
        <span className="bg-gray-700 px-2 py-1 rounded text-xs">
          {r.language || "N/A"}
        </span>
      </td>

      {/* 6. LAST UPDATED */}
      <td className="p-3 text-gray-300">
        {new Date(r.updated_at).toLocaleDateString()}
      </td>

      {/* 7. STATUS */}
      <td className="p-3">
        {getStatus(r.updated_at).includes("Active") ? (
          <span className="text-green-400"><GoCheckCircleFill className="text-green-500"/> Active</span>
        ) : (
          <span className="text-red-400"><GoXCircle className="text-red-500"/> Inactive</span>
        )}
      </td>
    </tr>
  ))}
</tbody>
        </table>
      </div>
    </div>
  );
}