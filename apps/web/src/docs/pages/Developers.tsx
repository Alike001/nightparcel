import { Callout, CodeBlock, DocSection, RepoLink } from '../components';

export default function Developers() {
  return <>
    <p className="doc-lede">The repository pins the compiler, SDK, wallet, and local services used to produce the recorded baseline. Reproduce those versions before changing contract or connector behavior.</p>
    <DocSection id="toolchain" title="Pinned toolchain">
      <div className="doc-table-wrap"><table><thead><tr><th>Component</th><th>Version</th></tr></thead><tbody><tr><td>Node.js</td><td>22.x</td></tr><tr><td>Yarn</td><td>4.18.0</td></tr><tr><td>Compact compiler / language</td><td>0.31.1 / 0.23</td></tr><tr><td>Midnight.js</td><td>4.1.1</td></tr><tr><td>Wallet SDK</td><td>1.2.0</td></tr><tr><td>DApp Connector API</td><td>4.0.1</td></tr><tr><td>Node / indexer / proof server</td><td>1.0.0 / 4.3.3 / 8.1.0</td></tr></tbody></table></div>
    </DocSection>
    <DocSection id="source-map" title="Implemented source map">
      <ul><li><RepoLink path="contract/nightparcel.compact">Contract circuits and ledger state</RepoLink></li><li><RepoLink path="contract/witnesses.ts">Merchant witness implementation</RepoLink></li><li><RepoLink path="src/test/nightparcel.sim.test.ts">18 contract simulator tests</RepoLink></li><li><RepoLink path="src/test/nightparcel.local.test.ts">Controlled two-wallet local harness</RepoLink></li><li><RepoLink path="apps/web/src/connector.ts">Browser discovery, diagnostics, and transfer integration</RepoLink></li><li><RepoLink path="apps/web/src/pages/WorkspacePage.tsx">Product workflow and guarded browser states</RepoLink></li></ul>
    </DocSection>
    <DocSection id="commands" title="Compilation and quality gates">
      <CodeBlock>{`corepack yarn install --immutable
corepack yarn compile:fast
corepack yarn test
corepack yarn test:sim
corepack yarn typecheck
corepack yarn lint
corepack yarn build
corepack yarn test:e2e`}</CodeBlock>
      <p>The full <code>yarn compile</code> command generates proving material and is slower. Playwright uses the installed Chrome channel and deterministic fixtures that do not count as payment evidence.</p>
    </DocSection>
    <DocSection id="local-execution" title="Local execution">
      <CodeBlock>{`docker compose up -d
cp .env.example .env
# Add disposable local-only fixture seeds outside source control.
set -a; source .env; set +a
corepack yarn test:local`}</CodeBlock>
      <Callout tone="warning" title="Secrets stay local"><p>Never use a production or public-testnet seed. The ignored environment file is for disposable local fixtures only; evidence logs must remain redacted.</p></Callout>
    </DocSection>
    <DocSection id="reconciliation" title="Integration invariant">
      <p>Do not add code that derives settlement from a contract receipt or wallet callback alone. A verifier must recompute invoice and receipt commitments and correlate payer history, indexer success, recipient history, and controlled balance deltas. Concurrent same-token activity requires an unresolved result.</p>
    </DocSection>
  </>;
}
