# NightParcel

**Private Payments. Verifiable Settlement.**

NightParcel is an original, self-custodial Midnight application for confidential invoice commitments and direct custom shielded-token payments. Its Compact contract registers invoice commitments, cancellation commitments, and merchant-authenticated receipt commitments. It never receives payment tokens and it does not declare an invoice paid.

Freelancers and small businesses need payment evidence without publishing invoice terms. NightParcel separates the private invoice opening, the direct wallet-to-wallet shielded payment, and the merchant's receipt acknowledgement. Each remains independently verifiable; no single UI callback is treated as settlement.

## Verified scope

- Compact language 0.23 compiled by Compact compiler 0.31.1.
- Three original state-changing circuits: `createInvoice`, `cancelInvoice`, and `acknowledgeReceipt`.
- Nineteen simulator tests covering authorization, replay, invalid evidence, state invariants, public-state privacy, and payer-side commitment recomputation.
- Thirty supporting tests covering connector compatibility, request integrity, payment-intent persistence, and privacy helpers; 33 deterministic Playwright scenarios cover the product and documentation surfaces.
- One clean local-network payment of 125 custom shielded-token units between independent wallets, reconciled by the payer wallet, indexer, and recipient wallet before `PAID_VERIFIED` was assigned.
- A public product landing page and a responsive five-surface workspace with real connector calls, honest draft/submission states, and a clearly labelled immutable local-run evidence view.

The connector readiness path discovers Lace instances, checks Connector API compatibility, asks for explicit authorization, validates the wallet-reported network and endpoints, retrieves a sanitized account fingerprint and shielded-address preview, reads balances and DUST, and checks transfer, history, submission, and proving capabilities. Two-profile runtime settlement is still a release gate; see `docs/PHASE_1C_REPORT.md`.

## Judge quick path

1. Run the deterministic install and verification commands below.
2. Inspect `contract/nightparcel.compact` for the three original circuits.
3. Read `evidence/phase1b-local.json` and the matching redacted logs for the authentic two-wallet local transfer.
4. Start the web application. `/` explains the product; `/app` opens the workspace. Recorded evidence is explicitly separated from current-session browser state.
5. Review `docs/PRIVACY_BOUNDARY.md` before evaluating privacy claims.

## Architecture

```text
merchant private invoice opening
          | Compact persistentCommit
          v
public invoice commitment ---- direct shielded wallet transfer ----> merchant wallet
          |                                                        |
          +---- merchant-authenticated receipt commitment <--------+
                         (attestation, not an oracle)
```

The app awards `PAID_VERIFIED` only when payer history, indexer acceptance, recipient-wallet history, exact balance deltas, and the matching public receipt commitment all agree. Contract acknowledgement alone is never sufficient.

## Requirements

- Node.js 22 (verified with 22.23.3)
- Corepack Yarn 4.18.0
- Compact compiler 0.31.1
- Docker Engine and Compose

The project pins Midnight.js 4.1.1, wallet SDK 1.2.0, connector API 4.0.1, node image 1.0.0, indexer 4.3.3, and proof server 8.1.0.

## Install and verify

```bash
nvm use
corepack enable
corepack prepare yarn@4.18.0 --activate
yarn install --immutable
yarn compile:fast
yarn test
yarn test:sim
yarn typecheck
yarn lint
yarn build
yarn test:e2e
```

`yarn compile` performs the full proving-key build and is slower than `compile:fast`.

## Local network test

The E2E test requires two disposable funded local-network wallet seeds. No seed is stored in this repository or its evidence artifacts.

```bash
cp .env.example .env
# Populate only disposable local-devnet fixture seeds in your shell or ignored .env.
docker compose up -d
set -a; source .env; set +a
yarn test:local
docker compose down
```

Never use production or public-testnet wallet seeds. The test deploys an open faucet token contract solely on the disposable local network.

## Web application

```bash
yarn workspace @nightparcel/web dev
```

Open `http://localhost:5173/` for the public product page or `http://localhost:5173/app` for the workspace.

| Route | Purpose |
|---|---|
| `/` | public explanation, privacy boundary, Midnight integration, and recorded evidence |
| `/app` | overview and wallet connection |
| `/app/request` | create a private draft; with verified Lace runtime, deploy/open an invoice book, commit it, and export a v2 request |
| `/app/pay` | import a v2 request, verify its live commitment/open state, confirm the merchant, and authorize in Lace |
| `/app/activity` | separate live browser state from recorded local evidence |
| `/app/settings` | connector, network, DUST, proving, and privacy diagnostics |
| `/docs` | first-party introduction and current capability status |
| `/docs/getting-started` | pinned local setup and safe Lace readiness |
| `/docs/payments` | request, review, payment, and state guidance |
| `/docs/verification` | six-check settlement invariant and genuine evidence |
| `/docs/privacy` | exact privacy and public-observability boundary |
| `/docs/architecture` | Compact, ledger state, authentication, and wallet boundary |
| `/docs/developers` | versions, source map, commands, and local execution |
| `/docs/troubleshooting` | actionable readiness and reconciliation failures |
| `/docs/roadmap` | verified Wave 2 scope and unimplemented Wave 3 candidates |

The request form always supports an explicitly uncommitted local draft. Phase 2A also implements the browser Compact deployment/open/create path and encrypted, account-scoped private-state plus signing-key recovery export. Those paths remain **runtime-unverified** until an owner-authorized Lace 2.4.2 session completes them on the local network. NightParcel generates a payable `nightparcel.invoice.v2` file only after the connected indexer exposes the new commitment. Private request contents are never placed in public URLs.

The payer rejects legacy v1 files. A v2 file is not payable merely because its JSON is valid: NightParcel recomputes the salted invoice commitment, verifies the deployment network, public merchant key, exact token color and recipient keys, confirms the invoice is registered and still open, and checks exact-token funding. The payer must also confirm the merchant/recipient through a trusted channel because a self-consistent blockchain deployment does not establish real-world identity.

The payment surface checks the connected network and balances, calls connector `makeTransfer`, derives the identifier from the returned serialized transaction, and calls `submitTransaction`. A local single-flight intent prevents duplicate clicks and survives reloads; interrupted or ambiguous submission becomes `REVIEW_REQUIRED` and is never automatically rebroadcast. Submission remains `SUBMITTED · UNRESOLVED` until independent recipient and network reconciliation can run. It is never promoted to `PAID_VERIFIED` from the connector callback alone.

Lace approval, unlock, passwords, and transaction authorization always remain owner actions. A connector returned by `window.midnight` is rejected unless its API major version is 4 and its connected configuration passes the runtime diagnostic. Diagnostics contain no full addresses, seeds, keys, or private invoice openings.

Playwright uses the locally installed Chrome channel and deterministic UI fixtures:

```bash
yarn test:e2e
```

Fixtures test interface states only and are never presented as settlement evidence. Genuine disconnected responsive captures are in `evidence/phase2a-*.png`; they are product screenshots, not browser-wallet or settlement evidence.

## Documentation website

NightParcel documentation is static, version-controlled React content served from `/docs`; it does not need a CMS, database, wallet, or GitHub API. Each guide is an independent module registered in `apps/web/src/docs/registry.ts`, while the shared shell provides navigation, table of contents, copyable commands, responsive behavior, local 404 handling, and previous/next links.

The documentation route is lazy-loaded separately from `/app`, so readers do not download the wallet/ledger workspace chunk merely to read a guide. Maintainer conventions and content boundaries are documented in `docs/DOCUMENTATION_SITE.md`.

## Privacy boundary

NightParcel keeps invoice openings out of its decoded contract state and uses a shielded custom token for payment. It does not promise complete anonymity. Commitments, timing, fees, transaction metadata, Zswap events/nullifiers, token issuance metadata, and opaque raw bytes remain public or correlatable. Native NIGHT is unshielded and is not supported as a confidential NightParcel payment asset.

## Evidence and documentation

- `evidence/phase1b-local.json` — redacted machine-readable successful local run
- `evidence/phase1b-local-run.log` — test and proof timing output without seeds
- `docs/PHASE_1B_REPORT.md` — milestone verdicts, commands, evidence, and limitations
- `docs/PHASE_1C_REPORT.md` — browser-runtime and Wave 2 release status
- `docs/PHASE_1D_REPORT.md` — product experience, UI verification, and current release recommendation
- `docs/PHASE_2A_REPORT.md` — request-integrity implementation, browser contract path, verification results, and owner-controlled blockers
- `docs/DESIGN_SYSTEM.md` — reusable visual, responsive, accessibility, and settlement-state patterns
- `docs/DOCUMENTATION_SITE.md` — documentation architecture and maintenance conventions
- `docs/PRIVACY_BOUNDARY.md` — exact public/private boundary
- `docs/CONTRACT_DESIGN.md` — contract semantics and trust boundary
- `docs/WAVE_2_SUBMISSION_CHECKLIST.md` — mandatory release artifacts and owner actions
- `docs/DEMO_RECORDING_PLAN.md` — evidence-first recording sequence
- `docs/PITCH_DECK_OUTLINE.md` — concise seven-slide narrative

## License and attribution

NightParcel is licensed under Apache-2.0. The simulator helper and wallet/provider scaffolding are adapted from the Apache-2.0-licensed `midnightntwrk/midnight-examples` repository; details are in `NOTICE`.

