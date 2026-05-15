# GitHub Organization Explorer

A **pure frontend** React + Vite + TypeScript web app for exploring GitHub organizations, testing OAuth 2.0 PKCE authentication, and observing API rate limits.

## Features

- **GitHub OAuth 2.0 with PKCE** – No client_secret, no backend
- **IndexedDB caching** – Org data cached 12h, repos 6h
- **Rate limit dashboard** – Live display after every API call
- **Organization search** – Avatar, stats, description
- **Repository table** – Stars, forks, language, issues, last updated (sortable/filterable)
- **Activity charts** – Repository update trends (Recharts)
- **Language distribution** – Donut chart by repo count
- **Security & Privacy page** – Cache management, token info
- **Debug panel** – Masked token, rate limit, call count, data source

## Quick Start

### 1. Create a GitHub OAuth App

Go to [GitHub Developer Settings](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**

| Field | Value |
|---|---|
| Application name | GitHub Org Explorer |
| Homepage URL | `http://localhost:5173` |
| Authorization callback URL | `http://localhost:5173/callback` |

> Enable **PKCE** support in your app's settings if available.

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local and set VITE_GITHUB_CLIENT_ID=your_client_id
```

### 3. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Architecture

```
Browser                    GitHub
  │                          │
  ├─ Login with GitHub ──→  OAuth authorize
  │ ←── redirect+code ──────┤
  │                          │
  ├─ (CORS proxy) exchange code+verifier ──→ Token endpoint
  │ ←── access_token ───────────────────────┤
  │                          │
  ├─ GET /rate_limit ──────→ api.github.com
  ├─ GET /orgs/{org} ──────→ api.github.com
  └─ GET /orgs/{org}/repos →  api.github.com
```

**No data ever leaves your browser** (except legitimate GitHub API calls).

## Token Exchange Proxy

GitHub's `https://github.com/login/oauth/access_token` endpoint does not include CORS headers, so browsers cannot call it directly. A minimal proxy is required for the one-time token exchange.

| Option | When to use |
|---|---|
| [corsproxy.io](https://corsproxy.io) (default) | Development / testing |
| [Netlify edge function](https://docs.netlify.com/edge-functions/overview/) | Production |

To use corsproxy.io (default, no setup needed):
```
# .env.local – leave VITE_TOKEN_PROXY_URL unset, or set:
VITE_TOKEN_PROXY_URL=https://corsproxy.io/?url=https://github.com/login/oauth/access_token
```

## Caching

| Data | TTL | Key |
|---|---|---|
| Org metadata | 12 hours | `org:{name}` |
| Repository list | 6 hours | `repos:{name}` |

Cache is stored in **IndexedDB** and is scoped to your browser. Clear it via the **Security** page or **Sidebar → Clear Cache**.

## GitHub Pages Deployment

```bash
# Build
npm run build

# Deploy dist/ to GitHub Pages
# (use gh-pages package or GitHub Actions)
```

Update `vite.config.ts` `base` to your repo name:
```ts
base: '/your-repo-name/'
```

And update `VITE_REDIRECT_URI` to your GitHub Pages URL.

## Tech Stack

- **React 19** + **Vite 7**
- **TypeScript 5**
- **React Router v7**
- **Recharts** – Charts
- **idb** – IndexedDB wrapper
- No backend, no server, no cookies
