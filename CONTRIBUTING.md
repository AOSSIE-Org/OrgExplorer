# Contributing to OrgExplorer

Thank you for your interest in contributing to **OrgExplorer**—an AOSSIE project. This guide outlines how to report issues, suggest features, and submit code changes.

By participating in this project, you agree to abide by our community standards and communicate respectfully with maintainers and fellow contributors.

## Quick Links

- **Discord**: [AOSSIE Community](https://discord.gg/hjUhu33uAn) — Join for discussions and announcements
- **Issues**: [GitHub Issues](https://github.com/AOSSIE-Org/OrgExplorer/issues) — Report bugs and request features
- **Discussions**: Use Discord for architecture questions and early-stage ideas


## How to Contribute

### Report a Bug

Before opening an issue, search for existing ones to avoid duplicates. A good bug report includes:

- **Clear title** — Brief, descriptive summary
- **Steps to reproduce** — Exact steps to trigger the issue
- **Expected vs actual behavior** — What should happen vs what happens
- **Screenshots/recordings** — For UI-related bugs
- **Environment** — OS, browser, Node.js version if relevant

### Request a Feature

1. Check existing [issues](https://github.com/AOSSIE-Org/OrgExplorer/issues) to see if it's already suggested
2. Describe the feature and the problem it solves
3. Provide examples or mockups if helpful
4. Discuss on Discord for early feedback before extensive work

### Submit Code

1. **Claim an issue** — Comment on the issue (or a [discussion](https://github.com/AOSSIE-Org/OrgExplorer/discussions)) before starting work
2. **Get alignment** — Wait for maintainer confirmation on approach for significant changes
3. **Fork & branch** — Create a feature branch from `main`
4. **Make changes** — Keep commits focused and messages clear
5. **Test locally** — Run lint and build before submitting
6. **Open a PR** — Use the PR template and link related issues
7. **Engage on Discord** — Share your PR link for visibility



## Project Architecture

OrgExplorer is a **single-package frontend** React application with the following tech stack:

| Component | Technology |
|-----------|-----------|
| **UI Framework** | React 18 with TypeScript |
| **Styling** | TailwindCSS |
| **Build Tool** | Vite |
| **Linting** | ESLint 9 |
| **Data Fetching** | GitHub REST & GraphQL APIs |
| **Visualizations** | D3.js & Recharts |
| **Storage** | IndexedDB (browser-based) |

### Project Structure

```
OrgExplorer/
├── public/              # Static assets (logos, etc.)
├── src/
│   ├── App.tsx         # Root component
│   ├── main.tsx        # React entry point
│   ├── components/     # Reusable components
│   ├── pages/          # Page components
│   ├── utils/          # Helper functions
│   └── styles/         # Global & module styles
├── index.html          # HTML entry point
├── vite.config.ts      # Vite configuration
├── eslint.config.js    # ESLint rules
├── tsconfig.json       # TypeScript config
└── package.json        # Dependencies & scripts
```

**Note**: No test script yet. Run `npm run lint` and `npm run build` before submitting PRs.



## Getting Started

### Prerequisites

- **Node.js**: Current LTS version (20.x or 22.x). If commands fail, upgrade Node first.
- **npm**: Comes with Node; this repo uses `package-lock.json` for consistency.

### Setup Steps

1. **Fork the repository** on GitHub (if you don't have push access)

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/OrgExplorer.git
   cd OrgExplorer
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/AOSSIE-Org/OrgExplorer.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```
   Opens on http://localhost:5173 (Vite default)

6. **Verify build works**:
   ```bash
   npm run build
   npm run preview
   ```

### Environment Setup

If `.env.example` exists, copy it to `.env` and fill in values as documented. Otherwise, no environment files are required for local development.



## Development Workflow

### 1. Create a Feature Branch

```bash
git fetch upstream
git checkout upstream/main
git checkout -b feat/short-description
# or: fix/issue-number-short-description
# or: docs/your-change
```

### 2. Make Your Changes

- Write focused, reviewable commits
- Use clear commit messages (see conventions below)
- Update documentation if behavior changes
- Remove console logs and debug code before committing

### 3. Verify Locally

```bash
npm run lint      # Check code style and TypeScript
npm run build     # Ensure production build succeeds
```

Fix any errors reported before proceeding.

### 4. Commit Message Conventions

| Prefix | Purpose |
|--------|---------|
| `feat:` | New user-facing feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `style:` | Formatting changes (no logic change) |
| `refactor:` | Code restructuring |
| `chore:` | Dependencies, config, tooling |

**Example**:
```
feat: add repository network graph visualization
docs: update CONTRIBUTING with setup steps
```

### 5. Push and Create a Pull Request

```bash
git push origin feat/short-description
```

On GitHub:
1. Open a PR against `upstream/main`
2. Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md)
3. Link related issues using `Fixes #123` or `Related to #123`
4. Add screenshots for UI changes
5. Share the PR link on [Discord](https://discord.gg/hjUhu33uAn)

### 6. Keep Your Branch Updated

```bash
git fetch upstream
git rebase upstream/main
git push --force-with-lease origin feat/short-description
```



## Pull Request Checklist

Before submitting your PR, ensure:

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Documentation is updated for behavior changes
- [ ] Commits are clear and well-described
- [ ] Branch is up to date with `upstream/main`
- [ ] Related issues are linked

### PR Contents

1. **Use the PR template** — Fill in all sections in [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md)
2. **Link issues** — Use `Fixes #123` or `Related to #456`
3. **Add visuals** — Screenshots/recordings for UI changes
4. **Explain trade-offs** — Mention anything reviewers should know
5. **Disclose AI usage** — If you used AI tools, mention it (required by template)

### After Submission

- Check back regularly for review feedback
- Push additional commits to the same branch (no need to force-push)
- Respond to comments promptly
- Share the PR on Discord for visibility



## Code Style & Standards

### TypeScript & React

- Follow existing **ESLint** configuration (`eslint.config.js`)
- Use `const` by default; only use `let` when reassignment is needed
- Write meaningful names; keep components focused and reusable
- Match patterns in nearby files for consistency

### Best Practices

- **No unnecessary dependencies** — Use browser APIs when possible
- **No secrets or large artifacts** — Don't commit API keys, build outputs, or node_modules
- **Keep it simple** — Avoid over-engineering; favor readability
- **Type safety** — Use TypeScript for new code; avoid `any` when possible

### Formatting

- ESLint is configured and will catch most issues
- Run `npm run lint` frequently during development
- Format imports and maintain consistent style with the codebase



## Community Guidelines

- **Be respectful** — Treat all contributors with courtesy
- **Communicate clearly** — Use clear language in issues and PRs
- **Ask for help** — If stuck or can't finish, reach out on Discord
- **Follow up** — If a PR is inactive, ping on Discord rather than only commenting on GitHub
- **One assignee per issue** — Avoid duplicate efforts; check for existing PRs first

---

## Questions?

- 💬 **Discord**: Ask on [AOSSIE server](https://discord.gg/hjUhu33uAn)
- 🐛 **Bug reports**: Open an [issue](https://github.com/AOSSIE-Org/OrgExplorer/issues)
- 💡 **Ideas**: Start a [discussion](https://github.com/AOSSIE-Org/OrgExplorer/discussions)

Thank you for contributing to OrgExplorer! 🎉

