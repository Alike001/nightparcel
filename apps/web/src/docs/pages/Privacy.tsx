import { Callout, DocSection, RepoLink } from '../components';

export default function Privacy() {
  return <>
    <p className="doc-lede">NightParcel protects invoice openings and uses a supported custom shielded token, but it does not promise anonymity or invisible network activity.</p>
    <DocSection id="kept-private" title="Kept out of decoded contract state">
      <ul><li>Merchant authentication secret</li><li>Invoice identifier and commercial description</li><li>Amount, expiry, recipient public keys, and terms digest</li><li>Invoice and receipt salts</li><li>Wallet identifier digest, indexed hash, block hash, and receipt opening</li><li>Wallet seeds, spending keys, passwords, and private keys</li></ul>
      <p>The intended recipient learns the request contents when the merchant shares a readable request or evidence bundle. Selective sharing is operational, not magically revocable.</p>
    </DocSection>
    <DocSection id="publicly-observable" title="Public or correlatable">
      <ul><li>Contract address and call timing</li><li>Merchant key commitment, network tag, and supported token color</li><li>Opaque invoice and receipt commitments and state transitions</li><li>Transaction/block metadata, proof presence, and fees</li><li>Zswap commitments, nullifiers/events, and opaque raw transaction data</li><li>Custom-token issuance metadata</li><li>Timing, repeated values, wallet activity, and deliberately shared evidence</li></ul>
      <Callout tone="warning" title="Native NIGHT is not confidential"><p>NIGHT remains unshielded. NightParcel does not implement sNIGHT, a wrapper, a bridge, or confidential native NIGHT transfers.</p></Callout>
    </DocSection>
    <DocSection id="browser-data" title="Browser files and diagnostics">
      <p>A downloaded draft is plaintext. Anyone who receives it can read its contents. The wallet diagnostic is sanitized but its short account fingerprint remains pseudonymous and linkable across repeated checks.</p>
      <p>Encrypted account-scoped browser private-state persistence and recovery are not enabled. Clearing browser state can remove local drafts and future application openings even when the wallet seed still exists.</p>
    </DocSection>
    <DocSection id="full-boundary" title="Technical privacy inventory">
      <p><RepoLink path="docs/PRIVACY_BOUNDARY.md">Read the complete public/private field inventory and empirical scan results</RepoLink>.</p>
    </DocSection>
  </>;
}
