import { Link } from 'react-router-dom';
import { Callout, DocSection } from '../components';

export default function Payments() {
  return <>
    <p className="doc-lede">NightParcel’s payment experience deliberately separates a readable request file, wallet authorization, network submission, and settlement evidence.</p>
    <DocSection id="request-payment" title="Request payment">
      <p>The browser form accepts amount, exact custom test-token color, private description, expiry, and intended recipient. A local JSON draft is marked <code>nightparcel.invoice.draft.v1</code> and <code>DRAFT_UNCOMMITTED</code>.</p>
      <Callout tone="warning" title="Drafts are not payable"><p>An uncommitted draft has no verified contract address or invoice commitment and is rejected by the payment authorization path. The browser Compact path is implemented, but remains runtime-unverified until an owner-authorized Lace session completes deployment and indexer confirmation.</p></Callout>
      <p>After the merchant opens or deploys an account-controlled invoice book and Lace authorizes <code>createInvoice</code>, NightParcel will export <code>nightparcel.invoice.v2</code> only if the indexer exposes the new commitment. That runtime path is not yet claimed as verified.</p>
      <p>The file is readable, not encrypted. Share it only through an intended private channel. Invoice contents are never placed in a public URL.</p>
    </DocSection>
    <DocSection id="make-payment" title="Make payment">
      <ol><li>Import a canonical committed <code>nightparcel.invoice.v2</code> request. Legacy v1 files fail closed.</li><li>Connect a compatible, ready Lace wallet.</li><li>Verify the request network and contract, recompute the salted commitment, compare the merchant key, token color and exact recipient keys, and confirm the invoice is registered, open, unexpired, uncancelled and unacknowledged.</li><li>Confirm the merchant and recipient through a trusted channel; on-chain consistency alone does not prove a real-world identity.</li><li>Review and authorize the exact direct shielded output inside Lace.</li><li>Wait for network and independent recipient reconciliation.</li></ol>
      <p>The implemented connector checks exact-token funding before calling <code>makeTransfer</code>, derives a transaction identifier from the returned serialized transaction, then calls <code>submitTransaction</code>. A persisted single-flight intent blocks duplicate clicks and turns an interrupted or ambiguous submission into <code>REVIEW_REQUIRED</code>; it is never rebroadcast automatically.</p>
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
