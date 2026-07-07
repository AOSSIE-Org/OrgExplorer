import dotenv from 'dotenv';
import { z } from 'zod';
import { validate as validateGraphQL } from '@octokit/graphql-schema';
import * as queries from '../src/services/queries.js';

dotenv.config();

const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || '';

// ANSI Colors for output formatting
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// ==========================================
// Zod Schemas for GitHub REST API Responses
// ==========================================

export const OrganizationSchema = z.object({
  login: z.string(),
  name: z.string().nullable().optional(),
  public_repos: z.number(),
  avatar_url: z.url(),
  description: z.string().nullable().optional(),
});

export const RepositorySchema = z.object({
  name: z.string(),
  pushed_at: z.string(), // ISO date string or similar timestamp representation
  open_issues_count: z.number(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  watchers_count: z.number(),
  language: z.string().nullable().optional(),
  license: z.object({
    key: z.string(),
    name: z.string(),
    spdx_id: z.string().nullable().optional(),
    url: z.url().nullable().optional(),
    node_id: z.string().optional(),
  }).nullable().optional(),
  archived: z.boolean(),
  fork: z.boolean(),
});

export const ContributorSchema = z.object({
  login: z.string(),
  avatar_url: z.url(),
  contributions: z.number(),
});

export const IssueSchema = z.object({
  title: z.string(),
  number: z.number(),
  user: z.object({
    login: z.string(),
  }).nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  html_url: z.url().optional(),
  pull_request: z.object({
    url: z.url().optional(),
    html_url: z.url().optional(),
  }).nullable().optional(),
  state: z.string(),
});

export const RateLimitSchema = z.object({
  limit: z.number(),
  remaining: z.number(),
  reset: z.number(),
  used: z.number(),
});

// ==========================================
// Zod Schemas for GitHub GraphQL Responses
// ==========================================

export const GraphQLOrgDetailsSchema = z.object({
  data: z.object({
    organization: z.object({
      login: z.string(),
      name: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      avatarUrl: z.url(),
      repositories: z.object({
        totalCount: z.number(),
      }),
    }).nullable(),
  }),
});

export const GraphQLOrgReposSchema = z.object({
  data: z.object({
    organization: z.object({
      repositories: z.object({
        pageInfo: z.object({
          hasNextPage: z.boolean(),
          endCursor: z.string().nullable().optional(),
        }),
        nodes: z.array(z.object({
          name: z.string(),
          pushedAt: z.string(),
          stargazerCount: z.number(),
          forkCount: z.number(),
          watchers: z.object({
            totalCount: z.number(),
          }),
          primaryLanguage: z.object({
            name: z.string(),
          }).nullable().optional(),
          licenseInfo: z.object({
            key: z.string(),
            name: z.string(),
          }).nullable().optional(),
          isArchived: z.boolean(),
          isFork: z.boolean(),
        })),
      }),
    }).nullable(),
  }),
});

export const GraphQLRepoIssuesSchema = z.object({
  data: z.object({
    repository: z.object({
      issues: z.object({
        pageInfo: z.object({
          hasNextPage: z.boolean(),
          endCursor: z.string().nullable().optional(),
        }),
        nodes: z.array(z.object({
          title: z.string(),
          number: z.number(),
          createdAt: z.string(),
          updatedAt: z.string(),
          state: z.string(),
          url: z.url(),
          author: z.object({
            login: z.string(),
          }).nullable().optional(),
        })),
      }),
    }).nullable(),
  }),
});

// ==========================================
// Static Mock Data for Local Validation Tests
// ==========================================

const mockFixtures = {
  organization: {
    login: 'AOSSIE-Org',
    name: 'AOSSIE',
    public_repos: 12,
    avatar_url: 'https://avatars.githubusercontent.com/u/12345',
    description: 'An open source organization'
  },
  repository: {
    name: 'OrgExplorer',
    pushed_at: '2026-07-05T12:00:00Z',
    open_issues_count: 5,
    stargazers_count: 42,
    forks_count: 10,
    watchers_count: 42,
    language: 'JavaScript',
    license: {
      key: 'gpl-3.0',
      name: 'GNU General Public License v3.0'
    },
    archived: false,
    fork: false
  },
  contributor: {
    login: 'kpj2006',
    avatar_url: 'https://avatars.githubusercontent.com/u/54321',
    contributions: 150
  },
  issue: {
    title: 'Fix sidebar responsiveness',
    number: 101,
    user: {
      login: 'aossie_dev'
    },
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-07-04T15:00:00Z',
    html_url: 'https://github.com/AOSSIE-Org/OrgExplorer/issues/101',
    pull_request: null,
    state: 'open'
  },
  rateLimit: {
    limit: 5000,
    remaining: 4999,
    reset: Math.floor(Date.now() / 1000) + 3600,
    used: 1
  }
};

// ==========================================
// Helper Functions
// ==========================================

async function fetchREST(url) {
  const headers = { Accept: 'application/vnd.github.v3+json' };
  if (token) {
    headers.Authorization = `token ${token}`;
  }
  const res = await fetch(url, { headers });
  if (res.status === 403) {
    const error = new Error(`REST Rate Limit or Forbidden for ${url}. Consider adding a GITHUB_TOKEN.`);
    error.status = 403;
    throw error;
  }
  if (!res.ok) {
    throw new Error(`REST Fetch failed for ${url}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchGraphQL(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'OrgExplorer-Schema-Validator'
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`GraphQL Fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function handleZodError(error, contextName) {
  console.error(`\n${colors.red}${colors.bold}❌ Validation failed in context: ${contextName}${colors.reset}`);
  const issues = error.issues || error.errors || [];
  issues.forEach(err => {
    const fieldPath = err.path.join('.');
    console.error(`  - Field: ${colors.cyan}${fieldPath}${colors.reset}`);
    console.error(`    Error: ${colors.yellow}${err.message}${colors.reset} (code: ${err.code})`);
  });
}

async function validateLiveRESTCollection({
  url,
  schema,
  startMsg,
  successMsg,
  skipMsg,
  errorMsg,
  isArray = false,
  getZodContext,
  transform = (data) => data,
  collectionTypeLabel = ''
}) {
  try {
    console.log(`  ${startMsg}`);
    const data = await fetchREST(url);
    if (isArray) {
      if (Array.isArray(data)) {
        let valid = true;
        for (const item of data) {
          const parseResult = schema.safeParse(item);
          if (!parseResult.success) {
            failed = true;
            valid = false;
            handleZodError(parseResult.error, getZodContext(item));
          }
        }
        if (valid) {
          const formattedSuccess = successMsg.replace('{count}', data.length);
          console.log(`  ${colors.green}✓ ${formattedSuccess}${colors.reset}`);
        }
      } else {
        failed = true;
        console.error(`  ${colors.red}❌ Expected array of ${collectionTypeLabel}, got: ${typeof data}${colors.reset}`);
      }
    } else {
      const targetData = transform(data);
      const parseResult = schema.safeParse(targetData);
      if (!parseResult.success) {
        failed = true;
        handleZodError(parseResult.error, getZodContext(data));
      } else {
        console.log(`  ${colors.green}✓ ${successMsg}${colors.reset}`);
      }
    }
  } catch (err) {
    if (!token && err.status === 403) {
      console.log(`  ${colors.yellow}⚠ ${skipMsg}${colors.reset}`);
    } else {
      failed = true;
      console.error(`  ${colors.red}❌ ${errorMsg}: ${err.message}${colors.reset}`);
    }
  }
}

// ==========================================
// Main Runner
// ==========================================

let failed = false;

async function main() {
  failed = false;

  console.log(`\n${colors.blue}${colors.bold}=== OrgExplorer Data Schema & API Validation ===${colors.reset}\n`);

  if (token) {
    console.log(`${colors.green}🔑 GitHub token found. Running in authenticated mode (full integration checks).${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️ No GitHub token found. Running in unauthenticated mode (live GraphQL skipped, live REST may hit rate limits).${colors.reset}`);
  }

  // ------------------------------------------
  // 1. Static GraphQL Query Syntax Validation
  // ------------------------------------------
  console.log(`\n${colors.cyan}${colors.bold}Step 1: Statically validating GraphQL query syntax...${colors.reset}`);

  for (const [name, query] of Object.entries(queries)) {
    console.log(`  Validating ${colors.bold}${name}${colors.reset}...`);
    const errors = validateGraphQL(query);
    if (errors.length > 0) {
      failed = true;
      console.error(`  ${colors.red}❌ ${name} is invalid:${colors.reset}`);
      errors.forEach(err => console.error(`    - ${err.message}`));
    } else {
      console.log(`  ${colors.green}✓ ${name} is syntactically valid against GitHub schema.${colors.reset}`);
    }
  }

  // ------------------------------------------
  // 2. Static Schema Validation (Mock Fixtures)
  // ------------------------------------------
  console.log(`\n${colors.cyan}${colors.bold}Step 2: Statically validating schemas with mock fixtures...${colors.reset}`);

  const staticTests = [
    { name: 'OrganizationSchema', schema: OrganizationSchema, data: mockFixtures.organization },
    { name: 'RepositorySchema', schema: RepositorySchema, data: mockFixtures.repository },
    { name: 'ContributorSchema', schema: ContributorSchema, data: mockFixtures.contributor },
    { name: 'IssueSchema', schema: IssueSchema, data: mockFixtures.issue },
    { name: 'RateLimitSchema', schema: RateLimitSchema, data: mockFixtures.rateLimit }
  ];

  for (const test of staticTests) {
    const result = test.schema.safeParse(test.data);
    if (!result.success) {
      failed = true;
      handleZodError(result.error, `Static Mock - ${test.name}`);
    } else {
      console.log(`  ${colors.green}✓ ${test.name} correctly parsed mock data.${colors.reset}`);
    }
  }

  // ------------------------------------------
  // 3. Live API Schema Validation (Integration)
  // ------------------------------------------
  console.log(`\n${colors.cyan}${colors.bold}Step 3: Validating live GitHub API responses (detecting breaking changes)...${colors.reset}`);

  // Test target info
  const testOrg = 'AOSSIE-Org';
  const testRepo = 'OrgExplorer';

  // Live REST API checks
  await validateLiveRESTCollection({
    url: `https://api.github.com/orgs/${testOrg}`,
    schema: OrganizationSchema,
    startMsg: `Fetching live Org details for ${colors.bold}${testOrg}${colors.reset}...`,
    successMsg: `Live REST organization schema matches expectations.`,
    skipMsg: `Skipped live Org REST fetch due to rate limiting (no token provided).`,
    errorMsg: `Error fetching live Org REST`,
    isArray: false,
    getZodContext: () => `Live REST - Organization: ${testOrg}`
  });

  await validateLiveRESTCollection({
    url: `https://api.github.com/orgs/${testOrg}/repos?per_page=5`,
    schema: RepositorySchema,
    startMsg: `Fetching live repositories for ${colors.bold}${testOrg}${colors.reset}...`,
    successMsg: `Live REST repositories schema matches expectations (checked {count} repos).`,
    skipMsg: `Skipped live repos REST fetch due to rate limiting.`,
    errorMsg: `Error fetching live Repos REST`,
    isArray: true,
    collectionTypeLabel: 'repos',
    getZodContext: (repo) => `Live REST - Repository: ${repo.name}`
  });

  await validateLiveRESTCollection({
    url: `https://api.github.com/repos/${testOrg}/${testRepo}/contributors?per_page=5`,
    schema: ContributorSchema,
    startMsg: `Fetching live contributors for ${colors.bold}${testOrg}/${testRepo}${colors.reset}...`,
    successMsg: `Live REST contributors schema matches expectations (checked {count} contribs).`,
    skipMsg: `Skipped live contributors REST fetch due to rate limiting.`,
    errorMsg: `Error fetching live Contributors REST`,
    isArray: true,
    collectionTypeLabel: 'contributors',
    getZodContext: (c) => `Live REST - Contributor: ${c.login}`
  });

  await validateLiveRESTCollection({
    url: `https://api.github.com/repos/${testOrg}/${testRepo}/issues?per_page=5&state=all`,
    schema: IssueSchema,
    startMsg: `Fetching live issues for ${colors.bold}${testOrg}/${testRepo}${colors.reset}...`,
    successMsg: `Live REST issues schema matches expectations (checked {count} issues).`,
    skipMsg: `Skipped live issues REST fetch due to rate limiting.`,
    errorMsg: `Error fetching live Issues REST`,
    isArray: true,
    collectionTypeLabel: 'issues',
    getZodContext: (issue) => `Live REST - Issue: #${issue.number}`
  });

  await validateLiveRESTCollection({
    url: `https://api.github.com/rate_limit`,
    schema: RateLimitSchema,
    startMsg: `Fetching live rate limit status...`,
    successMsg: `Live REST rate limit schema matches expectations.`,
    skipMsg: `Skipped live rate limit REST fetch due to rate limiting.`,
    errorMsg: `Error fetching live RateLimit REST`,
    isArray: false,
    transform: (liveRate) => liveRate.rate,
    getZodContext: () => `Live REST - RateLimit`
  });

  // Live GraphQL API checks
  if (token) {
    try {
      console.log(`  Running live GraphQL query: ${colors.bold}GET_ORG_DETAILS${colors.reset} for ${testOrg}...`);
      const res = await fetchGraphQL(queries.GET_ORG_DETAILS, { login: testOrg });
      const parseResult = GraphQLOrgDetailsSchema.safeParse(res);
      if (!parseResult.success) {
        failed = true;
        handleZodError(parseResult.error, 'Live GraphQL - GET_ORG_DETAILS');
      } else {
        console.log(`  ${colors.green}✓ Live GraphQL GET_ORG_DETAILS matches expectations.${colors.reset}`);
      }
    } catch (err) {
      failed = true;
      console.error(`  ${colors.red}❌ Error in live GraphQL GET_ORG_DETAILS: ${err.message}${colors.reset}`);
    }

    try {
      console.log(`  Running live GraphQL query: ${colors.bold}GET_ORG_REPOS${colors.reset} for ${testOrg}...`);
      const res = await fetchGraphQL(queries.GET_ORG_REPOS, { login: testOrg, first: 3 });
      const parseResult = GraphQLOrgReposSchema.safeParse(res);
      if (!parseResult.success) {
        failed = true;
        handleZodError(parseResult.error, 'Live GraphQL - GET_ORG_REPOS');
      } else {
        console.log(`  ${colors.green}✓ Live GraphQL GET_ORG_REPOS matches expectations.${colors.reset}`);
      }
    } catch (err) {
      failed = true;
      console.error(`  ${colors.red}❌ Error in live GraphQL GET_ORG_REPOS: ${err.message}${colors.reset}`);
    }

    try {
      console.log(`  Running live GraphQL query: ${colors.bold}GET_REPO_ISSUES${colors.reset} for ${testOrg}/${testRepo}...`);
      const res = await fetchGraphQL(queries.GET_REPO_ISSUES, { owner: testOrg, name: testRepo, first: 3 });
      const parseResult = GraphQLRepoIssuesSchema.safeParse(res);
      if (!parseResult.success) {
        failed = true;
        handleZodError(parseResult.error, 'Live GraphQL - GET_REPO_ISSUES');
      } else {
        console.log(`  ${colors.green}✓ Live GraphQL GET_REPO_ISSUES matches expectations.${colors.reset}`);
      }
    } catch (err) {
      failed = true;
      console.error(`  ${colors.red}❌ Error in live GraphQL GET_REPO_ISSUES: ${err.message}${colors.reset}`);
    }
  } else {
    console.log(`\n${colors.yellow}⚠️ Live GraphQL validation skipped: GITHUB_TOKEN or GITHUB_PAT not set.${colors.reset}`);
  }

  // ------------------------------------------
  // Summary and Exit Code
  // ------------------------------------------
  console.log(`\n${colors.bold}=== Validation Summary ===${colors.reset}`);
  if (failed) {
    console.error(`${colors.red}${colors.bold}❌ Schema / API Validation FAILED! Check error outputs above.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bold}✓ All GraphQL query syntax and API schemas validated successfully!${colors.reset}\n`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error(`${colors.red}Fatal Error: ${err.message}${colors.reset}`);
  process.exit(1);
});
