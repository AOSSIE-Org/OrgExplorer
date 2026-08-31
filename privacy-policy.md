# Privacy Policy

**Last updated: August 2026**

## Introduction

At OrgExplorer, we respect your privacy.

This Privacy Policy explains what data OrgExplorer handles and how — and, just as importantly, what it does **not** do.

OrgExplorer's architecture is different from many applications because it operates entirely in the browser. It has **no backend server and no user accounts**.

---

## Information We Collect

OrgExplorer does not have:

- User accounts
- Signup or waitlist systems
- A backend server operated by us

Because of this, we do not collect, receive, or store any personal information about you on any system we control.

### What the App Handles

#### Data fetched from GitHub

When you search an organization, publicly available GitHub data is fetched directly from GitHub's API by your browser.

This may include:

- Repository information
- Contributor information
- Issues
- Pull requests
- Other publicly available GitHub metadata

This data never passes through a server operated by OrgExplorer.

#### Data stored locally on your device

The following data may be stored locally in your browser:

- GitHub Personal Access Token (if provided)
- Cached GitHub API responses
- API rate-limit status
- Recent search history
- Application preferences

This data is stored only in your browser's:

- `localStorage`
- `IndexedDB`

OrgExplorer does not transmit this data to any server operated by us.

When a GitHub Personal Access Token is provided, your browser uses it to authenticate requests directly with GitHub's API. The token is sent only to GitHub for authorized API requests and is never sent to OrgExplorer servers.

#### Standard Hosting Logs

OrgExplorer is hosted on GitHub Pages.

GitHub, as the hosting provider, may collect standard infrastructure logs such as:

- IP addresses
- Request timestamps
- Other operational metadata

OrgExplorer maintainers do not have access to these logs.

For more information, see [GitHub's Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

---

## How We Use Your Information

Since OrgExplorer does not collect or receive your personal data, we do not use, analyze, sell, or process your information.

All locally stored data exists only to make the application function properly, including:

- Reducing repeated GitHub API requests through caching
- Preserving your preferences
- Allowing you to avoid entering your Personal Access Token repeatedly

---

## Data Sharing and Disclosure

We do not sell, share, or disclose your data.

This is because OrgExplorer does not collect your data in the first place.

The only external communication occurs directly between:
```
Your Browser
|
|
v
GitHub API (api.github.com)
```


This communication is governed by:

- [GitHub Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)
- [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)

---

## Data Security

Because OrgExplorer has no backend server or database, most server-side data security risks do not apply.

The relevant security considerations involve data stored on your own device.

### GitHub Personal Access Token

If you choose to provide a GitHub Personal Access Token:

- It is stored only in your browser's `localStorage`
- It is sent only to GitHub's API
- It is never logged by OrgExplorer
- It is never transmitted to OrgExplorer servers

### Token Safety Recommendations

We recommend:

- Using a token with the minimum permissions required
- Avoiding unnecessary scopes
- Revoking your token from GitHub settings if you suspect misuse

Please note that browser `localStorage` is not encrypted.

---

## Your Rights

Since OrgExplorer does not collect or store personal information on our systems, there is no personal data held by us that you can request to:

- Access
- Correct
- Delete
- Export

You maintain complete control over locally stored application data.

You can remove stored data by:

- Clearing your browser storage
- Removing your Personal Access Token from the Settings page
- Resetting application data through browser settings

---

## Changes to This Policy

We may update this Privacy Policy as OrgExplorer evolves.

Any changes will be reflected on this page with an updated **"Last updated"** date.

We encourage users to review this policy periodically.

---

## Contact Us

If you have questions about this Privacy Policy, contact us:

**Email:** [contact@aossie.org](mailto:contact@aossie.org)

**Discord:** [Discord](https://discord.gg/hjUhu33uAn)

Or open an issue on [the project's GitHub repository](https://github.com/AOSSIE-Org/OrgExplorer).

---

*This policy describes OrgExplorer's actual technical behavior as of the date above. It is provided for transparency and is not a substitute for professional legal advice.*
