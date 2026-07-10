import { BsArrowRight } from "react-icons/bs";
import { cn } from "@/lib/utils";

export default function RecentSearches({ recent, go }) {
  return (
    <section className="mt-14 flex w-full max-w-5xl flex-col items-center">
      <div className="mb-5 flex items-center gap-3">
        <div className="h-px w-10 bg-zinc-800" />

        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Recent Searches
        </span>

        <div className="h-px w-10 bg-zinc-800" />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {recent.map((r) => (
          <button
            key={r}
            onClick={() => go(r.split(",").map((s) => s.trim()))}
            className={cn(
              "group flex items-center gap-2 rounded-xl border border-(--border) bg-(--bg) text-(--text) px-4 py-3",
              "transition-all duration-200",
              "hover:-translate-y-0.5 hover:border-[#FCD34D]/50 hover:bg-(--bg)"
            )}
          >
            <span className="text-sm font-medium transition-colors group-hover:text-[#FCD34D]">
              {r}
            </span>

            <BsArrowRight className="size-3.5 text-zinc-600 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#FCD34D]" />
          </button>
        ))}
      </div>
    </section>
  );
}