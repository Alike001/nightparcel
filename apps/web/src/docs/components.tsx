import { useState, type ReactNode } from 'react';
import { Check, Copy, ExternalLink, Link as LinkIcon } from 'lucide-react';

export function DocSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="doc-section" id={id}>
      <h2><a href={`#${id}`}>{title}<LinkIcon aria-hidden="true" /></a></h2>
      {children}
    </section>
  );
}

export function Callout({ tone = 'note', title, children }: { tone?: 'note' | 'warning' | 'verified'; title: string; children: ReactNode }) {
  return <aside className={`doc-callout ${tone}`}><strong>{title}</strong><div>{children}</div></aside>;
}

export function CodeBlock({ children, label = 'Terminal' }: { children: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }
  return (
    <div className="doc-code">
      <div><span>{label}</span><button type="button" onClick={copy} aria-label={`Copy ${label} code`}>{copied ? <Check /> : <Copy />}{copied ? 'Copied' : 'Copy'}</button></div>
      <pre><code>{children}</code></pre>
    </div>
  );
}

export function RepoLink({ path, children }: { path: string; children: ReactNode }) {
  return <a className="doc-inline-link" href={`https://github.com/Alike001/nightparcel/blob/main/${path}`} target="_blank" rel="noreferrer">{children}<ExternalLink aria-hidden="true" /></a>;
}

export function StatusTable({ rows }: { rows: Array<[string, string, string]> }) {
  return (
    <div className="doc-table-wrap">
      <table><thead><tr><th>Capability</th><th>Status</th><th>Meaning</th></tr></thead><tbody>{rows.map(([capability, status, meaning]) => <tr key={capability}><td>{capability}</td><td><span className={`doc-status ${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span></td><td>{meaning}</td></tr>)}</tbody></table>
    </div>
  );
}
