import { Link } from 'react-router-dom';
import { Callout, DocSection } from '../components';

export default function Payments() {
  return <>
    <p className="doc-lede">NightParcel’s payment experience deliberately separates a readable request file, wallet authorization, network submission, and settlement evidence.</p>
    <DocSection id="request-payment" title="Request payment">
      <p>The browser form accepts amount, supported test token, private description, expiry, and intended recipient. It downloads a local JSON file marked <code>nightparcel.invoice.draft.v1</code> and <code>DRAFT_UNCOMMITTED</code>.</p>
      <Callout tone="warning" title="Drafts are not payable"><p>An uncommitted draft has no verified contract address or invoice commitment and is rejected by the payment authorization path. Browser Compact creation remains disabled.</p></Callout>
      <p>The file is readable, not encrypted. Share it only through an intended private channel. Invoice contents are never placed in a public URL.</p>
    </DocSection>
    <DocSection id="make-payment" title="Make payment">
      <ol><li>Import a canonical committed <code>nightparcel.invoice.v1</code> request.</li><li>Review network, amount, token color, recipient, expiry, contract address, and invoice commitment.</li><li>Connect a compatible, ready Lace wallet.</li><li>Authorize the exact direct shielded output inside Lace.</li><li>Wait for network and independent recipient reconciliation.</li></ol>
      <p>The implemented connector checks available shielded balance before calling <code>makeTransfer</code>, derives a transaction identifier from the returned serialized transaction, then calls <code>submitTransaction</code>.</p>
    </DocSection>
    <DocSection id="payment-states" title="Payment states">
      <div className="doc-state-list"><div><code>DRAFT</code><p>Local terms only; not an on-chain invoice.</p></div><div><code>SUBMITTED</code><p>The wallet created and handed off a transaction. Settlement is not proven.</p></div><div><code>PENDING</code><p>The transaction is known but not final.</p></div><div><code>UNRESOLVED</code><p>Evidence is incomplete, ambiguous, or disagrees.</p></div><div><code>FAILED</code><p>The wallet or network rejected or discarded the operation.</p></div><div><code>ACKNOWLEDGED</code><p>A merchant-authenticated receipt commitment exists; it is not a network oracle.</p></div><div><code>PAID_VERIFIED</code><p>All six independent checks refer to the same invoice and transaction.</p></div></div>
    </DocSection>
    <DocSection id="delays" title="If a transaction is delayed">
      <p>Do not immediately resubmit. Preserve the transaction identifier, check payer history and indexer status, then ask the recipient to reconcile independently. If attribution is incomplete or concurrent same-token activity makes balance changes ambiguous, keep the invoice <code>UNRESOLVED</code>.</p>
      <p><Link className="doc-inline-link" to="/docs/verification">Continue to settlement verification →</Link></p>
    </DocSection>
  </>;
}
