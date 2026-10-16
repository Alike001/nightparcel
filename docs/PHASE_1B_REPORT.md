# NightParcel Phase 1B technical report

Date: 2026-10-16  
Verdict: **GO_WITH_LIMITATIONS**  
Submission readiness: **NOT READY**

> Historical report: Lace was installed after this Phase 1B snapshot. See `PHASE_1C_REPORT.md` for the current browser-readiness state; runtime authorization and two-profile settlement remain unverified.

## Executive result

NightParcel now has an original compiling Compact contract, meaningful private-state authorization and commitment logic, 18 passing contract-simulator tests, and a successful real local-network payment tied to an invoice and merchant receipt commitment. A payer transferred 125 units of a custom shielded test token to an independent merchant wallet; the indexer and both wallets reported success, both balance deltas matched, and duplicate acknowledgement was rejected.

The product frontend implements the four approved surfaces and calls the real connector API, but this machine does not have a compatible Midnight browser wallet installed in two independent profiles. Browser connector runtime, browser contract calls, encrypted persistent private state, and a full browser `PAID_VERIFIED` flow are therefore unverified. The UI keeps these paths gated and never promotes a browser submission to paid.

## Milestone status

| Milestone | Status | Evidence |
|---|---|---|
| 1. Contract and simulator | IMPLEMENTED_AND_VERIFIED | compiler 0.31.1; full and skip-ZK compiles exit 0; 18/18 simulator tests |
| 2. Real local payment | IMPLEMENTED_AND_VERIFIED | real proof generation, indexer `SUCCESS`, two independent wallet histories, exact balance deltas, matching receipt |
| 3. Browser connector | IMPLEMENTED_BUT_UNVERIFIED | connector 4.0.1 path compiles and unit tests pass; no compatible two-profile Midnight wallet runtime available |
| 4. Product frontend | IMPLEMENTED_WITH_LIMITATIONS | four responsive surfaces, authentic evidence, real `makeTransfer` call; browser contract/private-state flow disabled |
| 5. Privacy and release verification | VERIFIED_WITH_LIMITATIONS | decoded-state and exact-byte scans pass with positive control; full raw Zswap decoding and browser storage audit deferred |

## 1. Original Compact contract

Project: `/home/ali/Desktop/midnight/nightparcel`  
Source: `contract/nightparcel.compact`

The contract exports exactly three state-changing circuits:

- `createInvoice(opening, invoiceSalt)` registers a hiding, address/network/token-bound invoice commitment.
- `cancelInvoice(opening, invoiceSalt)` records one merchant-authorized cancellation.
- `acknowledgeReceipt(opening, invoiceSalt, evidence, receiptSalt)` validates the evidence fields against the private invoice opening and records one salted receipt commitment.

Public ledger fields are `merchantKey`, `networkTag`, `tokenColor`, `invoices`, `cancelled`, and `receipts`. The contract has no token receive/send circuit, no custody, and no paid field.

### Approved-spec adjustment

Phase 1A specified `merchantKey = H(domain, contractAddress, merchantSecret)`. In runtime 4.1.1, `kernel.self()` is unavailable in constructor execution but available in later calls. The authoritative simulator demonstrated that constructor address binding made valid merchant authorization impossible. The implementation therefore uses `H(domain, merchantSecret)`, matching the official private-tip-jar authorization pattern. A fresh secret per deployment is mandatory. Reuse links deployments through the same public key. Invoice and receipt commitments still include `kernel.self().bytes` and retain contract-address replay separation.

## 2. Compilation and tests

Verified toolchain:

| Component | Version |
|---|---|
| Node.js | 22.23.3 |
| Corepack Yarn | 4.18.0 |
| Compact compiler used by `compact compile` | 0.31.1 |
| Compact language | 0.23 |
| Midnight.js | 4.1.1 |
| Wallet SDK | 1.2.0 |
| Connector API | 4.0.1 |
| Node / indexer / proof images | 1.0.0 / 4.3.3 / 8.1.0 |

Results:

- `yarn compile:fast`: exit 0.
- `yarn compile`: exit 0; proving keys generated for all three NightParcel circuits and the test-only token circuit.
- `yarn test:sim`: 1 file, 18 tests passed, approximately 1.26 seconds test time.
- `yarn test`: 2 files, 9 tests passed (7 shared simulator-helper tests and 2 connector request-validation tests).
- `yarn typecheck`: exit 0.
- `yarn lint`: exit 0.
- `yarn build`: exit 0; Vite 6.4.3 production build.
- Web artifact: approximately 985 kB minified JavaScript and 10.2 MB ledger WASM. Code splitting is a non-blocking Wave 3 optimization.

The simulator covers valid creation, zero amount/expiry, exact replay, wrong merchant secret on all three circuits, cancellation replay, cancellation/receipt exclusion, unknown or mismatched openings, every settlement evidence mismatch, receipt replay, cancel-after-receipt, decoded public-state privacy with a positive control, and the malicious-merchant attestation trust boundary.

## 3. Real local transaction evidence

Evidence files: `nightparcel/evidence/phase1b-local.json`, `nightparcel/evidence/phase1b-local-run.log`, `nightparcel/evidence/phase1b-proof-server.log`, and `nightparcel/evidence/phase1b-indexer-transaction.json`. The retained proof-server log contains 13 completed `/prove` requests across deployment, token, payment, and receipt operations.

| Field | Captured value |
|---|---|
| Generated | 2026-10-15T22:49:57.557Z |
| Network | `undeployed` disposable local network |
| Independent wallets | yes; fingerprints `7ec59271da631996` and `40d7c396ba11e597` |
| NightParcel contract | `1474cd09114f90683f028bc91354026dd4bd038879428b38880dfb95d3e70324` |
| Test token contract | `0e76b8b1967dae1b617225d46ce522035ca2eed82c8879b90d23b04024c8534a` |
| Token color | `aeee96dcd18f02863846715a159b3898de6a30213da004c0e58d0a4390e8dffb` |
| Amount | 125 |
| Payer balance | 300 → 175 |
| Merchant balance | 0 → 125 |
| Wallet transaction identifier | `009edba2ce40d79270a8bec5a892b330db25e72917aa3e7f2634c0e992ab406586` |
| Indexed hash | `640a9f1366e585ed53b6e64efd326beef592498c53e11b59756628d9c3fe4a32` |
| Result | `SUCCESS` at block 37 |
| Block hash | `d7f45afe9f76a39f560a016de9542fa0d101c914db5ae0f8d46207624725648f` |
| Fee | `53450103312063` |
| Proof/finalize time | 28,266 ms |
| Submit-return time | 18,206 ms |
| Payer / recipient histories | `SUCCESS` / `SUCCESS`, same indexed hash |
| Invoice commitment | `184dbb9b819776eeb5e09491187f560c59d3f71e16ed7649309cf15d3485b828` |
| Receipt commitment | `2d42900d3073bba61c7c763887ea1ba40c63904928c1a7145e037759fca7d14a` |

All six application checks were true: payer accepted, indexer accepted, recipient reconciled, sender delta matched, recipient delta matched, and stored receipt matched. Only then did the harness produce `PAID_VERIFIED`. A second acknowledgement rejected with `Invoice already acknowledged`.

This is a controlled no-concurrency flow. Wallet history exposes relevance and status rather than a decoded received amount, so balance attribution becomes ambiguous if unrelated same-token activity occurs. The required state in that case is `UNRESOLVED`.

## 4. Browser connector findings

Installed connector API 4.0.1 declares and documents `getShieldedBalances`, `getDustBalance`, `makeTransfer`, `submitTransaction`, and `getTxHistory`. The NightParcel web code:

1. detects `window.midnight` providers;
2. connects to the exact request network;
3. verifies configuration and shielded balance;
4. requests one exact shielded output through `makeTransfer`;
5. deserializes the returned transaction with protocol 4.1.1 and derives its first 33-byte identifier;
6. submits the exact returned serialization;
7. records only `SUBMITTED`, not a settlement claim.

Static inspection found no compatible Midnight extension in the available Chrome profiles; a second independent compatible profile was also absent. Runtime testing was therefore impossible without installing/configuring user-owned wallets and accounts. The official testkit `DAppConnectorWalletAdapter` is not an acceptable substitute for the required real extension profiles. AC-07 and AC-08 remain open.

## 5. Frontend status

Implemented surfaces:

- Readiness: detected connector, network, DUST, payment capability, private-state status, and authentic local-run snapshot.
- Create and share: local draft and disclosure preview; on-chain action deliberately disabled until browser contract/private-state integration is verified.
- Review and pay: strict request validation, exact amount/token/recipient/network review, and real connector transfer call when available.
- Verify evidence: immutable captured real-run evidence, public visibility inventory, privacy caveat, and a separate unresolved current browser-session state.

The UI is responsive at desktop/mobile breakpoints, keyboard focus styles are present, controls use labels, live/error text is exposed, and no illustrative balance or transaction is presented as live. The authentic run is explicitly labelled as a captured snapshot. Headless local preview returned HTTP 200 and produced `nightparcel/evidence/frontend-readiness.png`.

Not implemented: browser Compact deployment/calls, canonical committed request export, encrypted browser private-state storage/recovery, recipient-profile reconciliation, and browser acknowledgement. Those controls remain disabled or unresolved.

## 6. Privacy audit

Decoded NightParcel public state contained only the approved six fields. The simulator searched merchant secret, invoice ID, amount in four binary encodings, recipient keys, expiry encodings, terms digest, invoice salt, wallet-ID digest, indexer hash, block hash, and receipt salt; none appeared. It first found the public invoice commitment as a positive control.

The E2E scan searched exact canonical bytes across indexed create-invoice and receipt transactions. It found no merchant secret, invoice ID, recipient key, terms digest, salts, wallet-ID digest, indexer hash, or block hash. The direct payment exposed 37,054 raw hex characters, four identifiers, Zswap range `[29,31)`, three opaque events of 186/650/650 hex characters, and no contract action or unshielded input/output fields.

These tests support invoice confidentiality in decoded NightParcel state. They do not establish complete anonymity, resistance to timing correlation, alternative-encoding absence, or full raw Zswap secrecy. Native NIGHT remains unshielded and outside the private payment claim.

## 7. Security findings and remaining blockers

| Priority | Finding | Required action |
|---|---|---|
| P0 | No real two-profile browser-wallet run | Install/configure two compatible disposable Midnight wallet profiles, then runtime-test every connector method and full reconciliation |
| P0 | Browser create/acknowledge and encrypted private state are absent | Implement only after the connector runtime gate; test reload, wrong passphrase, account scoping, and loss behavior |
| P0 | AC-08 browser E2E is open | Complete create → share/import → pay → receive → acknowledge → verify without seed entry |
| P1 | Merchant receipt is an attestation, not an oracle | Keep live indexer and recipient-wallet checks mandatory; never derive paid status from the contract alone |
| P1 | Merchant-secret reuse links deployments | Generate a cryptographically fresh authorization secret for every deployment and test backup/loss UX |
| P1 | Full raw Zswap decoding is incomplete | Decode or obtain an authoritative encoding analysis before strengthening privacy language |
| P1 | Browser request validation does not yet recompute/query commitment state | Implement contract read/recomputation before enabling payment in a submission build |
| P2 | Frontend bundle is large | Lazy-load protocol/WASM code after correctness gates |
| P2 | Real-node negative cases are narrower than simulator cases | Add wrong-network, insufficient-funds, reload/single-flight, and real-node authorization cases |

No sNIGHT, NIGHT privacy claim, custodial vault, bridge, mainnet deployment, fake proof, fake payment, or fake paid state was introduced. No wallet seed or private key is stored in source or evidence. Local E2E seeds are required through ignored environment variables.

## 8. Acceptance trace

| Criterion | Result |
|---|---|
| AC-01 original compile | PASS |
| AC-02 simulator/privacy assertions | PASS |
| AC-03 pinned local-devnet stack | PASS |
| AC-04 independent-wallet payment evidence | PASS |
| AC-05 matching receipt commitment | PASS |
| AC-06 negative/replay coverage | PASS_WITH_LIMITATION — simulator complete; real-node subset |
| AC-07 browser connector runtime | BLOCKED |
| AC-08 two-profile browser E2E | BLOCKED |
| AC-09 public/raw privacy scan | PASS_WITH_LIMITATION — exact-byte scan, not full decode |
| AC-10 release gates and clean rerun | PASS_WITH_LIMITATION — deterministic gates pass; browser rerun absent |

## Verdict and next action

**GO_WITH_LIMITATIONS** means the original contract and Node-based self-custodial settlement thesis are technically credible and verified, so Phase 1B need not be abandoned. It does not mean Wave 2 submission-ready.

The next action is a controlled browser-wallet enablement session: install or identify a connector-4.0.1-compatible Midnight wallet in two disposable profiles, configure both for the local network, and run the connector spike. If it passes, implement browser contract/private-state integration and complete AC-08. If the wallet cannot support this stack, retain the Node demonstration and present the browser limitation honestly rather than bypassing it.

