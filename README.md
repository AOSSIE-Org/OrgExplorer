<!-- Don't delete it -->
<div name="readme-top"></div>

<!-- Organization Logo -->
<div align="center" style="display: flex; align-items: center; justify-content: center; gap: 16px;">
  <img src="./public/org-explorer-logo.png" width="175" />
  <img alt="AOSSIE" src="public/aossie-logo.svg" width="175">
</div>

<div align="center" style="margin-top: 16px; margin-bottom: 16px;">


<a href="https://x.com/aossie_org">
<img src="https://img.shields.io/twitter/follow/aossie_org" alt="X Badge"/></a>
&nbsp;&nbsp;
<a href="https://discord.gg/hjUhu33uAn">
<img src="https://img.shields.io/discord/1022871757289422898?style=flat&logo=discord&logoColor=white&logoSize=auto&label=Discord&labelColor=5865F2&color=57F287" alt="Discord Badge"/></a>
&nbsp;&nbsp;
<a href="https://www.linkedin.com/company/aossie/">
  <img src="https://img.shields.io/badge/LinkedIn-black?style=flat&logo=LinkedIn&logoColor=white&logoSize=auto&color=0A66C2" alt="LinkedIn Badge"></a>
&nbsp;&nbsp;
<a href="https://www.youtube.com/@StabilityNexus">
  <img src="https://img.shields.io/youtube/channel/subscribers/UCZOG4YhFQdlGaLugr_e5BKw?style=flat&logo=youtube&logoColor=white&logoSize=auto&labelColor=FF0000&color=FF0000" alt="Youtube Badge"></a>
  &nbsp;&nbsp;

[![License](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

</div>

---

**OrgExplorer** transforms GitHub organizations into interactive, visual intelligence dashboards. Explore repository relationships, compare two or more organizations, contributor networks, activity trends, risk metrics, and organizational health—all without leaving your browser.

### Key Insights

- Organizational structure and repository relationships
- Comparative analysis of multiple organizations
- Repository relationship mapping
- Contributor collaboration networks
- Activity trends and growth patterns
- Bus factor & single-point-of-failure detection
- Technology stack distribution
- Real-time organizational metrics

---

## 🚀 Features

- **Fully Browser-Based** — Runs entirely in the browser using GitHub APIs with no backend server required.

- **Organization Overview Dashboard** — Explore repositories, contributors, activity trends, tech stack distribution, and organization growth insights.

- **Advanced Repository Analytics** — Analyze repository activity, contributor density, issue and PR trends, health metrics, and lifecycle status.

- **Contributor & Repository Network Graphs** — Interactive visualizations for contributor collaboration and repository-centric contributor relationships.

- **Multi-Organization Analysis** — Compare and analyze multiple GitHub organizations together.

- **Repository Health & Governance Insights** — Detect inactive repositories, stale issues/PRs, missing licenses, and contributor concentration risks.

- **Time-Series Activity Charts** — Visualize weekly and monthly repository, issue, and pull request activity trends.

- **Persistent API Cache & Performance Optimization** — IndexedDB-powered caching and optimized handling for large organizations and datasets.

- **Personal Access Token (PAT) & API Quota Support** — Optional authenticated mode with rate limit awareness and enhanced API access.

- **Advanced Repository Explorer** — Interactive repository table with filtering, sorting, and computed analytics metrics.

- **Export & Share Features** — Export analytics reports and share application state through URL-based deep linking.

---

## 💻 Tech Stack

**Frontend**: React 18 · JavaScript · TailwindCSS · Vite  
**Visualizations**: D3.js · Recharts  
**Data**: GitHub REST & GraphQL APIs  
**Storage**: IndexedDB (browser-based caching), Local Storage (user settings)  
**Build**: Vite with React plugin

---

## ✅ Project Checklist

- [x] Organization overview dashboard implemented  
- [x] Repository-level analytics implemented  
- [x] Contributor graph visualization system built  
- [x] Advanced GraphQL authenticated mode  
- [x] Enterprise-grade caching and rate optimization  
- [x] Historical data tracking engine  

---

## 🔗 Repository Links

1. [Main Repository](https://github.com/AOSSIE-Org/OrgExplorer)

---

## 🏗️ Architecture Diagram

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

- Frontend (React + D3.js + Recharts)
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
REST API fetches public insights for organization
        ↓
Analytics engine computes metrics
        ↓
Dashboard renders visual intelligence
        ↓
(Optional) User enables advanced authenticated mode
```

### Key User Journeys

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

3. **Risk Assessment**
   - Open bus factor panel
   - Detect low contributor redundancy
   - Review critical repositories

---

## 🍀 Getting Started

We welcome contributions from developers, designers, and open-source enthusiasts. See [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- How to report bugs and suggest features
- Development workflow and coding standards
- Pull request guidelines
- Community communication

## 📍 License

This project is licensed under the GNU General Public License v3.0.  
See the [LICENSE](LICENSE) file for details.

---

## 💪 Thanks To All Contributors

Open source grows because of people like you.

© 2026 AOSSIE. All rights reserved.

---

Thanks a lot for spending your time helping OrgExplorer grow. Keep rocking 🥂

<a href="https://github.com/AOSSIE-Org/OrgExplorer/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AOSSIE-Org/OrgExplorer" alt="Contributors"/>
</a>
<br>
