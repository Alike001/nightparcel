# NightParcel design system

Status: Phase 1D implementation baseline, 2026-10-16.

NightParcel should feel calm, precise, and trustworthy. The interface uses financial-product conventions—explicit amounts, readable states, review before authorization, and evidence after submission—without implying that a wallet callback is settlement.

## Foundations

### Color

| Token | Value | Use |
|---|---:|---|
| `--ink-950` | `#090d0b` | page background |
| `--ink-900` | `#0e1310` | navigation and elevated dark surfaces |
| `--ink-850` | `#141a16` | cards and form surfaces |
| `--ink-700` | `#2b352e` | borders and dividers |
| `--paper` | `#f4f6f1` | primary text |
| `--muted` | `#9da89f` | supporting text |
| `--lime` | `#b8f34a` | primary action and verified emphasis |
| `--lime-dark` | `#17260c` | lime-on-dark support surface |
| `--amber` | `#f2bd5b` | pending and unresolved states |
| `--red` | `#ff7b72` | failed or blocked states |

Lime is reserved for primary action, focus, and genuinely verified state. Amber never means success. Red is used for failures and blocking validation, not decoration.

### Type

- UI and body: `Inter`, with a system sans-serif fallback.
- Evidence identifiers and technical values: `IBM Plex Mono`, with a system monospace fallback.
- Display: fluid `clamp(2.8rem, 7vw, 6.7rem)` only on the public hero.
- Page title: `clamp(2rem, 4vw, 3.5rem)`.
- Section title: `clamp(1.55rem, 3vw, 2.5rem)`.
- Body: `1rem`, approximately `1.6` line height.
- Supporting copy: `0.875rem`; never use tiny text to hide a limitation.

### Space and shape

- Spacing follows an approximate 4/8/12/16/24/32/48/64 px scale.
- Content width is limited to `1240px`; text measures are narrower for scanning.
- Card radius: 16–24 px. Control radius: 10–12 px.
- Borders, not shadows, separate most surfaces. Effects are restrained and never communicate state alone.

## Components

- **Brand mark:** original parcel outline and lime edge. Do not substitute third-party wallet or payment branding.
- **Buttons:** primary, secondary, quiet/text. Every disabled action includes nearby explanatory text.
- **Status:** neutral, pending, failed, verified. Labels use text and color together.
- **Notice:** plain-language summary first, expandable technical detail second.
- **Cards:** one purpose per card; headings state the user task, not the implementation layer.
- **Forms:** persistent labels, short help copy, visible invalid state, and input-level error association.
- **File import:** native file input with a styled label; raw JSON remains an advanced disclosure.
- **Evidence row:** human-readable label plus monospace value; identifiers may wrap and must not force horizontal scrolling.
- **Timeline:** ordered settlement stages. Acknowledged and independently verified remain distinct.
- **Empty state:** one explanation and one primary action. It must not resemble a fake balance or activity feed.

## Product-specific patterns

### Wallet connection

The disconnected overview explains that Lace opens separately and that passwords, seeds, approvals, and signatures stay in the extension. Connector/API/network detail lives in Settings. A failed diagnostic cannot enable payment authorization.

### Payment request

The request form creates a local `nightparcel.invoice.draft.v1` file. The UI calls it a draft in the heading, status, download name, and explanatory notice. It never describes the file as a committed invoice. Private request contents are not placed in URLs.

### Payment and settlement

The payer imports a committed request, reviews exact amount/token/recipient/expiry, connects Lace, and authorizes. Returning from `makeTransfer` or `submitTransaction` produces `SUBMITTED · UNRESOLVED`, never `PAID_VERIFIED`. The evidence surface keeps current-session activity separate from the immutable Phase 1B local-run record.

### Privacy disclosure

Use paired “kept private” and “observable or correlatable” lists. Avoid “anonymous”, “untraceable”, “private NIGHT”, or any implication that commitments and metadata disappear.

## Responsive behavior

- **≥ 1100px:** public two-column hero; workspace rail and content grid.
- **900–1099px:** workspace becomes a top navigation layout; dense grids reduce columns.
- **700–899px:** landing navigation collapses; cards and forms become one column.
- **≤ 430px:** controls become full-width where useful; evidence wraps; no horizontal page overflow.

The verified test widths are 1440, 1024, 768, and 390 px.

## Accessibility

- A skip link is first in the tab order.
- All controls have visible labels and `:focus-visible` outlines.
- Native controls are retained for file input, disclosure, and navigation where practical.
- Keyboard operation does not depend on hover.
- Color never carries settlement meaning alone.
- Reduced-motion preferences remove smooth scrolling and transitions.
- Error messages use normal language and may disclose optional developer detail.

Automated checks cover the primary keyboard path and narrow-screen overflow. Manual screen-reader testing, zoom at 200–400%, forced-colors mode, and a complete contrast audit remain release follow-ups.
