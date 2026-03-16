<!-- Don't delete it -->
<div name="readme-top"></div>

<!-- Organization Logo -->
<div align="center" style="display: flex; align-items: center; justify-content: center; gap: 16px;">
  <img alt="AOSSIE" src="public/aossie-logo.svg" width="175">
  <img src="public/org-explorer-logo.svg" width="175" alt="Org Explorer" />
</div>

&nbsp;

<!-- Organization Name -->
<div align="center">

[![Static Badge](https://img.shields.io/badge/aossie.org%2FOrgExplorer-228B22?style=for-the-badge&labelColor=FFC517)](https://github.com/AOSSIE-Org/OrgExplorer)

</div>

<!-- Organization/Project Social Handles -->
<p align="center">
<!-- X (formerly Twitter) -->
<a href="https://x.com/aossie_org">
<img src="https://img.shields.io/twitter/follow/aossie_org" alt="X (formerly Twitter) Badge"/></a>
&nbsp;&nbsp;
<!-- Discord -->
<a href="https://discord.gg/hjUhu33uAn">
<img src="https://img.shields.io/discord/1022871757289422898?style=flat&logo=discord&logoColor=white&logoSize=auto&label=Discord&labelColor=5865F2&color=57F287" alt="Discord Badge"/></a>
&nbsp;&nbsp;
<!-- LinkedIn -->
<a href="https://www.linkedin.com/company/aossie/">
  <img src="https://img.shields.io/badge/LinkedIn-black?style=flat&logo=LinkedIn&logoColor=white&logoSize=auto&color=0A66C2" alt="LinkedIn Badge"></a>
</p>

---

<div align="center">
<h1>Org Explorer</h1>
</div>

**Org Explorer** is a lightweight web application that analyzes data from the **GitHub API** and presents it in a clear, interactive dashboard. Users can understand the activity of any GitHub organization in one place—repositories, contributors, commits, issues, and programming languages—through visual charts, summaries, and statistics.

The app provides **advanced analytics and tracking** that GitHub’s native UI doesn’t offer, helping maintainers spot trends, inactive projects, and overall organization growth.

**Theme:** Governance and Management  
**Goal:** Make it easier to track and govern distributed open organizations (e.g. AOSSIE).

---

## 🚀 Features

- **Organization health score** — A single computed score (e.g. 0–100) for overall org health: activity, issue closure rate, contributor engagement, repo freshness.
- **Inactive repository detection** — Flag repos with no commits/issues/PRs for a chosen period (e.g. 90 days).
- **Contributor activity ranking** — Rank contributors by commits, PRs, or issues in a chosen time window.
- **Activity heatmaps** — GitHub-style contribution heatmaps at org or repo level.
- **Single org-wide dashboard** — One place for repos, contributors, and stats.
- **Repo comparison** — Sort/filter repos by stars, forks, PR count, last activity.
- **Time-based views** — Activity in last 7 / 30 / 90 days.
- **Language breakdown** — Charts for programming languages across the org.
- **Shareable links** — Open a specific org view via URL (e.g. `?org=AOSSIE-Org`); no login required (public API only).
- **Offline / cached** — Data cached in IndexedDB for faster repeat visits and fewer API calls.

---

## 💻 Tech Stack

### Frontend
- **React** (with React Router)
- **TypeScript**
- **Vite** (build tooling)

### Data & storage
- **GitHub REST API** — Fetched from the browser (no backend).
- **IndexedDB** — Cache for repos, contributors, commits, issues.
- **localStorage** — Last org name, theme, preferences.

The app runs entirely in the browser; there is no backend server.

---

## 🔗 Repository

- [Main Repository](https://github.com/AOSSIE-Org/OrgExplorer)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18 or later
- **npm**, **yarn**, or **pnpm**

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/AOSSIE-Org/OrgExplorer.git
cd OrgExplorer
```

#### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

#### 3. (Optional) Environment Variables

For higher GitHub API rate limits, you can use a personal access token. Copy `.env.example` to `.env` and set:

```env
VITE_GITHUB_TOKEN=your_github_token_here
```

If not set, the app uses unauthenticated requests (lower rate limits).

#### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

#### 5. Open in Browser

Navigate to [http://localhost:5173](http://localhost:5173) (or the URL shown in the terminal) to use the application.

### Other scripts

- `npm run build` — Production build
- `npm run preview` — Preview production build locally
- `npm run lint` — Run ESLint

---

## 📱 App Screenshots

_Screenshots will be added as the UI is built._

---

## 🙌 Contributing

⭐ Star this repository if you find it useful! ⭐

Contributions are welcome. Please read our [Contribution Guidelines](./CONTRIBUTING.md) before submitting a PR or issue.

---

## 📍 License

This project is licensed under the GNU General Public License v3.0.  
See the [LICENSE](LICENSE) file for details.

---

## 💪 Thanks To All Contributors

Thanks for helping Org Explorer grow. 🥂

[![Contributors](https://contrib.rocks/image?repo=AOSSIE-Org/OrgExplorer)](https://github.com/AOSSIE-Org/OrgExplorer/graphs/contributors)

© 2025 AOSSIE
