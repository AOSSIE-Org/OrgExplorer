# Contributing to OrgExplorer

Thank you for considering a contribution to **OrgExplorer**, an AOSSIE project. This guide describes how the repository is set up today and how we expect contributions to flow.

By participating, you agree to communicate respectfully with maintainers and other contributors, in line with AOSSIE community norms on Discord and GitHub.

## Discord communication

**Project coordination happens on Discord.** GitHub is used for code and issue tracking; important updates and questions should also reach maintainers on Discord.

- Join the [AOSSIE Discord server](https://discord.gg/hjUhu33uAn) before you start substantial work.
- Share a link to your PR in the relevant channel so reviewers can find it.
- PRs that are hard to discover or lack context may be delayed—see also the [pull request template](.github/PULL_REQUEST_TEMPLATE.md).

## Table of contents

- [How you can contribute](#how-you-can-contribute)
- [Project overview](#project-overview)
- [Getting started](#getting-started)
- [Development workflow](#development-workflow)
- [Pull request guidelines](#pull-request-guidelines)
- [Code style](#code-style)
- [Community notes](#community-notes)

## How you can contribute

### Reporting bugs

Before opening an issue, search existing ones to avoid duplicates. Useful bug reports include:

- A clear title and short summary
- Steps to reproduce
- Expected vs actual behavior
- Screenshots or recordings if the UI is involved
- Environment (OS, browser, Node.js version if relevant)

### Suggesting features

- Check whether the idea already exists as an issue
- Describe the feature and the problem it solves
- Add examples or mockups if helpful

### Contributing code

1. **Open or pick an issue** — For non-trivial work, tie your change to an issue (feature, bug, or docs).
2. **Comment / get aligned** — Prefer waiting for maintainer assignment or confirmation on Discord before large efforts, to avoid duplicate or rejected work.
3. **Open a PR** — Keep the change focused; unrelated drive-by edits make review harder.

## Project overview

OrgExplorer is a **single-package frontend** application:

| Area | Stack |
|------|--------|
| UI | [React](https://react.dev/) 19 |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Build & dev server | [Vite](https://vite.dev/) (with `@vitejs/plugin-react`) |
| Linting | [ESLint](https://eslint.org/) 9 (flat config in `eslint.config.js`) |

Approximate layout:

```text
OrgExplorer/
├── public/           # Static assets (e.g. logos)
├── src/
│   ├── App.tsx       # Root UI
│   ├── main.tsx      # React entry
│   └── *.css         # Styles
├── index.html
├── vite.config.ts
├── eslint.config.js
├── tsconfig.json     # TypeScript project references
└── package.json
```

There is **no `test` script** in `package.json` yet. Before opening a PR, run **lint** and **build** locally (see below).

## Getting started

### Prerequisites

- **[Node.js](https://nodejs.org/)** — Use a current LTS release (for example 20.x or 22.x). If `npm run dev` or `npm run build` fails, try upgrading Node first.
- **npm** — Comes with Node; this repo uses `package-lock.json`, so prefer `npm install` for consistent dependency trees.

### Clone and install

1. **Fork** the repository on GitHub (if you do not have write access to the org repo).

2. **Clone your fork** and enter the project root:

   ```bash
   git clone https://github.com/YOUR_USERNAME/OrgExplorer.git
   cd OrgExplorer
   ```

3. **Add `upstream`** (replace the URL if the canonical remote differs):

   ```bash
   git remote add upstream https://github.com/AOSSIE-Org/OrgExplorer.git
   ```

4. **Install dependencies:**

   ```bash
   npm install
   ```

5. **Run the dev server:**

   ```bash
   npm run dev
   ```

   Vite prints a local URL (typically `http://localhost:5173`). Open it in your browser.

6. **Production build (sanity check):**

   ```bash
   npm run build
   ```

7. **Preview the production build (optional):**

   ```bash
   npm run preview
   ```

### Environment variables

If the project later adds a `.env.example`, copy it to `.env` and fill in values as documented. Until then, the default setup does not require env files for local development.

## Development workflow

### 1. Branch from the default branch

Create a branch from the latest default branch (usually `main`):

```bash
git fetch upstream
git checkout main
git pull upstream main
git checkout -b docs/your-change-description
# or: fix/issue-42-short-name
# or: feat/short-feature-name
```

### 2. Make changes

- Prefer small, reviewable commits with clear messages.
- Update docs when behavior or setup changes.
- Remove stray `console.log` and debug code before submitting.

### 3. Verify locally

```bash
npm run lint
npm run build
```

Fix any ESLint or TypeScript errors reported by these commands.

### 4. Commit messages

Conventional prefixes help scan history:

| Prefix | Use for |
|--------|---------|
| `feat:` | New user-facing behavior |
| `fix:` | Bug fixes |
| `docs:` | Documentation only |
| `style:` | Formatting, no logic change |
| `refactor:` | Internal restructuring |
| `chore:` | Tooling, config, dependencies |

Example:

```bash
git commit -m "docs: refine CONTRIBUTING for Vite and React setup"
```

### 5. Push and open a PR

```bash
git push origin docs/your-change-description
```

On GitHub, open a pull request against the upstream default branch. Use the PR template, link the issue (e.g. `Fixes #23`), and post on Discord as requested in the checklist.

### 6. Keep your branch up to date

```bash
git fetch upstream
git rebase upstream/main
# resolve conflicts if any, then:
git push --force-with-lease origin docs/your-change-description
```

Use rebase or merge according to what maintainers prefer; rebasing keeps history linear.

## Pull request guidelines

### Before you submit

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Documentation updated when setup or behavior changes
- [ ] Commits are understandable without reading every file
- [ ] Branch is reasonably up to date with upstream

### PR contents

1. Fill in [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md).
2. Link related issues (`Fixes #123` or `Related to #123`).
3. Add screenshots or recordings for visible UI changes.
4. Mention anything reviewers should know (breaking changes, follow-ups).

### After submission

- Share the PR link on Discord.
- Respond to review feedback; additional commits on the same branch are fine.
- The PR template includes an **AI notice**: if you used AI-assisted tooling, you are still responsible for correctness, build, and lint.

### Suggested PR description snippet

```markdown
## Description
Brief summary of changes.

## Related issue
Fixes #23

## Testing
- `npm run lint`
- `npm run build`
- Manual: …

## Checklist
See PR template.
```

## Code style

### TypeScript and React

- Follow the existing **ESLint** setup in `eslint.config.js` (`typescript-eslint`, React Hooks, React Refresh for Vite).
- Prefer `const`; use `let` only when reassignment is needed.
- Use meaningful names; keep components and functions focused.
- Match formatting and patterns in nearby files.

### General

- Avoid unnecessary dependencies.
- Do not commit secrets or large generated artifacts unrelated to the feature.

## Community notes

- Be respectful and constructive.
- If you cannot finish an issue, say so on Discord so it can be reassigned.
- If a PR has no response after a reasonable time, follow up on Discord rather than only pinging on GitHub.

### Issue assignment

- One primary assignee per issue unless maintainers say otherwise.
- Check for an existing PR before duplicating work.

---

Thank you for helping improve OrgExplorer.
