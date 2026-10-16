import { Callout, CodeBlock, DocSection } from '../components';

export default function GettingStarted() {
  return <>
    <p className="doc-lede">Run the verified prototype locally, then connect only disposable Lace accounts configured for NightParcel’s <code>undeployed</code> network.</p>
    <DocSection id="requirements" title="Requirements">
      <ul><li>Node.js 22 (verified with 22.23.3)</li><li>Corepack Yarn 4.18.0</li><li>Compact compiler 0.31.1, language 0.23</li><li>Docker Engine and Docker Compose</li><li>Lace 2.4.2 for owner-controlled browser checks</li></ul>
      <Callout tone="warning" title="Disposable accounts only"><p>Never enter or share a recovery phrase, private key, invoice salt, or merchant authentication secret with NightParcel or its maintainers.</p></Callout>
    </DocSection>
    <DocSection id="install" title="Install and verify">
      <CodeBlock>{`git clone https://github.com/Alike001/nightparcel.git
cd nightparcel
nvm use
corepack enable
corepack prepare yarn@4.18.0 --activate
yarn install --immutable
yarn compile:fast
yarn test
yarn test:sim
yarn typecheck
yarn lint
yarn build`}</CodeBlock>
      <p><code>compile:fast</code> skips proving-key generation. Use <code>yarn compile</code> when a full proving-key build is required.</p>
    </DocSection>
    <DocSection id="local-network" title="Start the local Midnight services">
      <CodeBlock>{`docker compose up -d
docker compose ps`}</CodeBlock>
      <p>The pinned stack exposes the node at <code>127.0.0.1:9944</code>, indexer at <code>127.0.0.1:8088</code>, and proof server at <code>127.0.0.1:6300</code>.</p>
    </DocSection>
    <DocSection id="web-app" title="Open NightParcel">
      <CodeBlock>{`yarn workspace @nightparcel/web dev
# Landing: http://127.0.0.1:5173/
# Workspace: http://127.0.0.1:5173/app
# Documentation: http://127.0.0.1:5173/docs`}</CodeBlock>
    </DocSection>
    <DocSection id="lace-readiness" title="Connect Lace safely">
      <ol><li>Open a disposable Chrome profile and unlock Lace yourself.</li><li>Select the same local <code>undeployed</code> network used by the services.</li><li>Open <code>/app</code>, select Connect Lace, and approve the connection in the extension.</li><li>Review the sanitized diagnostic: API 4.x, network, shielded-address preview, DUST, required methods, and local prover.</li><li>Repeat in the second profile and require a different account fingerprint.</li></ol>
      <Callout title="Stop before transferring"><p>Do not send a test token until both profiles pass readiness, the payer actually has the supported asset, and the recipient address is independently confirmed.</p></Callout>
    </DocSection>
  </>;
}
