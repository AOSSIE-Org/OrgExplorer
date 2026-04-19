// export function generateInsights(repos: any[]) {
//   if (!repos || repos.length === 0) return [];

//   const insights: string[] = [];

//   // Most starred repo
//   const topRepo = [...repos].sort(
//     (a, b) => b.stargazers_count - a.stargazers_count
//   )[0];

//   insights.push(` Most popular repo: ${topRepo.name}`);

//   //  Low activity repos
//   const lowActivity = repos.filter((r) => r.stargazers_count < 5);
//   if (lowActivity.length > 0) {
//     insights.push(` ${lowActivity.length} repos have very low stars`);
//   }

//   //  Fork heavy repos
//   const forkHeavy = repos.filter((r) => r.forks_count > r.stargazers_count);
//   if (forkHeavy.length > 0) {
//     insights.push(` Some repos are fork-heavy but not popular`);
//   }

//   //  Recently updated
//   const recent = repos.filter((r) => {
//     const updated = new Date(r.updated_at);
//     const now = new Date();
//     return (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24) < 30;
//   });

//   if (recent.length > repos.length / 2) {
//     insights.push(` Org is actively maintained (many recent updates)`);
//   }

//   //  Stale repos
//   const stale = repos.filter((r) => {
//     const updated = new Date(r.updated_at);
//     const now = new Date();
//     return (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24) > 180;
//   });

//   if (stale.length > 0) {
//     insights.push(` ${stale.length} repos are stale (>6 months no updates)`);
//   }

//   //  Language dominance
//   const langMap: any = {};
//   repos.forEach((r) => {
//     if (!r.language) return;
//     langMap[r.language] = (langMap[r.language] || 0) + 1;
//   });

//   const topLang = Object.keys(langMap).sort(
//     (a, b) => langMap[b] - langMap[a]
//   )[0];

//   if (topLang) {
//     insights.push(` Most used language: ${topLang}`);
//   }

//   return insights;
// }