# GitHub Organization Explorer – Project Summary

## 🎯 Project Overview

**GitHub Organization Explorer** is a pure frontend React web application that allows users to explore GitHub organizations and gather insights about repositories, contributors, and activity trends. The application uses **GitHub OAuth 2.0 with PKCE (Proof Key for Code Exchange)** for secure, trustworthy authentication without requiring users to share personal access tokens.
 
---

## ⚠️ Problem Statement: Why OAuth Instead of PAT?

### The PAT Challenge
Initially, the project explored using GitHub **Personal Access Tokens (PAT)** for authentication:
- **Rate Limit**: Same 5,000 requests/hour as OAuth
- **Trust Issue**: Users must manually create and provide their PAT to the application
- **Security Concern**: Storing user PATs locally raises legitimate trust questions
  - *"Why should I give my token to your application?"*
  - *"How do I know my token isn't being sent to your servers?"*
  - Users justifiably hesitant to trust third-party token storage

### The OAuth Solution
Implemented **GitHub OAuth 2.0 with PKCE** as the superior alternative:
- **Familiar Pattern**: Users authenticate directly with GitHub (same as linking GitHub with plugins, apps, or services)
- **No Token Sharing**: User never gives a token to the app; GitHub issues tokens after user approval
- **Trust Building**: Transparent authentication flow users already understand and trust
- **Same API Limits**: Still 5,000 req/hr, but with user confidence
- **Frontend-Only**: No backend server required; authentication happens entirely in the browser

**Trade-off**: OAuth is significantly more complex to implement than PAT, but the trust advantage is worth it.

---

## 🏗️ Technical Architecture

### Authentication Flow
```
User Browser                    GitHub OAuth                GitHub API
    │                                 │                            │
    ├─ 1. Click "Login with GitHub"  │                            │
    │     Generate PKCE code_verifier │                            │
    │     & code_challenge            │                            │
    │                                 │                            │
    ├─ 2. Redirect to OAuth authorize├─ User consents             │
    │     (code_challenge + scope)    │                            │
    │     ↓                           │     ↓                      │
    │ ←── 3. Redirect back with code ──                           │
    │     state + code               │                            │
    │                                 │                            │
    ├─ 4. Exchange code + verifier   ├──────────────────────────→ │
    │     (via CORS proxy)            │ Verify PKCE & code        │
    │                                 │                            │
    │ ←─ 5. Receive access_token ────┤                           │
    │                                 │                            │
    ├─ 6. Store token in sessionStorage (never localStorage)      │
    ├─ 7. Fetch /rate_limit ────────────────────────────────────→│
    ├─ 8. Search orgs & fetch repos ─────────────────────────────→│
    └─ All data cached in IndexedDB (local only) ─────────────────│
```

### Why PKCE?
- **No Client Secret Needed**: Traditional OAuth requires a `client_secret` (which must be hidden on a backend). PKCE eliminates this requirement by using a code verifier/challenge pair.
- **Frontend-Safe**: Code verifier is generated in the browser and never exposed.
- **CSRF Protection**: State parameter prevents cross-site request forgery attacks.

### CORS Proxy Requirement
GitHub's token exchange endpoint (`github.com/login/oauth/access_token`) does **not** include CORS headers, so browsers cannot call it directly. Solution:
- **Default (Development)**: `corsproxy.io` – freely available public proxy
- **Production**: [Netlify Edge Functions](https://docs.netlify.com/edge-functions/) – custom CORS proxy (recommended)

---

## ✨ Features Implemented

### 1. **Authentication & Security**
- ✅ GitHub OAuth 2.0 with PKCE (no client_secret, no backend needed)
- ✅ State-based CSRF protection
- ✅ Token stored in `sessionStorage` (cleared on browser close for added security)
- ✅ Login/logout functionality

### 2. **Organization Search & Discovery**
- ✅ Search GitHub organizations by name
- ✅ Display org avatar, stats (followers, public repos, etc.)
- ✅ View org description, location, website, email, Twitter handle
- ✅ Real-time rate limit feedback after each API call

### 3. **Repository Analysis**
- ✅ List all public repositories for an organization
- ✅ **Sortable/Filterable Table** with:
  - Repository name (linked to GitHub)
  - Star count
  - Fork count
  - Primary programming language
  - Open issues
  - Last updated date
  - Topics/tags
- ✅ Identify archived and forked repositories

### 4. **Metrics & Analytics Dashboard**

#### **Overview Tab**
- ✅ Organization stats card (followers, repos, creation date)
- ✅ Repository statistics (total, by visibility, archived count)
- ✅ Language ecosystem breakdown

#### **Repositories Tab**
- ✅ Full repository table with sorting and filtering
- ✅ Quick stats (avg stars, forks, languages per repo)

#### **Contributors Tab**
- ✅ List top contributors across organization repositories
- ✅ Display contributor avatar, login, contribution count
- ✅ Identify major vs. minor contributors

#### **Activity Tab**
- ✅ **Repository Update Timeline** – Recharts-based line chart showing repo update frequency over the past year
- ✅ Track development momentum and project velocity
- ✅ Identify active vs. dormant repositories

### 5. **Language Distribution Analytics**
- ✅ **Donut Chart** showing programming language distribution by repo count
- ✅ Color-coded visualization
- ✅ Percentage breakdown (e.g., 40% TypeScript, 25% Python, etc.)

### 6. **Intelligent Caching System (IndexedDB)**
Reduces API calls and enables offline-like experience:
- ✅ **Organization Metadata**: Cached for 12 hours
- ✅ **Repository Lists**: Cached for 6 hours
- ✅ **Contributors Data**: Cached for 6 hours
- ✅ **Activity Data**: Cached for 3 hours
- ✅ **Automatic TTL Expiration**: Stale data automatically removed
- ✅ Scoped to browser (no cloud storage)

### 7. **Rate Limit Monitoring**
- ✅ **Live Dashboard**: Displays current rate limit status after every API call
- ✅ Shows:
  - Request limit (5,000/hr for authenticated)
  - Requests remaining
  - Requests used
  - Time until reset (Unix timestamp)
- ✅ **Visual Warning**: Alerts when approaching limit

### 8. **Security & Privacy Page**
- ✅ View masked access token (first/last 4 characters, middle redacted)
- ✅ Cache management (view size, clear all data)
- ✅ Token revocation information
- ✅ Data localization confirmation ("No data leaves your browser")

### 9. **Debug Panel**
- ✅ Masked token display (for verification purposes)
- ✅ Current rate limit snapshot
- ✅ API call counter (total calls in session)
- ✅ Last data source indicator (API / Cache / None)
- ✅ Useful for development and troubleshooting

### 10. **Responsive UI & Navigation**
- ✅ **Header**: Org search bar, user menu, logout
- ✅ **Sidebar**: Navigation, cache clear, debug toggle
- ✅ **Tab-Based Dashboard**: Easy switching between Overview → Repos → Contributors → Activity
- ✅ **Repository Detail Panel**: Click a repo to view full details (expandable)
- ✅ Mobile-friendly responsive design

---

## 🔧 How It Works – End-to-End Flow

### User Journey

1. **Landing Page**: User clicks "Login with GitHub"
2. **OAuth Flow**: Redirected to GitHub, user approves app permissions
3. **Callback**: GitHub redirects back with authorization code
4. **Token Exchange**: App exchanges code (+ PKCE verifier) for access token via CORS proxy
5. **Dashboard**: User searches for an organization
6. **API Calls**:
   - Fetch org metadata
   - Fetch repository list (50+ repos paginated)
   - Fetch contributors and activity data
7. **Caching**: Data stored in IndexedDB with TTL
8. **Display**: Charts, tables, and metrics rendered with Recharts
9. **Rate Limit**: App tracks remaining requests and displays status
10. **Logout**: Token cleared from sessionStorage; cache remains available (optional clear)

### API Endpoints Used
- `GET /rate_limit` – Check remaining requests
- `GET /orgs/{org}` – Organization metadata
- `GET /orgs/{org}/repos` – Repository list
- `GET /repos/{owner}/{repo}/contributors` – Contributors per repo
- `GET /repos/{owner}/{repo}/stats/commit_activity` – Commit activity (with 202 retry logic)
- `GET /repos/{owner}/{repo}` – Extended repo details (language, topics, etc.)

---

## 📦 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | React 19 + TypeScript | Type-safe, component-based UI |
| **Build Tool** | Vite | Fast development & optimized builds |
| **Routing** | react-router-dom v7 | Client-side navigation |
| **Data Visualization** | Recharts | Charts, graphs, analytics |
| **Local Storage** | IndexedDB (idb library) | Browser-native caching with TTL |
| **HTTP Client** | Fetch API | Native browser HTTP (no axios dependency) |
| **Authentication** | GitHub OAuth 2.0 + PKCE | Secure, user-approved access |
| **CSS** | CSS Modules / Tailwind-like inline styles | Scoped, maintainable styles |
| **Deployment** | Vite + GitHub Pages / Netlify | Static hosting (no backend) |

---

## 🚀 Key Implementation Details

### 1. PKCE Implementation (`src/lib/oauth.ts`)
```typescript
// Generate secure PKCE verifier (48 bytes, base64url-encoded)
const array = crypto.getRandomValues(new Uint8Array(48));
const verifier = base64URLEncode(array);

// Create SHA-256 challenge
const digest = await crypto.subtle.digest('SHA-256', verifier_bytes);
const challenge = base64URLEncode(digest);

// Include in OAuth authorize request
client_id, redirect_uri, code_challenge, code_challenge_method='S256'
```

### 2. Rate Limit Tracking
- Extracts `RateLimit` object from GitHub response headers after every API call
- Displays remaining/total in realtime
- Warns user when approaching limit (e.g., "50/5000 remaining")

### 3. Stats Retry Logic (`src/lib/github.ts`)
GitHub returns HTTP 202 while computing repository stats. Implementation:
- Sends initial request
- If 202 received, waits 2.5 seconds and retries
- Attempts up to 3 times before timing out
- Prevents incomplete data from being cached

### 4. Pagination Handling
- Fetches repos in batches (GitHub default 30 per page)
- Aggregates results across pages automatically
- Handles large organizations with 100+ repos

### 5. Cache Key Schema
```
org:{organization_name}              → OrgData (12h TTL)
repos:{organization_name}            → RepoData[] (6h TTL)
contributors:{owner}/{repo}          → Contributor[] (6h TTL)
activity:{owner}/{repo}              → ActivityMonth[] (3h TTL)
```

---

## 🔐 Privacy & Data Flow

### Data Never Leaves Browser
✅ All data fetching happens directly from the browser  
✅ No backend server stores user data  
✅ Token stored in `sessionStorage` (not localStorage, cleared on browser close)  
✅ Cache stored in IndexedDB (specific to browser)  
✅ Only legitimate GitHub API calls leave the browser  

### Access Token Security
- ✅ **Generated via OAuth**: User approves directly with GitHub
- ✅ **PKCE Protected**: Code verifier never exposed (only challenge sent)
- ✅ **Stored Locally**: sessionStorage (volatile, cleared on close)
- ✅ **Scoped Permissions**: `read:org public_repo` (no write/delete access)

---

## 📊 Rate Limiting

Both PAT and OAuth use the same GitHub REST API rate limits:
- **Authenticated Requests**: 5,000 per hour
- **Reset**: Every hour (UTC)
- **Default**: 60 per hour without authentication (no good for org exploration)

App provides live feedback to user on remaining requests to prevent hitting limits unexpectedly.

---

## 🛠️ Development & Deployment

### Local Development
```bash
cp .env.example .env.local
# Set VITE_GITHUB_CLIENT_ID from https://github.com/settings/developers
npm install
npm run dev
# Visit http://localhost:5173
```

### Production Deployment
```bash
npm run build
# Deploy dist/ to GitHub Pages, Netlify, or Vercel
```

### Environment Variables
```env
VITE_GITHUB_CLIENT_ID=your_oauth_client_id
VITE_REDIRECT_URI=https://yourdomain.com/callback
VITE_TOKEN_PROXY_URL=https://your-cors-proxy.com (optional, defaults to corsproxy.io)
```

---

## 🎓 Key Lessons & Decisions

| Decision | Rationale |
|----------|-----------|
| **OAuth over PAT** | User trust, familiar pattern, credential-free |
| **PKCE Implementation** | No backend needed, secure for frontend-only apps |
| **IndexedDB Caching** | Offline-capable, reduces API calls, respects TTLs |
| **Frontend-Only** | Simpler deployment, privacy-first, no server costs |
| **React + Vite** | Fast development, optimized production builds, TypeScript support |
| **Recharts** | Easy-to-use charts, integrates well with React |

---

## 📈 Future Enhancements (Possible)

- [ ] GraphQL API support (cheaper for complex queries)
- [ ] Export reports (CSV, PDF)
- [ ] Team collaboration (share org reports via URL)
- [ ] Advanced filtering (repos by language, stars, age)
- [ ] Webhook integration (auto-refresh when org changes)
- [ ] GitHub App support (elevated rate limits for paid tiers)
- [ ] Dark mode
- [ ] Multi-language support

---

## Summary

**GitHub Organization Explorer** demonstrates a production-ready approach to GitHub integration:
1. **Authentication**: Secure OAuth 2.0 + PKCE without requiring users to share tokens
2. **Performance**: Smart caching reduces API calls while respecting rate limits
3. **Privacy**: Pure frontend, no backend data storage
4. **User Experience**: Rich analytics, real-time rate limit feedback, familiar auth flow
5. **Technical Excellence**: TypeScript, React patterns, responsive design, efficient data fetching

This project solves the real-world trust problem with PAT-based authentication and provides a template for building GitHub-integrated applications that users can confidently use.
