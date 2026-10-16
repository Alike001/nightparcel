# NightParcel Phase 0 technical report

Date: 2026-10-15 (Africa/Lagos)  
Scope: local toolchain, official baseline, independent-wallet shielded payment, public visibility, and research-only NIGHT wrapper assessment.  
Verdict: **PASS_WITH_LIMITATIONS. Phase 1 has not started and still requires explicit approval.**

## Executive result

The core Phase 0 feasibility question passed on the pinned local stack. A genuine custom-token shielded transfer executed from an independently constructed Alice wallet to an independently constructed Bob wallet:

- a contract minted 300 units of a custom shielded token to Alice;
- Alice sent 125 units to Bob at the wallet/protocol layer;
- Alice's shielded balance changed `300 → 175`, and Bob's changed `0 → 125`;
- transfer ID `00f5a0121b8894f9d771e10b88125095c4a5afb434d73d294090454fb240724ac9` was indexed `SUCCESS` in block 46;
- matching proof-server `/prove` requests completed;
- the official clone ended clean.

This was a distinct custom token, not shielded NIGHT. The proposed NIGHT-backed token remains a separate **NO-GO** for Phase 1; see `SNIGHT_FEASIBILITY.md`.

Limitations:

1. the official suite intentionally skips `sendShieldedToUser` because a committed contract-held coin needs correct `mt_index` bookkeeping;
2. public fields and opaque payload presence were inventoried, but raw bytes were not fully decoded or positive-control scanned;
3. an unexplained concurrent cleanup removed generated `node_modules`; immutable reinstall and all later checks passed, but the cleanup source is unknown;
4. sNIGHT backing, redemption, recovery, and security invariants remain unimplemented and untested.

## Source baseline

| Source | Path | Commit |
|---|---|---|
| Official examples | `upstream-midnight-examples/` | `f19c80266c7308b991f03aa935bb92131f9946f3` |
| Official docs | `upstream-midnight-docs/` | `61f60097aef76c946a151b4bbb9357af7cf5123f` |
| Midnight MIPs | `upstream-midnight-mips/` | `8ba407f41083b40aa730ad63a720e787ee69a2da` |
| Compact setup action | `upstream-setup-compact-action/` | `0607cf2cdf94c6f6ab71fdd3cb075e8365016c26` |
| ZK Freighter reference | `upstream-zk-freighter/` | `5ddf72483e1383defcbc0a17fd9dba58c5e0f0f4` |

Current Midnight docs were also checked through Context7 (`/midnightntwrk/midnight-docs`). Because the repository pins wallet SDK `1.2.0`, runtime work followed the installed pinned source/API rather than newer wallet-SDK examples.

## Environment validation

| Component | Required | Observed | Result |
|---|---:|---:|---|
| Node | `.nvmrc` `22`; engine `>=22` | `v22.23.3` | PASS |
| npm | indirect | `10.9.9` | INFO |
| Corepack | required | `0.36.0` | PASS |
| Yarn | `4.18.0` | `4.18.0` | PASS |
| Compact | `0.31.1` | `0.31.1` | PASS |
| Compact language | `0.23` | repository pin | PASS |
| Midnight.js/testkit | `4.1.1` | immutable install | PASS |
| Wallet SDK | `1.2.0` | immutable install | PASS |
| Docker client/server | running | `29.1.3` / `29.1.3` | PASS |
| Compose | present | `2.40.3+ds1-0ubuntu1` | PASS |
| Images | proof `8.1.0`, indexer `4.3.3`, node `1.0.0` | pulled and healthy | PASS |

The first login-shell check selected Node 24 due to shell initialization. `source /home/ali/.nvm/nvm.sh && nvm use` selected Node 22. Corepack shims were enabled for that installation; no pin or lockfile changed.

### Command record

Commands were run from `upstream-midnight-examples` unless a workspace path is explicit:

```text
source /home/ali/.nvm/nvm.sh
nvm use 22
node --version
corepack --version
corepack enable
corepack yarn --version
compact compile --version
docker version
docker compose version
docker info
docker system df
df -h /home/ali/Desktop/midnight
corepack yarn install --immutable
corepack yarn workspace @midnight-ntwrk/example-hello-world run compile
corepack yarn workspace @midnight-ntwrk/example-hello-world run test:sim
corepack yarn workspace @midnight-ntwrk/example-hello-world run validate
corepack yarn workspace @midnight-ntwrk/example-token-transfers run validate
```

For the independent-wallet check, the token-transfer workspace's official `env:up`, `wait:dust`, and `env:down` scripts managed the same pinned Compose stack. A temporary `src/test/phase0-two-wallet.ts` was executed with the workspace's installed `vite-node`; it used the official `resolveWallet`, token contract, and wallet SDK `transferTransaction` implementations. The file was removed after its output and indexer evidence were captured.

### Storage and resources

Before pulling: 231 GiB filesystem, about 12 GiB free (95% used); 7.1 GiB RAM; 4 GiB swap; 4 Docker CPUs. The three image manifests totaled about 0.40 GiB compressed; installed sizes were proof server 114 MB, indexer 231 MB, node 1.49 GB. Compose declares no explicit resource reservation or persistent volume.

The lowest observed free space was about 8.1 GiB. No cleanup command was issued. Free space later jumped to 61 GiB while generated `node_modules` disappeared, indicating external/concurrent cleanup. Dependencies were restored with the unchanged lockfile. Final free space was 74 GiB.

Targeted recovery opportunities identified but not performed:

- Docker build cache: 2.004 GB reclaimable;
- unused Docker volumes: 965.6 MB, ownership unknown;
- dangling image layers: about 1.11 GB, ownership unknown;
- `.npm`: 4.0 GB; `.cache/ms-playwright`: 2.0 GB; `.cache/google-chrome`: 1.8 GB; `.cache/pnpm`: 1.3 GB; `.local/share/pnpm`: 9.1 GB.

These cross project boundaries. If storage becomes essential again, approve exact targets only after ownership checks; do not broadly prune Docker or home caches.

## Official baseline results

### Install and smallest example

```text
$ corepack yarn install --immutable
Yarn 4.18.0; exit 0

$ yarn workspace @midnight-ntwrk/example-hello-world run compile
Compiling 1 circuits; exit 0; 5.124 s; managed output 84 KiB

$ yarn workspace @midnight-ntwrk/example-hello-world run test:sim
No test files found, exiting with code 0
```

The simulator result is not behavioral coverage. The real local suite passed:

```text
$ yarn workspace @midnight-ntwrk/example-hello-world run validate
Test Files 1 passed (1)
Tests 2 passed (2)
validate passed; exit 0
```

Node, indexer, and proof server became healthy. Alice synchronized with five spendable DUST coins.

### Official token-transfer example

```text
$ yarn workspace @midnight-ntwrk/example-token-transfers run validate
Compiling 9 circuits
Test Files 1 passed (1)
Tests 9 passed | 1 skipped (10)
test duration 263.87 s
validate passed; exit 0
```

Passed paths covered custom unshielded mint/send/receive, native NIGHT receive/send, shielded mint to contract, shielded mint/send to Alice, and shielded receive from Alice. The suite logged a shielded coin color `248cb8076a2fa6d3e16a9710aaa6146915bb59e865631de9432ec1b07c1443b4` with value 250, plus a separate shielded send of value 300 to Alice.

The official suite is single-wallet and does not emit transaction IDs for each test. Its only skipped case was `sendShieldedToUser (requires a contract-held qualified shielded coin)`.

## Independent-wallet transfer evidence

A temporary test-only harness used the official wallet builder, token contract, and pinned packages. It was removed after the run.

| Evidence | Value |
|---|---|
| Distinct keypairs | `true` |
| Alice key fingerprint | `1bd4f827be97ff01…` |
| Bob key fingerprint | `5aee546a493df3ac…` |
| Contract | `1673d14b8cacad979a01a464bc397b769914fc58d5da5a0229ddaa249c51fc53` |
| Mint tx ID | `0003f7b97e3b4812759988e5e8c1d26b9b33783395faa4ef2c020ef299af44a358` |
| Token color | `a262243bc750fd3fea291f15cda5c59968fcee7f598280d8b75fd5c2a39fa59e` |
| Amount | 125 |
| Before | Alice 300; Bob 0 |
| After | Alice 175; Bob 125 |
| Proof/finalize | 17,468 ms |
| Submit-return | 21,876 ms |
| Transfer ID | `00f5a0121b8894f9d771e10b88125095c4a5afb434d73d294090454fb240724ac9` |
| Indexed hash | `e5cacc1f27214e59482344638fdf382bb2daa3ae9b98d327f0a78819771176ef` |
| Result | `SUCCESS` |
| Block | 46; `8f3c9c6e910867605be5acabd0f36561dc680599060bb93124c1ce446660d4b5` |
| Fee | `37738091905308` SPECK |

At `20:29:39Z`, the proof server logged four concurrent `/prove` requests that completed in 3.37–17.36 seconds, matching the proof/finalize interval.

## Public state and indexer output

The direct wallet transfer exposed:

- hash, four identifiers, `SUCCESS`, block height/hash/time, and fee;
- Zswap range `[34, 36)`, revealing two new commitment-tree entries;
- three opaque Zswap events (186, 650, 650 raw hex characters);
- a 37,054-character raw transaction;
- zero contract actions and zero unshielded inputs/outputs.

The GraphQL result had no decoded sender, recipient, token color, or amount fields. Those were known from wallet-local state. Raw transaction/events remain public and were not fully decoded, so stronger unlinkability claims are not warranted.

The mint remained public as a `ContractCall`: serialized state 36,214 hex characters, serialized contract Zswap state 1,070 hex characters, and no unshielded contract balances. The later wallet transfer did not mutate contract state.

## NIGHT-backed token finding

The run proves two components separately: custom shielded tokens can move between independent wallets, and a contract can locally receive/release native unshielded NIGHT. It does not prove an atomic wrapper.

Unresolved blockers include reserve/liability invariants, public boundary leakage, burn/redemption, wrong-color rejection, replay/nullifier behavior across the complete flow, `mt_index` recovery, change durability, private-state recovery, authorization, reconciliation of direct deposits, and independent review. No wrapper was implemented or deployed.

## Verdict and next action

**Phase 0: PASS_WITH_LIMITATIONS.**

Recommended next action: after explicit approval, write and approve a narrow Phase 1 spec for the sealed invoice vault before contract or frontend work. Keep sNIGHT out of Phase 1. Put a reproducible two-wallet harness and a positive-control raw-byte leak scanner in the future NightParcel repository, not the upstream clone.

## Cleanup

- Official `env:down` removed only the Phase 0 containers/networks.
- No unrelated images, containers, volumes, caches, or dependencies were deleted by this work.
- The temporary harness was removed.
- `upstream-midnight-examples` ended clean at commit `f19c80266c7308b991f03aa935bb92131f9946f3`.
- No Phase 1 code, frontend, sNIGHT wrapper, mainnet deployment, commit, push, or real-fund action occurred.
