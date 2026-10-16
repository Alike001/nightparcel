# NightParcel Wave 2 demo recording plan

Target length: 3–4 minutes. Record only disposable local-network accounts. Never show a seed, spending key, wallet password, private invoice opening, full shielded address, or browser developer storage.

## Authentic sequence

1. **Problem and promise — 20 seconds.** Explain that invoices contain commercially sensitive details, while merchants still need defensible settlement evidence. State: “Private Payments. Verifiable Settlement.”
2. **Original Compact contract — 35 seconds.** Show `createInvoice`, `cancelInvoice`, and `acknowledgeReceipt`; explain that the contract commits to state and authenticates the merchant but never custodies tokens or acts as a payment oracle.
3. **Deterministic verification — 25 seconds.** Run the compile, simulator, supporting-test, typecheck, lint, and production-build commands. Keep the complete terminal result in frame.
4. **Verified payment evidence — 40 seconds.** Show the redacted Phase 1B run: 125-unit direct shielded transfer, payer 300→175, recipient 0→125, indexer `SUCCESS`, matched commitments, and rejected duplicate acknowledgement. Label this as the verified Node-wallet local baseline.
5. **Browser readiness — 35 seconds.** In both disposable Chrome profiles, show the sanitized diagnostic: Connector API, local network, different account fingerprints, DUST, transfer/history capabilities, and local proving configuration. Do not expose full addresses.
6. **Browser lifecycle — 60 seconds, only if verified.** Create the commitment, connect the payer, review the exact output, authorize, show `SUBMITTED`/`PENDING`, show network acceptance, independently reconcile Bob, acknowledge the receipt, and only then show `PAID_VERIFIED`. Include one duplicate or unauthorized rejection.
7. **Privacy boundary and close — 25 seconds.** Show which invoice fields remain private and which timing/commitment/transaction metadata remain public. State the current browser and recovery limitations exactly.

## Honest fallback

If the browser lifecycle remains blocked, omit any simulated success. Show the readiness failure, explain the precise incompatibility, retain the real Phase 1B Node-wallet evidence, and label browser settlement as unverified. Decorative mock data must not appear as live state.

