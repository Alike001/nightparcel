import type { ConnectorTransfer, VerifiedInvoiceRequest } from './connector';

export const PAYMENT_INTENT_STORAGE_KEY = 'nightparcel.payment-intents.v1';

export type PaymentIntentStatus = 'AUTHORIZING' | 'SUBMITTED' | 'REVIEW_REQUIRED' | 'FAILED';

export type PaymentIntent = {
  id: string;
  accountFingerprint: string;
  invoiceCommitment: string;
  contractAddress: string;
  network: string;
  status: PaymentIntentStatus;
  startedAt: string;
  updatedAt: string;
  transactionId?: string;
  failure?: string;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const active = new Set<string>();

function read(storage: StorageLike): Record<string, PaymentIntent> {
  const stored = storage.getItem(PAYMENT_INTENT_STORAGE_KEY);
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored) as unknown;
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, PaymentIntent>
      : {};
  } catch {
    return {};
  }
}

function write(storage: StorageLike, intents: Record<string, PaymentIntent>): void {
  storage.setItem(PAYMENT_INTENT_STORAGE_KEY, JSON.stringify(intents));
}

export function paymentIntentId(request: VerifiedInvoiceRequest, accountFingerprint: string): string {
  return `${request.network}:${request.contractAddress}:${request.invoiceCommitment}:${accountFingerprint}`;
}

export async function withPaymentLock<T>(intentId: string, operation: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) return operation();
  const result = await navigator.locks.request(
    `nightparcel:${intentId}`,
    { ifAvailable: true },
    async (lock) => lock ? { acquired: true as const, value: await operation() } : { acquired: false as const },
  );
  if (!result.acquired) throw new Error('Another tab is already authorizing this payment.');
  return result.value;
}

export function recoverPaymentIntents(storage: StorageLike): PaymentIntent[] {
  const intents = read(storage);
  let changed = false;
  for (const intent of Object.values(intents)) {
    if (intent.status === 'AUTHORIZING') {
      intent.status = 'REVIEW_REQUIRED';
      intent.updatedAt = new Date().toISOString();
      intent.failure = 'The page reloaded while Lace authorization or submission was in progress. Reconcile before retrying.';
      changed = true;
    }
  }
  if (changed) write(storage, intents);
  return Object.values(intents).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function beginPaymentIntent(
  storage: StorageLike,
  request: VerifiedInvoiceRequest,
  accountFingerprint: string,
): PaymentIntent {
  const id = paymentIntentId(request, accountFingerprint);
  if (active.has(id)) throw new Error('This payment is already being authorized.');
  const intents = read(storage);
  const existing = intents[id];
  if (existing && ['AUTHORIZING', 'SUBMITTED', 'REVIEW_REQUIRED'].includes(existing.status)) {
    throw new Error('This payment already has an active or unresolved transaction intent. Reconcile it before attempting another payment.');
  }
  const now = new Date().toISOString();
  const intent: PaymentIntent = {
    id,
    accountFingerprint,
    invoiceCommitment: request.invoiceCommitment,
    contractAddress: request.contractAddress,
    network: request.network,
    status: 'AUTHORIZING',
    startedAt: now,
    updatedAt: now,
  };
  intents[id] = intent;
  write(storage, intents);
  active.add(id);
  return intent;
}

export function finishPaymentIntent(
  storage: StorageLike,
  intent: PaymentIntent,
  status: Exclude<PaymentIntentStatus, 'AUTHORIZING'>,
  options: { transfer?: ConnectorTransfer; failure?: string } = {},
): PaymentIntent {
  const intents = read(storage);
  const updated: PaymentIntent = {
    ...intent,
    status,
    updatedAt: new Date().toISOString(),
    transactionId: options.transfer?.transactionId ?? intent.transactionId,
    failure: options.failure,
  };
  intents[intent.id] = updated;
  write(storage, intents);
  active.delete(intent.id);
  return updated;
}

export function releasePaymentIntent(intent: PaymentIntent): void {
  active.delete(intent.id);
}
