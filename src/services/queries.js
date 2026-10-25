// Reusable GitHub GraphQL query strings for OrgExplorer API validation

export const GET_ORG_DETAILS = `
  query GetOrgDetails($login: String!) {
    organization(login: $login) {
      login
      name
      description
      avatarUrl
      repositories {
        totalCount
      }
    }
  }
`;

export const GET_ORG_REPOS = `
  query GetOrgRepos($login: String!, $first: Int!, $after: String) {
    organization(login: $login) {
      repositories(first: $first, after: $after, orderBy: {field: PUSHED_AT, direction: DESC}) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          name
          pushedAt
          stargazerCount
          forkCount
          watchers {
            totalCount
          }
          primaryLanguage {
            name
          }
          licenseInfo {
            key
            name
          }
          isArchived
          isFork
        }
      }
    }
  }
`;

export const GET_REPO_ISSUES = `
  query GetRepoIssues($owner: String!, $name: String!, $first: Int!, $after: String) {
    repository(owner: $owner, name: $name) {
      issues(first: $first, after: $after, states: [OPEN, CLOSED]) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          title
          number
          createdAt
          updatedAt
          state
          url
          author {
            login
          }
        }
      }
    }
  }
`;
