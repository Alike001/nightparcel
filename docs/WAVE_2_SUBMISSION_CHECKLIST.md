# Midnight Buildathon Wave 2 submission checklist

Checked 2026-10-16. The public Midnight schedule says Wave 2 ends October 17, while the live rendered AKINDO page showed a countdown corresponding to October 19 at 15:00 UTC. This discrepancy is unresolved; the owner must verify the authenticated submission form immediately and submit against the earlier deadline unless AKINDO confirms otherwise.

## Mandatory materials

- [ ] Public GitHub repository URL. No remote is configured yet.
- [ ] GitHub repository topic `midnightntwrk`. This can only be set after publication.
- [x] Apache-2.0 `LICENSE` and third-party `NOTICE` are present.
- [x] Pinned Yarn and Midnight dependencies are committed in the project files and lockfile.
- [x] Technical README includes setup, architecture, judge path, evidence, and limitations.
- [x] Original compiling Compact contract with meaningful private-state behavior.
- [x] Reproducible deterministic test commands and redacted real local evidence.
- [x] Slide-deck outline prepared in `docs/PITCH_DECK_OUTLINE.md`.
- [x] Demo recording plan prepared in `docs/DEMO_RECORDING_PLAN.md`.
- [ ] Final slide deck file or public link.
- [ ] Recorded demo/video pitch and accessible link.
- [ ] Final progress description entered in AKINDO.
- [ ] Team registration, members, repository, video, and deck verified in the authenticated submission form.
- [ ] Browser-runtime limitation/result reflected consistently in README, video, slides, and submission text.

## Progress-description draft

NightParcel implements an original Compact invoice-commitment contract with merchant-authorized cancellation and receipt acknowledgement while keeping invoice openings private. Its payment path is direct and self-custodial: supported custom shielded tokens move wallet-to-wallet, never through the contract. The verified local baseline compiled with Compact 0.31.1, passed 18 simulator tests and supporting gates, and completed a real 125-unit Alice-to-Bob transfer whose payer history, indexer `SUCCESS`, recipient history, balance deltas, commitments, and duplicate protection reconciled. The four-surface web application separates current browser state from immutable evidence and refuses to infer settlement from submission alone. Remaining browser-runtime and private-state recovery limits are disclosed in the Phase 1C report.

## Sources

- Official Buildathon schedule and overview: https://midnight.network/hackathon/buildathon
- Live Wave 2 submission page and rules: https://app.akindo.io/wave-hacks/jaMZjqPOBsLXvjdG
- Official DApp Connector API reference: https://docs.midnight.network/api-reference/dapp-connector
