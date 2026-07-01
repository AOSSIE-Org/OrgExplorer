import OrgSearchBox from "./OrgSearchBox";
import RecentSearches from "./RecentSearches";
import QuickAccess from "./QuickAccess";

import { Spinner } from "@/components/UI";

export default function HeroSection(props) {
  const {
    loading,
    loadMsg,
    error,
    recent,
    go,
    quickExploreItems,
    handleSelectOrg,
  } = props;

  return (
    <section className="relative overflow-x-hidden border-b border-zinc-900">
      <div className="absolute left-1/2 top-[35%] h-112.5 w-112.5 -translate-x-1/2 rounded-full bg-[#FCD34D]/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-7xl flex-col items-center justify-center px-4 py-20 text-center md:px-6">
        <h1 className="max-w-5xl text-5xl font-black leading-none tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
          Architect Your
          <span className="block text-[#FCD34D]">Insights</span>
        </h1>

        <p className="mt-8 max-w-3xl text-base leading-relaxed text-zinc-400 sm:text-lg md:text-xl">
          Unified analytics across one or many GitHub organizations.
        </p>

        <OrgSearchBox {...props} />

        <p
          style={{
            fontSize: 11,
            color: "var(--text2)",
            marginTop: 6,
            paddingLeft: 4,
          }}
        >
          Type an org name and press Enter or comma to add.
        </p>

        {error && (
          <p style={{ color: "var(--red)", fontSize: 12, marginTop: 8 }}>
            {error}
          </p>
        )}

        {loading && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <Spinner />
            <p className="text-sm text-zinc-500">{loadMsg}</p>
          </div>
        )}

        {recent.length > 0 && !loading && (
          <RecentSearches recent={recent} go={go} />
        )}

        {!loading && (
          <QuickAccess
            items={quickExploreItems}
            handleSelectOrg={handleSelectOrg}
          />
        )}
      </div>
    </section>
  );
}