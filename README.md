# NightParcel

**Private Payments. Verifiable Settlement.**

NightParcel is an original, self-custodial Midnight application for confidential invoice commitments and direct custom shielded-token payments. Its Compact contract registers invoice commitments, cancellation commitments, and merchant-authenticated receipt commitments. It never receives payment tokens and it does not declare an invoice paid.

Freelancers and small businesses need payment evidence without publishing invoice terms. NightParcel separates the private invoice opening, the direct wallet-to-wallet shielded payment, and the merchant's receipt acknowledgement. Each remains independently verifiable; no single UI callback is treated as settlement.

## Verified scope

- Compact language 0.23 compiled by Compact compiler 0.31.1.
- Three original state-changing circuits: `createInvoice`, `cancelInvoice`, and `acknowledgeReceipt`.
- Eighteen simulator tests covering authorization, replay, invalid evidence, state invariants, and public-state privacy.
- One clean local-network payment of 125 custom shielded-token units between independent wallets, reconciled by the payer wallet, indexer, and recipient wallet before `PAID_VERIFIED` was assigned.
- A responsive four-surface web application with real connector calls and a clearly labelled immutable local-run evidence view.

The connector readiness path discovers Lace instances, checks Connector API compatibility, asks for explicit authorization, validates the wallet-reported network and endpoints, retrieves a sanitized account fingerprint and shielded-address preview, reads balances and DUST, and checks transfer, history, submission, and proving capabilities. Two-profile runtime settlement is still a release gate; see `docs/PHASE_1C_REPORT.md`.

## Judge quick path

1. Run the deterministic install and verification commands below.
2. Inspect `contract/nightparcel.compact` for the three original circuits.
3. Read `evidence/phase1b-local.json` and the matching redacted logs for the authentic two-wallet local transfer.
4. Start the web application and inspect its four surfaces. The immutable evidence view is explicitly separated from current-session browser state.
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

The app checks the connected network and balances, calls connector `makeTransfer`, derives the identifier from the returned serialized transaction, and calls `submitTransaction`. Submission remains explicitly unresolved until independent recipient and network reconciliation can run.

Lace approval, unlock, passwords, and transaction authorization always remain owner actions. A connector returned by `window.midnight` is rejected unless its API major version is 4 and its connected configuration passes the runtime diagnostic. Diagnostics contain no full addresses, seeds, keys, or private invoice openings.

## Privacy boundary

NightParcel keeps invoice openings out of its decoded contract state and uses a shielded custom token for payment. It does not promise complete anonymity. Commitments, timing, fees, transaction metadata, Zswap events/nullifiers, token issuance metadata, and opaque raw bytes remain public or correlatable. Native NIGHT is unshielded and is not supported as a confidential NightParcel payment asset.

## Evidence and documentation

- `evidence/phase1b-local.json` — redacted machine-readable successful local run
- `evidence/phase1b-local-run.log` — test and proof timing output without seeds
- `docs/PHASE_1B_REPORT.md` — milestone verdicts, commands, evidence, and limitations
- `docs/PHASE_1C_REPORT.md` — browser-runtime and Wave 2 release status
- `docs/PRIVACY_BOUNDARY.md` — exact public/private boundary
- `docs/CONTRACT_DESIGN.md` — contract semantics and trust boundary
- `docs/WAVE_2_SUBMISSION_CHECKLIST.md` — mandatory release artifacts and owner actions
- `docs/DEMO_RECORDING_PLAN.md` — evidence-first recording sequence
- `docs/PITCH_DECK_OUTLINE.md` — concise seven-slide narrative

## License and attribution

NightParcel is licensed under Apache-2.0. The simulator helper and wallet/provider scaffolding are adapted from the Apache-2.0-licensed `midnightntwrk/midnight-examples` repository; details are in `NOTICE`.

