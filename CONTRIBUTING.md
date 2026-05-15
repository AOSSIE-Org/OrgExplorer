# Contributing to OrgExplorer

⭐ First off, thank you for considering contributing to OrgExplorer! ⭐

OrgExplorer is a high-speed visualization engine for massive GitHub organizations, developed under the **AOSSIE** organization. We are proud to be part of the Open Source community and welcome contributions from GSoC students, students, and developers of all backgrounds.

## 📢 IMPORTANT: Discord Communication is Mandatory

**All project communication MUST happen on Discord. We do not pay attention to GitHub notifications.**

- Join our [Discord server](https://discord.gg/hjUhu33uAn) before starting any work.
- Post your PR/issue updates in the #orgexplorer channel (**MANDATORY**).
- GitHub is for code hosting only—Discord is for community and discussion.

---

## 📋 Table of Contents

- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Code Style Guidelines](#code-style-guidelines)
- [GSoC & AOSSIE specifics](#gsoc--aossie-specifics)

---

## 🤝 How Can I Contribute?

### Reporting Bugs
Before creating bug reports, please check existing issues to avoid duplicates. When creating a report, include steps to reproduce, environment details, and screenshots.

### Suggesting Features
Feature suggestions are highly encouraged! Please describe the utility of the feature and how it fits into the "High-Speed Visualization" goal of OrgExplorer.

### Contributing Code
1. **Submit an Issue**: Always create an issue first to describe the problem or feature.
2. **Get Assigned**: Wait for an AOSSIE maintainer to assign the issue to you.
3. **Submit Your PR**: Work on your branch and submit the PR once ready.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v22.x or later (LTS recommended)
- **npm**: v10.x or later
- **Git**

### local Setup
1. **Fork the Repository** on GitHub.
2. **Clone Your Fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/OrgExplorer.git
   cd OrgExplorer
   ```
3. **Add Upstream Remote**:
   ```bash
   git remote add upstream https://github.com/AOSSIE-Org/OrgExplorer.git
   ```
4. **Install Dependencies**:
   ```bash
   npm install
   ```
5. **Run the Project**:
   ```bash
   npm run dev
   ```

---

## 🔄 Development Workflow

### 1. Create a Branch
```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Tech Stack
OrgExplorer uses a modern, high-performance stack:
- **React 19**: Frontend framework.
- **TypeScript**: For type-safe development.
- **Tailwind CSS v4**: CSS-first styling engine.
- **Vite**: Build tool for fast HMR.

### 3. Commit Format
We follow conventional commits:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `refactor:` for code restructuring (like the recent component migration)

---

## 📤 Pull Request Guidelines

### Submitting a PR
- Ensure your code is linted (`npm run lint`).
- Update relevant documentation.
- Link the PR to the issue (`Closes #issue_number`).
- **Post the PR link on Discord immediately after submission.**

---

## 🌟 GSoC & AOSSIE Specifics

As an AOSSIE project, we maintain a high standard for GSoC contributions:
- **Quality**: Code must be clean, modular, and well-documented.
- **Engagement**: Active participation in Discord discussions is key.
- **Timeline**: Pull requests should ideally be completed within 14 days of assignment.

---

Thank you for helping make OrgExplorer the best tool for visualizing the open-source world! 🚀
