import { Callout, DocSection, RepoLink } from '../components';

export default function Architecture() {
  return <>
    <p className="doc-lede">NightParcel uses direct self-custodial wallet transfers plus an original Compact commitment registry. The contract authenticates invoice state—it never holds payment tokens.</p>
    <div className="doc-architecture" role="img" aria-label="Merchant private invoice opening creates a public commitment; payer sends a direct shielded wallet transfer; merchant stores an authenticated receipt commitment after independent reconciliation"><span>Private invoice opening</span><i>→</i><span>Public commitment</span><i>+</i><span>Direct shielded transfer</span><i>→</i><span>Receipt commitment</span></div>
    <DocSection id="contract-circuits" title="Original Compact circuits">
      <div className="doc-definition-list"><div><code>createInvoice</code><p>Authenticates the merchant, validates amount/expiry, rejects a duplicate commitment, and inserts it into the public invoice set.</p></div><div><code>cancelInvoice</code><p>Recomputes the private opening, rejects missing, duplicate, or already acknowledged invoices, then inserts the commitment into the cancelled set.</p></div><div><code>acknowledgeReceipt</code><p>Checks merchant authorization, invoice state, evidence linkage, amount, token, recipient, and network, then stores a salted receipt commitment once.</p></div></div>
      <p><RepoLink path="contract/nightparcel.compact">Inspect the implemented Compact source</RepoLink>.</p>
    </DocSection>
    <DocSection id="ledger-state" title="Public ledger state">
      <ul><li>Sealed <code>merchantKey</code>, <code>networkTag</code>, and <code>tokenColor</code></li><li><code>invoices</code>: set of opaque invoice commitments</li><li><code>cancelled</code>: set of cancelled invoice commitments</li><li><code>receipts</code>: invoice-to-receipt commitment map</li></ul>
      <p>Plaintext invoice terms, salts, merchant secret, and evidence openings do not belong in decoded public state.</p>
    </DocSection>
    <DocSection id="authentication-replay" title="Authentication and replay protection">
      <p>A private <code>merchantSecret</code> witness derives the sealed merchant key. Every state-changing circuit requires the same secret. Duplicate invoice commitments, repeated cancellation, repeated acknowledgement, cross-invoice evidence, wrong token/network/recipient, and acknowledgement after cancellation are rejected.</p>
      <Callout title="Receipt semantics"><p>The receipt is a merchant-authenticated attestation, not an oracle. The contract cannot query the indexer or recipient wallet, so application reconciliation remains mandatory.</p></Callout>
    </DocSection>
    <DocSection id="wallet-boundary" title="Wallet and connector boundary">
      <p>The browser discovers injected wallets dynamically, accepts Connector API major version 4, requests owner authorization, and then checks connection status, configured network, shielded address, balances, DUST, transfer/submission/history/proving capabilities, and the local proof-server setting.</p>
      <p>Lace 2.4.2 may omit the optional runtime <code>hintUsage</code> method despite the 4.0.1 type. NightParcel records that mismatch but never bypasses mandatory readiness checks or permission rejection.</p>
    </DocSection>
  </>;
}
