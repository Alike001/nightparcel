# NightParcel Phase 1A product specification

Date: 2026-10-15  
Status: specification only; no NightParcel application or contract has been implemented.  
Phase 0 input: `PASS_WITH_LIMITATIONS`.

## Objective

Build the smallest original Midnight payment application in which a freelancer can create a confidential invoice, a client can pay the requested amount in one supported custom shielded test token directly to the freelancer's wallet, and both parties can reconcile the same real transaction without publishing the invoice contents.

NightParcel must distinguish three claims:

1. the network accepted a shielded transfer;
2. the freelancer's wallet observed the expected receipt;
3. the freelancer acknowledged evidence bound to the invoice commitment.

Only the conjunction of those claims may be presented as `PAID_VERIFIED`. The Compact contract by itself must never expose a field named or described as “paid.”

## Architecture decision

Choose **Architecture A: direct self-custodial wallet-to-wallet payment plus an original confidential invoice registry contract**.

The contract commits to invoice terms and later stores a merchant-authorized commitment to settlement evidence. The custom shielded token never enters contract custody. Payment uses the same wallet/protocol transfer path proven in Phase 0.

### Evidence extracted from official examples

| Example | Verified design lesson used by NightParcel |
|---|---|
| `token-transfers` | Wallet/protocol token effects can operate without contract ledger fields; shielded receive/send APIs have fresh-versus-committed coin constraints |
| `private-bid` | Private arguments plus a witness secret can produce a salted `persistentCommit`; contract-address domain separation prevents cross-deployment identifiers |
| `private-tip-jar` | Witness-secret authorization works, but storing spendable contract coins makes amount and timing public; its positive-control privacy tests are the model |
| `shielded-chips` | Commitment-only custody avoids publishing coin nonces, but requires durable private coin state and post-transaction `mt_index` recovery; payout delivery is caller-oriented |

These examples support the commitment and authorization components separately. They do not provide a contract primitive that validates a shielded output delivered directly to an unrelated wallet, which is why NightParcel treats settlement as composite wallet/indexer/receipt evidence rather than an on-chain payment flag.

### Comparison

| Dimension | A — direct payment + invoice commitments | B — contract-held shielded vault |
|---|---|---|
| Self-custody | Payment moves payer wallet → merchant wallet | Contract controls funds between deposit and claim |
| Proven primitive | Independent-wallet transfer passed Phase 0 | Source examples demonstrate custody, but NightParcel has not run the full qualified-coin lifecycle |
| Amount privacy | Transfer amount was not exposed as a decoded indexer field; raw audit remains incomplete | Publishing a spendable coin in contract state exposes its value; commitment-only custody shifts coin recovery to private state |
| Recipient delivery | Native wallet transfer creates wallet-discoverable ciphertext | Contract sends reliably to the current caller; arbitrary-recipient delivery is constrained |
| `mt_index` | No NightParcel contract dependency | Required for a committed contract-held coin and must be recovered correctly |
| Recovery | Wallet handles payment coins; NightParcel must preserve invoice openings | Loss of contract coin opening/index can strand escrowed funds |
| Security burden | Commitments, authorization, evidence reconciliation | Adds custody, withdrawal, denomination/change, liveness, and loss invariants |
| Wave 2 fit | Credible if kept to a controlled two-wallet demonstration | Too much unverified state and recovery behavior for the remaining Wave 2 window |

Architecture B is rejected for Wave 2. It may be reconsidered only after dedicated contract-custody, `mt_index`, recovery, and privacy tests. NIGHT and any NIGHT-backed wrapper remain excluded.

### zk-freighter inspiration boundary

NightParcel reuses only product concepts: self-custody, explicit receive information, a pre-sign review, staged proving/submission/confirmation states, user-held evidence, and an honest public/private disclosure panel. It does not copy zk-freighter source, UI assets, branding, Circom/Noir circuits, Soroban contracts, Stellar note formats, CCTP integration, or cryptographic assumptions. Midnight's Compact, wallet connector, local private state, Zswap transfer, and indexer form an original implementation boundary.

## Users and trust roles

| Role | Responsibility | Trust boundary |
|---|---|---|
| Freelancer / merchant | Deploys or owns an invoice book, creates requests, receives payment, confirms receipt | Controls their wallet and encrypted NightParcel private state |
| Client / payer | Imports a request, reviews exact terms, authorizes one direct shielded transfer | Controls their wallet; NightParcel never receives wallet secrets |
| Midnight wallet | Holds keys, builds/balances the transfer, proves or delegates proving, submits, reports wallet-relevant history | Must match the requested network and supported connector API |
| Midnight indexer/node | Supplies transaction inclusion/status, block metadata, contract state, and public Zswap data | Public evidence source; does not reveal private invoice terms |
| NightParcel contract | Commits invoice data, enforces merchant authorization and one-time state transitions | Does not inspect or custody the wallet-to-wallet payment |
| NightParcel frontend | Coordinates request exchange, transfer, reconciliation, and evidence display | Must not claim settlement from local intent or contract acknowledgement alone |

## Canonical invoice request

An invoice request is a versioned, canonical data object shared directly by the freelancer with the intended client. It contains:

- schema version;
- expected Midnight network tag;
- invoice-book contract address;
- random 32-byte invoice ID;
- supported custom shielded token color and human-readable test-token label;
- unsigned amount within the Compact and wallet-supported range;
- freelancer's full shielded address, including coin and encryption public keys;
- expiry time;
- terms digest and optional human-readable description;
- random 32-byte invoice salt;
- resulting on-chain invoice commitment.

The salt and plaintext terms are shared only with the intended client. The merchant authorization secret is never included. The package is exchanged as copied/downloaded JSON in Wave 2; NightParcel operates no sharing server.

Canonicalization is a protocol requirement. The same request must produce the same commitment in the contract helper, Node harness, and browser. The final encoding and Compact type layout must be compile-verified in Phase 1B before the schema is frozen.

## Product state model

| State | Authority | Meaning |
|---|---|---|
| `DRAFT` | local merchant state | Request exists only on the merchant device |
| `OPEN` | invoice contract | Commitment exists and is neither cancelled nor acknowledged |
| `CANCELLED` | invoice contract | Merchant cancelled before acknowledgement |
| `SIGNING` / `PROVING` | payer wallet/frontend | Transfer is being prepared; no settlement claim |
| `SUBMITTED` | payer wallet | Transaction was submitted; not yet confirmed |
| `NETWORK_CONFIRMED` | indexer plus payer wallet history | Transaction is included/accepted; recipient outcome not yet reconciled |
| `RECEIVED` | merchant wallet | Same transaction is wallet-relevant and the expected token balance increase is observed |
| `ACKNOWLEDGED` | invoice contract | Merchant committed matching private settlement evidence; not independently a payment proof |
| `PAID_VERIFIED` | NightParcel verifier | `NETWORK_CONFIRMED`, `RECEIVED`, and a valid receipt commitment all refer to the same invoice and transaction |
| `FAILED` / `DISCARDED` | wallet/indexer | Transaction failed or expired; no receipt acknowledgement allowed by the UI |

No green success state may be derived from a button click, a locally built transaction, proof generation alone, submission alone, or `ACKNOWLEDGED` alone.

## Functional requirements

### Invoice creation

- **FR-01:** The merchant can create one invoice request for a positive amount of the single configured custom shielded test token.
- **FR-02:** Invoice amount, recipient keys, invoice ID, expiry, terms digest, and salt remain outside public ledger fields.
- **FR-03:** The original Compact contract computes and records a hiding invoice commitment from the private opening.
- **FR-04:** Only a proof of knowledge of the merchant authorization secret can create, cancel, or acknowledge an invoice in that merchant's invoice book.
- **FR-05:** Duplicate commitments are rejected.
- **FR-06:** An open invoice may be cancelled once; an acknowledged invoice may not be cancelled.

### Payment

- **FR-07:** The payer imports a request, recomputes its commitment, checks it exists and is open, and verifies network, token, recipient, amount, and expiry before wallet interaction.
- **FR-08:** Payment uses a wallet-created direct shielded output to the invoice's full shielded address; the invoice contract neither receives nor forwards the token.
- **FR-09:** Submission is single-flight. Reload/retry must first reconcile the previous transaction identifier and wallet history.
- **FR-10:** Insufficient balance, zero amount, invalid address, unsupported token, wrong network, expired/cancelled invoice, and rejected wallet authorization fail without displaying settlement success.

### Verification and evidence

- **FR-11:** NightParcel derives the transaction identifier from the finalized transfer, submits exactly that serialized transaction, and polls authoritative status.
- **FR-12:** Payer evidence includes the invoice commitment, exact wallet transaction identifier, its domain-separated digest, the mapped indexer transaction hash/result, block reference, requested token/amount/recipient, and payer wallet history status.
- **FR-13:** Merchant verification requires the same transaction ID to be relevant in the independently connected merchant wallet plus an expected token balance increase in the controlled Wave 2 flow.
- **FR-14:** The merchant may acknowledge only after the frontend has obtained `NETWORK_CONFIRMED` and `RECEIVED` evidence.
- **FR-15:** The acknowledgement circuit privately checks that settlement-evidence fields match the invoice opening and stores only a salted receipt commitment.
- **FR-16:** Either party can export an evidence bundle containing public identifiers and the invoice/receipt openings they intentionally choose to disclose to the other party.
- **FR-17:** A verifier recomputes both commitments and rechecks current indexer and contract state; it never trusts a cached status string.
- **FR-18:** The UI labels merchant acknowledgement as an attestation and explains that the contract cannot independently inspect a transfer to another wallet.

### Private state

- **FR-19:** Merchant authorization secret, invoice openings/salts, and receipt openings/salts are encrypted at rest in the browser's private-state store and scoped to wallet account and contract.
- **FR-20:** Payer-imported request data and local evidence are stored locally; wallet seeds, spending keys, and raw signing keys are never requested, logged, exported, or stored by NightParcel.
- **FR-21:** Loss of the browser private-state passphrase or site data is described as unrecoverable in the MVP unless an explicit encrypted export/import path has been tested.

### User experience

- **FR-22:** Persistent badges identify local network, test-only token, wallet status, DUST readiness, proof readiness, and privacy limitations.
- **FR-23:** The transfer review shows the canonical recipient, token, amount, network, invoice commitment, and public/private disclosure summary.
- **FR-24:** The evidence screen distinguishes public chain facts, wallet-local observations, disclosed invoice facts, and unresolved privacy claims.
- **FR-25:** No UI path exposes sNIGHT, native NIGHT payment, bridging, AI, mobile, or browser-extension features.

## Settlement evidence model

The binding is intentionally composite:

```text
invoice opening + invoice salt
             │
             └── Compact commitment ──> public OPEN invoice

same opening ──> wallet makeTransfer(token, amount, merchant shielded address)
                                  │
                                  └── finalized tx ID ──> indexer acceptance
                                                        └── merchant wallet receipt

invoice commitment + wallet ID digest + indexed hash + confirmed block + matching private terms
             │
             └── salted receipt commitment ──> public ACKNOWLEDGED record
```

The cryptographic linkage is the recomputable invoice commitment plus the receipt commitment that binds it to a digest of the exact 33-byte wallet identifier, the corresponding 32-byte indexed transaction hash, and the confirmation evidence. The real-payment claim additionally depends on live network and recipient-wallet checks. The contract cannot prove those checks by itself, so an acknowledgement without its matching evidence bundle is insufficient.

### Evidence bundle v1

The payer exports a canonical JSON bundle containing the request commitment, exact wallet identifier, identifier digest, indexed transaction hash, indexer status/block metadata, requested transfer fields, payer history observation, and timestamps. The merchant imports it, verifies the request opening, finds the same transaction in their wallet history, records before/after balance evidence, and adds the receipt commitment/opening after acknowledgement.

The bundle is not a bearer proof and is not safe to publish casually: its request opening reveals invoice amount and recipient to the recipient of the file. A verifier must reject altered fields, mismatched network/contract, non-success status, missing recipient evidence, or a receipt opening that does not recompute. JSON field order is irrelevant; commitment inputs use a separately specified canonical binary encoding.

## Security requirements

- **SR-01 Replay:** commitments include a domain/version, network tag, contract address, random invoice ID, and fresh salt. Receipt commitments include the invoice commitment, wallet-identifier digest, and indexed transaction hash.
- **SR-02 Duplicate acknowledgement:** one receipt commitment per invoice; a second call rejects.
- **SR-03 Duplicate payment:** the frontend uses a durable single-flight record and reconciles before retry. The protocol cannot prevent a payer deliberately authorizing two separate wallet transfers; both must remain visible in evidence.
- **SR-04 Unauthorized update:** every state-changing invoice circuit proves the merchant secret matches the sealed owner commitment.
- **SR-05 Cross-invoice substitution:** acknowledgement recomputes the invoice commitment and checks evidence token, amount, recipient, network, and invoice identifiers against that opening.
- **SR-06 Leakage:** privacy tests scan public ledger state, indexer records, logs, and raw transaction/event bytes for invoice plaintext, amount encodings, recipient keys, salts, authorization secret, and transaction ID where it is intended to remain committed.
- **SR-07 Guessing:** invoice and receipt commitments use independent high-entropy salts; a plain hash of a guessable amount or memo is prohibited.
- **SR-08 Key isolation:** merchant authorization secret is distinct from wallet keys, invoice salts, and receipt salts.
- **SR-09 Network binding:** the connected wallet network must match the request and deployment before any call or transfer.
- **SR-10 Evidence freshness:** status is re-read from wallet/indexer; cached `CONFIRMED` data cannot upgrade a different or replaced request.

## Non-goals

- Contract custody, escrow, arbitration, refunds, partial payment, recurring invoices, multi-token routing, conversion, or programmable shielded-token spend hooks.
- Native NIGHT confidentiality, sNIGHT, stablecoins, redemption, bridging, fiat, DEX, or mainnet.
- Complete sender anonymity, recipient anonymity, amount confidentiality guarantees, or fee-payer unlinkability.
- Publicly verifiable proof of private transfer amount without merchant participation.
- Seed generation/recovery, mobile applications, extensions, AI, compliance scoring, or auditor portals.
- A hosted service that receives private invoice openings or proof inputs.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-01 | Original `nightparcel-invoice` Compact source compiles with language 0.23/compiler 0.31.1 and passes spec lint. |
| AC-02 | Simulator tests execute every circuit, every assert has a rejecting test, and every specified secret has an `assertNotInPublicState` assertion with a positive control. |
| AC-03 | Full local devnet tests pass with Midnight.js 4.1.1, wallet SDK 1.2.0, node 1.0.0, indexer 4.3.3, and proof server 8.1.0. |
| AC-04 | Two independent wallets complete a direct custom shielded-token payment for an open invoice; exact before/after balances, transaction ID, proof completion, indexer status, block, and both wallet histories are captured. |
| AC-05 | The recipient acknowledges the exact transaction; the stored receipt commitment recomputes from the private evidence bundle. |
| AC-06 | A forged acknowledgement, wrong merchant secret, wrong opening, wrong transaction binding, duplicate creation, duplicate acknowledgement, cancel-after-acknowledge, and acknowledge-after-cancel all reject without state change. |
| AC-07 | Browser integration runtime-tests connector `makeTransfer`, `submitTransaction`, `getTxHistory`, balances, addresses, configuration, and transaction-ID derivation; source/type presence alone is insufficient. |
| AC-08 | A two-profile browser run completes create → share/import → pay → receive → acknowledge → verify with no seed entry and no mocked success state. |
| AC-09 | Public-state and raw-payload scans find no prohibited invoice opening or secret; any newly observed field is added to `PRIVACY_BOUNDARY.md` before release. |
| AC-10 | Production build, unit tests, typecheck, immutable install, and a clean rerun pass; an evidence manifest records commands, versions, hashes, and limitations. |

## Known blockers and risky assumptions

1. Phase 0 validated direct transfer with the Node wallet SDK, not browser connector `makeTransfer`; browser runtime compatibility is a Phase 1B hard gate.
2. Connector transaction history proves wallet relevance and status but does not expose decoded private amount/recipient. The controlled MVP therefore also reconciles a no-concurrency balance delta; this is not a general-purpose receipt oracle.
3. The final Compact struct/generic layout for invoice and receipt commitments must be compiler-verified. This specification defines semantics, not assumed syntax.
4. Raw Zswap payload decoding remains incomplete, so “amount confidential” is a tested hypothesis, not an unconditional anonymity claim.
5. Browser encrypted private-state recovery has not been demonstrated. Loss warnings and an explicit no-recovery boundary are mandatory.
6. The official public schedule gives Wave 2 build dates of September 27–October 17, 2026; the exact authenticated AKINDO deadline/timezone remains unverified.

## Source references

- `docs/PHASE_0_REPORT.md`, `docs/TECH_MATRIX.md`, `docs/PRIVACY_BOUNDARY.md`
- `upstream-midnight-examples/AGENTS.md`, `docs/compact-gotchas.md`, `docs/patterns.md`
- `upstream-midnight-examples/examples/private-bid/contract/private-bid.compact`
- `upstream-midnight-examples/examples/private-tip-jar/SPEC.md` and `contract/private-tip-jar.compact`
- `upstream-midnight-examples/examples/shielded-chips/contract/roulette.compact`
- `upstream-midnight-examples/examples/shielded-chips/ui/src/midnight/private-state.ts`
- `upstream-midnight-examples/node_modules/@midnight-ntwrk/dapp-connector-api/dist/api.d.ts` (installed 4.0.1 API)
- Context7 `/midnightntwrk/midnight-docs`: private-state witnesses, wallet transfer, deployment providers, and shielded-token documentation, checked 2026-10-15
- [Official Buildathon schedule](https://midnight.network/hackathon/buildathon), checked 2026-10-15
- `upstream-zk-freighter/` at `5ddf72483e1383defcbc0a17fd9dba58c5e0f0f4`, workflow inspiration only; no source, cryptography, brand, or assets copied
