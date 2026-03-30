import { useState } from "react";

export default function OrgInput({ onSubmit }: any) {
  const [value , setValue] = useState("Aossie-Org")
  return (
    <div className="mb-6 flex gap-3">
      <input
        className="flex-1 p-3 bg-gray-900 border border-gray-700 rounded"
        placeholder="Enter orgs (AOSSIE-Org, StabilityNexus)"
        value={value}
        onChange={(e) => setValue(e.target.value)} 
      />

      <button
        className="bg-green-500 px-6 py-2 rounded hover:bg-green-600"
        onClick={() => onSubmit(value)}
      >
        Analyze
      </button>
    </div>
  );
}