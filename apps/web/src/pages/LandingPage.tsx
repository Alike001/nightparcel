import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Blocks, Check, CircleCheck, Eye, EyeOff, FileText, Github,
  KeyRound, Menu, Radio, ReceiptText, WalletCards,
} from 'lucide-react';
import { Brand } from '../components/Brand';
import verifiedRun from '../data/verified-run.json';

const githubUrl = 'https://github.com/Alike001/nightparcel';

export default function LandingPage() {
  useEffect(() => {
    document.title = 'NightParcel · Get paid privately. Prove it confidently.';
  }, []);

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="site-container landing-nav">
          <Brand />
          <nav className="desktop-links" aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#security">Security</a>
            <Link to="/docs">Documentation</Link>
            <a href={githubUrl} target="_blank" rel="noreferrer">GitHub</a>
            <Link className="button button-compact button-primary" to="/app">Open app</Link>
          </nav>
          <details className="mobile-menu">
            <summary aria-label="Open navigation"><Menu size={20} /></summary>
            <nav aria-label="Mobile navigation">
              <a href="#how-it-works">How it works</a>
              <a href="#security">Security</a>
              <Link to="/docs">Documentation</Link>
              <a href={githubUrl}>GitHub</a>
              <Link to="/app">Open app</Link>
            </nav>
          </details>
        </div>
      </header>

      <main id="main-content">
        <section className="hero site-container">
          <div className="hero-copy">
            <p className="network-note"><span /> Built for Midnight · local test network</p>
            <h1>Get paid privately.<br /><em>Prove it confidently.</em></h1>
            <p className="hero-lede">Create confidential payment requests, transfer supported shielded tokens directly, and verify settlement on Midnight.</p>
            <div className="hero-actions">
              <Link className="button button-primary" to="/app">Open NightParcel <ArrowRight size={17} /></Link>
              <a className="text-link" href="#recorded-evidence">See verified evidence <ArrowRight size={15} /></a>
            </div>
            <p className="hero-caveat">Wave 2 prototype. Custom test tokens only—no mainnet or real-value payments.</p>
          </div>

          <div className="hero-product" aria-label="NightParcel product architecture preview">
            <div className="preview-window">
              <div className="preview-bar"><span /><span /><span /><small>NightParcel · Payment review</small></div>
              <div className="preview-body">
                <div className="preview-rail"><div className="mini-brand">NP</div><span className="active" /><span /><span /><span /></div>
                <div className="preview-content">
                  <div className="preview-heading"><div><small>PRIVATE REQUEST</small><strong>Design milestone</strong></div><span className="state-label neutral">Review</span></div>
                  <div className="preview-amount"><span>Amount due</span><strong>125</strong><small>NightParcel Demo Token</small></div>
                  <div className="preview-details"><p><span>Recipient</span><b>mn_shield…19f3</b></p><p><span>Network</span><b>Local / undeployed</b></p></div>
                  <div className="privacy-strip"><EyeOff size={15} /><span>Invoice terms stay off the public ledger</span></div>
                  <div className="preview-action">Authorize in Lace <ArrowRight size={15} /></div>
                </div>
              </div>
            </div>
            <div className="evidence-float"><CircleCheck size={18} /><div><small>Settlement rule</small><strong>6 checks must agree</strong></div></div>
          </div>
        </section>

        <section className="principle-band" aria-label="Product principles">
          <div className="site-container principle-grid">
            <div><KeyRound size={19} /><span><strong>Self-custodial</strong>Your wallet signs every payment</span></div>
            <div><EyeOff size={19} /><span><strong>Confidential by design</strong>Invoice openings stay private</span></div>
            <div><CircleCheck size={19} /><span><strong>Evidence before status</strong>Submission is never called settlement</span></div>
          </div>
        </section>

        <section className="content-section site-container" id="how-it-works">
          <div className="section-intro">
            <p className="section-label">A clearer payment trail</p>
            <h2>Three steps. Three independent truths.</h2>
            <p>NightParcel separates the private request, the wallet transfer, and the evidence that proves the two belong together.</p>
          </div>
          <ol className="process-list">
            <li><span>01</span><FileText /><div><h3>Request</h3><p>Create payment terms privately. NightParcel publishes only an opaque commitment when browser contract creation is enabled.</p></div></li>
            <li><span>02</span><WalletCards /><div><h3>Pay</h3><p>The client reviews one exact output and authorizes a direct custom shielded-token transfer in Lace.</p></div></li>
            <li><span>03</span><ReceiptText /><div><h3>Verify</h3><p>Wallets, indexer, balance changes, and the receipt commitment must agree before the result is independently verified.</p></div></li>
          </ol>
        </section>

        <section className="content-section product-story site-container">
          <div className="story-copy">
            <p className="section-label">Built around the real architecture</p>
            <h2>A payment workspace, not a promise machine.</h2>
            <p>Every state has an authority. Draft comes from your device. Submitted comes from the payer wallet. Confirmed comes from the network. Received comes from the merchant wallet. NightParcel shows the gaps instead of hiding them.</p>
            <Link className="text-link" to="/app/activity">Explore activity and evidence <ArrowRight size={15} /></Link>
          </div>
          <div className="state-stack" aria-label="NightParcel settlement states">
            <article><span className="state-label neutral">Draft</span><div><strong>Private request prepared</strong><p>Not yet an on-chain invoice</p></div></article>
            <article><span className="state-label pending">Submitted</span><div><strong>Wallet handed off the transaction</strong><p>Settlement is still unresolved</p></div></article>
            <article><span className="state-label verified">Verified</span><div><strong>All six checks agree</strong><p>Independent evidence supports settlement</p></div></article>
          </div>
        </section>

        <section className="privacy-section" id="security">
          <div className="site-container privacy-layout">
            <div className="section-intro">
              <p className="section-label">An exact privacy boundary</p>
              <h2>Private does not mean invisible.</h2>
              <p>NightParcel keeps invoice contents out of its decoded contract state. Midnight still exposes the public facts needed to order and verify transactions.</p>
            </div>
            <div className="privacy-columns">
              <article className="privacy-card private-card"><EyeOff /><p className="card-label">Kept private</p><h3>Commercial terms</h3><ul><li>Amount and intended recipient</li><li>Description and invoice identifier</li><li>Expiry, salts, and merchant secret</li><li>Receipt evidence opening</li></ul></article>
              <article className="privacy-card public-card"><Eye /><p className="card-label">Publicly observable</p><h3>Network evidence</h3><ul><li>Opaque invoice and receipt commitments</li><li>Transaction and block metadata</li><li>Timing, fees, nullifiers, and events</li><li>Custom-token issuance metadata</li></ul></article>
            </div>
            <p className="privacy-disclaimer">NightParcel supports payment confidentiality—not complete anonymity. Native NIGHT remains unshielded and is not offered as a private payment asset.</p>
          </div>
        </section>

        <section className="content-section midnight-section site-container">
          <div className="midnight-visual" aria-hidden="true"><div className="ledger-node"><Blocks /></div><span /><div className="ledger-node accent"><Radio /></div><span /><div className="ledger-node"><CircleCheck /></div></div>
          <div>
            <p className="section-label">Midnight-native by construction</p>
            <h2>Compact commitments. Shielded transfers. Independent reconciliation.</h2>
            <p>The original Compact contract controls invoice commitments, cancellation, and merchant-authenticated receipt commitments. Supported custom shielded tokens move directly between user wallets—the contract never holds payment funds.</p>
            <div className="fact-row"><span><strong>3</strong> Compact circuits</span><span><strong>18</strong> simulator tests</span><span><strong>0</strong> custodial transfers</span></div>
          </div>
        </section>

        <section className="evidence-section site-container" id="recorded-evidence">
          <div className="evidence-title-row">
            <div><p className="section-label">Recorded local-network run</p><h2>Real evidence, clearly separated.</h2></div>
            <span className="recorded-badge">Historical evidence · not your activity</span>
          </div>
          <div className="evidence-layout">
            <article className="evidence-primary">
              <div className="evidence-number"><strong>{verifiedRun.amount}</strong><span>custom shielded units</span></div>
              <p>A controlled transfer between two independent local wallets, recorded {new Date(verifiedRun.generatedAt).toLocaleDateString()}.</p>
              <div className="balance-change"><span>Payer <b>{verifiedRun.balances.payerBefore} → {verifiedRun.balances.payerAfter}</b></span><ArrowRight /><span>Merchant <b>{verifiedRun.balances.merchantBefore} → {verifiedRun.balances.merchantAfter}</b></span></div>
            </article>
            <ul className="evidence-checks">
              <li><Check />Proof generation completed</li><li><Check />Indexer reported {verifiedRun.transfer.status}</li><li><Check />Both wallet histories reconciled</li><li><Check />Receipt commitment matched</li><li><Check />Duplicate acknowledgement rejected</li>
            </ul>
          </div>
          <p className="evidence-footnote">Local custom test token on `undeployed`. This is not mainnet evidence and does not represent real-value funds.</p>
        </section>

        <section className="closing-cta site-container">
          <div><p className="section-label">Wave 2 prototype</p><h2>See the product as it really works.</h2><p>Explore the request, payment, evidence, and wallet-readiness flows without connecting a wallet.</p></div>
          <Link className="button button-primary" to="/app">Open the app <ArrowRight size={17} /></Link>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="site-container footer-layout">
          <div><Brand /><p>Private payments. Verifiable settlement.</p></div>
          <div className="footer-links"><a href={githubUrl}><Github size={15} />Repository</a><Link to="/docs">Documentation</Link><Link to="/app/settings">Product limitations</Link></div>
          <p className="footer-note">Apache-2.0 · Midnight local prototype · No mainnet deployment</p>
        </div>
      </footer>
    </div>
  );
}
