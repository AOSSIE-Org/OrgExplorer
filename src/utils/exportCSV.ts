export const exportCSV = (repos: any[]) => {
  const rows = repos.map(r =>
    `${r.name},${r.stargazers_count},${r.forks_count}`
  );

  const csv = "Name,Stars,Forks\n" + rows.join("\n");

  const blob = new Blob([csv]);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "repos.csv";
  a.click();
};