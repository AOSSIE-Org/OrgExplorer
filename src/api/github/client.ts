const GITHUB_API_BASE = "https://api.github.com";

export async function githubRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem("github_token");
  //access token from frontend 
  const headers: HeadersInit = {
    "Accept": "application/vnd.github+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };


  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`,{
    ...options,
    headers,
  });

   

  if (!response.ok) {
    throw new Error(`GitHub API error:${response.status}`);
  }

  return response.json();
}
