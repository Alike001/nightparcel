# NightParcel documentation website

Date: 2026-10-16

## Purpose

The first-party documentation at `/docs` serves three audiences without requiring a wallet connection:

- ordinary users learning the Request → Pay → Verify workflow;
- developers reproducing the pinned local implementation; and
- judges evaluating the original Compact contract, privacy boundary, and genuine evidence.

The implementation uses static, version-controlled React modules. It has no database, external CMS, client-side GitHub API dependency, analytics requirement, or wallet requirement.

## Route map

| Route | Content owner |
|---|---|
| `/docs` | introduction and capability status |
| `/docs/getting-started` | local setup and Lace readiness |
| `/docs/payments` | request, payment review, and states |
| `/docs/verification` | six settlement checks and historical evidence |
| `/docs/privacy` | private/public boundary and prohibited claims |
| `/docs/architecture` | Compact contract, ledger state, and connector boundary |
| `/docs/developers` | versions, source paths, commands, and local execution |
| `/docs/troubleshooting` | actionable readiness and evidence failures |
| `/docs/roadmap` | implemented scope, candidates, and exclusions |

Unknown `/docs/*` paths render a documentation-specific not-found state rather than falling through to the product 404.

## Source organization

```text
apps/web/src/docs/
├── components.tsx       shared article primitives
├── registry.ts          route metadata, order, TOC, previous/next
├── types.ts             documentation page contract
└── pages/               one content module per guide

apps/web/src/pages/
└── DocumentationPage.tsx  shared responsive shell
```

`App.tsx` lazy-loads `DocumentationPage`. The documentation registry and content are therefore emitted separately from the lazy workspace route and its wallet/ledger dependencies.

## Shared patterns

- `DocSection` gives each section a stable heading ID and anchor link.
- `Callout` provides note, warning, and verified treatments.
- `CodeBlock` renders version-controlled commands with a keyboard-operable copy button.
- `RepoLink` links developers to real source or evidence in the public repository.
- `StatusTable` separates verified, runtime-pending, blocked, and unavailable capabilities.
- The shell supplies desktop sidebar navigation, mobile navigation, an on-page table of contents, page title metadata, raw-report access, and previous/next navigation.

Use semantic headings, lists, tables, code, `<aside>`, `<nav>`, and `<article>` elements. Do not simulate documentation structure with generic cards when native document structure is clearer.

## Adding a guide

1. Add one content component under `apps/web/src/docs/pages/`.
2. Compose it from the shared documentation primitives and semantic HTML.
3. Add one `DocPage` record to `registry.ts`, including stable section IDs used by the table of contents.
4. Add or update Playwright coverage for the route, anchors, mobile access, and overflow.
5. Verify any commands and version numbers against the repository before publishing.
6. Run all repository gates and inspect the page at 1440, 1024, 768, and 390 px.

The registry order controls sidebar order and previous/next navigation.

## Content truth rules

- Code, contract source, tests, evidence, and accepted specifications outrank marketing copy.
- Label browser-generated request files `DRAFT_UNCOMMITTED`; never describe them as payable invoices.
- Treat `makeTransfer` and `submitTransaction` returns as submission, never settlement.
- Reserve `PAID_VERIFIED` for the six-check reconciliation invariant.
- Keep the historical 125-unit local run distinct from live browser activity.
- State that native NIGHT is unshielded and unsupported as a confidential NightParcel payment asset.
- Mark browser Compact calls, encrypted recovery, public-network operation, real-value assets, and production security as unavailable until implemented and verified.
- Never publish seeds, private keys, authentication secrets, invoice/receipt salts, full private openings, or unredacted private-state material.

## Links and evidence

User-facing guides should link internally wherever a first-party explanation exists. Developer-level claims may also link to raw source, reports, and redacted evidence on GitHub. Do not fetch those resources at runtime; an external link is sufficient.

Repository links currently target `main`, which is the durable public location after review and merge. During PR review, the local documentation still renders entirely from the feature branch.

## Accessibility and responsive behavior

- The global skip link targets the documentation `<main>`.
- Router links and buttons retain visible `:focus-visible` styles.
- Active navigation uses `NavLink`, including `aria-current="page"`.
- The mobile guide button has an explicit accessible name independent of its hidden visual label.
- Tables and code blocks scroll within their own containers; the page itself must not overflow horizontally.
- Heading anchors use a sticky-header scroll offset.
- Copy confirmation is textual, not color-only.
- Reduced-motion behavior inherits the product design system.

Automated coverage includes keyboard navigation and required responsive widths. Manual screen-reader, forced-colors, high-zoom, and wider browser/OS coverage remain follow-up work.

## Verification

Run:

```bash
corepack yarn install --immutable
corepack yarn compile:fast
corepack yarn test
corepack yarn test:sim
corepack yarn typecheck
corepack yarn lint
corepack yarn build
corepack yarn test:e2e
```

Documentation browser tests cover home routing, active sidebar state, direct nested loading, refresh, mobile navigation, anchor links, code copy, keyboard operation, local 404 behavior, screenshots, and horizontal overflow at 1440, 1024, 768, and 390 px.
