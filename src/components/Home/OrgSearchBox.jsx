import { FiSearch, FiX } from "react-icons/fi";
import { BsArrowRight } from "react-icons/bs";

import { Button } from "@/components/ui/Button";

import SearchSuggestions from "./SearchSuggestions";

export default function OrgSearchBox({
  input,
  setInput,
  chips,
  addChip,
  removeChip,
  handleKey,
  handleSubmit,
  showSuggestions,
  setShowSuggestions,
  setSelectedIndex,
  filteredSuggestions,
  selectedIndex,
  isLoading,
  handleSelectOrg,
}) {
  return (
    <div className="relative mt-12 w-full max-w-3xl">
      <form
        role="search"
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl border-2 border-zinc-900 bg-zinc-950/90 p-3 shadow-[0px_0px_100px_rgba(252,211,77,0.15)] backdrop-blur-xl md:flex-row"
      >
        <div className="relative flex flex-1 items-center gap-5 rounded-xl border border-zinc-800 bg-black px-4 py-4">
          <FiSearch className="h-5 w-5 text-zinc-500" />
          {chips.map((c) => (
            <span
              key={c}
              className="shrink-0 whitespace-nowrap flex items-center gap-1 rounded border border-[#FCD34D]/30 bg-[#FCD34D]/10 px-2 py-1 text-sm text-[#FCD34D]"
            >
              <span>{c}</span>

              <FiX
                size={12}
                className="cursor-pointer opacity-70"
                onClick={() => removeChip(c)}
              />
            </span>
          ))}

          <input
            id="org-search"
            type="text"
            value={input}
            autoComplete="off"
            aria-label="Search GitHub organization"
            placeholder="AOSSIE-Org, StabilityNexus, DjedAlliance.."
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              setTimeout(() => {
                setShowSuggestions(false);
              }, 200);

              input.trim() && addChip(input);
            }}
            onChange={(e) => {
              setInput(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKey}
            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none md:text-base"
          />
        </div>

        <Button
          type="submit"
          className="h-14.5 min-w-45 text-sm font-black uppercase tracking-[0.2em]"
        >
          Explore
          <BsArrowRight className="size-4" />
        </Button>
      </form>

      <SearchSuggestions
        showSuggestions={showSuggestions}
        input={input}
        isLoading={isLoading}
        filteredSuggestions={filteredSuggestions}
        selectedIndex={selectedIndex}
        handleSelectOrg={handleSelectOrg}
        addChip={addChip}
      />
    </div>
  );
}
