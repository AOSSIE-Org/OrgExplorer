export const calculateOrgHealthScore = (repos: any[]) => {
  if (!repos || repos.length === 0) return { score: 0, label: "No Data" };

  const totalRepos = repos.length;

  const activeRepos = repos.filter(repo => {
    const days =
      (Date.now() - new Date(repo.pushed_at).getTime()) /
      (1000 * 60 * 60 * 24);
    return days < 30;
  }).length;

  const avgStars =
    repos.reduce((sum, r) => sum + r.stargazers_count, 0) / totalRepos;

  const avgForks =
    repos.reduce((sum, r) => sum + r.forks_count, 0) / totalRepos;

  const staleRepos = repos.filter(repo => {
    const days =
      (Date.now() - new Date(repo.pushed_at).getTime()) /
      (1000 * 60 * 60 * 24);
    return days > 180;
  }).length;

  let score = 0;

  // Activity score (40)
  score += (activeRepos / totalRepos) * 40;

  // Popularity score (30)
  score += Math.min(avgStars, 100) * 0.3;

  //  Engagement score (20)
  score += Math.min(avgForks, 50) * 0.4;

  //  Penalty (10)
  score -= (staleRepos / totalRepos) * 10;

  score = Math.round(score);

  let label = "Poor";
  if (score > 75) label = "Excellent 🚀";
  else if (score > 50) label = "Good 👍";
  else if (score > 30) label = "Average ⚠️";

  return { score, label };
};