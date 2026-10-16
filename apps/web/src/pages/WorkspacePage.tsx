import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowRight, Check, ChevronDown, CircleCheck,
  Clipboard, Copy, Download, FileInput, FilePlus2, Fingerprint, Gauge,
  Home, Info, LockKeyhole, Menu, PlugZap, Radio, ReceiptText,
  Settings, ShieldCheck, Upload, WalletCards, XCircle,
} from 'lucide-react';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { Brand } from '../components/Brand';
import verifiedRun from '../data/verified-run.json';
import {
  connectWallet,
  detectWallets,
  isCompatibleConnectorVersion,
  makeInvoiceTransfer,
  validateRequest,
  type ConnectorTransfer,
  type InvoiceRequest,
  type WalletDiagnostic,
} from '../connector';

type WalletState = 'disconnected' | 'connecting' | 'connected' | 'error';
type PaymentState = 'idle' | 'authorizing' | 'submitted' | 'failed';
type Notice = { tone: 'info' | 'success' | 'warning' | 'error'; message: string; details?: string };
type DraftForm = { amount: string; token: string; description: string; expiry: string; recipient: string };

const workspaceNavigation = [
  { path: '/app', label: 'Overview', icon: Home, end: true },
  { path: '/app/request', label: 'Request payment', icon: FilePlus2 },
  { path: '/app/pay', label: 'Make payment', icon: WalletCards },
  { path: '/app/activity', label: 'Activity and evidence', icon: Activity },
  { path: '/app/settings', label: 'Settings', icon: Settings },
];

const supportedToken = 'NightParcel Demo Token';
const compact = (value: string, start = 10, end = 8) => value.length > start + end ? `${value.slice(0, start)}…${value.slice(-end)}` : value;

function Status({ tone, children }: { tone: 'neutral' | 'pending' | 'verified' | 'failed'; children: ReactNode }) {
  return <span className={`state-label ${tone}`}>{children}</span>;
}

function NoticePanel({ notice }: { notice: Notice }) {
  const Icon = notice.tone === 'success' ? CircleCheck : notice.tone === 'error' ? XCircle : notice.tone === 'warning' ? AlertTriangle : Info;
  return (
    <div className={`notice-panel ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
      <Icon size={18} />
      <div><p>{notice.message}</p>{notice.details && <details><summary>Technical details</summary><code>{notice.details}</code></details>}</div>
    </div>
  );
}

function WorkspaceNavigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="workspace-navigation" aria-label="Workspace navigation">
      {workspaceNavigation.map(({ path, label, icon: Icon, end }) => (
        <NavLink key={path} to={path} end={end} onClick={onNavigate} className={({ isActive }) => isActive ? 'active' : ''}>
          <Icon size={17} /><span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function WorkspacePage() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wallets, setWallets] = useState(detectWallets());
  const [selectedWallet, setSelectedWallet] = useState('');
  const [api, setApi] = useState<ConnectedAPI | null>(null);
  const [walletState, setWalletState] = useState<WalletState>('disconnected');
  const [walletNotice, setWalletNotice] = useState<Notice>({ tone: 'info', message: 'Connect Lace when you are ready to authorize a local test payment.' });
  const [diagnostic, setDiagnostic] = useState<WalletDiagnostic | null>(null);
  const [draft, setDraft] = useState<DraftForm>({ amount: '', token: supportedToken, description: '', expiry: '', recipient: '' });
  const [draftErrors, setDraftErrors] = useState<Partial<Record<keyof DraftForm, string>>>({});
  const [draftArtifact, setDraftArtifact] = useState<string | null>(null);
  const [draftNotice, setDraftNotice] = useState<Notice | null>(null);
  const [requestText, setRequestText] = useState('');
  const [request, setRequest] = useState<InvoiceRequest | null>(null);
  const [requestNotice, setRequestNotice] = useState<Notice | null>(null);
  const [transfer, setTransfer] = useState<ConnectorTransfer | null>(null);
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [paymentNotice, setPaymentNotice] = useState<Notice | null>(null);

  useEffect(() => {
    document.title = 'NightParcel workspace · Local test network';
    let attempts = 0;
    const scan = () => {
      const found = detectWallets();
      setWallets(found);
      setSelectedWallet((current) => current || found[0]?.key || '');
      attempts += 1;
      if (attempts === 10) window.clearInterval(timer);
    };
    scan();
    const timer = window.setInterval(scan, 400);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => setMobileMenuOpen(false), [location.pathname]);

  const selected = wallets.find((wallet) => wallet.key === selectedWallet);
  const activeSection = location.pathname === '/app' ? 'overview'
    : location.pathname.split('/')[2] || 'overview';

  async function handleConnect() {
    if (!selected) {
      setWalletState('error');
      setWalletNotice({
        tone: 'error',
        message: 'Lace is not available in this browser profile.',
        details: 'Install or enable the official Lace Midnight extension, unlock it, then refresh this page. NightParcel will never ask for your password or seed.',
      });
      return;
    }
    setWalletState('connecting');
    setWalletNotice({ tone: 'info', message: 'Check Lace and approve the NightParcel connection request.' });
    try {
      const connected = await connectWallet(selected, 'undeployed');
      setDiagnostic(connected.diagnostic);
      if (!connected.diagnostic.readyForTransfer) {
        setApi(null);
        setWalletState('error');
        setWalletNotice({ tone: 'error', message: 'This wallet is connected but not ready for local payments.', details: connected.diagnostic.issues.join(' ') });
        return;
      }
      setApi(connected.api);
      setWalletState('connected');
      const compatibilityDetails = connected.diagnostic.compatibilityLimitations.join(' ');
      setWalletNotice(compatibilityDetails
        ? {
            tone: 'warning',
            message: `${selected.name} passed the required local payment checks with a connector compatibility note.`,
            details: compatibilityDetails,
          }
        : { tone: 'success', message: `${selected.name} is ready on the local Midnight network.` });
      if (import.meta.env.DEV) console.info('NightParcel sanitized wallet diagnostic', connected.diagnostic);
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Unknown connector failure';
      setApi(null);
      setDiagnostic(null);
      setWalletState('error');
      setWalletNotice({ tone: 'error', message: 'NightParcel could not finish connecting to Lace.', details });
    }
  }

  function validateDraft(): boolean {
    const next: Partial<Record<keyof DraftForm, string>> = {};
    if (!/^\d+$/.test(draft.amount) || BigInt(draft.amount || '0') <= 0n) next.amount = 'Enter a whole amount greater than zero.';
    if (!draft.description.trim()) next.description = 'Add a short private description.';
    if (!draft.recipient.trim()) next.recipient = 'Enter the intended recipient’s full shielded address.';
    if (!draft.expiry || new Date(draft.expiry).getTime() <= Date.now()) next.expiry = 'Choose an expiry in the future.';
    setDraftErrors(next);
    return Object.keys(next).length === 0;
  }

  function createDraft() {
    if (!validateDraft()) {
      setDraftArtifact(null);
      setDraftNotice({ tone: 'error', message: 'Check the highlighted request details.' });
      return;
    }
    const artifact = {
      version: 'nightparcel.invoice.draft.v1',
      state: 'DRAFT_UNCOMMITTED',
      network: 'undeployed',
      token: { label: draft.token, kind: 'custom-shielded-test-token' },
      amount: draft.amount,
      description: draft.description.trim(),
      expiresAt: Math.floor(new Date(draft.expiry).getTime() / 1_000),
      intendedRecipient: draft.recipient.trim(),
      warning: 'This browser draft is not an on-chain invoice commitment and cannot be paid through NightParcel.',
    };
    setDraftArtifact(JSON.stringify(artifact, null, 2));
    setDraftNotice({ tone: 'warning', message: 'Private draft created. Browser contract submission is not yet verified, so this file is not payable.' });
  }

  async function copyText(value: string, success: string) {
    await navigator.clipboard.writeText(value);
    setDraftNotice({ tone: 'success', message: success });
  }

  function downloadDraft() {
    if (!draftArtifact) return;
    const url = URL.createObjectURL(new Blob([draftArtifact], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'nightparcel-private-request-draft.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setDraftNotice({ tone: 'success', message: 'Private draft downloaded to this device.' });
  }

  function importRequestText(value: string) {
    setRequestText(value);
    try {
      const parsedJson = JSON.parse(value) as { version?: string };
      if (parsedJson.version === 'nightparcel.invoice.draft.v1') {
        throw new Error('This is an uncommitted draft. Ask the merchant for a committed nightparcel.invoice.v1 request before paying.');
      }
      const parsed = validateRequest(parsedJson);
      setRequest(parsed);
      setRequestNotice({ tone: 'success', message: 'Request validated locally. Review every term before connecting your wallet.' });
    } catch (error) {
      const details = error instanceof SyntaxError ? 'The selected file is not valid JSON.' : error instanceof Error ? error.message : 'Invalid request file.';
      setRequest(null);
      setRequestNotice({ tone: 'error', message: 'NightParcel could not validate this payment request.', details });
    }
  }

  async function handleFileImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 256_000) {
      setRequestNotice({ tone: 'error', message: 'This request file is too large.', details: 'NightParcel accepts JSON request files up to 256 KB.' });
      return;
    }
    importRequestText(await file.text());
  }

  async function handlePay() {
    if (!api || !request || paymentState === 'authorizing') return;
    setPaymentState('authorizing');
    setPaymentNotice({ tone: 'info', message: 'Review the exact output in Lace. NightParcel is waiting for your decision.' });
    try {
      const result = await makeInvoiceTransfer(api, request);
      setTransfer(result);
      setPaymentState('submitted');
      setPaymentNotice({ tone: 'warning', message: 'Transaction submitted. Payment remains unresolved until network and recipient evidence agree.' });
    } catch (error) {
      setPaymentState('failed');
      setPaymentNotice({ tone: 'error', message: 'The payment was not submitted successfully.', details: error instanceof Error ? error.message : 'Unknown transfer failure' });
    }
  }

  const draftPreview = useMemo(() => ({
    amount: draft.amount || '—', description: draft.description || 'No description yet',
    expiry: draft.expiry ? new Date(draft.expiry).toLocaleString() : 'Not set',
    recipient: draft.recipient ? compact(draft.recipient, 16, 10) : 'Not set',
  }), [draft]);

  return (
    <div className="workspace-shell">
      <header className="workspace-header">
        <div className="workspace-header-inner">
          <Brand compact />
          <div className="environment-label"><Radio size={13} />Local test network</div>
          <div className="workspace-header-actions">
            <Link className="back-to-site" to="/">Public site</Link>
            <Link className="back-to-site" to="/docs/getting-started">Help</Link>
            <button className="wallet-connect" onClick={handleConnect} disabled={walletState === 'connecting'}>
              <PlugZap size={16} />
              {walletState === 'connected' ? 'Lace connected' : walletState === 'connecting' ? 'Waiting for Lace…' : 'Connect Lace'}
            </button>
            <button className="mobile-nav-trigger" aria-expanded={mobileMenuOpen} aria-controls="mobile-workspace-menu" onClick={() => setMobileMenuOpen((open) => !open)}><Menu size={20} /><span className="sr-only">Workspace menu</span></button>
          </div>
        </div>
        <div className="workspace-nav-wrap"><WorkspaceNavigation /></div>
        {mobileMenuOpen && <div id="mobile-workspace-menu" className="mobile-workspace-menu"><WorkspaceNavigation onNavigate={() => setMobileMenuOpen(false)} /></div>}
      </header>

      <main id="main-content" className="workspace-main">
        <div className="workspace-context"><span>NightParcel workspace</span><b>{workspaceNavigation.find((item) => item.path === location.pathname)?.label ?? 'Overview'}</b></div>

        {activeSection === 'overview' && (
          <section className="workspace-page" aria-labelledby="overview-title">
            <div className="page-heading"><div><p className="section-label">Overview</p><h1 id="overview-title">Private payments, with evidence built in.</h1><p>Prepare requests, authorize direct payments in Lace, and keep settlement claims tied to independent evidence.</p></div><Status tone={walletState === 'connected' ? 'verified' : walletState === 'error' ? 'failed' : 'neutral'}>{walletState === 'connected' ? 'Wallet ready' : walletState === 'error' ? 'Action needed' : 'Wallet disconnected'}</Status></div>
            {walletState !== 'connected' ? (
              <div className="wallet-empty-state">
                <div className="empty-state-icon"><WalletCards /></div>
                <div><h2>Connect a disposable Lace wallet</h2><p>Use Lace on the local Midnight network to review balances and authorize test-token payments. NightParcel never asks for a seed or wallet password.</p><ol><li>Unlock Lace in this browser profile</li><li>Choose the local `undeployed` network</li><li>Approve the NightParcel connection request</li></ol></div>
                <button className="button button-primary" onClick={handleConnect} disabled={walletState === 'connecting'}>{walletState === 'connecting' ? 'Waiting for Lace…' : 'Connect Lace'} <ArrowRight size={17} /></button>
              </div>
            ) : (
              <div className="wallet-summary-grid">
                <article className="summary-card prominent"><span>Connected account</span><strong>#{diagnostic?.wallet.accountFingerprint}</strong><small>{diagnostic?.wallet.shieldedAddressPreview}</small></article>
                <article className="summary-card"><span>DUST available</span><strong>{diagnostic?.balances.dustBalance}</strong><small>Fee resource reported by Lace</small></article>
                <article className="summary-card"><span>Shielded assets</span><strong>{diagnostic?.balances.shieldedTokenTypes}</strong><small>Token types, not an invented balance</small></article>
              </div>
            )}
            <NoticePanel notice={walletNotice} />
            <div className="quick-actions">
              <Link to="/app/request"><FilePlus2 /><span><strong>Request payment</strong>Create a private local draft</span><ArrowRight /></Link>
              <Link to="/app/pay"><WalletCards /><span><strong>Make payment</strong>Import and review a request</span><ArrowRight /></Link>
              <Link to="/app/activity"><ReceiptText /><span><strong>Review evidence</strong>Separate live and recorded state</span><ArrowRight /></Link>
            </div>
            <div className="overview-boundary"><LockKeyhole /><div><strong>What NightParcel cannot claim yet</strong><p>Browser-created commitments, browser recipient reconciliation, and encrypted private-state recovery are not verified. The interface keeps those actions gated.</p></div><Link to="/app/settings">View limitations</Link></div>
          </section>
        )}

        {activeSection === 'request' && (
          <section className="workspace-page" aria-labelledby="request-title">
            <div className="page-heading"><div><p className="section-label">Request payment</p><h1 id="request-title">Prepare private payment terms.</h1><p>Create a readable local draft. Nothing is published, uploaded, or placed in a URL.</p></div><Status tone="neutral">Draft only</Status></div>
            <div className="form-layout">
              <form className="product-form" onSubmit={(event) => { event.preventDefault(); createDraft(); }} noValidate>
                <div className="field-row">
                  <div className={`form-field ${draftErrors.amount ? 'has-error' : ''}`}><label htmlFor="draft-amount">Amount</label><div className="amount-input"><input id="draft-amount" inputMode="numeric" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} aria-describedby={draftErrors.amount ? 'draft-amount-error' : undefined} /><span>units</span></div>{draftErrors.amount && <small id="draft-amount-error" className="field-error">{draftErrors.amount}</small>}</div>
                  <div className="form-field"><label htmlFor="draft-token">Supported token</label><select id="draft-token" value={draft.token} onChange={(event) => setDraft({ ...draft, token: event.target.value })}><option>{supportedToken}</option></select><small>Custom shielded token · local testing only</small></div>
                </div>
                <div className={`form-field ${draftErrors.description ? 'has-error' : ''}`}><label htmlFor="draft-description">Private description</label><textarea id="draft-description" rows={3} placeholder="Example: Brand identity — final milestone" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />{draftErrors.description && <small className="field-error">{draftErrors.description}</small>}<small>Shared in the private request file, never placed in a public URL.</small></div>
                <div className={`form-field ${draftErrors.recipient ? 'has-error' : ''}`}><label htmlFor="draft-recipient">Intended recipient</label><input id="draft-recipient" autoComplete="off" placeholder="Full local Midnight shielded address" value={draft.recipient} onChange={(event) => setDraft({ ...draft, recipient: event.target.value })} />{draftErrors.recipient && <small className="field-error">{draftErrors.recipient}</small>}</div>
                <div className={`form-field ${draftErrors.expiry ? 'has-error' : ''}`}><label htmlFor="draft-expiry">Expires</label><input id="draft-expiry" type="datetime-local" value={draft.expiry} onChange={(event) => setDraft({ ...draft, expiry: event.target.value })} />{draftErrors.expiry && <small className="field-error">{draftErrors.expiry}</small>}</div>
                {draftNotice && <NoticePanel notice={draftNotice} />}
                <div className="form-actions"><button className="button button-primary" type="submit">Create private draft <ArrowRight size={17} /></button><button className="button button-secondary" type="button" disabled title="Browser Compact submission has not passed the runtime gate">Commit on Midnight</button></div>
              </form>
              <aside className="request-preview">
                <p className="card-label">Private request preview</p><h2>{draftPreview.description}</h2><div className="preview-due"><span>Amount due</span><strong>{draftPreview.amount}</strong><small>{draft.token}</small></div>
                <dl><div><dt>Recipient</dt><dd>{draftPreview.recipient}</dd></div><div><dt>Expires</dt><dd>{draftPreview.expiry}</dd></div><div><dt>Network</dt><dd>Local / undeployed</dd></div><div><dt>On-chain state</dt><dd>Not committed</dd></div></dl>
                {draftArtifact && <div className="artifact-actions"><button onClick={downloadDraft}><Download />Download file</button><button onClick={() => copyText(draftArtifact, 'Private draft copied to your clipboard.')}><Copy />Copy draft</button></div>}
                <div className="draft-boundary"><AlertTriangle /><p><strong>Draft files are not payable.</strong> A committed request must contain the real contract address, token color, recipient keys, salt, and commitment.</p></div>
              </aside>
            </div>
          </section>
        )}

        {activeSection === 'pay' && (
          <section className="workspace-page" aria-labelledby="pay-title">
            <div className="page-heading"><div><p className="section-label">Make payment</p><h1 id="pay-title">Review before your wallet signs.</h1><p>Import a committed request, inspect the exact output, then authorize the direct shielded transfer in Lace.</p></div><Status tone={paymentState === 'submitted' ? 'pending' : paymentState === 'failed' ? 'failed' : 'neutral'}>{paymentState === 'submitted' ? 'Submitted · unresolved' : paymentState === 'failed' ? 'Failed' : 'No payment started'}</Status></div>
            <div className="payment-steps" aria-label="Payment progress"><span className={request ? 'complete' : 'active'}>1 <b>Import</b></span><span className={request ? 'active' : ''}>2 <b>Review</b></span><span>3 <b>Authorize</b></span><span>4 <b>Reconcile</b></span></div>
            <div className="payment-layout">
              <article className="import-panel">
                <div className="file-drop"><FileInput /><h2>Choose a payment request</h2><p>Select a `.json` file shared privately by the merchant.</p><label className="button button-secondary" htmlFor="request-file"><Upload size={16} />Select file</label><input id="request-file" className="visually-hidden-input" type="file" accept="application/json,.json" onChange={handleFileImport} /></div>
                <details className="advanced-input"><summary><ChevronDown />Advanced: paste request JSON</summary><label htmlFor="request-json">Committed request JSON</label><textarea id="request-json" rows={10} value={requestText} onChange={(event) => setRequestText(event.target.value)} placeholder="Paste nightparcel.invoice.v1 JSON" /><button className="button button-secondary" type="button" onClick={() => importRequestText(requestText)}>Validate pasted request</button></details>
                {requestNotice && <NoticePanel notice={requestNotice} />}
              </article>
              <article className="payment-review">
                <div className="review-heading"><div><p className="card-label">Payment review</p><h2>{request ? 'Check every term' : 'Waiting for a request'}</h2></div>{request && <Status tone="neutral">Locally validated</Status>}</div>
                {request ? <><div className="review-total"><span>You will send</span><strong>{request.amount}</strong><small>custom shielded units</small></div><dl className="review-list"><div><dt>Recipient</dt><dd>{compact(request.recipient, 18, 12)}</dd></div><div><dt>Token color</dt><dd>{compact(request.tokenColor)}</dd></div><div><dt>Network</dt><dd>{request.network}</dd></div><div><dt>Invoice commitment</dt><dd>{compact(request.invoiceCommitment)}</dd></div><div><dt>Expires</dt><dd>{new Date(request.expiresAt * 1_000).toLocaleString()}</dd></div></dl><div className="review-warning"><ShieldCheck /><p>The invoice contract does not receive this token. Lace creates one direct shielded output to the recipient above.</p></div></> : <div className="review-empty"><Clipboard /><p>Import a committed request to see exact amount, token, recipient, network, and expiry.</p></div>}
                {paymentNotice && <NoticePanel notice={paymentNotice} />}
                <button className="button button-primary button-full" onClick={handlePay} disabled={!request || !api || paymentState === 'authorizing'}>{paymentState === 'authorizing' ? 'Waiting for Lace approval…' : 'Authorize in Lace'} <ArrowRight size={17} /></button>
                {!api && <p className="button-explanation">Connect a compatible Lace wallet from the header. A valid request alone cannot start a payment.</p>}
              </article>
            </div>
          </section>
        )}

        {activeSection === 'activity' && (
          <section className="workspace-page" aria-labelledby="activity-title">
            <div className="page-heading"><div><p className="section-label">Activity and evidence</p><h1 id="activity-title">Know what happened—and what has not.</h1><p>Live browser state and recorded project evidence are kept in separate sections.</p></div></div>
            <article className="live-activity-panel">
              <div className="panel-heading"><div><p className="card-label">This browser session</p><h2>Live payment state</h2></div><Status tone={transfer ? 'pending' : paymentState === 'failed' ? 'failed' : 'neutral'}>{transfer ? 'Submitted · unresolved' : paymentState === 'failed' ? 'Failed' : 'No activity'}</Status></div>
              {transfer ? <div className="live-transaction"><Radio /><div><strong>Shielded transfer submitted</strong><span>{new Date(transfer.submittedAt).toLocaleString()}</span><code>{compact(transfer.transactionId, 20, 14)}</code></div><p>Recipient reconciliation, indexer mapping, balance deltas, and receipt acknowledgement are still missing.</p></div> : <div className="activity-empty"><Activity /><div><strong>No live browser payment yet</strong><p>Import a committed request and authorize it in Lace. Recorded evidence below is never inserted into this list.</p></div><Link to="/app/pay">Make a payment</Link></div>}
            </article>

            <div className="state-guide"><h2>Settlement states</h2><div><span><Status tone="neutral">Draft</Status>Local request only</span><span><Status tone="pending">Submitted</Status>Wallet handoff returned</span><span><Status tone="pending">Pending</Status>Network not final</span><span><Status tone="failed">Unresolved</Status>Evidence disagrees or is incomplete</span><span><Status tone="failed">Failed</Status>Rejected or discarded</span><span><Status tone="neutral">Acknowledged</Status>Merchant attestation only</span><span><Status tone="verified">Independently verified</Status>All six checks agree</span></div></div>

            <article className="recorded-evidence-panel">
              <div className="recorded-banner"><Info /><p><strong>Recorded project evidence—not your activity.</strong> This immutable snapshot comes from a controlled Node-wallet run on the disposable local network.</p></div>
              <div className="panel-heading"><div><p className="card-label">Phase 1B local run · {new Date(verifiedRun.generatedAt).toLocaleDateString()}</p><h2>125-unit settlement</h2></div><Status tone="verified">PAID_VERIFIED</Status></div>
              <div className="settlement-timeline">
                {[['Payer accepted', 'Wallet history SUCCESS'], ['Network confirmed', `Block ${verifiedRun.transfer.blockHeight} · indexer SUCCESS`], ['Recipient observed', `Balance +${verifiedRun.amount}`], ['Receipt matched', compact(verifiedRun.commitments.receipt)]].map(([title, detail], index) => <div key={title}><span><Check /></span><p><strong>{title}</strong><small>{detail}</small></p>{index < 3 && <i />}</div>)}
              </div>
              <div className="evidence-metrics"><div><span>Payer balance</span><strong>{verifiedRun.balances.payerBefore} → {verifiedRun.balances.payerAfter}</strong></div><div><span>Merchant balance</span><strong>{verifiedRun.balances.merchantBefore} → {verifiedRun.balances.merchantAfter}</strong></div><div><span>Indexed hash</span><strong>{compact(verifiedRun.transfer.indexedHash)}</strong></div><div><span>Proof + finalize</span><strong>{(verifiedRun.transfer.proofMilliseconds / 1_000).toFixed(1)}s</strong></div></div>
              <details className="evidence-details"><summary>View recorded public evidence</summary><dl><div><dt>Wallet transaction ID</dt><dd>{verifiedRun.transfer.transactionId}</dd></div><div><dt>Block hash</dt><dd>{verifiedRun.transfer.blockHash}</dd></div><div><dt>Invoice commitment</dt><dd>{verifiedRun.commitments.invoice}</dd></div><div><dt>Receipt commitment</dt><dd>{verifiedRun.commitments.receipt}</dd></div></dl></details>
            </article>
          </section>
        )}

        {activeSection === 'settings' && (
          <section className="workspace-page" aria-labelledby="settings-title">
            <div className="page-heading"><div><p className="section-label">Settings</p><h1 id="settings-title">Wallet readiness and privacy.</h1><p>Every technical check lives here, away from the primary payment tasks.</p></div></div>
            <div className="settings-grid">
              <article className="settings-card"><div className="settings-icon"><PlugZap /></div><div><h2>Wallet connection</h2><p>Approve NightParcel from Lace in this browser profile. Passwords, seed recovery, and signing stay inside the extension.</p><label htmlFor="wallet-provider">Detected connector</label><select id="wallet-provider" value={selectedWallet} onChange={(event) => setSelectedWallet(event.target.value)}><option value="">No connector detected</option>{wallets.map((wallet) => <option key={wallet.key} value={wallet.key}>{wallet.name} · API {wallet.api.apiVersion} · {isCompatibleConnectorVersion(wallet.api.apiVersion) ? 'compatible' : 'blocked'}</option>)}</select><button className="button button-primary" onClick={handleConnect} disabled={walletState === 'connecting'}>{walletState === 'connecting' ? 'Waiting for Lace…' : diagnostic ? 'Run checks again' : 'Connect and check'}</button></div></article>
              <article className="settings-card"><div className="settings-icon"><Gauge /></div><div><h2>Local network</h2><p>NightParcel currently supports the disposable `undeployed` network and local prover only.</p><dl className="settings-list"><div><dt>Network</dt><dd>{diagnostic?.configuration.networkId ?? 'Not checked'}</dd></div><div><dt>DUST</dt><dd>{diagnostic?.balances.dustBalance ?? 'Not checked'}</dd></div><div><dt>Local proving</dt><dd>{diagnostic?.proofServer.browserReachability ?? 'Not checked'}</dd></div><div><dt>Transfer API</dt><dd>{diagnostic?.capabilities.makeTransfer ? 'Available' : 'Not checked'}</dd></div></dl></div></article>
              <article className="settings-card"><div className="settings-icon"><Fingerprint /></div><div><h2>Account-scoped state</h2><p>Encrypted browser private-state persistence and recovery have not completed runtime verification. Clearing site data may lose future NightParcel openings even if your wallet seed survives.</p><Status tone="failed">Not enabled</Status></div></article>
              <article className="settings-card"><div className="settings-icon"><ShieldCheck /></div><div><h2>Privacy boundary</h2><p>Invoice terms stay out of decoded NightParcel state. Commitments, timing, transaction metadata, fees, and opaque Zswap data remain publicly observable or correlatable.</p><Link className="text-link" to="/docs/privacy">Read the privacy guide <ArrowRight /></Link><a className="text-link settings-source-link" href="https://github.com/Alike001/nightparcel/blob/main/docs/PRIVACY_BOUNDARY.md">Open the raw technical report <ArrowRight /></a></div></article>
            </div>
            <NoticePanel notice={walletNotice} />
            <details className="developer-diagnostics"><summary><ChevronDown />Developer diagnostics</summary>{diagnostic ? <><p>This output is sanitized. The account fingerprint is pseudonymous and linkable across repeated checks.</p><pre>{JSON.stringify(diagnostic, null, 2)}</pre><button className="button button-secondary" onClick={() => navigator.clipboard.writeText(JSON.stringify(diagnostic, null, 2))}><Copy />Copy sanitized diagnostic</button></> : <p>Connect Lace to populate connector version, endpoints, capabilities, DUST, address preview, and local proving status.</p>}</details>
          </section>
        )}
      </main>
    </div>
  );
}
