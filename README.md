<!-- Don't delete it -->
<div name="readme-top"></div>

<!-- Organization Logo -->
<div align="center" style="display: flex; align-items: center; justify-content: center; gap: 16px;">
  <img alt="AOSSIE" src="public/aossie-logo.svg" width="175">
  <img src="public/todo-project-logo.svg" width="175" />
</div>

&nbsp;

<!-- Organization Name -->
<div align="center">

[![Static Badge](https://img.shields.io/badge/aossie.org/TODO-228B22?style=for-the-badge&labelColor=FFC517)](https://TODO.aossie.org/)

<!-- Correct deployed url to be added -->

</div>

<!-- Organization/Project Social Handles -->
<p align="center">
<!-- Telegram -->
<a href="https://t.me/StabilityNexus">
<img src="https://img.shields.io/badge/Telegram-black?style=flat&logo=telegram&logoColor=white&logoSize=auto&color=24A1DE" alt="Telegram Badge"/></a>
&nbsp;&nbsp;
<!-- X (formerly Twitter) -->
<a href="https://x.com/aossie_org">
<img src="https://img.shields.io/twitter/follow/aossie_org" alt="X (formerly Twitter) Badge"/></a>
&nbsp;&nbsp;
<!-- Discord -->
<a href="https://discord.gg/hjUhu33uAn">
<img src="https://img.shields.io/discord/1022871757289422898?style=flat&logo=discord&logoColor=white&logoSize=auto&label=Discord&labelColor=5865F2&color=57F287" alt="Discord Badge"/></a>
&nbsp;&nbsp;
<!-- Medium -->
<a href="https://news.stability.nexus/">
  <img src="https://img.shields.io/badge/Medium-black?style=flat&logo=medium&logoColor=black&logoSize=auto&color=white" alt="Medium Badge"></a>
&nbsp;&nbsp;
<!-- LinkedIn -->
<a href="https://www.linkedin.com/company/aossie/">
  <img src="https://img.shields.io/badge/LinkedIn-black?style=flat&logo=LinkedIn&logoColor=white&logoSize=auto&color=0A66C2" alt="LinkedIn Badge"></a>
&nbsp;&nbsp;
<!-- Youtube -->
<a href="https://www.youtube.com/@StabilityNexus">
  <img src="https://img.shields.io/youtube/channel/subscribers/UCZOG4YhFQdlGaLugr_e5BKw?style=flat&logo=youtube&logoColor=white&logoSize=auto&labelColor=FF0000&color=FF0000" alt="Youtube Badge"></a>
</p>

---

<div align="center">
<h1> OrgExplorer</h1>
</div>

 OrgExplorer is a lightweight, browser-based web application that helps visualize and understand activity within a GitHub organization.  
It fetches publicly available data from the GitHub API and presents it in a summarized and structured way, making it easier to track repositories, contributors, and overall organizational activity beyond what GitHub’s default UI provides.

The application is designed to be fully client-side, with no backend dependency, and uses local caching to efficiently manage GitHub API rate limits.


---


### 🚀 Features

- **Organization-level insights**  
  View high-level information about a GitHub organization, including repository activity and overall growth indicators.

- **Repository-level analytics**  
  Analyze repositories within an organization, such as activity status, update frequency, issues, pull requests, and language usage.

- **Contributor summaries**  
  Identify and rank contributors based on their activity across repositories using aggregated contribution data.

- **Client-side caching**  
  Uses IndexedDB (via a lightweight wrapper) to cache fetched data locally, reducing redundant API calls and helping avoid rate limits.

- **Optional GitHub authentication**  
  Works with unauthenticated GitHub API calls by default, with optional support for a user-provided GitHub Personal Access Token (PAT) for higher rate limits when needed.

---

## 💻 Tech Stack


### Frontend
- React 
- TypeScript
- TailwindCSS

### Backend
- Github REST API
- Database: idb(for browser indexed db)


## 🔗 Repository Links


[Main Repository](https://github.com/AOSSIE-Org/OrgExplorer)


---

## 🏗️ Architecture Diagram

TODO: Add your system architecture diagram here
```

<img width="1801" height="1730" alt="image" src="https://github.com/user-attachments/assets/40b1d108-5698-4945-9662-99369f25e8ee" />
```

---


## 🔄 User Flow


```

<img width="1842" height="4420" alt="image" src="https://github.com/user-attachments/assets/5cbd668f-41d6-4717-8143-8b130cdcae2a" />

```

### Key User Journeys
1. ###  Explore an Organization (Default Flow)
- User opens the application
- User enters a GitHub organization name
- Application checks IndexedDB for cached data
- If cached data exists, it is loaded immediately
- Otherwise, data is fetched from the GitHub API and cached locally
- Organization and repository insights are displayed

2. ###  Optional Authentication for Higher Rate Limits
- User optionally provides a GitHub Personal Access Token (PAT)
- Token is stored locally in the browser
- Subsequent API requests use authenticated GitHub requests
- Enables higher rate limits and deeper data access

3. ### Refresh Organization Data
- User manually refreshes organization data
- Cached data is invalidated or updated
- Latest data is fetched from the GitHub API
- Updated insights are stored back in IndexedDB

> Note: Diagrams and flows will evolve as features and UI components are finalized.

---

## �🍀 Getting Started

### Prerequisites

TODO: List what developers need installed

- Node.js 18+ 
- npm / yarn / pnpm


### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/AOSSIE-Org/OrgExplorer.git
cd OrgExplorer
```

#### 3. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```



#### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

#### 5. Open your Browser

Navigate to [http://localhost:5173/](http://localhost:5173) to see the application.


---

## 📱 App Screenshots


> Screenshots will be added once the initial UI and data visualizations are implemented.

---

## 🙌 Contributing

⭐ Don't forget to star this repository if you find it useful! ⭐

Thank you for considering contributing to this project! Contributions are highly appreciated and welcomed. To ensure smooth collaboration, please refer to our [Contribution Guidelines](./CONTRIBUTING.md).

---

## ✨ Maintainers


- [Bruno](https://github.com/Zahnentferner)

---

## 📍 License

This project is licensed under the GNU General Public License v3.0.
See the [LICENSE](LICENSE) file for details.

---

## 💪 Thanks To All Contributors

Thanks a lot for spending your time helping TODO grow. Keep rocking 🥂

[![Contributors](https://contrib.rocks/image?repo=AOSSIE-Org/TODO)](https://github.com/AOSSIE-Org/TODO/graphs/contributors)

© 2025 AOSSIE 
