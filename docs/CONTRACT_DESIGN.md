# NightParcel contract design

Date: 2026-10-15  
Status: Phase 1B contract implemented and locally verified; browser application flow remains incomplete.  
Selected architecture: self-custodial direct payment with a confidential invoice/receipt commitment registry.

## Contract purpose

`nightparcel-invoice` is a per-merchant invoice book. It has exactly three state-changing responsibilities:

1. register a hiding commitment to private invoice terms;
2. let the merchant cancel an open invoice;
3. let the merchant record a hiding commitment to evidence for one observed payment transaction.

It does not mint, receive, hold, forward, burn, refund, or inspect payment tokens. It does not mark invoices paid. Its receipt record is a merchant-authorized attestation whose payment meaning exists only when a verifier also checks the real wallet and network evidence.

## Why the payment stays outside the contract

Phase 0 proved direct wallet-to-wallet transfer. A vault would add contract custody and committed-coin `mt_index` recovery. The official examples show two uncomfortable choices for custody:

- store a complete contract-owned coin so it can later be spent, which makes its value and nonce public; or
- store only a commitment and depend on durable private delivery of the coin opening and correct Merkle index to the claimant.

Both add security and recovery work without improving the Wave 2 core claim. The direct architecture has no NightParcel `receiveShielded`, `sendShielded`, qualified coin, change coin, or `mt_index` path.

## Roles

| Role | Contract recognition | Contract permissions |
|---|---|---|
| Merchant | knowledge of a fresh 32-byte authorization secret whose domain-separated hash equals sealed `merchantKey` | create, cancel, acknowledge |
| Payer | not identified by the contract | none; pays directly through the wallet |
| Observer/verifier | public contract/indexer access | read commitments and derived state |

One merchant deploys one invoice book. All activity within that deployment is publicly linkable to the same book. A new deployment provides a new public boundary.

## Semantic types

These types are implemented and compiler-verified on Compact language 0.23/compiler 0.31.1.

### Invoice opening

| Field | Intended Compact shape | Rule |
|---|---|---|
| `invoiceId` | `Bytes<32>` | cryptographically random; unique per request |
| `amount` | `Uint<128>` | greater than zero; exact wallet transfer amount |
| `payeeCoinPublicKey` | `Bytes<32>` / verified Zswap key representation | decoded from the merchant's shielded address |
| `payeeEncryptionPublicKey` | `Bytes<32>` / verified encryption-key representation | binds wallet discoverability, not only ownership |
| `expiresAt` | `Uint<64>` | Unix time interpreted by the application; ledger-time enforcement is not assumed |
| `termsDigest` | `Bytes<32>` | digest of canonical private business terms |

The commitment domain also binds:

- `nightparcel:invoice:v1` domain separator;
- the contract address;
- sealed network tag;
- sealed supported token color.

### Settlement evidence opening

| Field | Intended Compact shape | Rule |
|---|---|---|
| `invoiceCommitment` | `Bytes<32>` | exact registered invoice key |
| `walletIdentifierDigest` | `Bytes<32>` | domain-separated digest of the exact wallet transaction identifier; Phase 0's identifier was 33 bytes |
| `indexedTransactionHash` | `Bytes<32>` | 32-byte transaction hash returned by the indexer for that identifier |
| `confirmationBlockHash` | `Bytes<32>` | block returned by the indexer for that transaction |
| `amount` | `Uint<128>` | must equal the invoice opening |
| `tokenColor` | `Bytes<32>` | must equal sealed supported color |
| `payeeCoinPublicKey` | `Bytes<32>` | must equal invoice opening |
| `payeeEncryptionPublicKey` | `Bytes<32>` | must equal invoice opening |
| `networkTag` | `Bytes<32>` | must equal sealed deployment network tag |

The contract checks equality between the two private openings before committing the receipt. It cannot check whether the wallet identifier/indexed hash exists, whether the indexer supplied the block, or whether the payee wallet received funds. Those are application verification duties.

## Public ledger schema

| Field | Logical type | Mutability | Purpose / accepted disclosure |
|---|---|---|---|
| `merchantKey` | sealed `Bytes<32>` | constructor only | domain-separated commitment to merchant authorization secret |
| `networkTag` | sealed `Bytes<32>` | constructor only | prevents cross-network evidence reuse |
| `tokenColor` | sealed `Bytes<32>` | constructor only | fixes the one supported custom shielded test token |
| `invoices` | `Set<Bytes<32>>` | append | invoice commitments; reveals count and creation timing |
| `cancelled` | `Set<Bytes<32>>` | append | cancelled invoice commitments; reveals cancellation timing |
| `receipts` | `Map<Bytes<32>, Bytes<32>>` | one insert per invoice | invoice commitment → salted settlement-evidence commitment |

Derived public state:

```text
UNKNOWN       = invoice ∉ invoices
OPEN          = invoice ∈ invoices and invoice ∉ cancelled and invoice ∉ receipts
CANCELLED     = invoice ∈ cancelled
ACKNOWLEDGED  = receipts.member(invoice)
```

`CANCELLED` and `ACKNOWLEDGED` must be mutually exclusive. There is deliberately no `PAID` ledger value.

## Private application state

### Merchant state

- merchant authorization secret, generated once per invoice-book deployment;
- invoice opening and independent high-entropy invoice salt for every local invoice;
- human-readable invoice terms corresponding to `termsDigest`;
- receipt evidence opening and independent receipt salt after reconciliation;
- local workflow state and exported-evidence history.

Storage target: Midnight.js persistent private-state provider in browser IndexedDB, AES-GCM through WebCrypto, account-scoped using the connected wallet's shielded coin public key, protected by a session-entered passphrase. The implementation must retain the provider's explicit no-recovery warning until export/import is tested.

### Payer state

- imported invoice request and opening;
- pre-submit transfer review;
- finalized transaction identifier and serialized-transaction digest;
- wallet history and indexer status snapshots;
- evidence bundle shared back with the merchant.

Payer data may live in encrypted application storage, but never includes wallet seed or spending keys.

## Witnesses

| Witness | Returns | Source | Use |
|---|---|---|---|
| `merchantSecret()` | `Bytes<32>` | merchant private state | prove authority for every state-changing circuit |

Invoice and settlement openings should be private circuit arguments unless compiler validation shows a witness-backed structure is necessary. Circuit arguments are private by default in the verified Compact model; the contract must disclose only commitments that reach ledger state.

The witness must be deterministic for a deployment and must not import `node:*`, because it also runs in the browser.

## Commitment construction

The design requires two salted `persistentCommit` operations and domain-separated persistent hashes. This follows the compiled `private-bid` pattern. Exact generic/type syntax is a Phase 1B compile gate.

### Merchant key

Implemented as:

```text
merchantKey = persistentHash("nightparcel:merchant:v1", merchantSecret)
```

The approved Phase 1A design intended to include the contract address. Runtime 4.1.1 does not expose a deployment address through `kernel.self()` during constructor execution, while normal circuit calls do. Binding the constructor-time key to `kernel.self()` therefore made every later authorization fail in the authoritative simulator. The implementation follows the verified `private-tip-jar` authorization pattern instead. A fresh merchant secret per deployment is mandatory; reusing one creates the same public `merchantKey` and links deployments. Invoice and receipt commitments remain contract-address bound.

### Invoice commitment

Conceptually:

```text
invoiceCommitment = Commit(
  "nightparcel:invoice:v1",
  contractAddress,
  networkTag,
  tokenColor,
  invoiceId,
  amount,
  payeeCoinPublicKey,
  payeeEncryptionPublicKey,
  expiresAt,
  termsDigest;
  invoiceSalt
)
```

The invoice salt must be random and unique. The commitment, not any opening field, enters `invoices`.

### Receipt commitment

Conceptually:

```text
receiptCommitment = Commit(
  "nightparcel:receipt:v1",
  contractAddress,
  invoiceCommitment,
  walletIdentifierDigest,
  indexedTransactionHash,
  confirmationBlockHash,
  networkTag,
  tokenColor,
  amount,
  payeeCoinPublicKey,
  payeeEncryptionPublicKey;
  receiptSalt
)
```

This makes evidence substitution detectable when an opening is shared. It does not make the transaction true; live verification supplies that property.

## Exported circuits

The following names and guards match the compiled implementation.

### `createInvoice(opening, invoiceSalt) -> invoiceCommitment`

Caller: merchant.

Effects:

- proves knowledge of `merchantSecret` matching sealed `merchantKey`;
- computes the commitment using sealed deployment fields;
- inserts the commitment into `invoices`;
- returns the commitment for request generation.

Guards and required error text:

- `Only the merchant can modify invoices`;
- `Invoice amount must be greater than zero`;
- `Invoice expiry must be set`;
- `Invoice already exists`.

No wall-clock expiry check is specified because a verified Compact ledger-time API has not been selected. The frontend blocks expired requests; adding an on-chain time check requires separate API verification.

### `cancelInvoice(opening, invoiceSalt)`

Caller: merchant.

Effects:

- recomputes the invoice commitment;
- inserts it into `cancelled`.

Guards:

- `Only the merchant can modify invoices`;
- `Invoice does not exist`;
- `Invoice already cancelled`;
- `Acknowledged invoice cannot be cancelled`.

### `acknowledgeReceipt(opening, invoiceSalt, evidence, receiptSalt) -> receiptCommitment`

Caller: merchant after application-level receipt verification.

Effects:

- recomputes the invoice commitment;
- checks the evidence opening is internally bound to the invoice and sealed deployment configuration;
- stores one receipt commitment under the invoice commitment;
- returns that receipt commitment.

Guards:

- `Only the merchant can modify invoices`;
- `Invoice does not exist`;
- `Cancelled invoice cannot be acknowledged`;
- `Invoice already acknowledged`;
- `Wallet transaction identifier digest must be set`;
- `Indexed transaction hash must be set`;
- `Confirmation block must be set`;
- `Evidence amount does not match invoice`;
- `Evidence token does not match invoice book`;
- `Evidence recipient does not match invoice`;
- `Evidence network does not match invoice book`.

The frontend must not call this circuit until it has independently checked transaction and recipient-wallet evidence. Tests must also prove that a malicious merchant can technically commit arbitrary but internally consistent evidence; the UX and docs must describe the receipt as merchant-authenticated rather than chain-certified.

## Pure helpers

If supported by the compiled type layout, export pure helpers for:

- merchant-key derivation from a secret plus explicit contract address;
- invoice commitment from explicit deployment fields, opening, and salt;
- receipt commitment from explicit fields and salt;
- derived invoice state from ledger membership.

If a helper needs `kernel.self()`, keep it internal and provide a pure version taking contract address explicitly. Tests must assert both produce the same value. Do not add a pure helper if doing so requires disclosing an opening.

## State-transition invariants

1. Every registered invoice has exactly one 32-byte commitment.
2. Only the merchant secret holder can mutate the book.
3. No invoice can be registered twice.
4. A cancelled invoice can never acquire a receipt.
5. An acknowledged invoice can never be cancelled.
6. An invoice has at most one receipt commitment.
7. A receipt opening must reproduce both the invoice key and stored receipt commitment.
8. No private opening, salt, merchant secret, amount, recipient key, memo, wallet identifier/digest, indexed transaction hash, or block hash is written directly to ledger state.
9. No circuit invokes shielded/unshielded token custody primitives.
10. No circuit or application field describes `ACKNOWLEDGED` as sufficient proof of payment.

## Replay and authorization analysis

- Reusing an invoice opening/salt produces the same commitment and is rejected by set membership.
- A receipt for transaction X cannot open under invoice Y because the invoice commitment is part of the receipt commitment and evidence fields must match Y's opening.
- Cross-network replay fails evidence equality against sealed `networkTag`.
- Cross-deployment replay fails because contract address is included in merchant, invoice, and receipt domains.
- A copied receipt call without `merchantSecret` fails authorization.
- A copied proof/transaction should fail ledger freshness when the invoice already has a receipt; this must be tested on the real node.
- Nothing prevents two distinct wallet payments for the same invoice. NightParcel must display both if discovered and must never conceal the duplicate behind the single receipt slot.

## Information leakage analysis

Public by design:

- contract address and deployment;
- merchant key commitment, network tag, and supported token color;
- invoice commitment values, counts, and creation timing;
- cancellation and acknowledgement entrypoints/timing;
- which public invoice commitment was cancelled or acknowledged;
- receipt commitments;
- fees, transaction identifiers for contract calls, proof presence, and other normal indexer metadata.

Not written to contract state:

- invoice amount, human memo, random invoice ID opening, expiry, token label;
- recipient coin/encryption keys and full shielded address;
- invoice and receipt salts;
- wallet transaction identifier/digest, indexed transaction hash, and confirmation block;
- merchant authorization secret;
- payer identity or wallet address.

Residual risks include DUST fee linkage, timing correlation between payment and acknowledgement, linkability of all invoices within one invoice-book address, dictionary attacks if randomness is weak, raw transaction encoding, local logs, clipboard leakage, and malicious browser code.

## Dependencies and exclusions

Required and already source-verified:

- `persistentHash`, `persistentCommit`, `sealed ledger`, `Set`, and `Map` patterns;
- witness-backed authorization and private circuit arguments;
- wallet connector 4.0.1 method signatures for balances, addresses, configuration, `makeTransfer`, history, and submission;
- direct transfer with wallet SDK 1.2.0 from Phase 0.

Required but not yet runtime-verified for NightParcel:

- browser connector direct `makeTransfer` on the local stack;
- deriving the exact wallet identifier from the connector-returned serialized transfer and mapping it to the indexer's transaction hash;
- the same hash appearing in both independent wallets' histories;
- browser persistent-state reload and wrong-passphrase behavior;
- the final Compact commitment type layout.

Explicitly not required:

- `receiveShielded`, `sendShielded`, `QualifiedShieldedCoinInfo`, `mt_index`, contract coin ciphertext delivery, NIGHT, DUST custody, sNIGHT, or any wrapper.

## Source traceability

- Commitment and private argument model: `examples/private-bid/contract/private-bid.compact`
- Witness authorization and privacy tests: `examples/private-tip-jar/contract/private-tip-jar.compact`, `SPEC.md`, and simulator test
- Custody/`mt_index` complexity used to reject Architecture B: `examples/shielded-chips/contract/roulette.compact`, `contract/witnesses.ts`, and UI `escrowMtIndex`
- Browser private state: `examples/shielded-chips/ui/src/midnight/private-state.ts`
- Connector surface: installed `@midnight-ntwrk/dapp-connector-api` 4.0.1 `dist/api.d.ts`
- Toolchain/runtime evidence: `docs/PHASE_0_REPORT.md`
