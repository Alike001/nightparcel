# NightParcel Phase 1C technical report

Date: 2026-10-16  
Verdict: **BLOCKED** (interim, pending owner-controlled Lace authorization)  
Wave 2 submission readiness: **NOT YET READY**

## Executive result

NightParcel now has an evidence-safe browser readiness gate for the official Lace connector path and prepared Wave 2 release documentation. Lace 2.4.2 is installed in two independent Chrome profiles, the local network is healthy, and the web application is running for the authorization test. However, extension unlock, connection approval, account initialization, and any payment authorization require the owner. No Phase 1C browser transfer, browser invoice lifecycle, or browser `PAID_VERIFIED` result is claimed.

The accepted Phase 1B Node-wallet baseline remains unchanged: a real 125-unit custom shielded-token transfer reconciled payer `300 → 175`, recipient `0 → 125`, indexer `SUCCESS`, both wallet histories, matching commitments, and duplicate-acknowledgement rejection.

## 1. Browser compatibility and connection

### Implemented and locally verified

- Confirmed the official Lace extension ID and found Lace 2.4.2 installed in Chrome Default and Profile 2.
- Enumerates generated providers under `window.midnight` without trusting an extension key or display name.
- Accepts semantic Connector API 4.x and rejects other majors before requesting access. NightParcel is compiled against Connector API 4.0.1.
- After authorization, checks connection status, wallet configuration, expected `undeployed` network, shielded address presence, shielded and unshielded balance calls, DUST, `makeTransfer`, `submitTransaction`, `getTxHistory`, `getProvingProvider`, and Lace's local prover URI on port 6300.
- Sets the Midnight.js network identifier from the verified connected network.
- Produces a sanitized diagnostic containing a truncated address preview and an eight-byte SHA-256 account fingerprint. It excludes complete addresses, keys, seeds, private state, transaction bytes, and invoice openings.
- A readiness failure clears the connected API from application state, so the payment control cannot be enabled by a partially compatible connector.

### Awaiting owner action

- Unlock/initialize Lace in Chrome Default, approve only the NightParcel connection, and record the sanitized result.
- Repeat in Profile 2 and verify a different account fingerprint on the same local network.
- Establish whether both accounts have DUST, the test token, and working local proving.

Connection approval and wallet passwords cannot be automated or bypassed. Therefore connector injection alone is not reported as compatibility.

## 2. Actual browser transfer and indexer evidence

**Status: BLOCKED — not attempted.**

No browser transaction ID, indexed hash, block, browser-wallet history entry, proof event, or balance delta exists for Phase 1C. `submitTransaction` returns no acceptance receipt under Connector API 4.0.1; even a successful return would produce only `SUBMITTED`. NightParcel requires subsequent wallet history/network acceptance and independent recipient reconciliation.

Required evidence remains:

1. payer wallet accepted/relevant history;
2. indexer accepted transaction and block;
3. independently synchronized recipient wallet/history;
4. exact payer balance delta;
5. exact recipient balance delta;
6. matching merchant receipt commitment.

Concurrent same-token activity, missing recipient history, or inconsistent identifiers must remain `UNRESOLVED`; it cannot be guessed into an invoice attribution.

## 3. Browser invoice lifecycle

**Status: BLOCKED.**

The browser UI can validate and prepare an exact direct shielded-token output, but browser contract creation/acknowledgement and persistent private state remain gated. The following browser cases have not been executed: complete create/pay/reconcile/acknowledge flow, duplicate acknowledgement, unauthorized wallet, wrong invoice, wrong amount, stale transaction, and ambiguous concurrent payment.

NightParcel does not assign `PAID_VERIFIED` to the current browser session. Its evidence screen displays the accepted Phase 1B run as an immutable snapshot and labels any current submission separately.

## 4. Account-scoped private state and recovery

Installed Midnight.js 4.1.1 private-state code and official documentation establish that the browser Level provider:

- requires a non-empty `accountId` and hashes it for account-scoped storage;
- encrypts private state and signing keys under a password-strength policy;
- exports private state separately from signing keys;
- does not make wallet-seed recovery sufficient for NightParcel application state; and
- may lose unexported state permanently when browser storage is cleared.

The shielded account address can be the account-scoping identifier, but it must not be used as the encryption password. Runtime persistence, reload, wrong-password, cross-account isolation, export/import, signing-key recovery, and loss behavior have not been tested. No browser private-state implementation is represented as complete.

## 5. Feature status

| Feature | Status | Evidence or blocker |
|---|---|---|
| Original three-circuit Compact contract | VERIFIED | Phase 1B compile and simulator evidence |
| Node-wallet direct payment and six settlement checks | VERIFIED | redacted Phase 1B local evidence |
| Connector 4.x discovery/version gate | VERIFIED | unit test and production build |
| Sanitized wallet readiness diagnostic | IMPLEMENTED, RUNTIME PENDING | owner must approve both Lace profiles |
| Browser direct transfer | BLOCKED | no authorized/funded two-profile session |
| Browser recipient reconciliation | BLOCKED | browser transfer has not occurred |
| Browser contract lifecycle | BLOCKED | contract/private-state integration remains gated |
| Browser private-state persistence/recovery | BLOCKED | requires runtime implementation and destructive-loss fixture planning |
| Four product surfaces | VERIFIED WITH LIMITATIONS | build passes; browser lifecycle actions remain gated |
| Wave 2 repository/README/license/NOTICE/checklists | VERIFIED/PREPARED | public repository and required topic verified; deck, video, and submission remain owner actions |

## 6. Privacy findings and limitations

- The diagnostic intentionally avoids full addresses and secrets, but its account fingerprint is stable pseudonymous data and can link repeated checks.
- Endpoint configuration, balance category counts, and DUST are wallet-local observations. They are not sent to a NightParcel backend; console output occurs only in development mode.
- Browser storage encryption does not defend against XSS, a compromised origin/extension, an unlocked session, or password disclosure.
- The direct shielded custom-token flow protects payment details from straightforward public decoding observed in the baseline; it does not establish complete anonymity. Timing, fees, commitments, nullifiers/events, issuance metadata, and raw transaction structure remain public or correlatable.
- Native NIGHT remains unshielded and outside NightParcel's private-payment claim.
- Phase 1B's exact-byte scan is not a proof that alternative encodings or cryptanalytic recovery are absent. Full Zswap decoding remains open.

## 7. Verification results

The browser portion will be updated after the two-profile owner session. Current code-gate results after the browser diagnostic change, all under Node 22.23.3, Yarn 4.18.0, Compact compiler 0.31.1, and language 0.23.0:

- full proving-key contract compilation: pass (three NightParcel circuits plus one test-token circuit, 1m40.49s);
- immutable dependency installation: pass under Yarn 4.18.0;
- simulator suite: pass, 18/18;
- supporting suite: pass, 12/12 (seven simulator/privacy helpers and five connector tests);
- typecheck: pass;
- lint: pass;
- Vite 6.4.3 production build: pass (1,784 modules; 993.56 kB JavaScript; 10,234.40 kB ledger WASM; advisory large-chunk warning);
- local node, indexer, and proof server: healthy;
- frontend HTTP check: pass;
- official examples and docs repositories: clean;
- browser runtime: blocked pending owner action;
- browser transaction/indexer evidence: absent;
- browser invoice lifecycle: absent.

Exact release-gate output is summarized in `evidence/phase1c-release-gates.log`.

No upstream reference repository was modified. No sNIGHT, custodial vault, mainnet action, real funds, fake transaction, fake receipt, or invented browser evidence was introduced.

## 8. Wave 2 submission checklist

Prepared: Apache-2.0 license, third-party notice, pinned dependency files, technical README, reproducible test commands, redacted evidence, progress-description draft, demo plan, and pitch-deck outline.

Published and verified: https://github.com/Alike001/nightparcel is public on branch `main`, with topic `midnightntwrk`; initial release commit `d5c80e7` passed the staged secret/path audit.

Missing/owner-controlled: final deck/link, authentic demo/video link, authenticated AKINDO submission fields, and confirmed live deadline. The public Buildathon schedule says October 17, while the rendered AKINDO page on October 16 corresponded to October 19 at 15:00 UTC. Submit against the earlier date unless the authenticated platform confirms otherwise.

See `docs/WAVE_2_SUBMISSION_CHECKLIST.md` for the itemized list.

## 9. Next owner actions

1. In the already opened `http://127.0.0.1:5173/`, unlock/initialize Lace in Chrome Default, click **Connect on undeployed**, and approve only NightParcel.
2. Return the exact on-screen message or the copied sanitized diagnostic; do not send a seed, password, full address, or private key.
3. If it passes, repeat in Profile 2. The two fingerprints must differ while network/endpoints agree.
4. Confirm the authenticated AKINDO deadline.
5. Record the honest demo, finish the deck, enter https://github.com/Alike001/nightparcel in AKINDO, and submit.

## Verdict

**BLOCKED** is the honest interim Phase 1C verdict because the mandatory browser runtime, browser transfer evidence, and complete browser invoice lifecycle have not executed. The blocker is owner-controlled extension/account authorization, not a claimed connector success. If both profiles pass readiness and a genuine transfer/lifecycle produces all six settlement checks, the verdict can advance. If Lace cannot support the pinned local stack, the appropriate release verdict is `SUBMIT_WITH_LIMITATIONS`, with the verified Node flow clearly distinguished from the blocked browser path.

## Sources

- Connector API: https://docs.midnight.network/api-reference/dapp-connector
- Lace extension: https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk
- Buildathon schedule: https://midnight.network/hackathon/buildathon
- Live Wave 2 page: https://app.akindo.io/wave-hacks/jaMZjqPOBsLXvjdG
