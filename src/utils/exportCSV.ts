export const exportCSV = (graphData: any) => {
  const { nodes, links } = graphData;

  //  Repos
  const repoRows = nodes
    .filter((n: any) => n.type === "repo")
    .map((r: any) =>
      `${r.label},${r.stars || 0},${r.forks || 0},${r.issues || 0}`
    );

  //  Contributors
  const userRows = nodes
    .filter((n: any) => n.type === "user")
    .map((u: any) =>
      `${u.label},${u.contributions || 0}`
    );

  //  Connections
  const getId = (val: any) =>
    typeof val === "object" ? val.id : val;

  const linkRows = links.map((l: any) =>
    `${getId(l.source)},${getId(l.target)},${l.weight}`
  );

  const parsedRows: string[][] = userRows.map((r: string) => r.split(","));

  const topContributor: string[] | undefined = parsedRows
    .sort((a: string[], b: string[]) => Number(b[1]) - Number(a[1]))[0];
  const csvContent =
    //  REPO SECTION
    "=== REPOSITORIES ===\n" +
    "Name,Stars,Forks,Issues\n" +
    repoRows.join("\n") +

    "\n\n=== CONTRIBUTORS ===\n" +
    "Name,Contributions\n" +
    userRows.join("\n") +

    "\n\n=== CONNECTIONS ===\n" +
    "Contributor,Repository,Weight\n" +
    linkRows.join("\n") +

    "\n\n=== INSIGHTS ===\n" +
    `Top Contributor,${topContributor?.[0]}\n`;

  //  Download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "github-analysis.csv";
  a.click();

  URL.revokeObjectURL(url);
};