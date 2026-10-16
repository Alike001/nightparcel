import type { DocPage } from './types';
import Introduction from './pages/Introduction';
import GettingStarted from './pages/GettingStarted';
import Payments from './pages/Payments';
import Verification from './pages/Verification';
import Privacy from './pages/Privacy';
import Architecture from './pages/Architecture';
import Developers from './pages/Developers';
import Troubleshooting from './pages/Troubleshooting';
import Roadmap from './pages/Roadmap';

export const docPages: DocPage[] = [
  { slug: '', label: 'Introduction', title: 'Understand NightParcel', description: 'What NightParcel does, what is verified, and where the prototype boundary sits.', eyebrow: 'Documentation', sections: [{ id: 'what-nightparcel-does', title: 'What NightParcel does' }, { id: 'current-status', title: 'Current product status' }, { id: 'core-principle', title: 'Evidence before status' }], component: Introduction },
  { slug: 'getting-started', label: 'Getting started', title: 'Run NightParcel locally', description: 'Install the pinned toolchain, start Midnight services, and connect disposable Lace profiles safely.', eyebrow: 'User guide', sections: [{ id: 'requirements', title: 'Requirements' }, { id: 'install', title: 'Install and verify' }, { id: 'local-network', title: 'Local services' }, { id: 'web-app', title: 'Open NightParcel' }, { id: 'lace-readiness', title: 'Lace readiness' }], component: GettingStarted },
  { slug: 'payments', label: 'Payments', title: 'Request, review, and pay', description: 'Follow the product workflow without confusing a local draft or wallet callback with settlement.', eyebrow: 'User guide', sections: [{ id: 'request-payment', title: 'Request payment' }, { id: 'make-payment', title: 'Make payment' }, { id: 'payment-states', title: 'Payment states' }, { id: 'delays', title: 'Delayed transactions' }], component: Payments },
  { slug: 'verification', label: 'Verification', title: 'Prove settlement with six checks', description: 'Understand the evidence required for PAID_VERIFIED and inspect the genuine recorded local run.', eyebrow: 'Evidence', sections: [{ id: 'six-checks', title: 'Six settlement checks' }, { id: 'historical-run', title: 'Historical evidence' }, { id: 'incomplete-evidence', title: 'Incomplete evidence' }], component: Verification },
  { slug: 'privacy', label: 'Privacy', title: 'Know the exact privacy boundary', description: 'See what stays private, what remains observable, and which confidentiality claims NightParcel does not make.', eyebrow: 'Security model', sections: [{ id: 'kept-private', title: 'Kept private' }, { id: 'publicly-observable', title: 'Publicly observable' }, { id: 'browser-data', title: 'Browser data' }, { id: 'full-boundary', title: 'Full inventory' }], component: Privacy },
  { slug: 'architecture', label: 'Architecture', title: 'Self-custodial by construction', description: 'Explore the Compact commitment registry, direct shielded transfers, authentication, and replay protection.', eyebrow: 'Technical design', sections: [{ id: 'contract-circuits', title: 'Contract circuits' }, { id: 'ledger-state', title: 'Ledger state' }, { id: 'authentication-replay', title: 'Authentication and replay' }, { id: 'wallet-boundary', title: 'Wallet boundary' }], component: Architecture },
  { slug: 'developers', label: 'Developers', title: 'Reproduce the verified implementation', description: 'Use the pinned compiler, SDKs, service images, source paths, and quality commands.', eyebrow: 'Developer guide', sections: [{ id: 'toolchain', title: 'Pinned toolchain' }, { id: 'source-map', title: 'Source map' }, { id: 'commands', title: 'Quality gates' }, { id: 'local-execution', title: 'Local execution' }, { id: 'reconciliation', title: 'Integration invariant' }], component: Developers },
  { slug: 'troubleshooting', label: 'Troubleshooting', title: 'Resolve readiness and evidence problems', description: 'Fix common Lace, network, DUST, proving, asset, and reconciliation failures without bypassing safety checks.', eyebrow: 'Support', sections: [{ id: 'lace-not-detected', title: 'Lace not detected' }, { id: 'authorization-rejected', title: 'Authorization rejected' }, { id: 'connector-incompatible', title: 'API incompatible' }, { id: 'hint-usage', title: 'hintUsage missing' }, { id: 'wrong-network', title: 'Wrong network' }, { id: 'no-dust', title: 'No DUST' }, { id: 'proof-server', title: 'Proof server' }, { id: 'missing-token', title: 'Missing token' }, { id: 'unresolved', title: 'Unresolved transaction' }, { id: 'lost-local-state', title: 'Lost local state' }], component: Troubleshooting },
  { slug: 'roadmap', label: 'Roadmap', title: 'Wave 2 reality and Wave 3 direction', description: 'Separate implemented capabilities from runtime gates, investigation targets, and explicit non-goals.', eyebrow: 'Project status', sections: [{ id: 'wave-2', title: 'Wave 2' }, { id: 'wave-3', title: 'Wave 3 candidates' }, { id: 'excluded', title: 'Excluded' }], component: Roadmap },
];

export function pathForDoc(page: DocPage): string {
  return page.slug ? `/docs/${page.slug}` : '/docs';
}
