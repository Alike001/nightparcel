import { createHash, randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import pino from 'pino';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  deployContract,
  submitCallTx,
  type DeployedContract,
} from '@midnight-ntwrk/midnight-js-contracts';
import {
  encodeCoinPublicKey,
  encodeRawTokenType,
  type ContractAddress,
} from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { rawTokenType } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import type { EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import { LOCAL_CONFIG } from '../config.js';
import { buildProviders, type NightParcelProviders } from '../providers.js';
import {
  localWalletSeed,
  NightParcelWallet,
  syncWallet,
  waitForShieldedBalance,
} from '../wallet.js';
import {
  CompiledDemoTokenContract,
  CompiledNightParcelContract,
  Contract,
  DemoTokenContract,
  demoTokenLedger,
  ledger,
  demoTokenZkConfigPath,
  zkConfigPath,
  type InvoiceOpening,
  type SettlementEvidence,
} from '../../contract/index.js';
import { createNightParcelPrivateState } from '../../contract/witnesses.js';

// Required by the indexer GraphQL subscription client.
// @ts-expect-error Node test runtime intentionally installs the WebSocket global.
globalThis.WebSocket = WebSocket;

const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport: { target: 'pino-pretty' },
});

const PRIVATE_STATE_ID = 'NightParcelMerchantState';
const AMOUNT = 125n;
const MINTED = 300n;
const TOKEN_DOMAIN = pad32('nightparcel:demo-token:v1');
const NETWORK_TAG = pad32('undeployed');

type IndexedTransaction = {
  hash: string;
  identifiers: string[];
  raw: string;
  transactionResult: { status: string };
  block: { height: number; hash: string; timestamp: number };
  fee: string;
  zswapStartIndex: number;
  zswapEndIndex: number;
  contractActions: { address: string }[];
  unshieldedCreatedOutputs: { __typename: string }[];
  unshieldedSpentOutputs: { __typename: string }[];
  zswapLedgerEvents: { raw: string }[];
};

const hex = (value: Uint8Array): string => Buffer.from(value).toString('hex');

function pad32(value: string): Uint8Array {
  const output = new Uint8Array(32);
  output.set(new TextEncoder().encode(value));
  return output;
}

function digest(domain: string, value: Uint8Array | string): Uint8Array {
  const hash = createHash('sha256').update(domain);
  hash.update(typeof value === 'string' ? Buffer.from(value, 'hex') : value);
  return new Uint8Array(hash.digest());
}

function fingerprint(value: string): string {
  return createHash('sha256').update(Buffer.from(value, 'hex')).digest('hex').slice(0, 16);
}

async function indexedTransaction(identifier: string, timeout = 180_000): Promise<IndexedTransaction> {
  const query = `query ($id: HexEncoded!) {
    transactions(offset: { identifier: $id }) {
      ... on RegularTransaction {
        hash identifiers raw fee zswapStartIndex zswapEndIndex
        transactionResult { status }
        block { height hash timestamp }
        contractActions { address }
        unshieldedCreatedOutputs { __typename }
        unshieldedSpentOutputs { __typename }
        zswapLedgerEvents { raw }
      }
    }
  }`;
  const deadline = Date.now() + timeout;
  for (;;) {
    const response = await fetch(LOCAL_CONFIG.indexer, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables: { id: identifier } }),
    });
    const body = (await response.json()) as {
      data?: { transactions?: IndexedTransaction[] };
      errors?: unknown;
    };
    const tx = body.data?.transactions?.[0];
    if (tx) return tx;
    if (Date.now() >= deadline) {
      throw new Error(`Indexer did not expose transaction ${identifier}: ${JSON.stringify(body.errors)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
}

async function walletHistoryEntry(wallet: NightParcelWallet, hash: string, timeout = 180_000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    try {
      return await wallet.historyEntry(hash);
    } catch {
      // The indexer and wallet-local history converge asynchronously.
    }
    if (Date.now() >= deadline) throw new Error(`Wallet did not reconcile ${hash}`);
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
}

describe('NightParcel real local payment', () => {
  let alice: NightParcelWallet;
  let bob: NightParcelWallet;
  let aliceInvoiceProviders: NightParcelProviders;
  let aliceTokenProviders: NightParcelProviders;

  beforeAll(async () => {
    setNetworkId(LOCAL_CONFIG.networkId);
    const env: EnvironmentConfiguration = {
      walletNetworkId: LOCAL_CONFIG.networkId,
      networkId: LOCAL_CONFIG.networkId,
      indexer: LOCAL_CONFIG.indexer,
      indexerWS: LOCAL_CONFIG.indexerWS,
      node: LOCAL_CONFIG.node,
      nodeWS: LOCAL_CONFIG.nodeWS,
      proofServer: LOCAL_CONFIG.proofServer,
      faucet: LOCAL_CONFIG.faucet,
    };
    [alice, bob] = await Promise.all([
      NightParcelWallet.build(logger, env, localWalletSeed('merchant')),
      NightParcelWallet.build(logger, env, localWalletSeed('payer')),
    ]);
    await Promise.all([alice.start(), bob.start()]);
    await Promise.all([
      syncWallet(logger, alice.wallet),
      syncWallet(logger, bob.wallet),
    ]);
    aliceInvoiceProviders = buildProviders(alice, zkConfigPath, LOCAL_CONFIG, 'alice-invoice');
    aliceTokenProviders = buildProviders(alice, demoTokenZkConfigPath, LOCAL_CONFIG, 'alice-token');
  });

  afterAll(async () => {
    await Promise.allSettled([alice?.stop(), bob?.stop()]);
  });

  it('reconciles one direct custom-token payment and binds its evidence', async () => {
    expect(alice.getCoinPublicKey()).not.toEqual(bob.getCoinPublicKey());

    const tokenDeploy: DeployedContract<DemoTokenContract> = await deployContract(
      aliceTokenProviders,
      { compiledContract: CompiledDemoTokenContract },
    );
    const tokenAddress = tokenDeploy.deployTxData.public.contractAddress;
    const tokenColor = rawTokenType(TOKEN_DOMAIN, tokenAddress);
    const tokenColorBytes = encodeRawTokenType(tokenColor);

    const mint = await submitCallTx<DemoTokenContract, 'mint'>(aliceTokenProviders, {
      compiledContract: CompiledDemoTokenContract,
      contractAddress: tokenAddress,
      circuitId: 'mint',
      args: [
        { bytes: encodeCoinPublicKey(bob.getCoinPublicKey()) },
        MINTED,
        new Uint8Array(randomBytes(32)),
      ],
      additionalCoinEncPublicKeyMappings: new Map([
        [bob.getCoinPublicKey(), bob.getEncryptionPublicKey()],
      ]),
    });
    expect(mint.public.status).toEqual(SucceedEntirely);
    const tokenState = await aliceTokenProviders.publicDataProvider.queryContractState(tokenAddress);
    expect(tokenState).not.toBeNull();
    expect(demoTokenLedger(tokenState!.data).mintCount).toBe(1n);
    expect(await waitForShieldedBalance(bob, tokenColor, MINTED)).toBe(MINTED);

    const merchantSecret = new Uint8Array(randomBytes(32));
    const invoiceDeploy: DeployedContract<Contract> = await deployContract(
      aliceInvoiceProviders,
      {
        compiledContract: CompiledNightParcelContract,
        privateStateId: PRIVATE_STATE_ID,
        initialPrivateState: createNightParcelPrivateState(merchantSecret),
        args: [NETWORK_TAG, tokenColorBytes],
      },
    );
    const invoiceAddress: ContractAddress = invoiceDeploy.deployTxData.public.contractAddress;
    const invoiceSalt = new Uint8Array(randomBytes(32));
    const invoice: InvoiceOpening = {
      invoiceId: new Uint8Array(randomBytes(32)),
      amount: AMOUNT,
      payeeCoinPublicKey: new Uint8Array(Buffer.from(alice.getCoinPublicKey(), 'hex')),
      payeeEncryptionPublicKey: new Uint8Array(Buffer.from(alice.getEncryptionPublicKey(), 'hex')),
      expiresAt: BigInt(Math.floor(Date.now() / 1_000) + 3_600),
      termsDigest: digest('nightparcel:terms:v1', new TextEncoder().encode('Wave 2 verification invoice')),
    };
    const create = await submitCallTx<Contract, 'createInvoice'>(aliceInvoiceProviders, {
      compiledContract: CompiledNightParcelContract,
      contractAddress: invoiceAddress,
      privateStateId: PRIVATE_STATE_ID,
      circuitId: 'createInvoice',
      args: [invoice, invoiceSalt],
    });
    expect(create.public.status).toEqual(SucceedEntirely);
    const invoiceCommitment = create.private.result;

    const aliceBefore = await alice.shieldedBalance(tokenColor);
    const bobBefore = await bob.shieldedBalance(tokenColor);
    expect(aliceBefore).toBe(0n);
    expect(bobBefore).toBe(MINTED);

    const transfer = await bob.transferShielded(tokenColor, AMOUNT, alice.getShieldedAddress());
    const indexed = await indexedTransaction(transfer.transactionId);
    expect(indexed.transactionResult.status).toBe('SUCCESS');
    expect(indexed.identifiers).toContain(transfer.transactionId);

    expect(await waitForShieldedBalance(alice, tokenColor, aliceBefore + AMOUNT)).toBe(
      aliceBefore + AMOUNT,
    );
    expect(await waitForShieldedBalance(bob, tokenColor, bobBefore - AMOUNT)).toBe(
      bobBefore - AMOUNT,
    );
    const aliceAfter = await alice.shieldedBalance(tokenColor);
    const bobAfter = await bob.shieldedBalance(tokenColor);

    const [payerHistory, merchantHistory] = await Promise.all([
      walletHistoryEntry(bob, indexed.hash),
      walletHistoryEntry(alice, indexed.hash),
    ]);
    expect(payerHistory.status).toBe('SUCCESS');
    expect(merchantHistory.status).toBe('SUCCESS');
    expect(payerHistory.hash).toBe(indexed.hash);
    expect(merchantHistory.hash).toBe(indexed.hash);

    const receiptSalt = new Uint8Array(randomBytes(32));
    const settlement: SettlementEvidence = {
      invoiceCommitment,
      walletIdentifierDigest: digest(
        'nightparcel:wallet-identifier:v1',
        transfer.transactionId,
      ),
      indexedTransactionHash: new Uint8Array(Buffer.from(indexed.hash, 'hex')),
      confirmationBlockHash: new Uint8Array(Buffer.from(indexed.block.hash, 'hex')),
      amount: AMOUNT,
      tokenColor: tokenColorBytes,
      payeeCoinPublicKey: invoice.payeeCoinPublicKey,
      payeeEncryptionPublicKey: invoice.payeeEncryptionPublicKey,
      networkTag: NETWORK_TAG,
    };
    const acknowledge = await submitCallTx<Contract, 'acknowledgeReceipt'>(
      aliceInvoiceProviders,
      {
        compiledContract: CompiledNightParcelContract,
        contractAddress: invoiceAddress,
        privateStateId: PRIVATE_STATE_ID,
        circuitId: 'acknowledgeReceipt',
        args: [invoice, invoiceSalt, settlement, receiptSalt],
      },
    );
    expect(acknowledge.public.status).toEqual(SucceedEntirely);
    const receiptCommitment = acknowledge.private.result;

    const publicState = await aliceInvoiceProviders.publicDataProvider.queryContractState(invoiceAddress);
    expect(publicState).not.toBeNull();
    const publicLedger = ledger(publicState!.data);
    expect(publicLedger.invoices.member(invoiceCommitment)).toBe(true);
    expect(publicLedger.receipts.lookup(invoiceCommitment)).toEqual(receiptCommitment);
    await expect(
      submitCallTx<Contract, 'acknowledgeReceipt'>(aliceInvoiceProviders, {
        compiledContract: CompiledNightParcelContract,
        contractAddress: invoiceAddress,
        privateStateId: PRIVATE_STATE_ID,
        circuitId: 'acknowledgeReceipt',
        args: [invoice, invoiceSalt, settlement, receiptSalt],
      }),
    ).rejects.toThrow('Invoice already acknowledged');

    const [createIndexed, receiptIndexed] = await Promise.all([
      indexedTransaction(create.public.txId),
      indexedTransaction(acknowledge.public.txId),
    ]);
    const sensitiveHex = {
      merchantSecret: hex(merchantSecret),
      invoiceId: hex(invoice.invoiceId),
      payeeCoinPublicKey: hex(invoice.payeeCoinPublicKey),
      payeeEncryptionPublicKey: hex(invoice.payeeEncryptionPublicKey),
      termsDigest: hex(invoice.termsDigest),
      invoiceSalt: hex(invoiceSalt),
      walletIdentifierDigest: hex(settlement.walletIdentifierDigest),
      indexedTransactionHash: hex(settlement.indexedTransactionHash),
      confirmationBlockHash: hex(settlement.confirmationBlockHash),
      receiptSalt: hex(receiptSalt),
    };
    const privacyHaystack = `${createIndexed.raw}${receiptIndexed.raw}`.toLowerCase();
    const privacyMatches = Object.fromEntries(
      Object.entries(sensitiveHex).map(([key, value]) => [key, privacyHaystack.includes(value)]),
    );
    expect(Object.values(privacyMatches).every((match) => match === false)).toBe(true);

    // The application-level state is earned only after every independent source agrees.
    const verificationChecks = {
      payerAccepted: payerHistory.status === 'SUCCESS',
      indexerAccepted: indexed.transactionResult.status === 'SUCCESS',
      recipientReconciled: merchantHistory.status === 'SUCCESS',
      senderDeltaMatches: bobBefore - bobAfter === AMOUNT,
      recipientDeltaMatches: aliceAfter - aliceBefore === AMOUNT,
      receiptMatches: publicLedger.receipts.lookup(invoiceCommitment).every(
        (byte, index) => byte === receiptCommitment[index],
      ),
    };
    const applicationStatus = Object.values(verificationChecks).every(Boolean)
      ? 'PAID_VERIFIED'
      : 'UNRESOLVED';
    expect(applicationStatus).toBe('PAID_VERIFIED');

    const evidence = {
      generatedAt: new Date().toISOString(),
      network: LOCAL_CONFIG.networkId,
      versions: {
        node: process.version,
        midnightJs: '4.1.1',
        walletSdk: '1.2.0',
        compactCompiler: '0.31.1',
        nodeImage: 'midnightntwrk/midnight-node:1.0.0',
        indexerImage: 'midnightntwrk/indexer-standalone:4.3.3',
        proofServerImage: 'midnightntwrk/proof-server:8.1.0',
      },
      actors: {
        independent: alice.getCoinPublicKey() !== bob.getCoinPublicKey(),
        merchantFingerprint: fingerprint(alice.getCoinPublicKey()),
        payerFingerprint: fingerprint(bob.getCoinPublicKey()),
      },
      contracts: { demoToken: tokenAddress, nightParcel: invoiceAddress },
      tokenColor,
      amount: AMOUNT.toString(),
      balances: {
        merchantBefore: aliceBefore.toString(),
        merchantAfter: aliceAfter.toString(),
        payerBefore: bobBefore.toString(),
        payerAfter: bobAfter.toString(),
      },
      transfer: {
        transactionId: transfer.transactionId,
        indexedHash: indexed.hash,
        status: indexed.transactionResult.status,
        blockHeight: indexed.block.height,
        blockHash: indexed.block.hash,
        blockTimestamp: indexed.block.timestamp,
        fee: indexed.fee,
        proofMilliseconds: transfer.proofMilliseconds,
        submitMilliseconds: transfer.submitMilliseconds,
        payerHistoryStatus: payerHistory.status,
        recipientHistoryStatus: merchantHistory.status,
      },
      commitments: {
        invoice: hex(invoiceCommitment),
        receipt: hex(receiptCommitment),
      },
      publicVisibility: {
        rawTransactionHexCharacters: indexed.raw.length,
        identifiers: indexed.identifiers.length,
        zswapRange: [indexed.zswapStartIndex, indexed.zswapEndIndex],
        zswapEventCount: indexed.zswapLedgerEvents.length,
        zswapEventHexCharacters: indexed.zswapLedgerEvents.map((event) => event.raw.length),
        contractActionCount: indexed.contractActions.length,
        unshieldedCreatedOutputCount: indexed.unshieldedCreatedOutputs.length,
        unshieldedSpentOutputCount: indexed.unshieldedSpentOutputs.length,
      },
      privacyScan: {
        positiveControlInvoiceCommitmentPublic: publicLedger.invoices.member(invoiceCommitment),
        sensitiveValuesFoundInCreateOrReceiptRaw: privacyMatches,
      },
      verificationChecks,
      applicationStatus,
    };
    await writeFile(
      path.resolve('evidence/phase1b-local.json'),
      `${JSON.stringify(evidence, null, 2)}\n`,
      { mode: 0o600 },
    );
    logger.info(
      `NightParcel ${applicationStatus}: transfer=${transfer.transactionId} block=${indexed.block.height}`,
    );
  });
});
