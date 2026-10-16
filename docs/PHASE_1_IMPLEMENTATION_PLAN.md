# Plan: NightParcel Phase 1B implementation

Date: 2026-10-15  
Status: proposed; execution requires explicit approval.  
Recommendation: **GO** for the direct-payment architecture, subject to the explicit stop gates below.

## Inputs

- Accepted Phase 0 reports and real two-wallet transfer evidence.
- `PHASE_1_SPEC.md` and `CONTRACT_DESIGN.md`.
- `PRIVACY_BOUNDARY.md` and `PHASE_1_TEST_PLAN.md`.
- `WAVE_2_MVP.md` scope and Buildathon timing.
- Official examples at commit `f19c80266c7308b991f03aa935bb92131f9946f3`.
- Pinned Node 22, Yarn 4.18.0, Compact 0.31.1/language 0.23, Midnight.js 4.1.1, wallet SDK 1.2.0, connector API 4.0.1, and local images from Phase 0.

## Assumptions

- Implementation occurs in a new NightParcel project, not inside an upstream inspection clone.
- The supported asset is one test-only custom shielded token with no peg or redemption.
- Merchant and payer can run independent local wallet profiles and have DUST.
- The authenticated Wave 2 deadline will be checked before work starts.
- No high-fidelity prototype exists; visual work begins only after the contract's simulator gate.

## Open questions resolved as gates

These do not require speculative design changes now; each has an early pass/fail check:

1. Does connector 4.0.1 `makeTransfer` produce a submit-ready direct shielded transfer on the local stack?
2. Can the exact transaction identifier be derived before submission and matched in both wallets' histories?
3. Does the chosen Compact invoice/receipt structure compile with `persistentCommit` under language 0.23?
4. Can browser private state survive reload without `findDeployedContract` overwriting it?
5. Does the controlled balance/history reconciliation remain unambiguous in the two-profile demo?

Failure of 1–2 blocks a working browser payment claim. Failure of 3 returns to the semantic spec without changing privacy requirements. Failure of 4 blocks acknowledgement UI. Failure of 5 forces `REVIEW_REQUIRED`, not `PAID_VERIFIED`.

## Prototype reintegration gate

No prototype has been supplied. There is therefore no mock or static UI to reintegrate. The implementation must derive its screens from the real contract, wallet, indexer, and private-state interfaces. Mock providers are allowed only in unit tests and Storybook-like development fixtures, never in the judged payment path.

## Phase 1 — project and design-card scaffold

### Goal

Create an independent, pinned NightParcel workspace while keeping all upstream repositories clean.

### Work

- Establish repository license, package manager, Node pin, package versions, scripts, lint/type/test/build conventions, and source attribution.
- Add the official-example-style contract design card from `CONTRACT_DESIGN.md`.
- Scaffold contract, harness, simulator, devnet configuration, and test-only token without adding product logic yet.
- Prefer deterministic official generators/templates in an isolated copy or faithfully attributed Apache-2.0 scaffolding; do not register NightParcel in the upstream clone.

### Real integration path

All packages resolve to the Phase 0 pins. Compose uses the known local node/indexer/proof images.

### Mock/simulation policy

No payment mocks. Simulator scaffolding is an explicit contract-test environment.

### Checks

- immutable install;
- source/license inventory;
- spec lint;
- upstream `git status --short` remains empty;
- dependency/version diff against Phase 0 matrix.

### Acceptance criteria covered

AC-01, AC-10.

### Stop condition

Stop if the project requires changing upstream, upgrading pinned Midnight packages, or importing incompatible/unlicensed zk-freighter code.

## Phase 2 — original Compact contract and witnesses

### Goal

Implement the smallest contract that matches the public schema, private authorization, commitments, and state machine exactly.

### Work

- Implement sealed merchant key, network tag, token color, invoice set, cancellation set, and receipt map.
- Implement domain-separated merchant key and salted invoice/receipt commitments.
- Implement `createInvoice`, `cancelInvoice`, and `acknowledgeReceipt` with every specified guard.
- Implement browser-compatible `merchantSecret` witness and private-state factory.
- Add pure helpers only where compiler/runtime verification supports them.

### Real integration path

Use only APIs demonstrated in private-bid/private-tip-jar or accepted by the pinned compiler. Let compiler output drive TypeScript types.

### Mock/simulation policy

No hand-written approximation of Compact behavior. The generated compiled contract is authoritative.

### Checks

- `compile:fast` after each semantic increment;
- generated circuit/ledger inventory against the design;
- typecheck witness signatures;
- full compile only after the simulator suite is complete.

### Acceptance criteria covered

AC-01, foundations for AC-02 and AC-03.

### Stop condition

Stop and revise the specification if hiding the required fields would require public ledger writes, unsupported types, or token custody.

## Phase 3 — simulator, privacy, and negative tests

### Goal

Mechanically establish contract correctness before spending time on proof generation or UI.

### Work

- Run all success transitions.
- Add one rejection test per assert and compare state before/after.
- Add `assertNotInPublicState` entries for every privacy invariant.
- Add scanner positive controls and cross-deployment/network replay fixtures.
- Remove every `it.todo`.

### Real integration path

Tests import the compiled contract and actual witnesses; they do not import wallet or provider harnesses.

### Mock/simulation policy

Made-up coins are unnecessary because the product contract has no token effects. Simulated ledger execution is valid only for this contract-logic gate.

### Checks

- typecheck;
- simulator suite;
- spec lint against compiled contract and tests;
- deterministic rerun.

### Acceptance criteria covered

AC-02, AC-06, part of AC-09.

### Stop condition

Do not create the frontend until the in-memory gate is fully green.

## Phase 4 — local-devnet contract and two-wallet harness

### Goal

Combine accepted contract calls with a real invoice-bound wallet-to-wallet payment.

### Work

- Full compile and start the pinned local services.
- Deploy a test-only shielded token and mint payer funds.
- Start independent payer and merchant wallets/private-state providers.
- Deploy the invoice book and create an invoice.
- Execute the direct payment with the verified wallet SDK path.
- Capture transaction ID before submit, wait for inclusion/indexing, reconcile both balances and histories.
- Construct matching private settlement evidence, acknowledge it, and recompute the stored receipt commitment.
- Run all real-node replay/authorization/duplicate cases that cannot be fully modeled in the simulator.
- Persist a redacted machine-readable evidence manifest.

### Real integration path

Wallet SDK 1.2.0 `transferTransaction` is the Node harness path. Contract calls use Midnight.js 4.1.1. The indexer supplies public state and inclusion data.

### Mock/simulation policy

The custom asset is a test token, but every transaction, proof, wallet observation, and ledger mutation is real on the local network.

### Checks

- full `validate` with exact counts and exit codes;
- proof-server log correlation;
- same transaction ID in indexer and both wallets;
- balance arithmetic;
- ledger and raw-payload privacy scans;
- clean environment teardown.

### Acceptance criteria covered

AC-03, AC-04, AC-05, AC-06, part of AC-09 and AC-10.

### Stop condition

Stop if an invoice can reach acknowledged application success without the recipient observation, or if evidence cannot bind to the exact transaction.

## Phase 5 — browser connector spike

### Goal

Resolve the largest remaining API risk before building presentation UI.

### Work

- Connect two browser profiles to the local network.
- Read configuration, addresses, DUST, and shielded balances.
- Call connector 4.0.1 `makeTransfer` for one shielded output.
- Deserialize the returned transaction using the pinned protocol package, derive its identifier, submit it, and poll `getTxHistory` plus indexer status.
- Confirm the same hash appears as relevant to the merchant profile and reconcile balances.
- Test rejection, timeout/reload, and wrong-network handling.

### Real integration path

Use only the installed connector surface. No direct wallet-sdk keys or seeds in the browser application.

### Mock/simulation policy

Connector mocks may cover error branches in unit tests. This spike passes only with two real browser wallet profiles.

### Checks

- runtime evidence for every connector method;
- serialized transaction/identifier equality;
- no secret or passphrase in network/console logs;
- update `verification.json`-style manifest.

### Acceptance criteria covered

AC-07 and prerequisite for AC-08.

### Stop condition

If the real connector cannot make the transfer, stop and return a browser-integration blocker. Do not substitute the Node harness behind a fake browser success screen.

## Phase 6 — purpose-built MVP frontend

### Goal

Deliver the four-surface workflow in `WAVE_2_MVP.md` using only real state.

### Work

- Readiness/unlock surface.
- Merchant create/share flow with canonical JSON.
- Payer import/recompute/review/pay flow with single-flight persistence.
- Merchant receive/reconcile/acknowledge flow.
- Evidence and privacy-boundary display.
- Persistent private state with account scoping, canary, wrong-passphrase behavior, and no-recovery warning.
- Responsive/accessibility/error-state polish.

### Real integration path

Contract calls use browser Midnight providers. Direct payment uses connector `makeTransfer`. Status uses wallet history and indexer, never timers or optimistic flags.

### Mock/simulation policy

Test fixtures are excluded from production builds and visually labelled in development. No mock path may set `PAID_VERIFIED`.

### Checks

- typecheck, unit tests, production build;
- two-profile E2E;
- reload after invoice creation and payment submission;
- single-flight duplicate click;
- wrong passphrase and lost-state messaging;
- keyboard and narrow-screen smoke checks.

### Acceptance criteria covered

AC-07, AC-08, AC-10.

### Stop condition

Do not add secondary screens or polish while any core state is mocked, ambiguous, or unreconciled.

## Phase 7 — privacy audit, clean rerun, and submission evidence

### Goal

Prove the implemented product matches the accepted specification and communicate its limits honestly.

### Work

- Collect and scan contract state, indexer results, raw transactions/events, wallet histories, browser storage inventory, and logs.
- Run the complete install → compile → tests → devnet → browser → build sequence from a clean NightParcel checkout/environment.
- Produce evidence manifest, README, architecture/privacy docs, demo script/video, license, and submission metadata.
- Confirm upstream clones remain clean and no secrets exist in repository history or artifacts.

### Real integration path

All demonstrated success comes from the local network unless a separately approved public-testnet run is completed and recorded.

### Mock/simulation policy

Screenshots/video must show real local evidence and visibly label the network/test token.

### Checks

- verification audit mapping AC-01 through AC-10 to commands/artifacts;
- dependency/security scan appropriate to the project;
- `git diff --check`, secret scan, production build;
- exact authenticated submission deadline and required repository topic/license.

### Acceptance criteria covered

AC-09, AC-10, final coverage for all criteria.

### Stop condition

If an acceptance criterion lacks evidence, label it failed or deferred. Never infer completion from code presence.

## Critical path

```text
scaffold
  → Compact compile
  → simulator/privacy gate
  → devnet contract + Node two-wallet payment
  → browser connector spike
  → four-surface UI
  → clean verification/submission
```

Contract custody, sNIGHT, mainnet, multi-asset support, and optional product features are not on this path.

## Verification checkpoint

Before calling Phase 1B complete, perform an independent traceability audit against all six Phase 1A documents. The verdict is:

- `PASS` only if AC-01–AC-10 have evidence;
- `PASS_WITH_LIMITATIONS` if the working local product has explicitly bounded raw-payload or recovery limitations that do not invalidate settlement;
- `BLOCKED` if browser payment, recipient reconciliation, contract privacy, or original-contract execution fails.

## Handoff decision

**GO** is recommended for Phase 1B implementation of Architecture A. Architecture B and all NIGHT wrapping remain **NO-GO**. Execution must not begin until the owner explicitly approves Phase 1B.
