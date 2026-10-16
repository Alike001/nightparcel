import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import {
  MidnightBech32m,
  ShieldedAddress,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
} from '@midnight-ntwrk/wallet-sdk-address-format';
import { Buffer } from 'buffer';
import type { InvoiceOpening } from '../../../contract/managed/nightparcel/contract/index.js';
import { validateRequest, verifiedRequest, type InvoiceRequest, type VerifiedInvoiceRequest } from './invoice-schema';
export { validateRequest } from './invoice-schema';
export type { InvoiceRequest, VerifiedInvoiceRequest } from './invoice-schema';

export type InvoiceState = 'OPEN' | 'CANCELLED' | 'ACKNOWLEDGED' | 'UNKNOWN';

export type InvoiceLedgerView = {
  merchantKey: Uint8Array;
  networkTag: Uint8Array;
  tokenColor: Uint8Array;
  invoices: { member(value: Uint8Array): boolean };
  cancelled: { member(value: Uint8Array): boolean };
  receipts: { member(value: Uint8Array): boolean };
};

export type RequestVerification = {
  request: VerifiedInvoiceRequest;
  state: 'OPEN';
  checkedAt: string;
  checks: {
    network: true;
    deployment: true;
    merchant: true;
    commitment: true;
    recipient: true;
    token: true;
    amountAndExpiry: true;
    openState: true;
    funding: boolean;
  };
};

function bytes(hex: string): Uint8Array {
  return Uint8Array.from(hex.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));
}

function hex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function termsDigest(memo: string): Promise<string> {
  const domain = new TextEncoder().encode('nightparcel:terms:v1');
  const value = new TextEncoder().encode(memo);
  const input = new Uint8Array(domain.length + value.length);
  input.set(domain);
  input.set(value, domain.length);
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', input)));
}

export function invoiceState(publicLedger: Pick<InvoiceLedgerView, 'invoices' | 'cancelled' | 'receipts'>, commitment: Uint8Array): InvoiceState {
  if (!publicLedger.invoices.member(commitment)) return 'UNKNOWN';
  if (publicLedger.cancelled.member(commitment)) return 'CANCELLED';
  if (publicLedger.receipts.member(commitment)) return 'ACKNOWLEDGED';
  return 'OPEN';
}

function openingValue(request: InvoiceRequest): InvoiceOpening {
  return {
    invoiceId: bytes(request.opening.invoiceId),
    amount: BigInt(request.opening.amount),
    payeeCoinPublicKey: bytes(request.opening.payeeCoinPublicKey),
    payeeEncryptionPublicKey: bytes(request.opening.payeeEncryptionPublicKey),
    expiresAt: BigInt(request.opening.expiresAt),
    termsDigest: bytes(request.opening.termsDigest),
  };
}

export async function verifyRequestAgainstLedger(
  rawRequest: unknown,
  publicLedger: InvoiceLedgerView,
  walletNetwork: string,
  now = Math.floor(Date.now() / 1_000),
): Promise<RequestVerification> {
  const request = validateRequest(rawRequest, now);
  if (walletNetwork !== request.network) throw new Error(`Wallet network ${walletNetwork} does not match request network ${request.network}.`);
  if (!constantTimeEqual(hex(publicLedger.networkTag), request.networkTag)) throw new Error('The invoice book network does not match the request.');
  if (!constantTimeEqual(hex(publicLedger.tokenColor), request.tokenColor)) throw new Error('The invoice book does not support the requested token color.');
  if (!constantTimeEqual(hex(publicLedger.merchantKey), request.merchantKey)) throw new Error('The request merchant identity does not match the invoice book.');
  if (!constantTimeEqual(await termsDigest(request.privateMemo), request.opening.termsDigest)) throw new Error('The private memo does not match the committed terms digest.');

  const committedRecipient = MidnightBech32m.encode(request.network, new ShieldedAddress(
    new ShieldedCoinPublicKey(Buffer.from(request.opening.payeeCoinPublicKey, 'hex')),
    new ShieldedEncryptionPublicKey(Buffer.from(request.opening.payeeEncryptionPublicKey, 'hex')),
  )).toString();
  if (!constantTimeEqual(committedRecipient, request.recipient)) {
    throw new Error('The payment recipient does not match the keys committed by the invoice.');
  }

  const { pureCircuits } = await import('../../../contract/managed/nightparcel/contract/index.js');
  const recomputed = pureCircuits.computeInvoiceCommitment(
    bytes(request.contractAddress),
    bytes(request.networkTag),
    bytes(request.tokenColor),
    openingValue(request),
    bytes(request.invoiceSalt),
  );
  if (!constantTimeEqual(hex(recomputed), request.invoiceCommitment)) throw new Error('The invoice opening does not reproduce the claimed commitment.');

  const state = invoiceState(publicLedger, recomputed);
  if (state !== 'OPEN') {
    const reason = state === 'UNKNOWN' ? 'is not registered' : state === 'CANCELLED' ? 'has been cancelled' : 'has already been acknowledged';
    throw new Error(`This invoice ${reason} and cannot authorize a payment.`);
  }

  return {
    request: Object.assign(request, { [verifiedRequest]: true as const }),
    state,
    checkedAt: new Date().toISOString(),
    checks: {
      network: true,
      deployment: true,
      merchant: true,
      commitment: true,
      recipient: true,
      token: true,
      amountAndExpiry: true,
      openState: true,
      funding: false,
    },
  };
}

export async function verifyPayableRequest(api: ConnectedAPI, rawRequest: unknown): Promise<RequestVerification> {
  const parsed = validateRequest(rawRequest);
  const configuration = await api.getConfiguration();
  if (configuration.networkId !== parsed.network) {
    throw new Error(`Wallet network ${configuration.networkId} does not match request network ${parsed.network}.`);
  }
  const publicDataProvider = indexerPublicDataProvider(
    configuration.indexerUri,
    configuration.indexerWsUri,
    window.WebSocket as unknown as Parameters<typeof indexerPublicDataProvider>[2],
  );
  const [state, balances] = await Promise.all([
    publicDataProvider.queryContractState(parsed.contractAddress),
    api.getShieldedBalances(),
  ]);
  if (state === null) throw new Error('The stated NightParcel invoice-book deployment was not found by the connected indexer.');
  if ((balances[parsed.tokenColor] ?? 0n) < BigInt(parsed.opening.amount)) {
    throw new Error('The connected wallet does not have enough of the exact requested shielded token.');
  }
  const { ledger } = await import('../../../contract/managed/nightparcel/contract/index.js');
  const verified = await verifyRequestAgainstLedger(parsed, ledger(state.data), configuration.networkId);
  return { ...verified, checks: { ...verified.checks, funding: true } };
}
