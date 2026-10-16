import { Callout, DocSection, StatusTable } from '../components';

export default function Roadmap() {
  return <>
    <p className="doc-lede">Wave 2 prioritizes a small original Compact contract, genuine local settlement evidence, and an honest product surface. Wave 3 work starts only after browser-runtime gates are proven.</p>
    <DocSection id="wave-2" title="Implemented for Wave 2">
      <StatusTable rows={[
        ['Original invoice commitment contract', 'Verified', 'Three circuits, merchant authorization, replay protection, and private openings.'],
        ['Simulator and privacy checks', 'Verified', 'Contract state-machine and prohibited-field coverage.'],
        ['Controlled local settlement', 'Verified', '125 custom shielded units, two independent wallets, indexer success, and matching commitments.'],
        ['Public product and documentation', 'Verified', 'Landing, task workspace, first-party docs, responsive tests, and genuine evidence separation.'],
        ['Browser connector readiness', 'Runtime pending', 'Compatibility fix and diagnostics pass deterministically; real two-profile authorization remains owner-controlled.'],
      ]} />
    </DocSection>
    <DocSection id="wave-3" title="Wave 3 candidates—not current features">
      <ul><li>Verified browser Compact creation and receipt acknowledgement</li><li>Encrypted, account-scoped private-state persistence, export, and recovery</li><li>Complete two-profile browser reconciliation and durable retry logic</li><li>Stronger raw transaction/Zswap decoding and privacy scanning</li><li>Public-network evaluation only after approval and security review</li><li>Accessibility validation with screen readers, forced colors, and high zoom</li></ul>
      <Callout title="No delivery promise"><p>These are investigation targets, not commitments or available product capabilities.</p></Callout>
    </DocSection>
    <DocSection id="excluded" title="Explicitly excluded">
      <p>NightParcel does not plan to add sNIGHT, a custodial vault, bridging, mobile applications, browser extensions, AI features, or real-value asset support within the accepted architecture.</p>
    </DocSection>
  </>;
}
