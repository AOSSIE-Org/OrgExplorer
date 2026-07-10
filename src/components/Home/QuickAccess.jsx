import { BsArrowRight } from "react-icons/bs";

export default function QuickAccess({ items, handleSelectOrg }) {
  return (
    <div className="mt-10 flex w-full max-w-4xl flex-col items-center gap-5 border-t border-zinc-900 pt-10">
      <p className="text-xs uppercase tracking-[0.35em] text-zinc-600">
        Quick Explore Access
      </p>

      <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => handleSelectOrg(item)}
            className="group flex items-center justify-between border border-(--border) bg-(--bg) text-(--text) px-5 py-4 text-left transition-all duration-200 hover:-translate-y-1 hover:border-[#FCD34D]"
          >
            <span className="text-sm font-medium group-hover:text-[#FCD34D]">
              {item}
            </span>

            <BsArrowRight className="size-4 text-zinc-600 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#FCD34D]" />
          </button>
        ))}
      </div>
    </div>
  );
}