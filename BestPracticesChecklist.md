# AOSSIE Best Practices Checklist

> Criteria adapted from the [OpenSSF Best Practices Badge](https://github.com/coreinfrastructure/best-practices-badge)
> (MIT / CC BY 3.0) by OpenSSF contributors. Modified for AOSSIE multi-repo template use.
>
> **Purpose:** Covers OpenSSF Best Practices criteria that are NOT auto-detected by OpenSSF Scorecard.
> Scorecard already handles: License, SAST tools, CI tests, Security Policy file, Branch Protection,
> Pinned Dependencies, Signed Releases, Maintained status, and Known Vulnerabilities.
>
> **How to use:**
> 1. Fill in checkboxes below — tick `[x]` for Met, leave `[ ]` for Unmet, use `[~]` for N/A
> 2. Add a brief note or URL after each item as evidence
> 3. Run the checklist-score workflow to update the badge automatically
>
> **Legend:**
> - 🔴 MUST — Required for passing
> - 🟡 SHOULD — Required unless documented rationale given
> - 🔵 SUGGESTED — Optional but recommended
> - ⚪ N/A — Mark `[~]` if not applicable, add justification

---

## Score Summary

<!-- Auto-updated by checklist-score.yml workflow — do not edit manually -->

| Category           | Met | Total | Status |
|--------------------|-----|-------|--------|
| Basics             | 8   | 8     | ✅     |
| Change Control     | 6   | 6     | ✅     |
| Reporting          | 8   | 8     | ✅     |
| Quality            | 6   | 11    | 🟡     |
| Security           | 9   | 9     | ✅     |
| Analysis           | 7   | 7     | 🟡     |
| **Total**          | **44** | **49** | **89.8%** |

---

## 🏗️ Basics

### Project Website & Documentation

- [x] 🔴 **description_good** — The project README/website clearly describes what the software does and what problem it solves.
  - *Evidence URL:* https://github.com/AOSSIE-Org/OrgExplorer/blob/main/README.md


- [x] 🔴 **interact** — The project provides information on how to obtain the software, submit bug reports, and contribute.
  - *Evidence URL:* https://github.com/AOSSIE-Org/OrgExplorer/blob/main/README.md#-contributing


- [x] 🔴 **contribution** — `CONTRIBUTING.md` explains the contribution process (e.g., PRs are used, how to open one).
  - *Evidence URL:* https://github.com/AOSSIE-Org/OrgExplorer/blob/main/CONTRIBUTING.md


- [x] 🟡 **contribution_requirements** — `CONTRIBUTING.md` references acceptable contribution standards (coding style, tests required, etc.).
  - *Evidence URL:* https://github.com/AOSSIE-Org/OrgExplorer/blob/main/CONTRIBUTING.md#code-style--standards


- [x] 🔴 **documentation_basics** — Basic documentation exists for the software (README, Wiki, or docs folder).
  - *Evidence URL:* https://github.com/AOSSIE-Org/OrgExplorer/blob/main/README.md


- [x] 🔴 **documentation_interface** — Reference documentation describes the external interface (API inputs/outputs, CLI flags, config schema, etc.).
  - *Evidence URL:* https://github.com/AOSSIE-Org/OrgExplorer/blob/main/README.md#%EF%B8%8F-architecture

### Other Basics

- [x] 🔴 **discussion** — Project has a searchable, URL-addressable discussion mechanism (GitHub Issues, Discord with archive, mailing list, etc.) that doesn't require proprietary client software.
  - *Evidence URL:* https://github.com/AOSSIE-Org/OrgExplorer/issues


- [x] 🟡 **english** — Documentation is provided in English and English bug reports/comments are accepted.
  - *Note:* English docs and Issues accepted


---

## 🔄 Change Control

### Version Control

- [x] 🔵 **repo_distributed** — Project uses a distributed VCS (e.g., git). *(SUGGESTED)*
  - *Evidence URL:* https://github.com/AOSSIE-Org/OrgExplorer

### Version Numbering

- [x] 🔴 **version_unique** — Each release has a unique version identifier (e.g., v1.0.0).
  - *Evidence URL:* https://github.com/AOSSIE-Org/OrgExplorer/releases/tag/v0.1.0


- [x] 🔵 **version_semver** — Project uses [SemVer](https://semver.org) or [CalVer](https://calver.org/) format. *(SUGGESTED)*
  - *Note:* pyproject.toml version 0.1.0 / release tags


- [x] 🔵 **version_tags** — Releases are tagged in the VCS (e.g., `git tag v1.0.0`). *(SUGGESTED)*
  - *Evidence URL:* https://github.com/AOSSIE-Org/OrgExplorer/releases

### Release Notes

- [x] 🔴 **release_notes** — Each release includes human-readable release notes summarizing major changes. Raw `git log` output is NOT acceptable.
  - *Evidence URL:* https://github.com/AOSSIE-Org/OrgExplorer/releases


- [~] 🔴 **release_notes_vulns** — Release notes identify every publicly known vulnerability (with CVE) fixed in that release.
  - *N/A — Justification:* No publicly known CVEs fixed yet; will document when applicable

---

## 🐛 Reporting

### Bug Reporting

- [x] 🔴 **report_process** — A bug-reporting process exists (e.g., GitHub Issues link in README).
  - *Evidence URL:* https://github.com/AOSSIE-Org/OrgExplorer/blob/main/CONTRIBUTING.md#report-a-bug

- [x] 🟡 **report_tracker** — An issue tracker (e.g., GitHub Issues) is used to track individual bugs.
  - *Evidence URL:* https://github.com/AOSSIE-Org/OrgExplorer/issues

- [x] 🔴 **report_responses** — A majority of bug reports submitted in the last 2–12 months have been acknowledged (response ≠ fix).
  - *Note:* Self-cert: Issues and PR reviews are actively triaged during GSoC

- [x] 🟡 **enhancement_responses** — More than 50% of enhancement requests in the last 2–12 months have received a response.
  - *Note:* Self-cert: Feature PRs and mentor feedback are responded to

- [x] 🔴 **report_archive** — Reports and responses are publicly archived and searchable (GitHub Issues satisfies this).
  - *Evidence URL:* https://github.com/AOSSIE-Org/OrgExplorer/issues

### Vulnerability Reporting

- [x] 🔴 **vulnerability_report_process** — A vulnerability reporting process is documented (e.g., `SECURITY.md`).
  - *Evidence URL:* https://github.com/AOSSIE-Org/OrgExplorer/blob/main/SECURITY.md


- [x] 🟡 **vulnerability_report_private** — If private vulnerability reporting is supported, the method for private submission is documented.
  - *Evidence URL:* SECURITY.md documents private reporting / advisories


- [~] 🔴 **vulnerability_report_response** — Initial response to any vulnerability report received in the last 6 months was within 14 days.
  - *N/A — Justification:* No vulnerability reports received in the last 6 months


---

## ✅ Quality

### Build System

- [x] 🔴 **build** — If the project requires building, a working build system exists that can auto-rebuild from source.
  - *Note:* Vite is used as the build tool.

- [x] 🔵 **build_common_tools** — Common build tools are used (npm, pip, cargo, make, gradle, etc.). *(SUGGESTED)*
  - *Note:* Node.js and npm


- [x] 🟡 **build_floss_tools** — The project can be built using only FLOSS tools.
  - *Note:* Node.js, npm, Vite, are FLOSS tooling.


### Automated Testing

- [x] 🔵 **test_invocation** — The test suite can be invoked in a standard way for the language (e.g., `npm test`, `pytest`, `cargo test`). *(SUGGESTED)*
  - *Note:* Vitest (`npm test`) is used for running the test suite.


- [ ] 🔵 **test_most** — The test suite covers most code branches, input fields, and functionality. *(SUGGESTED)*
  - *Note:* Tests are implemented using Vitest, but the test suite does not yet provide comprehensive coverage of most code branches and functionality.


### New Functionality Testing Policy

- [ ] 🔴 **test_policy** — The project has a general policy that new functionality must include tests in the automated test suite.
  - *Note:* Testing is encouraged for new functionality, but a general requirement is not currently documented in `CONTRIBUTING.md`.

- [ ] 🔴 **tests_are_added** — Evidence exists that the test policy has been followed in recent major changes (e.g., PRs include tests).
  - *Evidence URL:* No sufficient evidence is currently documented to demonstrate that the test policy has been consistently followed in recent major changes.

- [ ] 🔵 **tests_documented_added** — The test policy is documented in contribution instructions. *(SUGGESTED)*
  - *Evidence URL:* The testing policy is not currently documented in `CONTRIBUTING.md`.

### Linting / Warning Flags

- [x] 🔴 **warnings** — At least one linter or compiler warning flag is enabled (ESLint, Pylint, clippy, golangci-lint, Slither for Solidity, etc.).
  - *Note:* ESLint is configured with recommended ESLint, TypeScript, React Hooks, and React Refresh rules.

- [x] 🔴 **warnings_fixed** — Warnings from the linter are addressed (not suppressed without reason).
  - *Note:* ESLint warnings and errors are addressed during development and code review.

- [ ] 🔵 **warnings_strict** — Project uses maximum strictness in linter config where practical. *(SUGGESTED)*
  - *Note:* Recommended ESLint and TypeScript rules are enabled; maximum strictness is not currently enforced.

---

## 🔐 Security

### Secure Development Knowledge

- [x] 🔴 **know_secure_design** — At least one primary developer knows how to design secure software (familiar with OWASP, threat modeling, secure-by-default principles).
  - *Note:* Self-cert: token handling, verified-only DMs, dry-run modes, no secrets in remote config


- [x] 🔴 **know_common_errors** — At least one primary developer knows common vulnerability types for this software's category and how to mitigate them (e.g., injection, XSS, reentrancy for Solidity, prompt injection for AI).
  - *Note:* Self-cert: aware of token leakage, Discord mention injection, GitHub App least privilege


### Cryptography (mark N/A if project does not handle cryptography)

- [~] 🔴 **crypto_published** — Only publicly reviewed cryptographic protocols/algorithms are used by default.
  - *N/A — Justification:* No application-layer crypto protocols beyond TLS and GitHub App JWT (PyJWT)


- [~] 🟡 **crypto_call** — Project calls an established crypto library rather than reimplementing crypto functions.
  - *N/A — Justification:* Uses PyJWT/cryptography libraries when App auth enabled; no custom crypto


- [~] 🔴 **crypto_working** — No broken algorithms (MD4, MD5, single DES, RC4, Dual_EC_DRBG) used unless required for interoperability (must be documented).
  - *N/A — Justification:* No broken crypto algorithms in app logic


- [~] 🔴 **crypto_keylength** — Key lengths meet [NIST 2030 minimums](https://www.keylength.com/en/4/) by default.
  - *N/A — Justification:* Relies on GitHub/Discord TLS and standard JWT libs


- [~] 🔴 **crypto_password_storage** — Passwords for external users are stored as iterated salted hashes (Argon2id, bcrypt, scrypt, PBKDF2).
  - *N/A — Justification:* Project does not store user passwords


- [~] 🔴 **crypto_random** — Cryptographic keys and nonces are generated using a CSPRNG; insecure generators (Math.random, rand()) are NOT used for security purposes.
  - *N/A — Justification:* No app-level crypto key generation; verification codes are short-lived random tokens via secrets module where used


- [x] 🟡 **delivery_unsigned** — Cryptographic hashes are NOT retrieved over plain HTTP without a signature check.
  - *Note:* Project dependencies and source code are retrieved through HTTPS-based package repositories and GitHub.

---

## 🔬 Analysis

### Static Code Analysis

- [~] 🔴 **static_analysis_fixed** — All medium+ severity vulnerabilities found by static analysis are fixed in a timely manner after confirmation.
  - *N/A — Justification:* No confirmed medium+ severity static analysis findings currently outstanding.

- [x] 🔵 **static_analysis_common_vulnerabilities** — The static analysis tool includes checks for common vulnerabilities in the language/environment (e.g., eslint-plugin-security, bandit, Slither). *(SUGGESTED)*
  - *Note:* ESLint is configured for TypeScript and React code, including React Hooks and common code-quality checks.

- [x] 🔵 **static_analysis_often** — Static analysis runs on every commit or at least daily (CI integration). *(SUGGESTED)*
  - *Note:* CodeRabbit on PRs.

### Dynamic Code Analysis

- [~] 🔵 **dynamic_analysis** — At least one dynamic analysis tool is applied before major releases (fuzzer, web app scanner like OWASP ZAP, etc.). *(SUGGESTED)*
  - *N/A — Justification:* OrgExplorer currently uses Vitest for automated runtime testing but does not use a dedicated dynamic analysis or web security scanning tool.

- [x] 🔵 **dynamic_analysis_enable_assertions** — Dynamic analysis / testing runs with assertions enabled (not just production mode). *(SUGGESTED)*
  - *Note:*  Vitest tests run with assertions enabled.

- [~] 🔴 **dynamic_analysis_fixed** — Medium+ severity vulnerabilities found by dynamic analysis are fixed in a timely manner.
  - *N/A — Justification:* No medium+ severity findings from dynamic analysis currently exist.

- [~] 🔵 **dynamic_analysis_unsafe** — If the project uses memory-unsafe languages (C/C++), memory safety tools (Valgrind, AddressSanitizer) are used. *(SUGGESTED)*
  - *N/A — Justification:* OrgExplorer is written in TypeScript and JavaScript and does not use memory-unsafe languages such as C or C++.

---

## 📎 Project-Specific Notes

> Add domain-specific notes here for Web3, Full-Stack, or AI projects.

### Web3 / Solidity Notes

- Scorecard does not audit Solidity-specific security. Use [Slither](https://github.com/crytic/slither) for `static_analysis` and `warnings` criteria.
- For `crypto_*` criteria, document which cryptographic primitives your contracts rely on (e.g., ECDSA in EVM is standard).
- Smart contract audit reports count as evidence for `know_secure_design`.

### Full-Stack / Next.js Notes

- For `crypto_password_storage`: document which auth library handles hashing (e.g., NextAuth + bcrypt).
- For `dynamic_analysis`: [OWASP ZAP](https://www.zaproxy.org/) can be run as a GitHub Action.

### AI / LLM Notes

- For `know_common_errors`: include awareness of prompt injection, data leakage, and model output validation.
- For `dynamic_analysis`: consider adversarial input testing as a form of dynamic analysis.

---

*This checklist complements [OpenSSF Scorecard](https://scorecard.dev/) (auto-detected checks) and is
inspired by the [OpenSSF Best Practices Badge](https://www.bestpractices.dev/en/criteria/0) passing criteria.*