# NightParcel privacy boundary

Date: 2026-10-16  
Status: Phase 1B contract, simulator, and Node-wallet local run measured; Phase 1C adds a sanitized Lace readiness diagnostic, while two-profile storage and settlement remain unverified.

## Privacy claim

NightParcel aims to keep invoice contents and direct custom-token transfer details out of its own public contract state. It does not claim complete transaction anonymity. Network timing, transaction metadata, commitments/nullifiers, contract entrypoints, fees, and raw payloads remain observable; Phase 0 did not fully decode the raw Zswap payloads.

Native NIGHT remains unshielded and is not a NightParcel payment asset in Phase 1.

## Phase 0 empirical baseline

The independent-wallet run used distinct Alice and Bob seeds with the official pinned stack.

- Transfer ID: `00f5a0121b8894f9d771e10b88125095c4a5afb434d73d294090454fb240724ac9`
- Indexed hash: `e5cacc1f27214e59482344638fdf382bb2daa3ae9b98d327f0a78819771176ef`
- Status/block: `SUCCESS`, height 46
- Wallet balances: Alice `300 -> 175`; Bob `0 -> 125`
- Public transfer shape: two commitment positions, three Zswap events, no contract action, and no unshielded UTXOs
- Raw exposure: 37,054 hex characters of transaction data plus raw Zswap events

This proves transfer execution and wallet reconciliation. It does not prove that sender, recipient, token, or amount cannot be recovered from raw encodings or auxiliary observations.

## Phase 1 data classification

| Data | Intended location | Public observer | Payer | Merchant | Status/basis |
|---|---|---|---|---|---|
| Invoice-book contract address | ledger/request | visible | visible | visible | specified; normal contract metadata |
| Merchant authorization secret | merchant private state/witness | not found in decoded state or scanned raw contract transactions | never | visible locally | implemented in Node/simulator; encrypted browser persistence not implemented |
| Merchant key commitment | sealed ledger | visible | visible | visible | implemented; secret-bound but not contract-bound, so fresh secret per deployment is mandatory |
| Network tag | sealed ledger | visible | visible | visible | specified accepted leak |
| Supported test-token color | sealed ledger/request | visible | visible | visible | specified accepted leak |
| Random invoice ID opening | encrypted merchant state/request | hidden | disclosed by merchant | visible | specified |
| Invoice amount | encrypted state/request and wallet transfer | absent from NightParcel ledger | disclosed by merchant | visible | transfer raw encoding still unresolved |
| Merchant shielded address/keys | request and wallets | absent from NightParcel ledger | disclosed by merchant | visible | transaction-level privacy not fully proven |
| Human invoice memo/terms | local request only | hidden | disclosed by merchant | visible | only `termsDigest` enters the private opening |
| Invoice expiry | local request/opening | hidden from NightParcel ledger | disclosed by merchant | visible | frontend enforcement in MVP |
| Invoice salt | encrypted state/request | hidden | disclosed by merchant | visible | required to recompute commitment |
| Invoice commitment | `invoices` public set | visible | visible | visible | specified accepted leak |
| Invoice creation/cancellation timing | indexer | visible | visible | visible | unavoidable contract metadata |
| Cancellation state | `cancelled` public set | visible | visible | visible | specified accepted leak |
| Wallet transaction identifier and indexer hash | wallet/indexer/evidence opening | publicly queryable when known; not stored directly by invoice contract | visible | visible | Phase 0 observed a 33-byte SDK identifier and distinct 32-byte indexed hash |
| Block/hash/time/fee/status | indexer | visible | visible | visible | Phase 0 observed |
| Commitments/nullifiers/Zswap range/events | ledger/indexer | visible | visible | visible | Phase 0 observed/source-verified |
| Decoded transfer sender/recipient | wallet-local | not exposed by queried GraphQL fields | own side visible | own side visible | raw payload and correlation remain unresolved |
| Decoded transfer amount | wallet-local | not exposed by queried GraphQL fields | visible | visible | raw payload and correlation remain unresolved |
| Receipt evidence opening | Node test private state/evidence bundle | exact values absent from decoded state and scanned raw calls | visible if shared | visible | locally verified; browser persistence/export unimplemented |
| Receipt salt | private state/evidence bundle | not found in decoded state or scanned raw calls | disclosed if shared | visible | locally verified; browser persistence unimplemented |
| Receipt commitment | `receipts` public map | visible | visible | visible | implemented accepted leak |
| Acknowledgement timing/entrypoint | indexer | visible | visible | visible | specified accepted leak |
| `PAID_VERIFIED` status | recomputed application view | not a ledger field | visible after checks | visible after checks | must never be inferred from contract alone |
| Wallet seed/spending keys | wallet only | never | wallet only | wallet only | NightParcel prohibition |
| DUST balance and fee-payer link | wallet/indexer | fee metadata public; linkage unresolved | own side visible | own side visible | no anonymity claim |

## Contract public state: exact target

The original contract may publish only:

- sealed merchant-key commitment;
- sealed network tag;
- sealed custom test-token color;
- invoice commitments;
- cancelled invoice commitments;
- invoice commitment → receipt commitment mappings.

It must not publish a `paid` boolean, amount, recipient, memo, wallet identifier/digest, indexed transaction hash, block hash, invoice salt, receipt salt, authorization secret, or full invoice/receipt opening.

## Who owns and shares private information

### Merchant

The merchant owns the authorization secret, invoice openings, human terms, salts, and receipt openings. These remain in encrypted local private state. The merchant intentionally shares the invoice request opening and salt with one client through an external channel. The authorization secret is never shared.

### Payer

The payer owns their wallet keys and the finalized transfer authorization. NightParcel receives only connector-provided addresses, balances, serialized transaction material needed for submission, and wallet history. The payer stores the imported request and transaction evidence locally and may return an evidence bundle to the merchant.

### Intended verifier

A party receiving an evidence bundle learns the invoice fields and payment identifiers the merchant chose to disclose. Selective disclosure is therefore audience-limited operationally, not magically revocable. Sharing the bundle can reveal amount and recipient to that verifier.

## Payment confidentiality versus anonymity

The target is confidential application data, not universal unlinkability:

- the invoice contract does not contain plaintext amount, recipient, or memo;
- the queried Phase 0 indexer fields did not decode direct-transfer amount or wallet identities;
- both wallets necessarily know their counterpart and amount;
- the token issuer may recognize freshly minted coins unless users re-nonce through wallet activity;
- timing, transaction graph, fee activity, wallet online behavior, repeated amounts, and deliberately shared evidence may correlate participants;
- raw transaction/event decoding and fee linkage remain open research items.

Permitted wording: “Invoice details are committed rather than published in NightParcel contract state; the payment uses a shielded custom token.”

Prohibited wording: “anonymous,” “untraceable,” “fully private,” “hidden from everyone,” or “shielded NIGHT.”

## Accepted leaks

- invoice-book address and all contract-call transaction metadata;
- one merchant key commitment per invoice-book deployment;
- network tag and supported test-token color;
- invoice commitment values, count, and creation timing;
- cancellation and acknowledgement states/timing;
- receipt commitments;
- payment transaction/block identifiers when a party shares them or an observer correlates them;
- Zswap commitments, nullifiers/events, raw bytes, fees, and proof presence;
- custom-token issuance metadata, including public mint amount where applicable;
- all facts intentionally opened in an evidence bundle to its recipient.

## Prohibited leaks

- merchant authorization secret;
- invoice or receipt salts;
- plaintext invoice ID, memo, business terms, amount, expiry, or recipient in contract state;
- payer or merchant wallet secret/spending key;
- raw coin nonce or complete coin description in NightParcel contract state;
- private-state passphrase;
- secrets, openings, or wallet keys in logs, analytics, URLs, screenshots, crash reports, or source control.

## Required privacy tests

1. Enumerate every byte string and integer in decoded public contract state.
2. Assert that authorization secret, invoice ID, terms, salts, amount encodings, recipient keys, wallet identifier/digest, indexed transaction hash, block hash, and receipt opening are absent.
3. Include positive controls for public network tag, token color, invoice commitment, and receipt commitment so the scanner proves it can find known values.
4. Scan serialized contract-call transactions, direct-transfer transaction bytes, indexer GraphQL responses, console output, saved evidence, and browser storage.
5. Test common amount encodings: big-endian, little-endian, fixed 16-byte, fixed 32-byte, decimal UTF-8, and hexadecimal UTF-8.
6. Recompute invoice and receipt commitments from disclosed openings and reject one-bit mutations.
7. Reuse a salt deliberately in a negative fixture and confirm deterministic linkability is detectable.
8. Compare payment and acknowledgement timestamps and document the correlation window.
9. Run two merchants/invoice books with the same test secret and verify contract-address domain separation prevents equal public keys.
10. Clear browser private state and demonstrate the documented loss behavior; do not imply wallet-seed recovery restores NightParcel state.

## Residual limitations

- The receipt commitment authenticates the merchant's evidence claim; the contract does not query the indexer or recipient wallet.
- A malicious merchant can acknowledge fabricated internally consistent evidence. NightParcel's verifier must fail it when network or wallet checks are absent.
- Connector history exposes transaction relevance/status, not a decoded received amount. The Wave 2 balance-delta check assumes no concurrent same-token activity during the controlled demonstration.
- Public timing can strongly correlate an invoice creation, payment, and acknowledgement even when contents remain committed.
- Browser storage encryption protects data at rest, not against a compromised origin, malicious extension, active XSS, or an unlocked session.
- Full raw Zswap decoding and public-testnet observation remain future work.
- The raw-byte audit searches exact canonical sensitive byte strings and has a working public invoice-commitment positive control. It does not prove that alternate encodings or cryptanalytic recovery are impossible.
- Lace 2.4.2 is installed in two Chrome profiles. NightParcel now verifies the injected Connector API major version, wallet-reported network/endpoints, DUST, required methods, local prover configuration, and distinct account fingerprints without logging full addresses. Authorization and the two-profile runtime privacy/settlement test still require owner interaction and are not yet verified.

## Phase 1C browser diagnostic boundary

The development diagnostic may expose only wallet name/RDNS/API version, endpoint configuration, connection/network status, token-type counts, DUST amounts, boolean capabilities, a truncated shielded-address preview, and the first eight bytes of a one-way SHA-256 account fingerprint. It must not print the full shielded address, serialized transactions, transaction history payloads, invoice openings, private-state values, passwords, seeds, or keys. The fingerprint is pseudonymous and can still link repeated diagnostics for the same account; it must not be treated as anonymous data.

The wallet's shielded address may scope encrypted application private state but must never serve as its encryption password. NightParcel private-state exports and signing-key exports are separate recovery artifacts. Clearing browser storage can permanently lose unexported application state even when the wallet seed survives.

## Phase 1D request-file and interface boundary

- The request form keeps values in browser component state and downloads a local `nightparcel.invoice.draft.v1` JSON file. It does not put invoice fields, commitments, addresses, or descriptions in the URL.
- The draft is not encrypted. Anyone receiving or reading the file learns its contents, so users must share it through an intended private channel.
- The draft is marked `DRAFT_UNCOMMITTED` and is rejected by the payment authorization path. This prevents an attractive UI artifact from being mistaken for on-chain invoice evidence.
- Raw JSON is available only under an advanced disclosure. Normal product surfaces display readable terms and truncated/sanitized technical values.
- Recorded Phase 1B evidence is rendered from a checked-in redacted artifact and is visually separated from live browser-session activity. It must never be relabelled as the connected user's transaction.
- Screenshots are captured only in a disconnected state. They contain no full wallet address, seed, key, password, private opening, or fabricated live balance.

## Phase 1B empirical evidence

- Invoice contract: `1474cd09114f90683f028bc91354026dd4bd038879428b38880dfb95d3e70324`
- Transfer identifier: `009edba2ce40d79270a8bec5a892b330db25e72917aa3e7f2634c0e992ab406586`
- Indexed hash/block: `640a9f1366e585ed53b6e64efd326beef592498c53e11b59756628d9c3fe4a32`, block 37
- Balance reconciliation: payer `300 -> 175`; merchant `0 -> 125`
- Direct transfer public shape: 37,054 raw hex characters, four identifiers, Zswap range `[29,31)`, three opaque events, zero contract actions, zero unshielded outputs/spends
- Exact-byte scan: no merchant secret, invoice ID, recipient keys, terms digest, invoice salt, wallet-ID digest, indexed hash, block hash, or receipt salt found in the create/receipt raw transactions
- Positive control: public invoice commitment was found in decoded public ledger state

## Sources

- Empirical results: `docs/PHASE_0_REPORT.md`
- Contract specification: `docs/PHASE_1_SPEC.md`, `docs/CONTRACT_DESIGN.md`
- Official privacy patterns: `upstream-midnight-examples/docs/compact-gotchas.md`
- Salted commitments: `examples/private-bid/contract/private-bid.compact`
- Positive-control state scans: `examples/private-tip-jar/src/test/private-tip-jar.sim.test.ts`
- Coin nonce/linkability analysis: `examples/shielded-chips/AGENTS.md` and `LESSONS.md`
- Private state: Context7 `/midnightntwrk/midnight-docs` private-state witness guide and installed official UI provider implementation
