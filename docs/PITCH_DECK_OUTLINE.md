# NightParcel Wave 2 pitch deck outline

1. **NightParcel.** Private Payments. Verifiable Settlement. One sentence: confidential invoice commitments plus direct self-custodial shielded-token payments on Midnight.
2. **The problem.** Conventional invoices expose commercially sensitive terms; a wallet callback alone is weak settlement evidence; custodial intermediaries add trust and risk.
3. **The product.** Create and privately share an invoice, pay wallet-to-wallet, reconcile independent evidence, then publish a merchant-authenticated receipt commitment.
4. **Why Midnight.** Original Compact contract, witness-backed private openings, opaque public commitments, direct custom shielded tokens, local proofs, and account-scoped private state. Native NIGHT is not represented as private.
5. **Architecture and trust.** Diagram the three independent truths: Compact state, network/indexer acceptance, and payer/merchant wallet observations. The contract is not a payment oracle and never holds tokens.
6. **Verified evidence.** 18 simulator tests; supporting tests; original contract compilation; a real 125-unit local transfer with both balance deltas, indexer `SUCCESS`, matching commitments, and duplicate rejection. Separate the verified Node baseline from any browser result.
7. **Release and roadmap.** Wave 2 delivers the smallest honest self-custodial flow. State browser/private-state limitations. Wave 3 can harden recovery, richer reconciliation, accessibility, and deployment—not sNIGHT, custody, bridging, or unrelated scope.

