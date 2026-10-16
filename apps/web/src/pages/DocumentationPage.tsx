import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Github, Menu, X } from 'lucide-react';
import { Brand } from '../components/Brand';
import { docPages, pathForDoc } from '../docs/registry';

function DocumentationNotFound() {
  return <div className="doc-not-found"><p className="section-label">Documentation · 404</p><h1>That guide does not exist.</h1><p>Use the documentation index to find a maintained NightParcel guide.</p><Link className="button button-primary" to="/docs">Documentation home</Link></div>;
}

export default function DocumentationPage() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const slug = location.pathname.replace(/^\/docs\/?/, '').replace(/\/$/, '');
  const pageIndex = docPages.findIndex((entry) => entry.slug === slug);
  const page = pageIndex >= 0 ? docPages[pageIndex] : undefined;
  const previous = pageIndex > 0 ? docPages[pageIndex - 1] : undefined;
  const next = pageIndex >= 0 && pageIndex < docPages.length - 1 ? docPages[pageIndex + 1] : undefined;

  useEffect(() => {
    document.title = page ? `${page.title} · NightParcel docs` : 'Documentation not found · NightParcel';
    setMobileOpen(false);
    if (!location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [page, location.pathname, location.hash]);

  return (
    <div className="docs-shell">
      <header className="docs-header">
        <div className="docs-header-inner">
          <Brand compact />
          <span className="docs-product-label"><BookOpen />Documentation</span>
          <nav aria-label="Documentation utility navigation"><Link to="/">Home</Link><Link to="/app">Open app</Link><a href="https://github.com/Alike001/nightparcel" target="_blank" rel="noreferrer"><Github />GitHub</a></nav>
          <button className="docs-mobile-trigger" type="button" aria-label={mobileOpen ? 'Close documentation navigation' : 'Open documentation navigation'} aria-expanded={mobileOpen} aria-controls="docs-mobile-navigation" onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X /> : <Menu />}<span>{mobileOpen ? 'Close' : 'Guides'}</span></button>
        </div>
        {mobileOpen && <nav id="docs-mobile-navigation" className="docs-mobile-navigation" aria-label="Mobile documentation navigation">{docPages.map((entry) => <NavLink end={!entry.slug} key={entry.slug} to={pathForDoc(entry)}>{entry.label}</NavLink>)}</nav>}
      </header>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          <p>NightParcel guides</p>
          <nav aria-label="Documentation navigation">{docPages.map((entry) => <NavLink end={!entry.slug} key={entry.slug} to={pathForDoc(entry)}>{entry.label}</NavLink>)}</nav>
          <div><span>Current scope</span><strong>Wave 2 prototype</strong><small>Local test network only</small></div>
        </aside>

        <main id="main-content" className="docs-main">
          {!page ? <DocumentationNotFound /> : <>
            <article className="doc-article">
              <header className="doc-page-header"><p>{page.eyebrow}</p><h1>{page.title}</h1><span>{page.description}</span></header>
              <page.component />
            </article>
            <nav className="doc-pagination" aria-label="Documentation pagination">
              {previous ? <Link to={pathForDoc(previous)}><ArrowLeft /><span>Previous<strong>{previous.label}</strong></span></Link> : <span />}
              {next && <Link to={pathForDoc(next)}><span>Next<strong>{next.label}</strong></span><ArrowRight /></Link>}
            </nav>
          </>}
        </main>

        {page && <aside className="docs-toc"><p>On this page</p><nav aria-label="On this page">{page.sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}</nav><a href="https://github.com/Alike001/nightparcel/tree/main/docs" target="_blank" rel="noreferrer">Raw technical reports <ArrowRight /></a></aside>}
      </div>
    </div>
  );
}
