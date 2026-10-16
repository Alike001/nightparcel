# NightParcel Phase 1D report

Date: 2026-10-16

Branch: `feature/phase-1d-product-experience`

Verdict: **SUBMIT_WITH_LIMITATIONS**

## Outcome

NightParcel now has a public product explanation at `/` and a task-oriented workspace at `/app`. A new visitor can understand the Request → Pay → Verify model without connecting a wallet. The live connector and transfer path remain intact, and the interface never promotes a wallet return value into independently verified settlement.

This phase does not add browser Compact submission, encrypted application private-state persistence, or an owner-authorized two-profile Lace transaction. Those remain explicit release limitations rather than simulated features.

## Implemented and verified

### Public product experience

- Original NightParcel landing page with product positioning, functional navigation, product-architecture preview, three-step workflow, privacy boundary, Midnight integration, recorded evidence, and limitations.
- `/` is public; `/app` is the workspace. React Router lazy-loads both route surfaces.
- No fabricated users, activity, balances, production availability, real-value token support, or mainnet claims.
- The Phase 1B 125-unit run is labelled as historical local-network evidence and is never shown as the connected user's activity.

### Workspace and payment flows

- Replaced the engineering-step navigation with Overview, Request payment, Make payment, Activity and evidence, and Settings.
- Disconnected overview provides one clear Lace connection action and owner-action instructions.
- Connector version, account fingerprint, network/endpoints, DUST, capabilities, proving, and technical failures remain available in Settings.
- Request form validates amount, token, description, expiry, and recipient, then creates a downloadable/copyable local draft. The file is explicitly `DRAFT_UNCOMMITTED`; contract commitment remains disabled.
- Payment import accepts only the existing canonical committed-request schema. An uncommitted draft cannot reach wallet authorization.
- Payment review exposes exact amount, supported token, recipient, expiry, and commitment before signing.
- Existing `makeTransfer` → transaction identifier → `submitTransaction` integration is preserved. A successful return produces `SUBMITTED · UNRESOLVED` only.
- Live browser-session state and recorded Phase 1B evidence are visibly separate.

### Design and accessibility baseline

- New charcoal/lime design tokens, responsive navigation, form, card, notice, status, timeline, empty-state, and evidence patterns.
- Persistent labels, visible focus, skip navigation, keyboard-operable native disclosures, reduced-motion handling, and text-plus-color states.
- No horizontal page overflow at 1440, 1024, 768, or 390 px across all six routes tested.
- Reusable decisions are recorded in `docs/DESIGN_SYSTEM.md`.

### Automated browser coverage

Sixteen Playwright scenarios cover:

- public navigation and primary calls to action;
- responsive mobile navigation;
- disconnected and pending wallet states;
- request validation and honest draft creation;
- exact payment review and disabled authorization;
- draft rejection;
- live/history evidence separation;
- first-tab skip link;
- all required responsive widths and screenshot capture.

Fixtures are deterministic UI inputs only. They do not replace or claim network payment evidence.

## Product behavior status

| Capability | Status | Evidence / limitation |
|---|---|---|
| Public product explanation | VERIFIED | landing content and Playwright navigation checks |
| Wallet discovery/readiness | IMPLEMENTED, RUNTIME PENDING | real Connector API 4.0.1 path; owner must unlock/approve Lace |
| Local request draft | VERIFIED | validation, download, copy/import UX; no public URL data |
| Browser `createInvoice` | BLOCKED | no verified browser Compact submission/private-state path |
| Committed request import | VERIFIED | existing canonical schema and commitment validation |
| Browser custom-token transfer | IMPLEMENTED, RUNTIME PENDING | real connector calls retained; two-profile owner-authorized run absent |
| Browser reconciliation | BLOCKED | recipient history/balance and indexer six-check orchestration absent |
| Browser acknowledgement | BLOCKED | account-scoped merchant private state not enabled |
| Recorded Phase 1B evidence | VERIFIED | immutable redacted local evidence, visually separated from live state |
| `PAID_VERIFIED` assignment | PROTECTED | browser UI has no path that assigns it from submission alone |

## Verification commands and results

Run from the repository root with Node 22 and Corepack Yarn 4.18.0:

| Command | Result |
|---|---|
| `yarn install --immutable` | PASS |
| `yarn compile:fast` | PASS; both Compact contracts compiled with compiler 0.31.1 |
| `yarn test:sim` | PASS; 18/18 |
| `yarn test` | PASS; 18/18 |
| `yarn typecheck` | PASS |
| `yarn lint` | PASS |
| `yarn build` | PASS |
| `yarn test:e2e` | PASS; 31/31 in system Chrome after Phase 1F documentation coverage |

The production build is route-split. The landing route does not load the larger workspace/ledger bundle. The shared entry is approximately 497 KB and the workspace chunk approximately 585 KB before compression; the generated ledger WASM is approximately 10.2 MB. Further crypto-bundle reduction must not alter verified behavior and is deferred.

## Genuine screenshots

Screenshots are captured by Playwright only after the routed page is visible:

- `evidence/phase1d-landing-1440.png`
- `evidence/phase1d-landing-1024.png`
- `evidence/phase1d-landing-768.png`
- `evidence/phase1d-landing-390.png`
- `evidence/phase1d-workspace-1440.png`
- `evidence/phase1d-request-390.png`

They show a disconnected product state and contain no wallet secret, full address, or invented live transaction.

## Privacy and correctness review

- Private request values remain local file content and component state; they are not encoded into a URL.
- The diagnostic UI exposes only the already-approved sanitized wallet fields.
- Raw JSON is behind an advanced disclosure.
- The frontend does not claim native NIGHT privacy, custody assets, or treat receipt acknowledgement as a settlement oracle.
- A downloaded request draft is intentionally readable to its holder. Sharing the file discloses its contents to that recipient; no at-rest file encryption is claimed.
- Browser storage persistence is not enabled, avoiding an unverified recovery promise but leaving drafts/session state ephemeral.

## Remaining blockers and owner actions

1. Unlock and authorize Lace 2.4.2 in both disposable Chrome profiles on the same local Midnight network.
2. Capture a real browser Alice → Bob transfer, indexer acceptance, independent Bob reconciliation, and all six settlement checks.
3. Verify browser Compact deployment/calls and account-scoped encrypted private-state recovery before enabling Create or Acknowledge actions.
4. Manually test screen readers, 200–400% zoom, forced colors, and browser/OS combinations beyond local Chrome.
5. Complete the authenticated Buildathon fields, deck, and genuine demo recording.

## Release recommendation

**SUBMIT_WITH_LIMITATIONS.** The public explanation, product workspace, honest draft/review states, verified Compact/Node baseline, automated UI coverage, and release documentation are strong enough for an evidence-led Wave 2 submission. Present the working original contract and Phase 1B local settlement as verified. Present browser-wallet transfer, browser contract calls, private-state recovery, and full browser reconciliation as unfinished owner-assisted work—never as working production functionality.

## Phase 1E runtime compatibility update

Manual authorization with Lace 2.4.2 exposed a real mismatch between the declared Connector API 4.0.1 `ConnectedAPI` type and the injected runtime object: the type includes `hintUsage`, but the authorized Lace object did not expose that function. NightParcel called it unconditionally, causing `api.hintUsage is not a function` before readiness diagnostics could run.

The connection path now:

1. awaits `hintUsage` when it is a runtime function and propagates any permission rejection;
2. records absent `hintUsage` as a sanitized, non-blocking `compatibilityLimitations` entry;
3. preflights every method needed to run diagnostics before invoking it;
4. runs the existing network, shielded-address, balances, DUST, transaction-capability, history, proving, and local-proof-server checks; and
5. allows the workspace to retain the connected API only when `readyForTransfer` is true.

Missing transfer/submission/history/proving methods, wrong network, absent shielded address, zero DUST, or invalid local proof-server configuration still block readiness. A present `hintUsage` that returns `PermissionRejected` is not swallowed.

Regression coverage now includes six connector cases requested in Phase 1E plus a deterministic Playwright UI fixture. The fixture proves only that the absent-method crash is fixed and is explicitly not a real Lace session or payment.

### Stale development server finding

The process listening on `127.0.0.1:5173` used the correct repository, but it had been running since before the Phase 1D branch changes. Its current module response was Phase 1D, while an already-open browser tab could still retain the old application/module graph. Only the exact NightParcel Vite process was stopped and restarted from:

`/home/ali/Desktop/midnight/nightparcel/apps/web`

The fresh server exposes the Phase 1D landing page at `/` and workspace at `/app`. A hard refresh is still appropriate in each owner-controlled Chrome profile before authorization.

### Owner-controlled Lace readiness order

1. In Chrome Default, hard-refresh `/app`, unlock Lace, confirm the disposable account and `undeployed` local network, then approve Connect Lace.
2. Save only the sanitized diagnostic. Confirm API 4.x, distinct account fingerprint, local endpoints, non-empty shielded-address preview, positive DUST, required methods, and local proving configuration.
3. Repeat in Chrome Profile 2 and confirm its account fingerprint differs while the network/endpoints match.
4. Confirm the intended recipient from Profile 2 and verify the supported test asset is actually available to the payer.
5. Stop before token authorization unless both profiles pass. No browser payment or verified settlement is claimed by this update.

## Phase 1F documentation update

NightParcel now includes nine first-party routes under `/docs`, implemented as a reusable lazy-loaded shell and independent version-controlled page modules. The guides cover users, developers, and judges; accurately separate verified, runtime-pending, blocked, and planned behavior; and link to genuine source, technical reports, and redacted evidence.

Fifteen documentation-specific Playwright scenarios cover the index, landing/workspace integration, active desktop navigation, nested deep links and refresh, mobile navigation, stable heading anchors, code copy, keyboard operation, documentation-local 404 handling, responsive overflow, and genuine screenshots. Together with the existing product suite, 31/31 browser tests pass.

The production output emits the documentation as its own approximately 38.8 KB minified route chunk. It does not require the approximately 585.8 KB workspace chunk or ledger WASM merely to render documentation. The shared application entry remains approximately 497.8 KB and retains its existing optimization follow-up.
