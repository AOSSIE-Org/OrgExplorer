import { useState, useMemo } from "react";
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell, LabelList,
  XAxis, YAxis, Tooltip, Legend
} from "recharts";

const tooltipFormatter = (
  value?: number | string,
  name?: string
): [string, string] => {
  return [
    value !== undefined ? value.toString() : "-",
    name !== undefined ? name : "-"
  ];
};

export default function ActivityChart({ repos }: any) {
  const [chartType, setChartType] = useState("line");
  const [filter, setFilter] = useState("top"); 

  const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  const data = useMemo(() => {
    let processed = [...repos];

    if (filter === "top") {
      processed.sort((a, b) => b.stargazers_count - a.stargazers_count);
    }
    if (filter === "inactive") {
      const now = new Date().getTime();
      processed = processed.filter(r => 
        now - new Date(r.updated_at).getTime() > 90 * 24 * 60 * 60 * 1000
      );
    }

    return processed.slice(0, 8).map((r: any) => ({
      name: r.name,
      stars: r.stargazers_count,
      forks: r.forks_count
    }));
  }, [repos, filter]);

  return (
    <div className="bg-[#1F2937] p-4 rounded mt-6 text-white" >

      <div className="flex gap-3 mb-4">
        {["line", "bar", "pie"].map(type => (
          <button
            key={type}
            onClick={() => setChartType(type)}
            className={`px-3 py-1 rounded ${chartType === type ? "bg-green-500" : "bg-gray-700"}`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setFilter("top")}
          className={`px-3 py-1 rounded ${filter === "top" ? "bg-blue-500" : "bg-gray-700"}`}
        >
          Top Repos
        </button>
        <button
          onClick={() => setFilter("inactive")}
          className={`px-3 py-1 rounded ${filter === "inactive" ? "bg-blue-500" : "bg-gray-700"}`}
        >
          Inactive
        </button>
      </div>

      {chartType === "line" && (
        <LineChart width={600} height={300} data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="stars" stroke="#22c55e" />
          <Line type="monotone" dataKey="forks" stroke="#3b82f6" />
        </LineChart>
      )}

      {chartType === "bar" && (
        <BarChart width={600} height={300} data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="stars" fill="#22c55e">
            <LabelList dataKey="stars" position="top" />
          </Bar>
          <Bar dataKey="forks" fill="#3b82f6">
            <LabelList dataKey="forks" position="top" />
          </Bar>
        </BarChart>
      )}

      {chartType === "pie" && (
        <PieChart width={400} height={400}>
          <Pie
            data={data}
            dataKey="stars"
            nameKey="name"
            outerRadius={100}
            label={({ name, value }) => `${name}: ${value}`} 
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={tooltipFormatter} />
          <Legend />
        </PieChart>
      )}

    </div>
  );
}
