import { useLocation } from "react-router-dom";

export default function Topbar({ orgInput, logo }: any) {
  const location = useLocation();

  // Only dashboard
  if (location.pathname !== "/") return null;

  const orgs = orgInput
    ? orgInput.split(",").map((o: string) => o.trim())
    : [];

  return (
    <div className="flex items-center justify-between px-6 py-4 h-20 border-b border-gray-800 bg-[#0B1220]">

      <div className="flex items-center gap-3">
        {logo ? (
          <img
            src={logo}
            className="w-12 h-12 rounded-full border border-gray-700"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-700 rounded-full animate-pulse"></div>
        )}

        <h2 className="text-4xl font-semibold text-green-400">
          {orgs.join(" + ") || "OrgExplorer"}
        </h2>
      </div>

    </div>
  );
}