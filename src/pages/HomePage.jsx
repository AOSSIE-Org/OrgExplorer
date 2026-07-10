import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useApp } from "../context/AppContext";
import { useDebounce } from "@/hooks/useDebounce";

import HeroSection from "@/components/home/HeroSection";
import StatsSection from "@/components/home/StatsSection";

const quickExploreItems = ["AOSSIE-Org", "vercel", "facebook", "microsoft"];

export default function HomePage() {
  const { explore, loading, loadMsg, error } = useApp();

  const navigate = useNavigate();

  const [input, setInput] = useState("");
  const [chips, setChips] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const debouncedQuery = useDebounce(input, 1000);

  const recent = JSON.parse(localStorage.getItem("oe_recent") || "[]");

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["github-orgs", debouncedQuery],

    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];

      const response = await fetch(
        `https://api.github.com/search/users?q=${debouncedQuery}+type:org`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch organizations");
      }

      const data = await response.json();

      return data.items;
    },

    enabled: !!debouncedQuery.trim(),
    staleTime: 1000 * 60 * 5,
  });

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(
      (item) => item.login.toLowerCase() !== input.toLowerCase()
    );
  }, [suggestions, input]);

  const addChip = (raw) => {
    const parts = raw
      .split(/[,+\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    setChips((prev) => [...new Set([...prev, ...parts])]);

    setInput("");
  };

  const removeChip = (c) => {
    setChips((prev) => prev.filter((x) => x !== c));
  };

  const go = async (targets) => {
    const orgs =
      targets || (chips.length ? chips : input.trim() ? [input.trim()] : []);

    if (!orgs.length) return;

    await explore(orgs);

    navigate("/overview");
  };

  const handleSelectOrg = async (org) => {
    const finalValue = Array.isArray(org) ? org : org != null ? [org] : [];

    await go(finalValue);
  };

  const handleKey = (e) => {
    if (e.key === "Backspace" && !input && chips.length) {
      setChips((prev) => prev.slice(0, -1));
    }

    if (filteredSuggestions.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();

        setSelectedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();

        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }

      if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();

        addChip(filteredSuggestions[selectedIndex].login);

        handleSelectOrg(filteredSuggestions[selectedIndex].login);

        return;
      }
    }

    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();

      addChip(input);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    go();
  };

  return (
    <main className="bg-(--bg) text-(--text) min-h-screen">
      <HeroSection
        input={input}
        setInput={setInput}
        chips={chips}
        addChip={addChip}
        removeChip={removeChip}
        handleKey={handleKey}
        handleSubmit={handleSubmit}
        showSuggestions={showSuggestions}
        setShowSuggestions={setShowSuggestions}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
        filteredSuggestions={filteredSuggestions}
        isLoading={isLoading}
        handleSelectOrg={handleSelectOrg}
        loading={loading}
        loadMsg={loadMsg}
        error={error}
        recent={recent}
        go={go}
        quickExploreItems={quickExploreItems}
      />

      <StatsSection />
    </main>
  );
}
