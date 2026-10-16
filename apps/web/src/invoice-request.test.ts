import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import {
  MidnightBech32m,
  ShieldedAddress,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
} from '@midnight-ntwrk/wallet-sdk-address-format';
import { pureCircuits, type InvoiceOpening } from '../../../contract/managed/nightparcel/contract/index.js';
import {
  validateRequest,
  verifyRequestAgainstLedger,
  type InvoiceLedgerView,
  type InvoiceRequest,
} from './invoice-request';

const hex = (value: Uint8Array): string => Buffer.from(value).toString('hex');
const bytes = (value: string): Uint8Array => new Uint8Array(Buffer.from(value, 'hex'));
const fixed = (value: number): string => value.toString(16).padStart(64, '0');
const networkTag = hex(Uint8Array.from([...new TextEncoder().encode('undeployed'), ...new Uint8Array(22)]));

async function fixture(): Promise<{ request: InvoiceRequest; ledger: InvoiceLedgerView }> {
  const contractAddress = fixed(1);
  const tokenColor = fixed(2);
  const merchantKey = fixed(3);
  const invoiceSalt = fixed(4);
  const coinKey = fixed(5);
  const encryptionKey = fixed(6);
  const privateMemo = 'Brand identity — final milestone';
  const termsDigest = createHash('sha256').update('nightparcel:terms:v1').update(privateMemo).digest('hex');
  const opening: InvoiceOpening = {
    invoiceId: bytes(fixed(7)),
    amount: 125n,
    payeeCoinPublicKey: bytes(coinKey),
    payeeEncryptionPublicKey: bytes(encryptionKey),
    expiresAt: 4_102_444_800n,
    termsDigest: bytes(termsDigest),
  };
  const commitment = hex(pureCircuits.computeInvoiceCommitment(
    bytes(contractAddress),
    bytes(networkTag),
    bytes(tokenColor),
    opening,
    bytes(invoiceSalt),
  ));
  const recipient = MidnightBech32m.encode('undeployed', new ShieldedAddress(
    new ShieldedCoinPublicKey(Buffer.from(coinKey, 'hex')),
    new ShieldedEncryptionPublicKey(Buffer.from(encryptionKey, 'hex')),
  )).toString();
  const request: InvoiceRequest = {
    version: 'nightparcel.invoice.v2',
    network: 'undeployed',
    networkTag,
    contractAddress,
    merchantKey,
    invoiceCommitment: commitment,
    tokenColor,
    recipient,
    opening: {
      invoiceId: hex(opening.invoiceId),
      amount: opening.amount.toString(),
      payeeCoinPublicKey: coinKey,
      payeeEncryptionPublicKey: encryptionKey,
      expiresAt: Number(opening.expiresAt),
      termsDigest,
    },
    invoiceSalt,
    privateMemo,
    termsEncoding: 'nightparcel.terms.utf8-sha256.v1',
  };
  const member = (candidate: Uint8Array) => hex(candidate) === commitment;
  return {
    request,
    ledger: {
      merchantKey: bytes(merchantKey),
      networkTag: bytes(networkTag),
      tokenColor: bytes(tokenColor),
      invoices: { member },
      cancelled: { member: () => false },
      receipts: { member: () => false },
    },
  };
}

describe('payable request integrity', () => {
  it('rejects legacy structurally valid requests because they cannot establish payability', () => {
    expect(() => validateRequest({ version: 'nightparcel.invoice.v1' })).toThrow('not payable');
  });

  it('verifies every binding against an open on-chain invoice', async () => {
    const { request, ledger } = await fixture();
    const verified = await verifyRequestAgainstLedger(request, ledger, 'undeployed');

    expect(verified.state).toBe('OPEN');
    expect(verified.request.invoiceCommitment).toBe(request.invoiceCommitment);
    expect(verified.checks).toMatchObject({ commitment: true, recipient: true, openState: true, funding: false });
  });

  it.each([
    ['wrong network', (request: InvoiceRequest) => ({ ...request, network: 'preview' }), 'network tag'],
    ['wrong recipient', (request: InvoiceRequest) => ({ ...request, recipient: request.recipient.replace(/.$/, request.recipient.endsWith('q') ? 'p' : 'q') }), 'does not match'],
    ['wrong amount', (request: InvoiceRequest) => ({ ...request, opening: { ...request.opening, amount: '126' } }), 'does not reproduce'],
    ['wrong merchant', (request: InvoiceRequest) => ({ ...request, merchantKey: fixed(99) }), 'merchant identity'],
    ['wrong token', (request: InvoiceRequest) => ({ ...request, tokenColor: fixed(98) }), 'does not support'],
    ['forged commitment', (request: InvoiceRequest) => ({ ...request, invoiceCommitment: fixed(97) }), 'does not reproduce'],
  ])('blocks %s before wallet authorization', async (_name, mutate, message) => {
    const { request, ledger } = await fixture();
    await expect(verifyRequestAgainstLedger(mutate(request), ledger, 'undeployed')).rejects.toThrow(message);
  });

  it.each([
    ['unknown', { invoices: false, cancelled: false, receipts: false }, 'not registered'],
    ['cancelled', { invoices: true, cancelled: true, receipts: false }, 'cancelled'],
    ['acknowledged', { invoices: true, cancelled: false, receipts: true }, 'already been acknowledged'],
  ])('blocks an %s invoice', async (_name, state, message) => {
    const { request, ledger } = await fixture();
    ledger.invoices.member = () => state.invoices;
    ledger.cancelled.member = () => state.cancelled;
    ledger.receipts.member = () => state.receipts;

    await expect(verifyRequestAgainstLedger(request, ledger, 'undeployed')).rejects.toThrow(message);
  });
});
