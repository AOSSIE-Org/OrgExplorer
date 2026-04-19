import NetworkGraph from "../components/Graph/NetworkGraph";

export default function GraphPage() {
  const repos = JSON.parse(localStorage.getItem("repos") || "[]");

  if (!repos.length) {
    return (
      <div className="text-gray-400 text-center mt-20">
        No data found  <br />
        Please analyze organizations first.
      </div>
    );
  }

  return (
    <div>

      <h2 className="text-xl font-semibold mb-3 text-green-400">
        Contributor Collaboration Network 
      </h2>

      <NetworkGraph repos={repos} />

      {/* <p className="text-gray-400 mb-4">
        Visualizes relationships between repositories and contributors across multiple organizations.
      </p> */}
    </div>
  );
}
