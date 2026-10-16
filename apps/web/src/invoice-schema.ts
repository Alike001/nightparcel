export const REQUEST_VERSION = 'nightparcel.invoice.v2' as const;
const HEX_32 = /^[0-9a-f]{64}$/;
export const verifiedRequest = Symbol('verified NightParcel request');

export type InvoiceRequest = {
  version: typeof REQUEST_VERSION;
  network: string;
  networkTag: string;
  contractAddress: string;
  merchantKey: string;
  invoiceCommitment: string;
  tokenColor: string;
  recipient: string;
  opening: {
    invoiceId: string;
    amount: string;
    payeeCoinPublicKey: string;
    payeeEncryptionPublicKey: string;
    expiresAt: number;
    termsDigest: string;
  };
  invoiceSalt: string;
  privateMemo: string;
  termsEncoding: 'nightparcel.terms.utf8-sha256.v1';
};

export type VerifiedInvoiceRequest = InvoiceRequest & { readonly [verifiedRequest]: true };

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a JSON object.`);
  return value as Record<string, unknown>;
}

function stringField(source: Record<string, unknown>, field: string): string {
  const value = source[field];
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Request field “${field}” is missing.`);
  return value;
}

function hex32(source: Record<string, unknown>, field: string): string {
  const value = stringField(source, field).toLowerCase();
  if (!HEX_32.test(value)) throw new Error(`Request field “${field}” must be exactly 32 bytes of hexadecimal.`);
  return value;
}

function hex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function networkTag(network: string): string {
  const encoded = new TextEncoder().encode(network);
  if (encoded.length > 32) throw new Error('Request network name is too long.');
  const padded = new Uint8Array(32);
  padded.set(encoded);
  return hex(padded);
}

function equal(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export function validateRequest(value: unknown, now = Math.floor(Date.now() / 1_000)): InvoiceRequest {
  const request = object(value, 'Request');
  if (request.version === 'nightparcel.invoice.v1') throw new Error('Legacy nightparcel.invoice.v1 files are not payable because they cannot prove their opening or on-chain state. Ask the merchant for a v2 request.');
  if (request.version !== REQUEST_VERSION) throw new Error('Unsupported request version.');
  const opening = object(request.opening, 'Request opening');
  const amount = stringField(opening, 'amount');
  if (!/^\d+$/.test(amount) || BigInt(amount) <= 0n || BigInt(amount) >= 2n ** 128n) throw new Error('Amount must be a positive Uint<128> integer.');
  const expiresAt = opening.expiresAt;
  if (typeof expiresAt !== 'number' || !Number.isSafeInteger(expiresAt) || expiresAt <= now) throw new Error('This invoice has expired or has an invalid expiry.');
  const network = stringField(request, 'network');
  const suppliedNetworkTag = hex32(request, 'networkTag');
  if (!equal(suppliedNetworkTag, networkTag(network))) throw new Error('The request network tag does not match its network name.');
  if (request.termsEncoding !== 'nightparcel.terms.utf8-sha256.v1') throw new Error('Unsupported private terms encoding.');
  if (typeof request.privateMemo !== 'string' || request.privateMemo.length > 4_096) throw new Error('Private memo must be a string no longer than 4096 characters.');
  return {
    version: REQUEST_VERSION,
    network,
    networkTag: suppliedNetworkTag,
    contractAddress: hex32(request, 'contractAddress'),
    merchantKey: hex32(request, 'merchantKey'),
    invoiceCommitment: hex32(request, 'invoiceCommitment'),
    tokenColor: hex32(request, 'tokenColor'),
    recipient: stringField(request, 'recipient'),
    opening: {
      invoiceId: hex32(opening, 'invoiceId'), amount,
      payeeCoinPublicKey: hex32(opening, 'payeeCoinPublicKey'),
      payeeEncryptionPublicKey: hex32(opening, 'payeeEncryptionPublicKey'),
      expiresAt, termsDigest: hex32(opening, 'termsDigest'),
    },
    invoiceSalt: hex32(request, 'invoiceSalt'),
    privateMemo: request.privateMemo,
    termsEncoding: request.termsEncoding,
  };
}
