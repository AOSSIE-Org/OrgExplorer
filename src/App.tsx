import { useState } from "react";
import { Routes, Route } from "react-router-dom";

import DashboardLayout from "./layout/DashboardLayout";
import Overview from "./pages/Overview";
import Repositories from "./pages/Repositories";
import GraphPage from "./pages/GraphPage";
import ContributorDetail from "./pages/ContributorDetail";
import RepoDetails from "./pages/RepoDetails";

export default function App() {
  const [orgInput, setOrgInput] = useState("");
  const [orgLogo, setOrgLogo] = useState("");

  return (
    <DashboardLayout orgInput={orgInput} orgLogo={orgLogo}>
      <Routes>
        <Route
          path="/"
          element={
            <Overview
              orgInput={orgInput}
              setOrgInput={setOrgInput}
              setOrgLogo={setOrgLogo}   
            />
          }
        />

        <Route path="/repositories" element={<Repositories />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/contributor/:username" element={<ContributorDetail />} />
        <Route path="/repo/:name" element={<RepoDetails />} />

      </Routes>
    </DashboardLayout>
  );
}