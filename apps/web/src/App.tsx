import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Brand } from './components/Brand';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));
const DocumentationPage = lazy(() => import('./pages/DocumentationPage'));

function PageLoader() {
  return (
    <main className="route-loader" id="main-content" aria-live="polite">
      <Brand />
      <div className="route-loader-line" />
      <p>Opening NightParcel…</p>
    </main>
  );
}

function NotFound() {
  return (
    <main className="not-found" id="main-content">
      <Brand />
      <p className="section-label">404 · Page not found</p>
      <h1>This parcel has no destination.</h1>
      <p>The page may have moved. Your wallet and payment state were not changed.</p>
      <Link className="button button-primary" to="/">Return home</Link>
    </main>
  );
}

export function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/docs/*" element={<DocumentationPage />} />
          <Route path="/app/*" element={<WorkspacePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
