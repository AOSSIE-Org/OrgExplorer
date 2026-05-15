export default function HealthScore({ score, label }: any) {
  return (
    <div className="bg-[#111827] p-5 rounded-xl border border-gray-800 w-full mt-10">

      <h3 className="text-gray-400 text-sm mb-2">
        Organization Health Score
      </h3>

      <div className="flex items-center justify-between mb-3">
        <span className="text-3xl font-bold text-green-400">
          {score}/100
        </span>
        <span className="text-sm text-gray-300">
          {label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-700 h-3 rounded-full">
        <div
          className="h-3 rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${score}%` }}
        ></div>
      </div>

    </div>
  );
}