
import { Link, useLocation } from "react-router-dom";


export default function Sidebar() {

  const location = useLocation();

  return (
    <div className="w-64 bg-[#111827] border-r border-gray-800 p-4 flex flex-col justify-between">

      <div>
        <div className="h-40 w-40 ">
          <img src="/org-explorer-logo.svg" alt="Logo" /> 
        </div>

        <nav className="space-y-3">

          <Link
            to="/"
            className={`block p-2 rounded ${
              location.pathname === "/" ? "bg-gray-800" : "hover:bg-gray-800"
            }`}
          >
            Dashboard
          </Link>

          <Link
            to="/repositories"
            className={`block p-2 rounded ${
              location.pathname === "/repositories"
                ? "bg-gray-800"
                : "hover:bg-gray-800"
            }`}
          >
            Repositories
          </Link>
           <Link
            to="/graph"
            className={`block p-2 rounded ${
              location.pathname === "/graph"
                ? "bg-gray-800"
                : "hover:bg-gray-800"
            }`}
          >
            Graph
          </Link>

        </nav>
      </div>

      <div className="p-2 hover:bg-gray-800 rounded cursor-pointer">
        ⚙ Settings
      </div>

    </div>
  );
}