import { Callout, DocSection, RepoLink } from '../components';

export default function Verification() {
  return <>
    <p className="doc-lede">NightParcel assigns <code>PAID_VERIFIED</code> only when six independent checks agree. Submission, confirmation, receipt acknowledgement, or a balance change alone is insufficient.</p>
    <DocSection id="six-checks" title="The six settlement checks">
      <ol className="verification-list"><li><b>01</b><div><strong>Payer acceptance</strong><p>The payer wallet history recognizes the exact transaction identifier and accepted outcome.</p></div></li><li><b>02</b><div><strong>Indexer acceptance</strong><p>The corresponding indexed transaction is successful in a concrete block.</p></div></li><li><b>03</b><div><strong>Recipient reconciliation</strong><p>An independent recipient wallet observes the relevant transfer outcome.</p></div></li><li><b>04</b><div><strong>Sender balance delta</strong><p>The controlled payer balance decreases by the requested token amount.</p></div></li><li><b>05</b><div><strong>Recipient balance delta</strong><p>The controlled recipient balance increases by that same amount.</p></div></li><li><b>06</b><div><strong>Commitment match</strong><p>The invoice opening, transaction evidence, and stored receipt commitment recompute consistently.</p></div></li></ol>
      <Callout tone="warning" title="Controlled-run limitation"><p>Wallet history does not publicly decode the private amount. Balance-delta attribution assumes no concurrent same-token activity; ambiguity must remain unresolved.</p></Callout>
    </DocSection>
    <DocSection id="historical-run" title="Recorded local-network evidence">
      <p>Phase 1B recorded a genuine 125-unit custom shielded-token transfer between independent Alice and Bob local wallets. Alice moved from 300 to 175, Bob from 0 to 125, the indexer reported success, commitments matched, and duplicate acknowledgement was rejected.</p>
      <p>This is historical project evidence—not the activity or balance of a current browser user.</p>
      <ul><li><RepoLink path="docs/PHASE_1B_REPORT.md">Phase 1B technical report</RepoLink></li><li><RepoLink path="evidence/phase1b-local.json">Redacted machine-readable evidence</RepoLink></li><li><RepoLink path="evidence/phase1b-indexer-transaction.json">Recorded indexer response</RepoLink></li></ul>
    </DocSection>
    <DocSection id="incomplete-evidence" title="When evidence is incomplete">
      <p>Keep the state <code>UNRESOLVED</code>. Retain the transaction identifier, do not guess which invoice a transfer settled, and do not acknowledge a receipt until the recipient and network evidence can be attributed to the same request.</p>
    </DocSection>
  </>;
}
