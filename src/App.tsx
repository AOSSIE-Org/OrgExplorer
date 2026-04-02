import { useState } from "react";
import { Routes, Route } from "react-router-dom";

import DashboardLayout from "./layout/DashboardLayout";
import Overview from "./pages/Overview";
import Repositories from "./pages/Repositories";
import GraphPage from "./pages/GraphPage";

export default function App() {
  const [orgInput, setOrgInput] = useState("");

  return (
    <DashboardLayout orgInput={orgInput}>
      <Routes>
        <Route
          path="/"
          element={
            <Overview
              orgInput={orgInput}
              setOrgInput={setOrgInput}
            />
          }
        />

        <Route path="/repositories" element={<Repositories />} />
        <Route path="/graph" element={<GraphPage />} />
      </Routes>
    </DashboardLayout>
  );
}