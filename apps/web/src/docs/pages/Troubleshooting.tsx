import { Callout, DocSection } from '../components';

const problems = [
  ['lace-not-detected', 'Lace is not detected', 'Enable Lace in the current Chrome profile, unlock it, then hard-refresh /app. NightParcel scans window.midnight for connectors rather than assuming a fixed key.'],
  ['authorization-rejected', 'Authorization was rejected', 'Start the connection again and approve it inside Lace. NightParcel does not suppress PermissionRejected errors or automate approval.'],
  ['connector-incompatible', 'Connector API is incompatible', 'NightParcel accepts API major version 4. Upgrade Lace if the diagnostic reports another major version.'],
  ['hint-usage', 'hintUsage is unavailable', 'Lace 2.4.2 may omit this optional runtime hint. NightParcel records a compatibility note and continues with explicit checks. If a present hint is rejected, connection still fails.'],
  ['wrong-network', 'Wallet is on the wrong network', 'Select the local undeployed network and confirm its node/indexer endpoints match the running NightParcel stack. Re-run checks; do not bypass the mismatch.'],
  ['no-dust', 'No DUST is available', 'A zero DUST balance blocks payment readiness because transaction fees cannot be funded. Prepare the disposable wallet through the supported local flow before continuing.'],
  ['proof-server', 'Proof server is unavailable', 'Confirm the proof-server container is healthy and Lace points to http://127.0.0.1:6300. Browser reachability may also fail because of CORS.'],
  ['missing-token', 'The test token is missing', 'Do not attempt payment. Confirm the payer wallet actually holds the exact supported custom token color used by the committed request.'],
  ['unresolved', 'The transaction remains unresolved', 'Do not resubmit blindly. Check payer history, indexer state, recipient reconciliation, and both controlled balance deltas. Preserve UNRESOLVED when evidence is absent or ambiguous.'],
  ['lost-local-state', 'A browser-only draft or private state was lost', 'NightParcel currently provides no verified encrypted recovery. Recreate an uncommitted draft from known terms. Never assume the wallet seed recovers application state.'],
] as const;

export default function Troubleshooting() {
  return <>
    <p className="doc-lede">Treat wallet and evidence failures as safety signals. Resolve the underlying network, capability, or reconciliation problem instead of bypassing the check.</p>
    {problems.map(([id, title, body]) => <DocSection key={id} id={id} title={title}><p>{body}</p></DocSection>)}
    <Callout tone="warning" title="Never send support secrets"><p>Do not share a recovery phrase, wallet password, private key, invoice salt, merchant secret, full diagnostic history, or unredacted private request.</p></Callout>
  </>;
}
