# Brand Guidelines

This document defines the visual identity of the project. Please follow these guidelines when creating new pages, components, or assets to keep the UI consistent.

## Design Principles

- Keep the interface clean and minimal.
- Prioritize readability over decoration.
- Support both light and dark themes.
- Use spacing and contrast to create hierarchy instead of excessive colors.
- Avoid introducing new colors or fonts unless there is a strong reason.

---

## Color Palette

### Core Colors

| Token | Dark | Light |
| ------ | ----- | ------ |
| Background | `#060606` | `#FFFFFF` |
| Surface | `#141414` | `#F5F5F5` |
| Surface Secondary | `#1A1A1A` | `#ECECEC` |
| Border | `#2A2A2A` | `#D5D5D5` |
| Text | `#FFFFFF` | `#060606` |
| Secondary Text | `#888888` | `#666666` |
| Muted Text | `#444444` | `#999999` |
| Accent | `#F5C518` | `#D4A500` |

### Semantic Colors

| Purpose | Color |
| -------- | ----- |
| Success | `#22C55E` |
| Error | `#EF4444` |
| Information | `#3B82F6` |

Always reference the CSS variables instead of hardcoding colors.

Example:

```css
background: var(--surface);
color: var(--text);
border-color: var(--border);
```

---

## Typography

Font stack:

```
-apple-system,
BlinkMacSystemFont,
"Segoe UI",
Roboto,
sans-serif
```

### Text Sizes

| Usage | Size |
| ------ | ---- |
| Body | 14px |
| Line Height | 1.6 |

Use the default font stack unless there is a project-wide decision to change it.

---

## Border Radius

Standard radius:

```
8px
```

Use the `--radius` CSS variable whenever possible.

---

## Theme Support

Every UI component should work correctly in both themes.

Prefer using CSS variables:

```css
var(--bg)
var(--surface)
var(--surface2)
var(--border)
var(--text)
var(--text2)
var(--accent)
```

Avoid hardcoded colors.

---

## Links

Links use the accent color.

```css
color: var(--accent);
```

Links should remain readable in both themes.

---

## Icons & Logos

- Use SVG whenever possible.
- Icons should inherit `currentColor` unless they intentionally use a fixed brand color.
- The project logo should support both light and dark themes.
- Do not stretch or distort the logo.

---

## Spacing

Keep spacing consistent across the project.

Preferred spacing scale:

```
4px
8px
12px
16px
24px
32px
48px
64px
```

---

## Scrollbars

The project uses a minimal scrollbar.

- Width: `5px`
- Thumb: `var(--border)`
- Track: `var(--bg)`

---

## Before Opening a UI Pull Request

- Supports both light and dark themes.
- Uses existing CSS variables.
- Uses the project's typography.
- Maintains consistent spacing.
- Does not introduce unnecessary colors.
- Works across common screen sizes.
