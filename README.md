<!-- Don't delete it -->
<div name="readme-top"></div>

<!-- Organization Logo -->
<div align="center" style="display: flex; align-items: center; justify-content: center; gap: 16px;">
  <img alt="AOSSIE" src="public/aossie-logo.svg" width="175">
  <img src="public/orgexplorer-logo.svg" width="175" />
</div>

&nbsp;

<!-- Organization Name -->
<div align="center">

[![Static Badge](https://img.shields.io/badge/aossie.org/OrgExplorer-228B22?style=for-the-badge&labelColor=FFC517)](https://orgexplorer.aossie.org/)

</div>

<!-- Organization/Project Social Handles -->
<p align="center">
<a href="https://t.me/StabilityNexus">
<img src="https://img.shields.io/badge/Telegram-black?style=flat&logo=telegram&logoColor=white&logoSize=auto&color=24A1DE" alt="Telegram Badge"/></a>
&nbsp;&nbsp;
<a href="https://x.com/aossie_org">
<img src="https://img.shields.io/twitter/follow/aossie_org" alt="X Badge"/></a>
&nbsp;&nbsp;
<a href="https://discord.gg/hjUhu33uAn">
<img src="https://img.shields.io/discord/1022871757289422898?style=flat&logo=discord&logoColor=white&logoSize=auto&label=Discord&labelColor=5865F2&color=57F287" alt="Discord Badge"/></a>
&nbsp;&nbsp;
<a href="https://news.stability.nexus/">
  <img src="https://img.shields.io/badge/Medium-black?style=flat&logo=medium&logoColor=black&logoSize=auto&color=white" alt="Medium Badge"></a>
&nbsp;&nbsp;
<a href="https://www.linkedin.com/company/aossie/">
  <img src="https://img.shields.io/badge/LinkedIn-black?style=flat&logo=LinkedIn&logoColor=white&logoSize=auto&color=0A66C2" alt="LinkedIn Badge"></a>
&nbsp;&nbsp;
<a href="https://www.youtube.com/@StabilityNexus">
  <img src="https://img.shields.io/youtube/channel/subscribers/UCZOG4YhFQdlGaLugr_e5BKw?style=flat&logo=youtube&logoColor=white&logoSize=auto&labelColor=FF0000&color=FF0000" alt="Youtube Badge"></a>
</p>

---

<div align="center">
<h1>OrgExplorer</h1>
</div>

**OrgExplorer** is an open-source intelligence platform that transforms GitHub organizations into interactive, visual ecosystems.

Instead of browsing repositories one by one, OrgExplorer allows you to explore:

- Relationships between repositories  
- Contributor collaboration networks  
- Activity trends over time  
- Bus factor risks  
- Language distribution  
- Organizational health metrics  

It turns GitHub data into insight.

---

## 🚀 Features

  **Fully Browser-Based Application**
   No backend server required. Runs entirely in the browser using GitHub's REST API for data retrieval and processing. Runs entirely in the browser with no dedicated backend server. All data is fetched directly from GitHub APIs.

- **Organization Intelligence Dashboard**  
  Overview of total repositories, stars, contributors, creation timeline, tech stack distribution, and activity insights.

- **Repository Analytics**  
  Deep dive into repository health, commit frequency, contributor density, issue trends, and language composition.

- **Contributor Network Visualization**  
  Graph-based view of how contributors collaborate across repositories.

- **Bus Factor & Risk Insights**  
  Identify single points of failure and contributor concentration risks.

- **Activity & Growth Trends**  
  Track repository creation patterns, commit waves, and engagement over time.

- **REST-first Data Strategy**  
  Uses GitHub REST API for initial trust-building insights before enabling advanced authenticated GraphQL exploration.

  **Optional Authenticated Mode**
   For users who want deeper insights, an authenticated mode can be enabled to access GitHub's GraphQL API, unlocking more detailed data and analytics.

---

## 💻 Tech Stack

### Frontend

- TypeScript
- TailwindCSS
- Framer Motion (animations)
- D3.js / Graph-based visualizations
- GitHub REST API
- Optional GraphQL API (Authenticated Mode)

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
(Optional) User enables advanced authenticated mode
```

### Key User Journeys

1. **Explore an Organization**
   - Enter org name
   - View overview dashboard
   - Analyze repository metrics

2. **Analyze Contributor Network**
   - Open contributor graph
   - Inspect collaboration edges
   - Identify central contributors

3. **Risk Assessment**
   - Open bus factor panel
   - Detect low contributor redundancy
   - Review critical repositories

---

## 🍀 Getting Started

### Prerequisites

- Node.js 18+
- npm / pnpm / yarn
- GitHub API rate awareness

---

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/AOSSIE-Org/OrgExplorer.git
cd OrgExplorer
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Run Development Server

```bash
npm run dev
```

#### 4. Open Browser

Navigate to:

http://localhost:3000

---


## 🙌 Contributing

We welcome developers, designers, data scientists, and open-source enthusiasts.

Ways you can contribute:

- Improve analytics algorithms
- Enhance UI/UX
- Optimize API rate handling
- Add new visualizations
- Improve documentation
- Fix bugs & performance issues

Before contributing:

1. Fork the repository
2. Create a feature branch
3. Follow coding standards
4. Submit a pull request with clear description

Please read our [Contribution Guidelines](./CONTRIBUTING.md).

If you love the vision — give it a ⭐.

---

## ✨ Maintainers

- AOSSIE Core Team

---

## 📍 License

This project is licensed under the GNU General Public License v3.0.  
See the [LICENSE](LICENSE) file for details.

---

## 💪 Thanks To All Contributors

Open source grows because of people like you.

© 2026 AOSSIE. All rights reserved.