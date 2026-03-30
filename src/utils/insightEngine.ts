import type { Repo, Insight } from "../types/github";

export interface InsightResult extends Insight {
  insights: string[];
}

export const getInsights = (repos: Repo[]): InsightResult => {
  const now = new Date();

  const inactive = repos.filter(r =>
    (now.getTime() - new Date(r.updated_at).getTime()) >
    90 * 24 * 60 * 60 * 1000
  );

  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
  const totalForks = repos.reduce((s, r) => s + r.forks_count, 0);

  const topRepos = [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5);

  const inactivePercent = (inactive.length / repos.length) * 100;

  //  NEW: INSIGHT GENERATION
  const insights: string[] = [];

  //  Inactive repos insight
  if (inactivePercent > 50) {
    insights.push("⚠ More than 50% repositories are inactive → maintenance risk");
  } else if (inactivePercent > 30) {
    insights.push("⚠ Significant number of repositories are inactive");
  } else {
    insights.push("✅ Most repositories are actively maintained");
  }

  //  Star concentration insight
  if (topRepos.length > 0) {
    const topStar = topRepos[0].stargazers_count;

    if (topStar > totalStars * 0.5) {
      insights.push("⚡ One repository dominates more than 50% of total stars");
    } else if (topStar > totalStars * 0.3) {
      insights.push("⚡ A few repositories dominate the ecosystem");
    }
  }

  //  Fork vs Star ratio insight
  if (totalStars > 0) {
    const ratio = totalForks / totalStars;

    if (ratio > 0.6) {
      insights.push("🔁 High fork-to-star ratio → strong developer engagement");
    } else if (ratio < 0.2) {
      insights.push("📉 Low fork activity compared to stars");
    }
  }

  //  Recently active repos insight
  const recent = repos.filter(r =>
    (now.getTime() - new Date(r.updated_at).getTime()) <
    30 * 24 * 60 * 60 * 1000
  );

  if (recent.length > repos.length * 0.5) {
    insights.push("🚀 High recent activity across repositories");
  } else if (recent.length < repos.length * 0.2) {
    insights.push("🐢 Low recent activity → possible slowdown");
  }

  // Repo size distribution insight
  const lowStarRepos = repos.filter(r => r.stargazers_count < 10);

  if (lowStarRepos.length > repos.length * 0.6) {
    insights.push("📦 Majority of repositories have low visibility (<10 stars)");
  }

  // Growth potential insight
  if (totalStars > 1000 && inactivePercent < 30) {
    insights.push("📈 Organization shows strong growth potential");
  }

  return {
    totalRepos: repos.length,
    totalStars,
    totalForks,
    inactivePercent: inactivePercent.toFixed(1),
    topRepos,
    insights
  };
};