# NightParcel technical matrix through Phase 1E

Date: 2026-10-16. Status reflects local evidence from this machine, not upstream CI.

| Capability | Status | Local evidence | Limitation |
|---|---|---|---|
| Pinned Node 22 | VERIFIED | `nvm use` → `v22.23.3`; `.nvmrc` = `22` | login shells may otherwise select Node 24 |
| Yarn 4.18.0 | VERIFIED | Corepack enabled; `yarn --version` → `4.18.0` | Corepack may refetch the CLI if its cache disappears |
| Compact 0.31.1 | VERIFIED | tool manager `0.5.3`; `compact compile --version` → `0.31.1`; language `0.23.0` | report compiler and manager separately |
| Immutable install | VERIFIED | `corepack yarn install --immutable`, exit 0 | repeated after unexplained external removal of generated `node_modules` |
| Docker | VERIFIED | client/server `29.1.3`; daemon reachable | none observed |
| Compose | VERIFIED | `2.40.3+ds1-0ubuntu1` | none observed |
| Official services | VERIFIED | node `1.0.0`, indexer `4.3.3`, proof `8.1.0` healthy | first startup downloads/verifies proof material |
| Smallest compile | VERIFIED | hello-world, 1 circuit, exit 0, 5.124 s | simulator command found no tests |
| Hello-world local tests | VERIFIED | 2/2 passed; `validate` exit 0 | none observed |
| Token-transfer compile | VERIFIED | 9 circuits compiled | compile-only elapsed time not separately captured |
| Official token tests | VERIFIED_WITH_LIMITATION | 9 passed, 1 intentional skip; 263.87 s | committed contract-held send lacks qualified coin/`mt_index` setup |
| DUST readiness | VERIFIED | 5 coins; `1250000000000000000000000` STAR | fee-payer unlinkability not established |
| Custom shielded mint/send | VERIFIED | official suite and Phase 0 harness accepted | issuance metadata is not wholly private |
| Independent wallets | VERIFIED | distinct Alice/Bob shielded keypairs | deterministic local genesis wallets |
| Alice→Bob transfer | VERIFIED | Alice `300→175`; Bob `0→125` | custom token, not NIGHT |
| Proof generation | VERIFIED | 17,468 ms plus matching `/prove` logs | proof bytes not retained |
| Acceptance | VERIFIED | transfer ID indexed `SUCCESS` in block 46 | ephemeral local chain |
| Wallet reconciliation | VERIFIED | both wallets independently observed final balances | no browser wallet tested |
| Public visibility | VERIFIED_WITH_LIMITATION | block/hash/IDs/fee, 2 commitments, 3 raw events, raw tx, no contract/unshielded action | raw bytes not fully decoded/positive-control scanned |
| Upstream cleanliness | VERIFIED | final `git status --short` empty | temporary harness removed |
| Native NIGHT receive/send | VERIFIED | both official local tests passed | NIGHT stays unshielded/public |
| NIGHT-backed wrapper | NO-GO | no implementation | backing/redemption/recovery/security unproven |
| Phase 1B overall | GO_WITH_LIMITATIONS | original contract and Node two-wallet flow verified | mandatory browser two-profile gates remain open |
| Original Compact contract | VERIFIED | compiler 0.31.1; 3 exported circuits; full proving-key compile exit 0 | merchant key cannot be constructor address-bound on runtime 4.1.1; fresh deployment secret required |
| Contract simulator | VERIFIED | 18/18 tests passed | authoritative for contract logic, not wallet settlement truth |
| NightParcel local payment | VERIFIED | 125 units; payer `300→175`; merchant `0→125`; both histories and indexer `SUCCESS` | controlled no-concurrency local flow |
| Receipt commitment | VERIFIED_WITH_LIMITATION | matching receipt stored; duplicate rejected | merchant attestation; contract cannot query wallet/indexer truth |
| Phase 1 privacy scan | VERIFIED_WITH_LIMITATION | positive control passed; exact sensitive bytes absent from decoded state/raw calls | alternate encoding and full Zswap decoding remain unresolved |
| Lace browser profiles | INSTALLED_UNVERIFIED | Lace 2.4.2 manifests in Chrome Default and Profile 2 | unlock, account initialization, and authorization require owner action |
| Connector API integration | IMPLEMENTED_RUNTIME_PENDING | Connector API 4.0.1; version/network/DUST/capability/prover checks; sanitized account fingerprint; transfer path compiles | no authorized two-profile transfer or reconciliation yet |
| Product frontend | IMPLEMENTED_WITH_LIMITATIONS | public landing + 5 workspace surfaces; 18 simulator + 18 supporting tests; typecheck/lint/build pass | create/acknowledge/private-state browser paths gated and disabled |
| Phase 1C overall | BLOCKED | code/release materials pass local gates | AC-07/AC-08 and browser persistence/recovery await owner-controlled runtime |
| Public repository | VERIFIED | `Alike001/nightparcel`, public `main`, topic `midnightntwrk`, initial commit `d5c80e7` | final browser result must still be pushed consistently |
| Release readiness | NOT READY | README/license/NOTICE/checklist/demo/deck plans and public repository prepared | final deck/video, AKINDO fields, deadline confirmation, and browser result missing |
| Phase 1D landing page | VERIFIED | `/` product explanation; CTA/navigation Playwright coverage | local prototype claims only |
| Phase 1D workspace | VERIFIED_WITH_LIMITATIONS | five task surfaces; honest draft/import/submission/evidence states | browser Compact create/acknowledge disabled |
| Responsive product UI | VERIFIED | Playwright at 1440/1024/768/390; no page overflow | manual screen-reader/zoom/forced-colors audit open |
| Browser UI suite | VERIFIED | 16/16 Playwright tests in installed Chrome | deterministic fixtures validate UI, not settlement |
| Production web build | VERIFIED_WITH_LIMITATION | lazy landing/workspace routes; build/typecheck/lint pass | ledger WASM ~10.2 MB; workspace chunk ~585 KB |
| Phase 1D overall | SUBMIT_WITH_LIMITATIONS | understandable product, original contract baseline, real evidence, and honest browser boundaries | owner-assisted two-profile browser settlement remains unverified |
| Lace `hintUsage` runtime mismatch | FIXED, MANUAL RETEST PENDING | runtime function guard; explicit rejection propagation; compatibility limitation in sanitized diagnostic; unit and Playwright regression coverage | actual Lace 2.4.2 reauthorization requires owner action |

## Gate verdicts

| Gate | Verdict | Reason |
|---|---|---|
| A: toolchain and compile | PASS | exact pinned Node/Yarn/Compact set and hello-world compile |
| B: devnet, DUST, official tests | PASS_WITH_LIMITATION | healthy services; hello 2/2; token 9 pass/1 intentional skip |
| C: two-wallet shielded payment | PASS | distinct wallets, proof, transaction ID, indexed success, reconciled balances |
| D: public visibility audit | PASS_WITH_LIMITATION | public inventory captured; opaque bytes not fully decoded/scanned |
| E: original NightParcel contract | PASS | 3 circuits; full proving-key compile; 18/18 simulator tests |
| F: sNIGHT | NO-GO | research only; critical invariants untested |
| G: Lace two-profile lifecycle | BLOCKED | extension is installed twice, but owner authorization and real runtime evidence are absent |
| H: Phase 1D product experience | PASS_WITH_LIMITATION | public landing, task workspace, responsive tests, production build | full browser lifecycle and private-state recovery remain blocked |

## Exact two-wallet evidence

- token: `a262243bc750fd3fea291f15cda5c59968fcee7f598280d8b75fd5c2a39fa59e`
- mint ID: `0003f7b97e3b4812759988e5e8c1d26b9b33783395faa4ef2c020ef299af44a358`
- transfer ID: `00f5a0121b8894f9d771e10b88125095c4a5afb434d73d294090454fb240724ac9`
- hash: `e5cacc1f27214e59482344638fdf382bb2daa3ae9b98d327f0a78819771176ef`
- block: 46 / `8f3c9c6e910867605be5acabd0f36561dc680599060bb93124c1ce446660d4b5`
- Zswap range: `[34, 36)`
- fee: `37738091905308` SPECK

## Evidence still required for stronger privacy claims

- retain raw transaction/event bytes in a dedicated test artifact;
- scan canonical encodings of keys, addresses, color, amount, nonce, and application secrets;
- include a deliberately public positive control;
- validate contract-held qualified-coin index recovery;
- repeat on a public testnet only after approval.
