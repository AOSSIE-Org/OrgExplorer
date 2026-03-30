import RepoTable from "../components/Tables/RepoTable";
import { exportCSV } from "../utils/exportCSV";

export default function Repositories() {
  const repos = JSON.parse(localStorage.getItem("repos") || "[]");

  return (
    <>
      <div>
        <h2 className="text-2xl font-bold mb-6 text-white">
          Repositories
        </h2>

        {!repos.length ? (
          <p className="text-gray-400">
            No data found. Please go to Dashboard and analyze org.
          </p>
        ) : (
          <RepoTable repos={repos} />
        )}
      </div>
      {/* EXPORT */}
      <button
        className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded mb-4 mt-4"
        onClick={() => exportCSV(repos)}
      >
        Export CSV
      </button>

    </>
  );
}