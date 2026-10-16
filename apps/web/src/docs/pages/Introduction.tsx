import { Link } from 'react-router-dom';
import { Callout, DocSection, StatusTable } from '../components';

export default function Introduction() {
  return <>
    <p className="doc-lede">NightParcel is a self-custodial payment prototype for confidential invoice commitments and direct custom shielded-token transfers on Midnight. It separates what a user requests, what a wallet submits, and what independent evidence can prove.</p>
    <div className="doc-audience-grid">
      <Link to="/docs/getting-started"><span>For users</span><strong>Connect Lace safely</strong><p>Understand drafts, local test assets, DUST, and wallet approval.</p></Link>
      <Link to="/docs/developers"><span>For developers</span><strong>Reproduce the build</strong><p>Compile Compact, run tests, and start the pinned local stack.</p></Link>
      <Link to="/docs/verification"><span>For judges</span><strong>Inspect genuine evidence</strong><p>See what was verified and what remains browser-runtime work.</p></Link>
    </div>
    <DocSection id="what-nightparcel-does" title="What NightParcel does">
      <ol className="doc-steps"><li><b>1</b><div><strong>Request</strong><p>A merchant prepares private payment terms. The approved architecture commits those terms without publishing the opening.</p></div></li><li><b>2</b><div><strong>Pay</strong><p>The payer reviews one exact output and authorizes a direct custom shielded-token transfer in Lace. The contract never takes custody.</p></div></li><li><b>3</b><div><strong>Verify</strong><p>Payer, indexer, recipient, balances, and receipt evidence must agree before NightParcel may show verified settlement.</p></div></li></ol>
    </DocSection>
    <DocSection id="current-status" title="Current product status">
      <StatusTable rows={[
        ['Original Compact contract', 'Verified', 'Three circuits compile with Compact compiler 0.31.1 and 18 simulator tests pass.'],
        ['Node-wallet local settlement', 'Verified', 'A controlled 125-unit transfer reconciled across two independent local wallets and the indexer.'],
        ['Browser wallet readiness', 'Runtime pending', 'Connector checks are implemented; owner-controlled Lace authorization must be repeated in both profiles.'],
        ['Browser invoice commitment', 'Blocked', 'The browser currently creates an explicit DRAFT_UNCOMMITTED local file only.'],
        ['Mainnet / real-value payments', 'Unavailable', 'NightParcel is a disposable local-network prototype.'],
      ]} />
      <Callout tone="warning" title="Prototype boundary"><p>NightParcel does not support mainnet, real funds, confidential native NIGHT, or production security claims.</p></Callout>
    </DocSection>
    <DocSection id="core-principle" title="Evidence before status">
      <p>A wallet returning from <code>makeTransfer</code> or <code>submitTransaction</code> establishes submission—not settlement. Browser activity stays <code>SUBMITTED</code> or <code>UNRESOLVED</code> until independent reconciliation exists.</p>
      <p><Link className="doc-inline-link" to="/docs/verification">Read the six-check verification rule →</Link></p>
    </DocSection>
  </>;
}
