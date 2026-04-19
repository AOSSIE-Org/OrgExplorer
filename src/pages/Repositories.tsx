import RepoTable from "../components/Tables/RepoTable";

export default function Repositories() {
  const repos = JSON.parse(localStorage.getItem("repos") || "[]");

  return (
    <>
      <div>
        {/* <h2 className="text-2xl font-bold mb-6 text-white">
          Repositories
        </h2> */}

        {!repos.length ? (
          <p className="text-gray-400">
            No data found. Please go to Dashboard and analyze org.
          </p>
        ) : (
          <RepoTable repos={repos} />
        )}
      </div>
      
    </>
  );
}