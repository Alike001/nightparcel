# NightParcel Wave 2 MVP

Date: 2026-10-15  
Status: proposed minimum submission scope; implementation has not started.

## Time constraint

The [official public schedule](https://midnight.network/hackathon/buildathon) lists Wave 2 build dates as September 27–October 17, 2026. As of this specification date, the build window is approximately two days. The exact closing time and timezone must be checked in the authenticated AKINDO dashboard before implementation priorities are changed.

The MVP therefore optimizes for one credible end-to-end claim:

> Two independently controlled wallets settle one confidential invoice in a custom shielded test token, while an original Compact contract protects the invoice opening and records a merchant-authenticated evidence commitment.

## Mandatory submission slice

### 1. Original Compact contract

`nightparcel-invoice` implements:

- sealed merchant authorization commitment;
- sealed network tag and supported custom test-token color;
- private invoice opening + salted public commitment;
- merchant-only create, cancel, and receipt-acknowledgement circuits;
- one-time state transitions and replay guards;
- no token custody and no `paid` ledger field.

Minimum proof: fast/full compile, generated proving artifacts, simulator tests for every guard, privacy scan with positive controls, and accepted local-devnet calls.

### 2. Real payment path

- one clearly labelled nonredeemable custom shielded test token;
- merchant and payer use independent wallets;
- payer sends directly to merchant via wallet transfer, not through the contract;
- exact transaction ID, proof evidence, indexer success, block reference, and both balance/history observations are recorded;
- receipt commitment binds the invoice commitment to the reconciled transaction evidence.

No simulated payment may appear in the submitted success path.

### 3. Meaningful private state

- merchant authorization secret;
- invoice openings and salts;
- receipt evidence and salts;
- encrypted persistent browser storage with passphrase and explicit loss warning;
- no seed phrase handling.

The witness must be necessary for contract authorization, not a decorative privacy feature.

### 4. Usable frontend

Keep the judged flow to four surfaces, implemented responsively:

| Surface | Essential behavior |
|---|---|
| Readiness | connect wallet; show network, DUST, proof and test-token readiness; unlock private state |
| Create/share | enter amount, expiry and memo; create on-chain invoice commitment; export/copy request JSON |
| Review/pay | import request; verify commitment and open state; show exact recipient/token/amount/privacy boundary; authorize once |
| Verify/evidence | timeline from submitted to recipient-observed and acknowledged; show transaction/block evidence and public/private fields; export evidence |

A separate marketing site, dashboard analytics, full activity explorer, theme system, and advanced settings are cut unless the mandatory flow is already green.

### 5. Evidence and communication

- README with architecture, setup, exact versions, commands, limitations, and no-recovery warning;
- architecture/privacy diagram;
- evidence manifest from a clean local run;
- Apache-2.0 license for original code and attribution for reused official Apache-licensed scaffolding;
- public repository and required `midnightntwrk` topic;
- concise slides and 2–3 minute demo showing a real transaction and one rejected attack;
- prominent distinction between `ACKNOWLEDGED` and `PAID_VERIFIED`.

## Scope priority

### P0 — submission blockers

1. Contract design card and compiler success.
2. Simulator guards and privacy invariants.
3. Real devnet contract calls.
4. Independent-wallet direct payment tied to one invoice.
5. Receiver evidence and receipt commitment.
6. Browser connector runtime path.
7. Clean build and reproducible report.

### P1 — essential UX polish

- clear readiness failures and transaction stepper;
- copy/import request and evidence JSON;
- accessible forms, address/hash handling, single-flight submit;
- privacy boundary panel and test-token warnings.

### P2 — only if every hard gate is green

- cancellation UI;
- compact local activity list;
- evidence download checksum;
- short guided demo mode that still uses real services.

## Explicit cuts

- contract-held vault or escrow;
- `mt_index`-dependent NightParcel logic;
- partial payments, overpayments, refunds, disputes, recurring billing, teams, multiple merchants per contract;
- multiple assets or issuer administration UI;
- native NIGHT payments, sNIGHT, wrapping, stablecoins, redemption, swaps, or bridges;
- Preprod/mainnet unless local completion leaves time and a separate approval is given;
- public sharing backend, notifications, email, accounts, databases, analytics;
- AI, mobile app, browser extension, compliance/auditor portal, selective-disclosure ZK proof beyond the receipt commitment;
- claims of anonymity, stable value, production security, or audited code.

## Demo script

1. Show the connected merchant wallet, local network, custom test token, proof readiness, and privacy warning.
2. Create a private invoice; show that only its commitment appears in decoded contract state.
3. Export the request and import it in a separate payer profile.
4. Recompute the commitment and review amount, asset, recipient, and network.
5. Submit one real shielded payment and show proving/submission status without early success.
6. Show the indexer transaction and payer wallet history.
7. Switch to the merchant profile; show the same hash and reconciled balance.
8. Acknowledge receipt; recompute the receipt commitment and reach `PAID_VERIFIED`.
9. Show a wrong-secret, duplicate acknowledgement, or modified-evidence rejection.
10. End on the public/private boundary and remaining raw-payload limitation.

## Minimum acceptance checklist

- [ ] Original Compact contract compiles with the pinned toolchain.
- [ ] Every contract guard has a negative simulator test.
- [ ] Public-state privacy scan has working positive controls.
- [ ] Contract create and acknowledge transactions are accepted locally.
- [ ] One direct two-wallet invoice payment has proof, transaction, block, history, and balance evidence.
- [ ] Browser connector transfer is runtime-tested; otherwise the frontend may not claim a working payment path.
- [ ] Reload does not resubmit or overwrite merchant private state.
- [ ] No success state is mocked or inferred from acknowledgement alone.
- [ ] No secrets appear in source, logs, evidence artifacts, or screenshots.
- [ ] Build, typecheck, tests, clean rerun, README, license, and evidence manifest pass.

## Fallback hierarchy

If time or an unverified API blocks the full slice:

1. Preserve the compiling original contract, complete simulator/privacy tests, and Node two-wallet devnet evidence.
2. Present browser payment as explicitly unavailable rather than simulated.
3. Submit a narrower technical proof with a documented blocker.
4. Never replace real settlement with a fake toast, hard-coded hash, or manually toggled paid state.

## Wave 3 continuation

After Wave 2, prioritize public-testnet repeatability, robust per-transaction recipient evidence under concurrent activity, encrypted state export/import, deeper raw-payload decoding, and selective evidence disclosure. Do not add custody or NIGHT wrapping until their separate security gates pass.
