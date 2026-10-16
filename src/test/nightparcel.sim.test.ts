import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  Sim,
  assertNotInPublicState,
  expectRejects,
  findInPublicState,
} from '@midnight-ntwrk/example-sim';
import {
  Contract,
  ledger,
  pureCircuits,
  type InvoiceOpening,
  type SettlementEvidence,
} from '../../contract/managed/nightparcel/contract/index.js';
import {
  createNightParcelPrivateState,
  witnesses,
} from '../../contract/witnesses.js';

const bytes32 = (): Uint8Array => new Uint8Array(randomBytes(32));
const zero32 = (): Uint8Array => new Uint8Array(32);
const uintBytes = (value: bigint, width: number, littleEndian: boolean): Uint8Array => {
  const hex = value.toString(16).padStart(width * 2, '0');
  const bytes = new Uint8Array(Buffer.from(hex, 'hex'));
  return littleEndian ? bytes.reverse() : bytes;
};

const MERCHANT_SECRET = bytes32();
const NETWORK_TAG = bytes32();
const TOKEN_COLOR = bytes32();

const opening = (overrides: Partial<InvoiceOpening> = {}): InvoiceOpening => ({
  invoiceId: bytes32(),
  amount: 125n,
  payeeCoinPublicKey: bytes32(),
  payeeEncryptionPublicKey: bytes32(),
  expiresAt: 2_000_000_000n,
  termsDigest: bytes32(),
  ...overrides,
});

const evidence = (
  invoiceCommitment: Uint8Array,
  invoice: InvoiceOpening,
  overrides: Partial<SettlementEvidence> = {},
): SettlementEvidence => ({
  invoiceCommitment,
  walletIdentifierDigest: bytes32(),
  indexedTransactionHash: bytes32(),
  confirmationBlockHash: bytes32(),
  amount: invoice.amount,
  tokenColor: TOKEN_COLOR,
  payeeCoinPublicKey: invoice.payeeCoinPublicKey,
  payeeEncryptionPublicKey: invoice.payeeEncryptionPublicKey,
  networkTag: NETWORK_TAG,
  ...overrides,
});

const deploy = () =>
  Sim.deploy({
    contract: new Contract(witnesses),
    ledger,
    privateState: createNightParcelPrivateState(MERCHANT_SECRET),
    args: [NETWORK_TAG, TOKEN_COLOR],
  });

describe('NightParcel invoice registry (in memory)', () => {
  it('deploys with only a merchant commitment and public deployment configuration', () => {
    const l = deploy().ledger();
    expect(l.networkTag).toEqual(NETWORK_TAG);
    expect(l.tokenColor).toEqual(TOKEN_COLOR);
    expect(l.merchantKey).not.toEqual(MERCHANT_SECRET);
    expect(l.invoices.isEmpty()).toBe(true);
    expect(l.cancelled.isEmpty()).toBe(true);
    expect(l.receipts.isEmpty()).toBe(true);
  });

  it('creates a valid opaque invoice commitment and rejects exact replay', () => {
    const sim = deploy();
    const invoice = opening();
    const salt = bytes32();
    const created = sim.call('createInvoice', invoice, salt).result;

    expect(sim.ledger().invoices.member(created)).toBe(true);
    expect(sim.ledger().invoices.size()).toBe(1n);
    expectRejects(
      () => sim.call('createInvoice', invoice, salt),
      'Invoice already exists',
    );
    expect(sim.ledger().invoices.size()).toBe(1n);
  });

  it('lets a payer reproduce a registered commitment from the privately shared opening', () => {
    const sim = deploy();
    const invoice = opening();
    const salt = bytes32();
    const created = sim.call('createInvoice', invoice, salt).result;
    const recomputed = pureCircuits.computeInvoiceCommitment(
      new Uint8Array(Buffer.from(sim.address, 'hex')),
      NETWORK_TAG,
      TOKEN_COLOR,
      invoice,
      salt,
    );

    expect(recomputed).toEqual(created);
    expect(
      pureCircuits.computeInvoiceCommitment(
        new Uint8Array(Buffer.from(sim.address, 'hex')),
        NETWORK_TAG,
        TOKEN_COLOR,
        { ...invoice, amount: invoice.amount + 1n },
        salt,
      ),
    ).not.toEqual(created);
  });

  it('rejects invalid invoice values without changing public state', () => {
    const sim = deploy();
    expectRejects(
      () => sim.call('createInvoice', opening({ amount: 0n }), bytes32()),
      'Invoice amount must be greater than zero',
    );
    expectRejects(
      () => sim.call('createInvoice', opening({ expiresAt: 0n }), bytes32()),
      'Invoice expiry must be set',
    );
    expect(sim.ledger().invoices.isEmpty()).toBe(true);
  });

  it('requires the deployment merchant secret for every state transition', () => {
    const sim = deploy();
    const invoice = opening();
    const invoiceSalt = bytes32();
    const commitment = sim.call('createInvoice', invoice, invoiceSalt).result;
    const receiptEvidence = evidence(commitment, invoice);

    sim.privateState = createNightParcelPrivateState(bytes32());
    expectRejects(
      () => sim.call('createInvoice', opening(), bytes32()),
      'Only the merchant can modify invoices',
    );
    expectRejects(
      () => sim.call('cancelInvoice', invoice, invoiceSalt),
      'Only the merchant can modify invoices',
    );
    expectRejects(
      () => sim.call('acknowledgeReceipt', invoice, invoiceSalt, receiptEvidence, bytes32()),
      'Only the merchant can modify invoices',
    );
    expect(sim.ledger().cancelled.isEmpty()).toBe(true);
    expect(sim.ledger().receipts.isEmpty()).toBe(true);
  });

  it('cancels once and never permits an acknowledgement afterward', () => {
    const sim = deploy();
    const invoice = opening();
    const salt = bytes32();
    const commitment = sim.call('createInvoice', invoice, salt).result;

    sim.call('cancelInvoice', invoice, salt);
    expect(sim.ledger().cancelled.member(commitment)).toBe(true);
    expectRejects(
      () => sim.call('cancelInvoice', invoice, salt),
      'Invoice already cancelled',
    );
    expectRejects(
      () => sim.call('acknowledgeReceipt', invoice, salt, evidence(commitment, invoice), bytes32()),
      'Cancelled invoice cannot be acknowledged',
    );
    expect(sim.ledger().receipts.isEmpty()).toBe(true);
  });

  it('rejects unknown or mismatched invoice openings', () => {
    const sim = deploy();
    const invoice = opening();
    const salt = bytes32();
    const commitment = sim.call('createInvoice', invoice, salt).result;

    expectRejects(
      () => sim.call('cancelInvoice', { ...invoice, termsDigest: bytes32() }, salt),
      'Invoice does not exist',
    );
    expectRejects(
      () => sim.call('acknowledgeReceipt', invoice, bytes32(), evidence(commitment, invoice), bytes32()),
      'Invoice does not exist',
    );
  });

  it.each([
    ['invoice commitment', (_c: Uint8Array, _i: InvoiceOpening) => ({ invoiceCommitment: bytes32() }), 'Evidence invoice does not match invoice'],
    ['wallet identifier', (_c: Uint8Array, _i: InvoiceOpening) => ({ walletIdentifierDigest: zero32() }), 'Wallet transaction identifier digest must be set'],
    ['indexed hash', (_c: Uint8Array, _i: InvoiceOpening) => ({ indexedTransactionHash: zero32() }), 'Indexed transaction hash must be set'],
    ['block hash', (_c: Uint8Array, _i: InvoiceOpening) => ({ confirmationBlockHash: zero32() }), 'Confirmation block must be set'],
    ['amount', (_c: Uint8Array, i: InvoiceOpening) => ({ amount: i.amount + 1n }), 'Evidence amount does not match invoice'],
    ['token', (_c: Uint8Array, _i: InvoiceOpening) => ({ tokenColor: bytes32() }), 'Evidence token does not match invoice book'],
    ['coin key', (_c: Uint8Array, _i: InvoiceOpening) => ({ payeeCoinPublicKey: bytes32() }), 'Evidence recipient does not match invoice'],
    ['encryption key', (_c: Uint8Array, _i: InvoiceOpening) => ({ payeeEncryptionPublicKey: bytes32() }), 'Evidence recipient does not match invoice'],
    ['network', (_c: Uint8Array, _i: InvoiceOpening) => ({ networkTag: bytes32() }), 'Evidence network does not match invoice book'],
  ])('rejects mismatched %s evidence', (_label, mutate, message) => {
    const sim = deploy();
    const invoice = opening();
    const salt = bytes32();
    const commitment = sim.call('createInvoice', invoice, salt).result;
    const bad = evidence(commitment, invoice, mutate(commitment, invoice));

    expectRejects(
      () => sim.call('acknowledgeReceipt', invoice, salt, bad, bytes32()),
      message,
    );
    expect(sim.ledger().receipts.isEmpty()).toBe(true);
  });

  it('acknowledges internally matching evidence exactly once', () => {
    const sim = deploy();
    const invoice = opening();
    const invoiceSalt = bytes32();
    const receiptSalt = bytes32();
    const commitment = sim.call('createInvoice', invoice, invoiceSalt).result;
    const receiptEvidence = evidence(commitment, invoice);
    const receipt = sim.call(
      'acknowledgeReceipt',
      invoice,
      invoiceSalt,
      receiptEvidence,
      receiptSalt,
    ).result;

    expect(sim.ledger().receipts.lookup(commitment)).toEqual(receipt);
    expectRejects(
      () => sim.call('acknowledgeReceipt', invoice, invoiceSalt, receiptEvidence, receiptSalt),
      'Invoice already acknowledged',
    );
    expectRejects(
      () => sim.call('cancelInvoice', invoice, invoiceSalt),
      'Acknowledged invoice cannot be cancelled',
    );
  });

  it('keeps every invoice/evidence opening and salt out of decoded public state', () => {
    const sim = deploy();
    const privateAmount = BigInt('0x102132435465768798a9bacbdcedfe0f');
    const privateExpiry = BigInt('0x1021324354657687');
    const invoice = opening({ amount: privateAmount, expiresAt: privateExpiry });
    const invoiceSalt = bytes32();
    const receiptSalt = bytes32();
    const commitment = sim.call('createInvoice', invoice, invoiceSalt).result;
    const receiptEvidence = evidence(commitment, invoice);
    sim.call('acknowledgeReceipt', invoice, invoiceSalt, receiptEvidence, receiptSalt);

    const l = sim.ledger();
    expect(findInPublicState(l, commitment)).not.toBeNull();
    assertNotInPublicState(l, {
      merchantSecret: MERCHANT_SECRET,
      invoiceId: invoice.invoiceId,
      amount128BigEndian: uintBytes(privateAmount, 16, false),
      amount128LittleEndian: uintBytes(privateAmount, 16, true),
      amount256BigEndian: uintBytes(privateAmount, 32, false),
      amount256LittleEndian: uintBytes(privateAmount, 32, true),
      payeeCoinPublicKey: invoice.payeeCoinPublicKey,
      payeeEncryptionPublicKey: invoice.payeeEncryptionPublicKey,
      expiryBigEndian: uintBytes(privateExpiry, 8, false),
      expiryLittleEndian: uintBytes(privateExpiry, 8, true),
      termsDigest: invoice.termsDigest,
      invoiceSalt,
      walletIdentifierDigest: receiptEvidence.walletIdentifierDigest,
      indexedTransactionHash: receiptEvidence.indexedTransactionHash,
      confirmationBlockHash: receiptEvidence.confirmationBlockHash,
      receiptSalt,
    });
    expect(Object.keys(l).sort()).toEqual([
      'cancelled',
      'invoices',
      'merchantKey',
      'networkTag',
      'receipts',
      'tokenColor',
    ]);
  });

  it('documents the trust boundary: a merchant can commit plausible arbitrary evidence', () => {
    const sim = deploy();
    const invoice = opening();
    const salt = bytes32();
    const commitment = sim.call('createInvoice', invoice, salt).result;

    expect(() =>
      sim.call('acknowledgeReceipt', invoice, salt, evidence(commitment, invoice), bytes32()),
    ).not.toThrow();
    expect(sim.ledger().receipts.member(commitment)).toBe(true);
  });
});
