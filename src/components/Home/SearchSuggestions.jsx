import { BsArrowRight } from "react-icons/bs";
import { cn } from "@/lib/utils";

export default function SearchSuggestions({
  showSuggestions,
  input,
  isLoading,
  filteredSuggestions,
  selectedIndex,
  handleSelectOrg,
  addChip,
}) {
  if (!showSuggestions || !input.trim()) return null;

  return (
    <div className="absolute left-0 top-[105%] z-50 flex max-h-96 w-full flex-col overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
      {isLoading ? (
        <div className="px-5 py-4 text-sm text-zinc-500">
          Searching organizations...
        </div>
      ) : filteredSuggestions.length > 0 ? (
        filteredSuggestions.map((org, index) => (
          <button
            key={org.id}
            type="button"
            onMouseDown={() => {
              handleSelectOrg(org.login);
              addChip(org.login);
            }}
            className={cn(
              "flex w-full items-center justify-between border-b border-zinc-900 px-5 py-4 text-left transition-colors last:border-none",
              "hover:bg-zinc-900",
              selectedIndex === index && "bg-zinc-900"
            )}
          >
            <div className="flex items-center gap-4">
              <img
                src={org.avatar_url}
                alt={org.login}
                className="size-10 rounded-full border border-zinc-800 object-cover"
              />

              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">
                  {org.login}
                </span>

                <span className="text-xs text-zinc-500">
                  GitHub Organization
                </span>
              </div>
            </div>

            <BsArrowRight className="size-4 text-zinc-600" />
          </button>
        ))
      ) : (
        <div className="px-5 py-4 text-sm text-zinc-500">
          No organization found
        </div>
      )}
    </div>
  );
}
