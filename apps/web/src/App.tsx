import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleDollarSign,
  Copy,
  FileCheck2,
  FilePlus2,
  Fingerprint,
  LockKeyhole,
  PlugZap,
  Radio,
  ReceiptText,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
} from 'lucide-react';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import verifiedRun from './data/verified-run.json';
import {
  connectWallet,
  detectWallets,
  isCompatibleConnectorVersion,
  makeInvoiceTransfer,
  validateRequest,
  type ConnectorTransfer,
  type InvoiceRequest,
  type WalletDiagnostic,
} from './connector';

type Surface = 'readiness' | 'create' | 'pay' | 'evidence';

const surfaces: Array<{ id: Surface; label: string; icon: typeof Radio }> = [
  { id: 'readiness', label: 'Readiness', icon: Radio },
  { id: 'create', label: 'Create & share', icon: FilePlus2 },
  { id: 'pay', label: 'Review & pay', icon: WalletCards },
  { id: 'evidence', label: 'Verify evidence', icon: FileCheck2 },
];

const compact = (value: string, start = 8, end = 6) =>
  value.length > start + end ? `${value.slice(0, start)}…${value.slice(-end)}` : value;

function StatusPill({ tone, children }: { tone: 'good' | 'warn' | 'muted'; children: ReactNode }) {
  return <span className={`pill ${tone}`}><span className="dot" />{children}</span>;
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
}

export function App() {
  const [surface, setSurface] = useState<Surface>('readiness');
  const [wallets, setWallets] = useState(detectWallets());
  const [selectedWallet, setSelectedWallet] = useState('');
  const [api, setApi] = useState<ConnectedAPI | null>(null);
  const [walletState, setWalletState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [walletMessage, setWalletMessage] = useState('No browser wallet connected');
  const [dust, setDust] = useState<bigint | null>(null);
  const [diagnostic, setDiagnostic] = useState<WalletDiagnostic | null>(null);
  const [draft, setDraft] = useState({ amount: '125', expiry: '', memo: '' });
  const [requestText, setRequestText] = useState('');
  const [request, setRequest] = useState<InvoiceRequest | null>(null);
  const [requestError, setRequestError] = useState('');
  const [transfer, setTransfer] = useState<ConnectorTransfer | null>(null);
  const [paymentState, setPaymentState] = useState<'idle' | 'authorizing' | 'submitted' | 'error'>('idle');
  const [paymentMessage, setPaymentMessage] = useState('');

  useEffect(() => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      const found = detectWallets();
      setWallets(found);
      setSelectedWallet((current) => current || found[0]?.key || '');
      if (++attempts >= 10) window.clearInterval(timer);
    }, 300);
    return () => window.clearInterval(timer);
  }, []);

  const activeIndex = surfaces.findIndex((item) => item.id === surface);
  const selected = wallets.find((wallet) => wallet.key === selectedWallet);
  const runDate = new Date(verifiedRun.generatedAt).toLocaleString();
  const allChecksPassed = Object.values(verifiedRun.verificationChecks).every(Boolean);

  const draftJson = useMemo(() => JSON.stringify({
    version: 'nightparcel.invoice.draft.v1',
    amount: draft.amount,
    expiresAt: draft.expiry || null,
    memo: draft.memo,
    state: 'DRAFT_UNCOMMITTED',
  }, null, 2), [draft]);

  async function handleConnect() {
    if (!selected) {
      setWalletState('error');
      setWalletMessage('No Midnight connector was detected in this browser profile.');
      return;
    }
    setWalletState('connecting');
    setWalletMessage('Waiting for wallet authorization…');
    try {
      const connected = await connectWallet(selected, 'undeployed');
      const dustBalance = await connected.api.getDustBalance();
      setApi(connected.diagnostic.readyForTransfer ? connected.api : null);
      setDiagnostic(connected.diagnostic);
      setDust(dustBalance.balance);
      setWalletState(connected.diagnostic.readyForTransfer ? 'connected' : 'error');
      setWalletMessage(connected.diagnostic.readyForTransfer
        ? `${selected.name} passed every transfer-readiness check.`
        : connected.diagnostic.issues.join(' '));
      if (import.meta.env.DEV) console.info('NightParcel sanitized wallet diagnostic', connected.diagnostic);
    } catch (error) {
      setApi(null);
      setDiagnostic(null);
      setWalletState('error');
      setWalletMessage(error instanceof Error ? error.message : 'Wallet connection failed.');
    }
  }

  function handleImport() {
    try {
      const parsed = validateRequest(JSON.parse(requestText));
      setRequest(parsed);
      setRequestError('');
    } catch (error) {
      setRequest(null);
      setRequestError(error instanceof Error ? error.message : 'Invalid request.');
    }
  }

  async function handlePay() {
    if (!api || !request) return;
    setPaymentState('authorizing');
    setPaymentMessage('Review and approve the exact shielded output in your wallet.');
    try {
      const result = await makeInvoiceTransfer(api, request);
      setTransfer(result);
      setPaymentState('submitted');
      setPaymentMessage('Submitted. Settlement remains unresolved until indexer and recipient reconciliation complete.');
    } catch (error) {
      setPaymentState('error');
      setPaymentMessage(error instanceof Error ? error.message : 'Transfer failed.');
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="NightParcel home">
          <span className="brand-mark"><LockKeyhole size={18} /></span>
          <span>NightParcel</span>
        </a>
        <div className="top-status">
          <StatusPill tone="warn">Local test network</StatusPill>
          <button className="wallet-button" onClick={handleConnect} disabled={walletState === 'connecting'}>
            <PlugZap size={16} />
            {walletState === 'connected' ? 'Wallet connected' : walletState === 'connecting' ? 'Connecting…' : 'Connect wallet'}
          </button>
        </div>
      </header>

      <aside className="sidebar" aria-label="NightParcel workflow">
        <div className="sidebar-intro">
          <p>Private payments.</p>
          <p>Verifiable settlement.</p>
        </div>
        <nav>
          {surfaces.map((item, index) => {
            const Icon = item.icon;
            return <button key={item.id} className={surface === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setSurface(item.id)} aria-current={surface === item.id ? 'page' : undefined}>
              <span className="step-number">0{index + 1}</span><Icon size={18} /><span>{item.label}</span><ChevronRight className="nav-chevron" size={16} />
            </button>;
          })}
        </nav>
        <div className="privacy-note"><ShieldCheck size={18} /><p><strong>Self-custodial by design.</strong><br />NightParcel never receives your payment tokens or wallet keys.</p></div>
      </aside>

      <main id="top" className="main">
        <div className="progress" aria-label={`Step ${activeIndex + 1} of 4`}><span style={{ width: `${((activeIndex + 1) / 4) * 100}%` }} /></div>

        {surface === 'readiness' && <section className="surface" aria-labelledby="readiness-title">
          <div className="eyebrow">Environment check · 01</div>
          <div className="surface-heading"><div><h1 id="readiness-title">Ready when every signal agrees.</h1><p>Wallet, network, DUST, proof path, and supported token are checked independently before any payment action.</p></div><Fingerprint size={38} /></div>

          <div className="grid two">
            <article className="card primary-card">
              <div className="card-head"><div><span className="kicker">Browser profile</span><h2>Live connector</h2></div><StatusPill tone={walletState === 'connected' ? 'good' : walletState === 'error' ? 'warn' : 'muted'}>{walletState}</StatusPill></div>
              <div className="field"><label htmlFor="wallet-select">Detected wallet</label><select id="wallet-select" value={selectedWallet} onChange={(event) => setSelectedWallet(event.target.value)}><option value="">No connector detected</option>{wallets.map((wallet) => <option key={wallet.key} value={wallet.key}>{wallet.name} · API {wallet.api.apiVersion} · {isCompatibleConnectorVersion(wallet.api.apiVersion) ? 'compatible' : 'blocked'}</option>)}</select></div>
              <div className="readiness-list">
                <div><span>Connector</span><strong>{selected ? `API ${selected.api.apiVersion}` : 'Not detected'}</strong></div>
                <div><span>Network</span><strong>{diagnostic?.configuration.networkId ?? 'Not checked'}</strong></div>
                <div><span>Account identity</span><strong>{diagnostic ? `#${diagnostic.wallet.accountFingerprint}` : 'Not checked'}</strong></div>
                <div><span>Shielded address</span><strong>{diagnostic?.wallet.shieldedAddressPreview ?? 'Not checked'}</strong></div>
                <div><span>DUST balance</span><strong>{dust === null ? 'Not checked' : dust.toString()}</strong></div>
                <div><span>Payment capability</span><strong>{diagnostic?.capabilities.makeTransfer ? 'makeTransfer available' : 'Not checked'}</strong></div>
                <div><span>Local proving</span><strong>{diagnostic ? diagnostic.proofServer.browserReachability : 'Not checked'}</strong></div>
                <div><span>Private state</span><strong>Locked until contract flow</strong></div>
              </div>
              <p className={walletState === 'error' ? 'inline-alert' : 'supporting'}>{walletMessage}</p>
              <div className="button-row readiness-actions"><button className="button primary" onClick={handleConnect} disabled={walletState === 'connecting'}><PlugZap size={17} />{walletState === 'connected' ? 'Refresh wallet checks' : 'Connect on undeployed'}</button>{diagnostic && <button className="button secondary" onClick={() => copy(JSON.stringify(diagnostic, null, 2))}><Copy size={16} />Copy sanitized diagnostic</button>}</div>
            </article>

            <article className="card evidence-card">
              <div className="card-head"><div><span className="kicker">Captured {runDate}</span><h2>Verified local run</h2></div><StatusPill tone="good">PAID_VERIFIED</StatusPill></div>
              <div className="hero-number"><strong>{verifiedRun.amount}</strong><span>custom shielded units</span></div>
              <div className="balance-line"><div><span>Payer</span><strong>{verifiedRun.balances.payerBefore} → {verifiedRun.balances.payerAfter}</strong></div><ArrowRight /><div><span>Merchant</span><strong>{verifiedRun.balances.merchantBefore} → {verifiedRun.balances.merchantAfter}</strong></div></div>
              <div className="verified-row"><Check size={16} /> Proofs generated · indexer SUCCESS · both wallet histories reconciled</div>
              <button className="text-button" onClick={() => setSurface('evidence')}>Inspect authentic evidence <ArrowRight size={15} /></button>
            </article>
          </div>
        </section>}

        {surface === 'create' && <section className="surface" aria-labelledby="create-title">
          <div className="eyebrow">Merchant request · 02</div>
          <div className="surface-heading"><div><h1 id="create-title">Create the private terms first.</h1><p>Amount, recipient keys, expiry, memo, and salts stay off the public ledger. Only the final commitment belongs on-chain.</p></div><ReceiptText size={38} /></div>
          <div className="grid create-grid">
            <form className="card form-card" onSubmit={(event) => event.preventDefault()}>
              <div className="notice"><TriangleAlert size={18} /><p><strong>Draft mode.</strong> Browser contract submission is not enabled until the connector integration passes its two-profile runtime gate. This form cannot claim an on-chain invoice.</p></div>
              <div className="form-row"><div className="field"><label htmlFor="amount">Amount</label><input id="amount" inputMode="numeric" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} /></div><div className="field"><label htmlFor="expiry">Expiry</label><input id="expiry" type="datetime-local" value={draft.expiry} onChange={(event) => setDraft({ ...draft, expiry: event.target.value })} /></div></div>
              <div className="field"><label htmlFor="memo">Private memo</label><textarea id="memo" rows={4} placeholder="e.g. Product design milestone 2" value={draft.memo} onChange={(event) => setDraft({ ...draft, memo: event.target.value })} /><small>Never written directly to public contract state.</small></div>
              <div className="button-row"><button type="button" className="button secondary" onClick={() => copy(draftJson)}><Copy size={16} />Copy private draft</button><button type="button" className="button primary" disabled>Create on-chain commitment</button></div>
            </form>
            <aside className="card boundary-card"><span className="kicker">Disclosure preview</span><h2>What changes on-chain</h2><div className="boundary-list"><div className="private"><LockKeyhole size={16} /><span><strong>Private</strong>Amount, recipient, expiry, memo, ID, salt</span></div><div className="public"><Radio size={16} /><span><strong>Public</strong>Opaque invoice commitment and creation timing</span></div></div><pre>{draftJson}</pre></aside>
          </div>
        </section>}

        {surface === 'pay' && <section className="surface" aria-labelledby="pay-title">
          <div className="eyebrow">Payer review · 03</div>
          <div className="surface-heading"><div><h1 id="pay-title">Review one exact output.</h1><p>NightParcel asks the connected wallet to create a direct shielded transfer. The invoice contract never handles the token.</p></div><CircleDollarSign size={38} /></div>
          <div className="grid pay-grid">
            <article className="card form-card"><div className="field"><label htmlFor="request">Invoice request JSON</label><textarea id="request" className="code-input" rows={11} value={requestText} onChange={(event) => setRequestText(event.target.value)} placeholder={'{\n  "version": "nightparcel.invoice.v1",\n  "network": "undeployed",\n  …\n}'} /></div>{requestError && <p className="inline-alert" role="alert">{requestError}</p>}<button className="button secondary" onClick={handleImport}>Validate private request</button></article>
            <article className="card review-card">
              <div className="card-head"><div><span className="kicker">Pre-sign review</span><h2>{request ? 'Request validated locally' : 'Awaiting a valid request'}</h2></div><StatusPill tone={request ? 'good' : 'muted'}>{request ? 'READY_TO_AUTHORIZE' : 'UNRESOLVED'}</StatusPill></div>
              {request ? <><div className="review-amount"><span>Exact amount</span><strong>{request.amount}</strong><small>token {compact(request.tokenColor)}</small></div><dl className="details"><div><dt>Recipient</dt><dd>{compact(request.recipient, 16, 10)}</dd></div><div><dt>Commitment</dt><dd>{compact(request.invoiceCommitment, 12, 8)}</dd></div><div><dt>Network</dt><dd>{request.network}</dd></div><div><dt>Expires</dt><dd>{new Date(request.expiresAt * 1000).toLocaleString()}</dd></div></dl></> : <div className="empty-state"><LockKeyhole size={24} /><p>Paste a merchant-provided request. NightParcel validates required fields and expiry before wallet interaction.</p></div>}
              {paymentMessage && <p className={paymentState === 'error' ? 'inline-alert' : 'supporting'} aria-live="polite">{paymentMessage}</p>}
              <button className="button primary full" disabled={!request || !api || paymentState === 'authorizing'} onClick={handlePay}>{paymentState === 'authorizing' ? 'Waiting for wallet…' : 'Authorize shielded payment'}<ArrowRight size={17} /></button>
              {!api && <small className="button-help">Connect a compatible browser wallet on undeployed to enable payment.</small>}
            </article>
          </div>
        </section>}

        {surface === 'evidence' && <section className="surface" aria-labelledby="evidence-title">
          <div className="eyebrow">Settlement proof · 04</div>
          <div className="surface-heading"><div><h1 id="evidence-title">Evidence, not a promise.</h1><p>Contract truth, network truth, and two wallet-local observations remain visibly separate until all of them agree.</p></div><ShieldCheck size={38} /></div>

          {transfer && <div className="notice session-notice"><Radio size={18} /><p><strong>Current browser session: SUBMITTED.</strong> ID {compact(transfer.transactionId, 14, 10)}. It is not marked paid; recipient reconciliation and receipt acknowledgement have not occurred.</p></div>}
          <div className="evidence-header"><div><span className="kicker">Clean local run · immutable snapshot</span><h2>Invoice {compact(verifiedRun.commitments.invoice, 10, 8)}</h2></div><StatusPill tone={allChecksPassed ? 'good' : 'warn'}>{verifiedRun.applicationStatus}</StatusPill></div>
          <div className="timeline" aria-label="Verified settlement timeline">
            {[
              ['Payer accepted', 'Wallet history SUCCESS', verifiedRun.verificationChecks.payerAccepted],
              ['Network confirmed', `Block ${verifiedRun.transfer.blockHeight} · indexer SUCCESS`, verifiedRun.verificationChecks.indexerAccepted],
              ['Recipient observed', `Merchant balance +${verifiedRun.amount}`, verifiedRun.verificationChecks.recipientReconciled],
              ['Receipt acknowledged', compact(verifiedRun.commitments.receipt, 12, 8), verifiedRun.verificationChecks.receiptMatches],
            ].map(([title, detail, passed], index) => <div className="timeline-item" key={String(title)}><span className={passed ? 'timeline-mark passed' : 'timeline-mark'}>{passed ? <Check size={16} /> : index + 1}</span><div><strong>{title}</strong><span>{detail}</span></div></div>)}
          </div>
          <div className="metric-grid"><Metric label="Transaction ID" value={compact(verifiedRun.transfer.transactionId, 12, 10)} hint="33-byte wallet identifier" /><Metric label="Indexed hash" value={compact(verifiedRun.transfer.indexedHash, 12, 10)} hint="Both histories matched" /><Metric label="Confirmation block" value={`#${verifiedRun.transfer.blockHeight}`} hint={compact(verifiedRun.transfer.blockHash)} /><Metric label="Proof + finalize" value={`${(verifiedRun.transfer.proofMilliseconds / 1000).toFixed(1)}s`} hint="Local proof server" /></div>
          <div className="grid two evidence-bottom"><article className="card"><span className="kicker">Publicly visible</span><h3>Ledger and indexer</h3><ul className="clean-list"><li>{verifiedRun.publicVisibility.identifiers} opaque identifiers</li><li>Zswap range {verifiedRun.publicVisibility.zswapRange.join(' → ')}</li><li>{verifiedRun.publicVisibility.zswapEventCount} opaque Zswap events</li><li>{verifiedRun.publicVisibility.rawTransactionHexCharacters.toLocaleString()} raw transaction hex characters</li><li>Invoice and receipt commitments with timing</li></ul></article><article className="card"><span className="kicker">Not directly found</span><h3>Positive-control privacy scan</h3><ul className="clean-list positive"><li><Check size={15} />Invoice ID and salts</li><li><Check size={15} />Amount and recipient keys</li><li><Check size={15} />Terms and evidence digests</li><li><Check size={15} />Merchant authorization secret</li></ul><p className="supporting">This supports payment confidentiality, not complete transaction anonymity. Timing, fees, commitments, nullifiers, and opaque raw bytes remain public.</p></article></div>
        </section>}
      </main>
    </div>
  );
}
