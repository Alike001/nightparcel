# NightParcel prioritized issues after Phase 0

Date: 2026-10-16  
Status: Phase 1D product experience is verified; Lace 2.4.2 exists in two profiles, but owner authorization and the two-profile browser lifecycle remain open.

## Phase 1D product status

### P9 — public landing, task workspace, and deterministic UI verification: COMPLETE

- `/` now explains Request → Pay → Verify, the private/public boundary, Midnight-specific architecture, recorded local evidence, and prototype limitations without requiring a wallet.
- `/app` now provides Overview, Request payment, Make payment, Activity and evidence, and Settings.
- The request path creates only an explicit `DRAFT_UNCOMMITTED` local file. The pay path rejects that draft and accepts only a canonical committed request.
- The real Connector API transfer path is preserved and can produce only `SUBMITTED · UNRESOLVED` without all six settlement checks.
- Fifteen Playwright scenarios pass, including required responsive widths, request/payment states, evidence separation, keyboard entry, and screenshot capture.
- Typecheck, lint, supporting tests, production build, and route-level splitting pass.

### P10 — owner-assisted browser lifecycle: OPEN / OWNER ACTION REQUIRED

- Unlock and approve Lace in the two disposable Chrome profiles.
- Confirm both wallets use the same local network and local prover.
- Execute Alice → Bob, capture indexer acceptance, and independently reconcile Bob.
- Runtime-test browser Compact create/acknowledge and encrypted account-scoped recovery before enabling those controls.

Until P10 completes, the browser product is a verified request/review/diagnostic experience with a real but runtime-pending connector path—not a complete browser settlement application.

## Completed Phase 0 gates

### P0 — official baseline: COMPLETE

- Pinned Yarn 4.18.0 was activated through Corepack without changing repository pins.
- Immutable dependency installation passed.
- The smallest example compiled with Compact compiler 0.31.1.
- Hello World local validation passed: 1 file, 2 tests.
- Token Transfers local validation passed: 1 file, 9 passed, 1 skipped.
- Docker services became healthy and the DUST readiness check succeeded.

### P1 — independent-wallet shielded payment: COMPLETE_WITH_LIMITATION

- Alice and Bob used independent seeds and distinct wallet fingerprints.
- A custom shielded token was minted to Alice.
- Alice transferred 125 units to Bob using the official pinned wallet SDK path.
- Alice reconciled `300 -> 175`; Bob reconciled `0 -> 125`.
- Transaction `00f5a0121b8894f9d771e10b88125095c4a5afb434d73d294090454fb240724ac9` was accepted and indexed `SUCCESS` at block 46.
- Proof-server logs showed four successful `/prove` requests in the run.
- The indexer exposed metadata, commitments/events, and raw bytes but no decoded sender, recipient, or amount fields.

Limitation: the raw transaction and Zswap events have not yet been fully decoded or tested with a positive-control leak scanner. The official contract-to-user shielded-send test was also skipped because no qualified contract-held coin with `mt_index` was available.

## Completed Phase 1A gate

### P2 — specify the confidential invoice registry: COMPLETE

- Architecture A selected: direct self-custodial wallet payment plus an invoice/receipt commitment contract.
- Public/private fields, merchant witness authorization, commitment domains, state transitions, and evidence semantics specified.
- The contract deliberately does not custody tokens and does not publish a `paid` field.
- Architecture B, NIGHT wrapping, and sNIGHT remain excluded.

Specification artifacts: `PHASE_1_SPEC.md`, `CONTRACT_DESIGN.md`, `PRIVACY_BOUNDARY.md`, `PHASE_1_TEST_PLAN.md`, `WAVE_2_MVP.md`, and `PHASE_1_IMPLEMENTATION_PLAN.md`.

## Phase 1B implementation status

### P3 — compile the original contract and pass simulator gates: COMPLETE

- Create the NightParcel project outside the upstream inspection repositories.
- Implement the approved three-circuit invoice contract and merchant witness.
- Compile on the Phase 0 pins.
- Pass every state-machine, authorization, replay, and public-state privacy test.

Result: full compilation succeeded and 18/18 simulator tests passed. The only specification adjustment is the documented constructor-time merchant-key binding limitation.

### P4 — local devnet contract and two-wallet evidence: COMPLETE_WITH_LIMITATIONS

- Deploy the original contract and its test-only token on the pinned local stack.
- Run create, cancel, and acknowledge calls with accepted transaction evidence.
- Execute one direct payer-to-merchant shielded transfer for an open invoice.
- Reconcile both wallets, indexer status, proof logs, and the stored receipt commitment.
- Cover wrong merchant secret, wrong opening/evidence, insufficient balance, duplicate payment/acknowledgement, cancelled invoice, wrong network/address, zero amount, and overflow boundaries.

Result: a 125-unit transfer reached indexer `SUCCESS` at block 37, both independent wallets reconciled, both balance deltas matched, the receipt commitment matched, and duplicate acknowledgement rejected. Real-node negative coverage is narrower than the simulator suite.

### P5 — browser connector spike and permanent privacy scanner: IN_PROGRESS

- Promote the temporary two-wallet method into a maintained test harness.
- Decode raw transaction and Zswap event encodings.
- Add a positive-control leak fixture.
- Runtime-test connector `makeTransfer`, transaction identifier derivation, wallet history, and recipient reconciliation.
- Record machine-readable transaction, block, wallet, and public-state evidence.

Result: connector 4.0.1 integration is implemented, compiled, and unit-tested. Lace 2.4.2 is installed in Chrome Default and Profile 2. A sanitized runtime diagnostic now rejects non-4.x connectors and checks authorization status, account identity, network/endpoints, balances, DUST, history/transfer/submission/proving methods, and local proof-server configuration. Extension unlock and authorization are owner actions; no browser transfer or recipient reconciliation has yet been recorded. The exact-byte scanner passed its public commitment positive control but full raw Zswap decoding remains open.

### P6 — usable end-to-end invoice application: IMPLEMENTED_BUT_UNVERIFIED

- Run payer and merchant as independent wallets/private-state stores.
- Create/share/import one private invoice, settle it with an actual wallet transaction, and record a merchant acknowledgement.
- Reconcile payer, merchant, contract, and indexer state.
- Exercise reload, single-flight retry, wrong-passphrase, and documented no-recovery behavior.
- Run the privacy scanner against the complete flow.

Result: the four responsive surfaces render authentic captured evidence and the payment surface calls the real connector. A failed readiness diagnostic cannot enable the payment action. Contract creation/acknowledgement and encrypted browser private state are deliberately disabled; a browser submission remains `SUBMITTED`, never `PAID_VERIFIED`.

### P8 — Wave 2 publication and submission: OWNER_ACTION_REQUIRED

- Confirm the authenticated AKINDO deadline because the official October 17 schedule conflicts with the rendered October 19 countdown.
- Keep the verified public repository (`Alike001/nightparcel`) and `midnightntwrk` topic current with the final browser result.
- Produce the final deck and demo recording from the prepared evidence-first outlines.
- Enter the progress description and verify team members/material links in the authenticated form.

The public repository and required topic are verified. Final browser-result consistency, video/deck links, and authenticated submission fields remain open.

### P7 — verification and submission audit: COMPLETE_WITH_BLOCKERS

- Run the acceptance traceability audit and clean-environment rerun.
- Finalize README, architecture/privacy docs, evidence manifest, license, slides, and demo.
- Confirm repository topic/deadline requirements and perform secret/upstream-cleanliness checks.

Result: the audit is recorded at `nightparcel/.thoughts/verification/2026-10-16-phase-1b.md`. Deterministic gates and the Node-wallet evidence pass, but AC-07 and AC-08 fail for lack of a real two-profile browser wallet run; Wave 2 submission readiness is not claimed.

## Deferred — NIGHT-backed custom token

Do not implement in Phase 1. The independent-wallet and component primitives now work locally, but atomic backing, redemption, reserve integrity, recovery, authorization, and complete privacy properties remain unproved. Reconsider only after every gate in `SNIGHT_FEASIBILITY.md` passes, with separate approval and security review before any public network or real funds.
