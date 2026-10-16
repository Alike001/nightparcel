# NightParcel Phase 2A — functional payment completion

Date: 2026-10-16

Branch: `feature/phase-2a-functional-payments`

Base: `feature/phase-1d-product-experience` at `02c8cc4`
Status: **IMPLEMENTED_WITH_OWNER_RUNTIME_BLOCKERS — NOT YET RELEASE READY**

## Outcome

Phase 2A closes the previously unsafe request-file path and implements the browser-side Compact invoice-book plumbing without representing it as verified Lace behavior. A payer can no longer authorize a payment from structurally valid JSON alone. The request must use the v2 format, reproduce the exact salted Compact commitment, match the live deployment and merchant key, commit the exact token and recipient keys, be registered and open, remain unexpired, and be funded by the connected payer account. The payer must also confirm the merchant and recipient through a trusted channel because an internally consistent deployment does not establish a real-world identity.

No owner-controlled Lace authorization, browser contract transaction, browser shielded-token transfer, or six-check browser settlement occurred in this phase. The historical 125-unit Node-wallet run remains the only verified end-to-end settlement and is kept separate in the product.

## P0 — Lace connectivity

| Item | Status | Evidence / limitation |
|---|---|---|
| Lace installations | READY_FOR_OWNER_TEST | Lace 2.4.2 exists in Chrome Default and Profile 2 |
| Connector compatibility | IMPLEMENTED_AND_AUTOMATED | Connector API 4.x, authorization, connection status, network, exact endpoints, shielded address, balances, DUST, transfer/balance/submit/history/proving methods, and local proof-server reachability are checked |
| Optional `hintUsage` | VERIFIED_BY_REGRESSION | absence is a sanitized compatibility note; a present method is awaited and explicit rejection is propagated |
| Chrome Default authorization | OWNER_ACTION_REQUIRED | no sanitized diagnostic captured in this phase |
| Profile 2 authorization | OWNER_ACTION_REQUIRED | must run only after Default passes; distinct fingerprint still unverified |

The local node `1.0.0`, indexer `4.3.3`, and proof server `8.1.0` were healthy during verification at ports 9944, 8088, and 6300. No wallet password, seed, signing dialog, or extension approval was automated.

## P1 — request integrity and duplicate-payment controls

Implemented `nightparcel.invoice.v2` with:

- network name and committed 32-byte network tag;
- invoice-book contract address and public merchant key;
- invoice commitment and exact custom shielded-token color;
- exact shielded recipient plus its committed coin and encryption keys;
- private opening fields, expiry, terms digest, private memo, and 32-byte invoice salt;
- a fixed terms-encoding identifier.

The contract exports a side-effect-free `computeInvoiceCommitment` circuit. The payer uses the generated Compact implementation to recompute the same commitment locally, then queries the connected indexer and decodes the actual NightParcel ledger. Authorization fails for legacy v1 files, forged commitments, wrong network, merchant, token, recipient or amount, unknown commitments, cancelled invoices, acknowledged invoices, expired invoices, or insufficient exact-token balance.

The request contains the opening and salt and is therefore **confidential, not secret from the payer**. It must be shared privately and never placed in a URL. It does not reveal the merchant authorization secret.

Submission now uses an account/invoice-scoped persisted intent and the Web Locks API:

- duplicate clicks and cross-tab concurrent authorization are blocked;
- `AUTHORIZING` recovered after reload becomes `REVIEW_REQUIRED`;
- a transaction identifier followed by an uncertain submit result becomes `REVIEW_REQUIRED`;
- `SUBMITTED` and review-required intents cannot be automatically retried;
- NightParcel never rebroadcasts an ambiguous transaction.

## P2 — browser Compact implementation

Implemented but not yet runtime-verified with real Lace:

- wallet-backed Midnight providers using `balanceUnsealedTransaction` and `submitTransaction`;
- local indexer, proof-server, and lazily fetched proving-key providers;
- invoice-book deploy and open operations;
- genuine `createInvoice` invocation through the compiled NightParcel contract;
- indexer membership confirmation before a v2 request is produced;
- WebCrypto/IndexedDB private state scoped by the connected account key;
- a wrong-passphrase canary;
- encrypted private-state and contract signing-key export/import.

The merchant secret, private openings, salts, and memos are stored in application private state. The shielded account key scopes the database but is not used as the encryption password. Loss of the passphrase and all exports remains unrecoverable; a Lace seed alone does not restore NightParcel application state.

The runtime still needs tests for deployment, proof generation, indexer acceptance, reload, account switching, wrong passphrase, export/import restoration, and site-data loss. `acknowledgeReceipt` is not exposed in the browser because the six settlement checks are not yet implemented there.

## P3 — payment and reconciliation

| Requirement | Result |
|---|---|
| Alice browser authorization | NOT RUN — owner action required |
| Real browser `makeTransfer` | NOT RUN |
| Proof and submission | NOT RUN |
| Indexer acceptance | NOT RUN |
| Independent Bob history/balance | NOT RUN |
| Matching browser invoice/receipt commitments | NOT RUN |
| Six-check `PAID_VERIFIED` | NOT RUN; impossible to claim from current evidence |

Browser submission remains `SUBMITTED · UNRESOLVED`. Interrupted or ambiguous work becomes `REVIEW_REQUIRED`. There is no automatic acknowledgement or verified-settlement promotion.

## P4 — usable product behavior

- Merchant drafts remain explicitly `DRAFT_UNCOMMITTED` and nonpayable.
- A committed v2 request is generated only after the browser contract path reports indexer membership.
- Payers see the amount, memo, recipient, merchant key, token, network, commitment, and expiry.
- Live contract verification and trusted-channel confirmation are separate mandatory gates.
- Recorded Node-wallet evidence remains visually and semantically separate from live browser state.
- Technical wallet diagnostics remain under Settings.

## P5 — visual identity

The requested paper/ink/copper identity redesign is deferred. P0–P3 remain owner-blocked and functional correctness was deliberately prioritized. Existing accessible Phase 1D styling was preserved, with only the minimum new form, confirmation, recovery, and state controls added.

Disconnected screenshots (not transaction evidence):

- `evidence/phase2a-landing-1440.png`
- `evidence/phase2a-landing-1024.png`
- `evidence/phase2a-landing-768.png`
- `evidence/phase2a-landing-390.png`
- `evidence/phase2a-workspace-1440.png`
- `evidence/phase2a-request-390.png`

## Verification results

All release commands below were rerun with the explicit Node `22.23.3` binary path and Yarn `4.18.0`:

| Command | Result |
|---|---|
| `yarn install --immutable` | PASS |
| `compact compile contract/nightparcel.compact contract/managed/nightparcel` | PASS, 3 state-changing circuits plus pure helper generated |
| `compact compile contract/demo-token.compact contract/managed/demo-token` | PASS, 1 circuit |
| `yarn test:sim` | PASS, 19/19 |
| `yarn test` | PASS, 30/30 |
| `yarn typecheck` | PASS |
| `yarn lint` | PASS |
| `yarn build` | PASS |
| `yarn test:e2e` | PASS, 33/33 in installed Chrome |
| `yarn test:local` | NOT RERUN; disposable seed environment was absent, historical redacted Phase 1B evidence retained |
| `yarn npm audit --all --recursive` | PASS_WITH_TRANSITIVE_LIMITATIONS; React Router high advisories removed by pinning `react-router-dom` 7.18.2; remaining findings are four moderate deprecation notices and one low transitive `elliptic` advisory |

Production output keeps the public site and documentation separate from the wallet/ledger path. The workspace entry is about 158 KB minified; the Midnight ledger WASM remains about 10.2 MB. The installed indexer provider emits an `isomorphic-ws` browser export warning during bundling; NightParcel supplies `window.WebSocket` explicitly, but real-browser runtime validation is still required.

## Security and privacy findings

- A valid request proves internal linkage to the queried deployment, not the civil identity of its sender. Trusted-channel confirmation is mandatory.
- The v2 request deliberately discloses invoice terms, opening, salt, exact recipient, token color, contract, merchant key, and commitment to the payer. Treat the file as confidential.
- Contract commitments, timing, fees, transaction metadata, nullifiers/events, and opaque raw network bytes remain observable or correlatable.
- Browser storage encryption does not protect an unlocked session from a compromised origin, malicious extension, XSS, or endpoint substitution. Strict local endpoints are checked before transfer readiness.
- Native NIGHT remains unshielded and unsupported as a confidential NightParcel payment asset.
- The application contract never custodies payment assets and cannot independently know whether a transfer settled.

## Exact owner-controlled next action

1. Start NightParcel under Node 22 at `http://127.0.0.1:5173/app/settings`.
2. In Chrome Default, unlock disposable Lace, approve NightParcel, and capture only the sanitized diagnostic. Do not sign a transaction.
3. Confirm `undeployed`, API v4 endpoints, local prover, nonzero DUST, required methods, shielded assets, and the account fingerprint.
4. Repeat in Profile 2 and confirm its fingerprint differs while network/endpoints match.
5. Confirm which profile is merchant, which is payer, the exact test-token color/funding, and the merchant recipient out of band.
6. Only then run deploy/create, recovery tests, payer verification, and one owner-approved transfer. Do not acknowledge or mark paid until all six independent settlement checks agree.

## Release recommendation

**NOT READY FOR FUNCTIONAL RELEASE.** The request-integrity and duplicate-submission gates are materially stronger and the browser contract path now compiles and builds, but the defining browser Request → Pay → Verify lifecycle is still unverified. The next checkpoint requires owner-controlled Lace authorization in both disposable profiles. Phase 2A must not be represented as a completed browser payment product until that evidence exists.
