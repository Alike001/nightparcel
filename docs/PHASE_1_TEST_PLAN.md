# NightParcel Phase 1 test plan

Date: 2026-10-15  
Status: planned; none of these NightParcel tests has run yet.

## Test objective

Prove that the original invoice contract enforces its state machine and privacy invariants, and that the application labels an invoice `PAID_VERIFIED` only after one real direct shielded-token transaction is accepted and independently observed by the recipient wallet.

The plan deliberately separates contract truth, network truth, wallet-local truth, and application composition.

## Pinned verification environment

Phase 1B begins on the Phase 0 version set:

| Component | Pin |
|---|---:|
| Node.js | 22 (`v22.23.3` observed) |
| Yarn | 4.18.0 from repository `packageManager` |
| Compact language/compiler | 0.23 / 0.31.1 |
| Midnight.js and testkit | 4.1.1 |
| Wallet SDK | 1.2.0 |
| DApp Connector API | 4.0.1 |
| Ledger | 8.1.2 resolution |
| Node/indexer/proof images | 1.0.0 / 4.3.3 / 8.1.0 |

No dependency upgrade is allowed to solve a test failure without a separate compatibility decision.

## Evidence levels

| Level | Proves | Does not prove |
|---|---|---|
| Static/type | imports and shapes agree with installed packages | runtime behavior |
| Compact compile | source is valid for pinned compiler | logic, privacy, or network acceptance |
| Simulator | contract state transitions and guards | proving, fees, wallet selection, network sync |
| Local devnet | proof generation and accepted contract/payment transactions | public-testnet behavior or production security |
| Two-wallet reconciliation | recipient wallet observed the transfer | complete anonymity or independent public amount proof |
| Browser two-profile | actual connector and UX work together | mobile, other wallets, or recovery guarantees |
| Privacy scan | selected secrets absent from inspected surfaces | absence from every side channel |

## Test suites

### T1 — specification and source gates

Checks:

- design card contains every role, field, circuit, assert, witness, privacy invariant, accepted leak, and test-only contract;
- no source imports sNIGHT/NIGHT wrapper, bridge, AI, mobile, or extension dependencies;
- exact package pins match the approved matrix;
- upstream repositories remain unchanged.

Planned commands, adjusted only to the final project workspace name:

```text
nvm use 22
corepack yarn install --immutable
corepack yarn spec:lint nightparcel-invoice --design
git diff --check
git -C ../upstream-midnight-examples status --short
```

Pass: spec lint and immutable install succeed; upstream status is empty.

### T2 — Compact compilation

Checks:

- fast compile validates the final semantic types and commitment generics;
- full compile generates prover/verifier material for all three state-changing circuits;
- generated circuit inventory matches `CONTRACT_DESIGN.md` and contains no token-custody effects.

Planned commands:

```text
corepack yarn workspace @nightparcel/invoice run compile:fast
corepack yarn workspace @nightparcel/invoice run typecheck
corepack yarn workspace @nightparcel/invoice run compile
```

Pass: exit 0; circuits are `createInvoice`, `cancelInvoice`, and `acknowledgeReceipt` only, plus any verified pure helpers.

### T3 — in-memory contract tests

Success cases:

1. deploy stores the expected merchant-key commitment, network tag, and token color;
2. merchant creates a positive invoice and receives the expected commitment;
3. merchant cancels one open invoice;
4. merchant acknowledges a different open invoice with matching evidence;
5. opening recomputation matches the stored invoice and receipt commitments;
6. derived states return `UNKNOWN`, `OPEN`, `CANCELLED`, and `ACKNOWLEDGED` correctly.

Required rejection cases—one test per guard:

- wrong merchant secret for create, cancel, and acknowledge;
- zero amount;
- unset expiry;
- duplicate invoice commitment;
- unknown invoice cancellation;
- duplicate cancellation;
- cancel after acknowledgement;
- acknowledge unknown invoice;
- acknowledge cancelled invoice;
- duplicate acknowledgement;
- zero wallet-identifier digest or indexed transaction hash;
- zero confirmation block;
- wrong amount, token, either recipient key, or network;
- changed invoice ID, terms digest, invoice salt, or receipt salt;
- receipt from another invoice, network, or contract deployment.

State-preservation rule: every rejected call must leave all public fields byte-for-byte unchanged.

Planned command:

```text
corepack yarn workspace @nightparcel/invoice run test:sim
```

Pass: every circuit runs, every assert has a rejection test, there are no `it.todo` tests, and the suite is deterministic.

### T4 — simulator privacy tests

Secrets/fields to scan:

- merchant authorization secret;
- invoice ID, amount in all canonical encodings, payee coin and encryption keys, expiry, terms digest and plaintext terms;
- invoice salt;
- evidence transaction ID, block hash, receipt salt;
- payer test key and wallet identifiers.

Positive controls:

- scanner finds the public token color and network tag;
- scanner finds the registered invoice commitment;
- after acknowledgement, scanner finds the public receipt commitment;
- a deliberately public fixture is detected before being removed from the target contract.

Pass: all prohibited values are absent, all controls are detected, and public ledger keys equal the schema in `CONTRACT_DESIGN.md`.

### T5 — local devnet contract flow

Actors: independent merchant wallet and payer wallet. A test-only faucet contract may mint the clearly labelled custom test token; it is not part of NightParcel's product contract.

Flow:

1. services become healthy and both wallets sync with DUST;
2. merchant deploys the invoice book;
3. merchant creates two invoices;
4. merchant cancels one and acknowledges the other only after T6 payment evidence;
5. indexer state matches simulator expectations;
6. rejection transactions fail locally or are rejected without ledger mutation;
7. every accepted contract call records transaction ID, block, status, proof timing, fee, and resulting state.

Pass: full `validate` exits 0 and all accepted calls are indexed successfully.

### T6 — real independent-wallet invoice payment

Preconditions:

- one open invoice commitment exists;
- payer owns enough supported shielded test tokens and DUST;
- merchant and payer wallets are independently constructed and synchronized;
- no concurrent transfer of the same token occurs during the balance-delta window.

Flow and evidence:

1. capture both wallet fingerprints without secrets;
2. capture payer and merchant token balances;
3. payer imports the exact invoice opening and recomputes the on-chain commitment;
4. build one shielded output for the specified token, amount, and merchant shielded address;
5. derive the transaction ID from the exact finalized transaction;
6. submit once;
7. wait for indexer `SUCCESS`/confirmed-finalized status and capture block/hash/fee/Zswap metadata;
8. require payer wallet history to contain that transaction ID;
9. require merchant wallet history to contain the same transaction ID;
10. require payer balance reduction and merchant balance increase to equal the invoice amount;
11. merchant creates the matching receipt opening and calls `acknowledgeReceipt`;
12. recompute the stored receipt commitment from the exported evidence bundle.

Pass: all identifiers agree, balances reconcile, proof generation is logged, and the application reaches `PAID_VERIFIED` only after step 12.

Failure scenarios:

- payer rejects wallet request;
- insufficient balance;
- wrong network or address encoding;
- unsupported token color;
- expired/cancelled request;
- submit timeout then reload/reconcile;
- same button clicked twice;
- second deliberate payment for one invoice;
- indexer confirms but merchant wallet has not synchronized;
- merchant balance changes from an unrelated same-token transfer;
- merchant tries to acknowledge a different transaction.

The unrelated-transfer scenario must remain `REVIEW_REQUIRED`, not automatically paid. This exposes the controlled-demo limitation of balance-delta reconciliation.

### T7 — browser connector and two-profile flow

Connector methods that require runtime coverage:

- `connect` / connection status;
- `getConfiguration` and network matching;
- `getShieldedAddresses`;
- `getShieldedBalances` and `getDustBalance`;
- `makeTransfer` with a shielded desired output;
- `submitTransaction`;
- `getTxHistory` pagination and status transitions;
- wallet or local proving provider as actually configured.

Two-profile test:

- Profile M: merchant wallet and merchant encrypted private state;
- Profile P: payer wallet and imported request;
- wrong passphrase rejected at unlock;
- reload after invoice creation preserves the opening;
- reload after submission reconciles instead of resubmitting;
- payer completes transfer and merchant observes the same hash;
- merchant acknowledgement survives reload;
- evidence export/import recomputes commitments;
- no seed entry, secret logging, or simulated success UI exists.

Pass: the full flow runs against the local network with real connector calls and is recorded in a verification manifest.

### T8 — raw public-surface audit

Collect for invoice creation, direct payment, cancellation, and acknowledgement:

- decoded contract ledger;
- indexer transaction/action data;
- raw transaction bytes and Zswap events;
- browser console/network log with secrets redacted;
- proof-server request metadata, not secret bodies;
- wallet histories and evidence JSON.

Run canonical-value scans described in `PRIVACY_BOUNDARY.md`. Compare transaction timing and identifiers. Record every visible field and classify it as expected, newly accepted, or blocking.

Pass: no prohibited opening appears in inspected public surfaces; positive controls succeed. If the amount or recipient is decoded publicly, update product wording and obtain a design decision before submission.

### T9 — frontend quality and status semantics

Unit/component coverage:

- request canonicalization and commitment recomputation;
- address/network/token/amount validation;
- state machine and prohibited transitions;
- single-flight and reload recovery;
- transaction hash/status rendering;
- privacy disclosure panel;
- long address/hash wrapping, keyboard navigation, focus, contrast, loading/error/empty states;
- test-token/no-redemption and local-network labels.

Planned commands:

```text
corepack yarn workspace @nightparcel/web run typecheck
corepack yarn workspace @nightparcel/web run test:unit
corepack yarn workspace @nightparcel/web run build
```

Pass: all checks succeed and no component can produce `PAID_VERIFIED` from mocked or incomplete evidence in the judged path.

## Acceptance traceability

| Spec criterion | Primary tests |
|---|---|
| AC-01 | T1, T2 |
| AC-02 | T3, T4 |
| AC-03 | T5 |
| AC-04 | T6 |
| AC-05 | T3, T5, T6 |
| AC-06 | T3, T5, T6 |
| AC-07 | T7 |
| AC-08 | T7 |
| AC-09 | T4, T8 |
| AC-10 | T1, T5, T7, T9 and final audit |

## Evidence manifest requirements

Every full run records:

- UTC and local timestamps;
- source commit and dirty status;
- exact tool/package/image versions;
- commands and exit codes;
- test file/test counts and skipped tests;
- contract address and accepted transaction IDs;
- block heights/hashes, fees, proof timings, and wallet balance snapshots;
- public-state snapshot digest and privacy-scan results;
- browser/wallet versions and profile separation;
- limitations and any manual steps.

Secrets, full seeds, private-state passphrases, complete coin openings, and unredacted request/receipt salts must never enter the manifest.

## Stop conditions

Phase 1B must stop and return `BLOCKED` or narrow the submission if:

- the contract cannot compile on the pinned toolchain;
- browser `makeTransfer` cannot complete a real two-wallet transfer;
- the receiver cannot reliably associate the transaction in the controlled test;
- a prohibited invoice field appears in public contract state;
- an application path can show paid without network plus recipient evidence;
- private state is silently replaced on join/reload;
- the upstream reference repositories become dirty;
- resolving a blocker requires dependency upgrades, mainnet, custody, or sNIGHT without new approval.
