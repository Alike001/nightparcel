import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { fromHex } from '@midnight-ntwrk/midnight-js-utils';

export type InvoiceRequest = {
  version: 'nightparcel.invoice.v1';
  network: string;
  contractAddress: string;
  invoiceCommitment: string;
  tokenColor: string;
  amount: string;
  recipient: string;
  expiresAt: number;
  memo?: string;
};

export type ConnectorTransfer = {
  transactionId: string;
  submittedAt: string;
};

export type DetectedWallet = { key: string; name: string; api: InitialAPI };

export const SUPPORTED_CONNECTOR_RANGE = '>=4.0.0 <5.0.0';

export type WalletDiagnostic = {
  checkedAt: string;
  wallet: {
    name: string;
    rdns: string;
    apiVersion: string;
    compatible: boolean;
    accountFingerprint: string;
    shieldedAddressPreview: string;
  };
  connection: { status: 'connected' | 'disconnected'; networkId: string };
  configuration: {
    networkId: string;
    indexerUri: string;
    indexerWsUri: string;
    substrateNodeUri: string;
    proverServerUri: string | null;
  };
  balances: {
    shieldedTokenTypes: number;
    unshieldedTokenTypes: number;
    dustBalance: string;
    dustCap: string;
  };
  capabilities: Record<'makeTransfer' | 'submitTransaction' | 'getTxHistory' | 'getProvingProvider', boolean>;
  proofServer: { configuredForLaceLocal: boolean; browserReachability: 'reachable' | 'cors-or-unreachable' | 'not-configured' };
  compatibilityLimitations: string[];
  issues: string[];
  readyForTransfer: boolean;
};

const REQUIRED_DIAGNOSTIC_METHODS = [
  'getConnectionStatus',
  'getConfiguration',
  'getShieldedAddresses',
  'getShieldedBalances',
  'getUnshieldedBalances',
  'getDustBalance',
] as const satisfies ReadonlyArray<keyof ConnectedAPI>;

const HINTED_METHODS = [
  ...REQUIRED_DIAGNOSTIC_METHODS,
  'makeTransfer',
  'submitTransaction',
  'getTxHistory',
  'getProvingProvider',
] as const;

export function isCompatibleConnectorVersion(version: string): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(version);
  return match !== null && Number(match[1]) === 4;
}

export function detectWallets(): DetectedWallet[] {
  if (typeof window === 'undefined' || !window.midnight) return [];
  const unique = new Set<InitialAPI>();
  return Object.entries(window.midnight).flatMap(([key, api]) => {
    if (!api || typeof api.connect !== 'function' || unique.has(api)) return [];
    unique.add(api);
    return [{ key, name: api.name || key, api }];
  });
}

function previewAddress(value: string): string {
  if (value.length <= 24) return value;
  return `${value.slice(0, 14)}…${value.slice(-8)}`;
}

async function fingerprint(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest).slice(0, 8), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function proofServerReachability(uri: string | undefined): Promise<WalletDiagnostic['proofServer']> {
  if (!uri) return { configuredForLaceLocal: false, browserReachability: 'not-configured' };
  const normalized = uri.replace(/\/$/, '');
  const configuredForLaceLocal = normalized === 'http://localhost:6300' || normalized === 'http://127.0.0.1:6300';
  try {
    const response = await fetch(`${normalized}/health`, { signal: AbortSignal.timeout(3_000) });
    return { configuredForLaceLocal, browserReachability: response.ok ? 'reachable' : 'cors-or-unreachable' };
  } catch {
    return { configuredForLaceLocal, browserReachability: 'cors-or-unreachable' };
  }
}

export async function diagnoseConnectedWallet(
  wallet: DetectedWallet,
  api: ConnectedAPI,
  expectedNetwork: string,
  compatibilityLimitations: string[] = [],
): Promise<WalletDiagnostic> {
  const compatible = isCompatibleConnectorVersion(wallet.api.apiVersion);
  const [status, configuration, addresses, shieldedBalances, unshieldedBalances, dust] = await Promise.all([
    api.getConnectionStatus(),
    api.getConfiguration(),
    api.getShieldedAddresses(),
    api.getShieldedBalances(),
    api.getUnshieldedBalances(),
    api.getDustBalance(),
  ]);
  const capabilities = {
    makeTransfer: typeof api.makeTransfer === 'function',
    submitTransaction: typeof api.submitTransaction === 'function',
    getTxHistory: typeof api.getTxHistory === 'function',
    getProvingProvider: typeof api.getProvingProvider === 'function',
  };
  const proofServer = await proofServerReachability(configuration.proverServerUri);
  const issues: string[] = [];
  if (!compatible) issues.push(`Connector ${wallet.api.apiVersion} is outside ${SUPPORTED_CONNECTOR_RANGE}.`);
  if (status.status !== 'connected') issues.push('Wallet reports a disconnected session.');
  const connectedNetwork = status.status === 'connected' ? status.networkId : '';
  if (connectedNetwork !== expectedNetwork || configuration.networkId !== expectedNetwork) {
    issues.push(`Wallet network does not match ${expectedNetwork}.`);
  }
  if (!addresses.shieldedAddress) issues.push('Wallet returned no shielded address.');
  if (dust.balance <= 0n) issues.push('DUST balance is zero.');
  for (const [name, present] of Object.entries(capabilities)) {
    if (!present) issues.push(`Required connector method ${name} is unavailable.`);
  }
  if (!proofServer.configuredForLaceLocal) issues.push('Lace is not configured for the local proof server on port 6300.');

  return {
    checkedAt: new Date().toISOString(),
    wallet: {
      name: wallet.name,
      rdns: wallet.api.rdns,
      apiVersion: wallet.api.apiVersion,
      compatible,
      accountFingerprint: await fingerprint(addresses.shieldedAddress),
      shieldedAddressPreview: previewAddress(addresses.shieldedAddress),
    },
    connection: { status: status.status, networkId: connectedNetwork },
    configuration: {
      networkId: configuration.networkId,
      indexerUri: configuration.indexerUri,
      indexerWsUri: configuration.indexerWsUri,
      substrateNodeUri: configuration.substrateNodeUri,
      proverServerUri: configuration.proverServerUri ?? null,
    },
    balances: {
      shieldedTokenTypes: Object.keys(shieldedBalances).length,
      unshieldedTokenTypes: Object.keys(unshieldedBalances).length,
      dustBalance: dust.balance.toString(),
      dustCap: dust.cap.toString(),
    },
    capabilities,
    proofServer,
    compatibilityLimitations,
    issues,
    readyForTransfer: issues.length === 0,
  };
}

export function validateRequest(value: unknown): InvoiceRequest {
  if (!value || typeof value !== 'object') throw new Error('Request must be a JSON object.');
  const request = value as Partial<InvoiceRequest>;
  if (request.version !== 'nightparcel.invoice.v1') throw new Error('Unsupported request version.');
  for (const field of ['network', 'contractAddress', 'invoiceCommitment', 'tokenColor', 'amount', 'recipient'] as const) {
    if (typeof request[field] !== 'string' || request[field]!.length === 0) {
      throw new Error(`Request field “${field}” is missing.`);
    }
  }
  if (!/^\d+$/.test(request.amount! as string) || BigInt(request.amount! as string) <= 0n) {
    throw new Error('Amount must be a positive integer.');
  }
  if (typeof request.expiresAt !== 'number' || !Number.isSafeInteger(request.expiresAt)) {
    throw new Error('Expiry must be a Unix timestamp.');
  }
  if (request.expiresAt <= Math.floor(Date.now() / 1_000)) throw new Error('This invoice has expired.');
  return request as InvoiceRequest;
}

export async function connectWallet(
  wallet: DetectedWallet,
  network: string,
): Promise<{ api: ConnectedAPI; diagnostic: WalletDiagnostic }> {
  if (!isCompatibleConnectorVersion(wallet.api.apiVersion)) {
    throw new Error(`Wallet connector ${wallet.api.apiVersion} is incompatible; NightParcel requires ${SUPPORTED_CONNECTOR_RANGE}.`);
  }
  const api = await wallet.api.connect(network);
  const compatibilityLimitations: string[] = [];
  if (typeof api.hintUsage === 'function') {
    await api.hintUsage([...HINTED_METHODS]);
  } else {
    compatibilityLimitations.push(
      'The wallet runtime does not expose Connector API hintUsage; NightParcel continued with explicit capability and readiness checks.',
    );
  }

  const missingDiagnosticMethod = REQUIRED_DIAGNOSTIC_METHODS.find((method) => typeof api[method] !== 'function');
  if (missingDiagnosticMethod) {
    throw new Error(`Required connector method ${missingDiagnosticMethod} is unavailable.`);
  }

  const diagnostic = await diagnoseConnectedWallet(wallet, api, network, compatibilityLimitations);
  if (diagnostic.connection.status !== 'connected' || diagnostic.configuration.networkId !== network) {
    throw new Error(diagnostic.issues.join(' ') || `Wallet is not connected to ${network}.`);
  }
  setNetworkId(network);
  return { api, diagnostic };
}

export async function makeInvoiceTransfer(
  api: ConnectedAPI,
  request: InvoiceRequest,
): Promise<ConnectorTransfer> {
  const config = await api.getConfiguration();
  if (config.networkId !== request.network) {
    throw new Error(`Wallet network ${config.networkId} does not match ${request.network}.`);
  }
  const balances = await api.getShieldedBalances();
  const available = balances[request.tokenColor] ?? 0n;
  const amount = BigInt(request.amount);
  if (available < amount) throw new Error('Insufficient shielded token balance.');

  const { tx } = await api.makeTransfer(
    [{
      kind: 'shielded',
      type: request.tokenColor,
      value: amount,
      recipient: request.recipient,
    }],
    { payFees: true },
  );
  const transaction = Transaction.deserialize(
    'signature',
    'proof',
    'binding',
    fromHex(tx),
  );
  const [transactionId] = transaction.identifiers();
  if (!transactionId) throw new Error('Wallet-created transfer has no transaction identifier.');
  await api.submitTransaction(tx);
  return { transactionId, submittedAt: new Date().toISOString() };
}
