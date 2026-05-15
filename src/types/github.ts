export interface GitHubOrg {
  login: string
  avatar_url: string
  description: string | null
  public_repos: number
  followers: number
  html_url: string
}