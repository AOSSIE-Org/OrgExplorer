import React from "react";

function StatsSection() {
  return (
    <section className="border-b border-(--border) bg-(--bg) text-(--text) py-10">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 divide-y divide-(--border) md:grid-cols-3 md:divide-x md:divide-y-0">
        <div className="flex items-center gap-5 px-6 py-10">
          <span className="text-5xl font-black text-[#FCD34D]">5,000</span>

          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-(--text-secondary)">
              Resource Load
            </p>

            <p className="mt-2 text-sm font-semibold uppercase text-(--text)">
              Girth With PAT
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 px-6 py-10">
          <span className="text-5xl font-black text-[#FCD34D]">1HR</span>

          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-(--text-secondary)">
              Data Freshness
            </p>

            <p className="mt-2 text-sm font-semibold uppercase text-(--text)">
              Intelligent Cache
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 px-6 py-10">
          <span className="text-5xl font-black text-green-400">ZERO</span>

          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-(--text-secondary)">
              Engine Efficiency
            </p>

            <p className="mt-2 text-sm font-semibold uppercase text-(--text)">
              Backend Latency
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default StatsSection;
