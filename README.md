<div name="readme-top"></div>

<div align="center" style="display: flex; align-items: center; justify-content: center; gap: 16px;">
  <img alt="AOSSIE" src="public/aossie-logo.svg" width="175">
  <img src="public/org-explorer-logo.png" width="175" />
</div>

<div align="center">

# OrgExplorer

[![Website](https://img.shields.io/badge/aossie.org/OrgExplorer-228B22?style=for-the-badge&labelColor=FFC517)](https://orgexplorer.aossie.org/)
[![Discord](https://img.shields.io/discord/1022871757289422898?style=flat&logo=discord&logoColor=white&label=Discord&labelColor=5865F2&color=57F287)](https://discord.gg/hjUhu33uAn)
[![License](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

</div>

<div align="center" style="margin-bottom: 16px;">
  <img src="badges/lighthouse.svg" alt="Lighthouse Score" />&nbsp;&nbsp;
  <img src="badges/lighthouse-performance.svg" alt="Lighthouse Performance" />&nbsp;&nbsp;
  <img src="badges/lighthouse-accessibility.svg" alt="Lighthouse Accessibility" />&nbsp;&nbsp;
  <img src="badges/lighthouse-best-practices.svg" alt="Lighthouse Best Practices" />&nbsp;&nbsp;
  <img src="badges/lighthouse-seo.svg" alt="Lighthouse SEO" />&nbsp;&nbsp;
  <img src="badges/lighthouse-pwa.svg" alt="Lighthouse PWA" />
</div>

---

**OrgExplorer** transforms GitHub organizations into interactive, visual intelligence dashboards. Explore repository relationships, contributor networks, activity trends, risk metrics, and organizational health—all without leaving your browser.

### Key Insights
- Repository relationship mapping
- Contributor collaboration networks
- Activity trends and growth patterns
- Bus factor & single-point-of-failure detection
- Technology stack distribution
- Real-time organizational metrics

---

## 🚀 Features

- **Fully Browser-Based** — Runs entirely in the browser with GitHub's REST API. No backend server required.

- **Organization Dashboard** — Overview of repositories, stars, contributors, creation timeline, tech stack, and activity metrics.

- **Repository Analytics** — Deep insights into repository health, commit frequency, contributor density, issue trends, and language composition.

- **Contributor Network Visualization** — Graph-based view of how contributors collaborate across repositories.

- **Bus Factor & Risk Detection** — Identify single points of failure and contributor concentration risks.

- **Activity & Growth Trends** — Track repository creation patterns, commit activity, and engagement over time.

- **Authenticated Mode** — Optional GitHub GraphQL API for enhanced data access and deeper analytics.

---

## 💻 Tech Stack

**Frontend**: React 18 · TypeScript · TailwindCSS · Vite  
**Visualizations**: D3.js · Recharts  
**Data**: GitHub REST & GraphQL APIs  
**Storage**: IndexedDB (browser-based caching)  
**Build**: Vite with React plugin

---

## 🏗️ Architecture

```mermaid
flowchart TD

%% =========================
%% USER BROWSER - MAIN FLOW
%% =========================

subgraph USER_BROWSER["User Browser"]

    %% -------------------------
    %% UI LAYER
    %% -------------------------
    subgraph UI_LAYER["UI Layer"]
        UI1[Organization Selector]
        UI2[Repo List]
        UI3[Contributor View]
        UI4[Graph View]
        UI5[Settings View<br/>Add PAT / Refresh Data]
    end

    %% -------------------------
    %% LOGIC LAYER
    %% -------------------------
    subgraph LOGIC_LAYER["Logic Layer"]
        L1[User Interaction with UI]
        L2[UI State Handling<br/>Selection Tracking]
        L3[Cache Validation Logic<br/>Check IndexedDB]
        L4[Rate Limit Awareness]
    end

end

UI1 --> L1
UI2 --> L1
UI3 --> L1
UI4 --> L1
UI5 --> L1

L1 --> L2
L2 --> L3

%% =========================
%% CACHE CHECK
%% =========================

L3 --> CACHE_DECISION{Data cached<br/>in IndexedDB?}

CACHE_DECISION -- Yes --> LOAD_CACHE[Load Data from IndexedDB]

CACHE_DECISION -- No --> API_FLOW_START[Start Data Fetch <br/>GraphQL / REST]

%% =========================
%% AUTH MODE DECISION
%% =========================

subgraph AUTH_LAYER["GitHub API Request Logic"]

    AUTH_CHECK{PAT Available?}

    AUTH_CHECK -- Yes --> AUTH_MODE[Request using PAT<br/>Higher Rate Limit]
    AUTH_CHECK -- No --> UNAUTH_MODE[Unauthenticated Mode<br/>60 req/hour]

end

API_FLOW_START --> AUTH_CHECK

AUTH_MODE --> API_REQUEST
UNAUTH_MODE --> API_REQUEST

%% =========================
%% GITHUB API LAYER
%% =========================

API_REQUEST[GitHub API Request]
API_REQUEST --> GITHUB_LAYER[GitHub API Layer<br/>GitHub Server]

GITHUB_LAYER --> RESPONSE_CHECK{Data Response}

RESPONSE_CHECK -- Success --> STORE_DATA[Store in IndexedDB]
RESPONSE_CHECK -- Failure --> ERROR_STATE[Error Message<br/>Failed to Load Data]

STORE_DATA --> LOAD_CACHE

%% =========================
%% LOCAL STORAGE LAYER
%% =========================

subgraph LOCAL_STORAGE["Local Storage Layer"]

    subgraph INDEXED_DB["IndexedDB (via idb)"]
        DB1[Org Store]
        DB2[Repo Store]
        DB3[Contributor Store]
        DB4[Graph Store]
        DB5[Node-Edge Store]
        DB6[Metadata]
    end

    subgraph LOCAL_STORAGE_META["localStorage"]
        LS1[Last Fetched]
        LS2[TTL]
        LS3[GitHub Rate Info]
        LS4[Known Present Flags]
    end

end

STORE_DATA --> INDEXED_DB
STORE_DATA --> LOCAL_STORAGE_META

LOAD_CACHE --> VISUAL_PAGE_1
LOAD_CACHE --> VISUAL_PAGE_2

%% =========================
%% VISUALIZATION PAGE 1
%% =========================

subgraph VISUAL_PAGE_1["Page 1 - Repo + Contributors Graph"]

    subgraph GRAPH_LAYER_1["Visualization Layer (Graph Visualization)"]
        G1_NODE[Node Builder]
        G1_EDGE[Edge Builder]
        G1_LAYOUT[Layout Engine]
        G1_INTERACT[Interaction Layer<br/>Hover → Tooltip<br/>Click → Detail Panel]
    end

    G1_NOTE[Shows one repo with all contributors<br/>Node & Edge Form]

end

%% =========================
%% VISUALIZATION PAGE 2
%% =========================

subgraph VISUAL_PAGE_2["Page 2 - All Repos Graph"]

    subgraph GRAPH_LAYER_2["Visualization Layer (Graph Visualization)"]
        G2_NODE[Node Builder]
        G2_EDGE[Edge Builder]
        G2_LAYOUT[Layout Engine]
        G2_INTERACT[Interaction Layer<br/>Hover → Tooltip<br/>Click → Detail Panel]
    end

    G2_NOTE[Shows all repos<br/>Node & Edge Form]

end
```

### System Structure

- Frontend (React + D3.js)
- Data Processing Layer (analytics engine)
- GitHub REST API
- Optional GitHub GraphQL API
- Database (IndexedDB for caching, local storage for user settings)
- UI Rendering Layer (dashboard, graphs, panels)

Data flows:

User → Frontend → API → GitHub APIs → Processing Layer → Database → UI Rendering

---

## 🔄 User Flow

```
User enters organization name
        ↓
REST API fetches public insights
        ↓
Analytics engine computes metrics
        ↓
Dashboard renders visual intelligence
        ↓
(Optional) User enables authenticated mode
```

### Quick Start

1. **Clone & Install**
   ```bash
   git clone https://github.com/AOSSIE-Org/OrgExplorer.git
   cd OrgExplorer
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open http://localhost:5173 in your browser.
   
3. **Build for Production**
   ```bash
   npm run build
   ```

4. **Docker Deployment (Optional)**

   If you want to host OrgExplorer locally or in your own containerized infrastructure:

   * **Using Docker Compose (Recommended)**:
     ```bash
     docker compose up --build -d
     ```
     Open http://localhost:8080 in your browser.

   * **Using Docker CLI**:
     ```bash
     docker build -t orgexplorer .
     docker run -d -p 8080:80 orgexplorer
     ```
     Open http://localhost:8080 in your browser.

5. **Risk Assessment**
   - Open bus factor panel
   - Detect low contributor redundancy
   - Review critical repositories


For detailed setup instructions, see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## 🤝 Contributing

We welcome contributions from developers, designers, and open-source enthusiasts. See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- How to report bugs and suggest features
- Development workflow and coding standards
- Pull request guidelines
- Community communication



## 📍 License

Licensed under the **GNU General Public License v3.0**. See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- AOSSIE Community
- GitHub API Documentation
- React, Vite, and D3.js communities

© 2026 AOSSIE. All rights reserved.
