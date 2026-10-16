import { describe, expect, it } from 'vitest';
import type { VerifiedInvoiceRequest } from './connector';
import {
  beginPaymentIntent,
  finishPaymentIntent,
  recoverPaymentIntents,
} from './payment-intent';

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
}

const request = {
  version: 'nightparcel.invoice.v2',
  network: 'undeployed',
  contractAddress: '01'.repeat(32),
  invoiceCommitment: '02'.repeat(32),
} as VerifiedInvoiceRequest;

describe('payment intent persistence', () => {
  it('blocks duplicate authorization while an intent is active or unresolved', () => {
    const storage = memoryStorage();
    const intent = beginPaymentIntent(storage, request, 'account-a');
    expect(() => beginPaymentIntent(storage, request, 'account-a')).toThrow('already');

    finishPaymentIntent(storage, intent, 'SUBMITTED', {
      transfer: { transactionId: 'tx-1', submittedAt: new Date().toISOString() },
    });
    expect(() => beginPaymentIntent(storage, request, 'account-a')).toThrow('unresolved');
  });

  it('turns an interrupted authorization into REVIEW_REQUIRED after reload', () => {
    const storage = memoryStorage();
    beginPaymentIntent(storage, request, 'account-b');

    const [recovered] = recoverPaymentIntents(storage);
    expect(recovered?.status).toBe('REVIEW_REQUIRED');
    expect(recovered?.failure).toContain('Reconcile before retrying');
  });

  it('allows an explicit failed attempt to be started again', () => {
    const storage = memoryStorage();
    const intent = beginPaymentIntent(storage, request, 'account-c');
    finishPaymentIntent(storage, intent, 'FAILED', { failure: 'Permission rejected before submission.' });

    expect(() => beginPaymentIntent(storage, request, 'account-c')).not.toThrow();
  });
});
