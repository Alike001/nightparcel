import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { deployContract, findDeployedContract, type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { parseCoinPublicKeyToHex, parseEncPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';
import type { InvoiceRequest } from '../invoice-request';
import type { PrivateStateExport, SigningKeyExport } from '@midnight-ntwrk/midnight-js-types';
import {
  CompiledNightParcelContract,
  Contract,
  PRIVATE_STATE_ID,
  createPrivateState,
  ledger,
  type InvoiceOpening,
  type NightParcelPrivateState,
} from './contract';
import { createBrowserProviders, type NightParcelProviders } from './providers';

export type InvoiceBookSession = {
  address: ContractAddress;
  contract: FoundContract<Contract<NightParcelPrivateState>>;
  providers: NightParcelProviders;
};

export type CreateInvoiceInput = {
  amount: string;
  privateMemo: string;
  expiresAt: number;
  tokenColor: string;
  intendedRecipient: string;
};

export type InvoiceBookRecovery = {
  version: 'nightparcel.recovery.v1';
  contractAddress: string;
  exportedAt: string;
  privateStates: PrivateStateExport;
  signingKeys: SigningKeyExport;
  warning: string;
};

const bytes = (value: string): Uint8Array => Uint8Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));
const hex = (value: Uint8Array): string => Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
const random32 = (): Uint8Array => crypto.getRandomValues(new Uint8Array(32));

function paddedNetworkTag(network: string): Uint8Array {
  const encoded = new TextEncoder().encode(network);
  if (encoded.length > 32) throw new Error('Network identifier is too long for NightParcel.');
  const result = new Uint8Array(32);
  result.set(encoded);
  return result;
}

async function digestTerms(memo: string): Promise<Uint8Array> {
  const domain = new TextEncoder().encode('nightparcel:terms:v1');
  const value = new TextEncoder().encode(memo);
  const input = new Uint8Array(domain.length + value.length);
  input.set(domain);
  input.set(value, domain.length);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', input));
}

export async function deployInvoiceBook(
  api: ConnectedAPI,
  passphrase: string,
  tokenColor: string,
): Promise<InvoiceBookSession> {
  if (!/^[0-9a-f]{64}$/i.test(tokenColor)) throw new Error('Token color must be exactly 32 bytes of hexadecimal.');
  const configuration = await api.getConfiguration();
  const providers = await createBrowserProviders(api, passphrase);
  const deployed = await deployContract(providers, {
    compiledContract: CompiledNightParcelContract,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: createPrivateState(random32()),
    args: [paddedNetworkTag(configuration.networkId), bytes(tokenColor.toLowerCase())],
  });
  return {
    address: deployed.deployTxData.public.contractAddress,
    contract: deployed,
    providers,
  };
}

export async function openInvoiceBook(
  api: ConnectedAPI,
  passphrase: string,
  contractAddress: string,
): Promise<InvoiceBookSession> {
  if (!/^[0-9a-f]{64}$/i.test(contractAddress)) throw new Error('Invoice-book address must be exactly 32 bytes of hexadecimal.');
  const providers = await createBrowserProviders(api, passphrase);
  const address = contractAddress.toLowerCase() as ContractAddress;
  const contract = await findDeployedContract(providers, {
    compiledContract: CompiledNightParcelContract,
    contractAddress: address,
    privateStateId: PRIVATE_STATE_ID,
  });
  return { address, contract, providers };
}

export async function exportInvoiceBookRecovery(session: InvoiceBookSession): Promise<InvoiceBookRecovery> {
  const [privateStates, signingKeys] = await Promise.all([
    session.providers.privateStateProvider.exportPrivateStates(),
    session.providers.privateStateProvider.exportSigningKeys(),
  ]);
  return {
    version: 'nightparcel.recovery.v1',
    contractAddress: session.address,
    exportedAt: new Date().toISOString(),
    privateStates,
    signingKeys,
    warning: 'Encrypted NightParcel application state. Keep it private. It does not contain or replace a Lace recovery phrase.',
  };
}

export async function restoreInvoiceBook(
  api: ConnectedAPI,
  passphrase: string,
  value: unknown,
): Promise<InvoiceBookSession> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Recovery file must be a JSON object.');
  const recovery = value as Partial<InvoiceBookRecovery>;
  if (recovery.version !== 'nightparcel.recovery.v1' || typeof recovery.contractAddress !== 'string') {
    throw new Error('Unsupported NightParcel recovery file.');
  }
  if (!recovery.privateStates || !recovery.signingKeys) throw new Error('Recovery file is missing private state or contract signing keys.');
  const providers = await createBrowserProviders(api, passphrase);
  await providers.privateStateProvider.importSigningKeys(recovery.signingKeys, { conflictStrategy: 'overwrite' });
  await providers.privateStateProvider.importPrivateStates(recovery.privateStates, { conflictStrategy: 'overwrite' });
  const address = recovery.contractAddress.toLowerCase() as ContractAddress;
  const contract = await findDeployedContract(providers, {
    compiledContract: CompiledNightParcelContract,
    contractAddress: address,
    privateStateId: PRIVATE_STATE_ID,
  });
  return { address, contract, providers };
}

export async function createCommittedInvoice(
  api: ConnectedAPI,
  session: InvoiceBookSession,
  input: CreateInvoiceInput,
): Promise<{ request: InvoiceRequest; transactionId: string }> {
  const configuration = await api.getConfiguration();
  const addresses = await api.getShieldedAddresses();
  if (addresses.shieldedAddress !== input.intendedRecipient) {
    throw new Error('The intended recipient is not the currently connected merchant wallet. Reconnect the correct account.');
  }
  const beforeState = await session.providers.publicDataProvider.queryContractState(session.address);
  if (beforeState === null) throw new Error('The invoice-book deployment is not visible to the indexer.');
  if (hex(ledger(beforeState.data).tokenColor) !== input.tokenColor.toLowerCase()) {
    throw new Error('The selected invoice book is configured for a different token color.');
  }
  const coinPublicKey = parseCoinPublicKeyToHex(addresses.shieldedCoinPublicKey, configuration.networkId);
  const encryptionPublicKey = parseEncPublicKeyToHex(addresses.shieldedEncryptionPublicKey, configuration.networkId);
  const opening: InvoiceOpening = {
    invoiceId: random32(),
    amount: BigInt(input.amount),
    payeeCoinPublicKey: bytes(coinPublicKey),
    payeeEncryptionPublicKey: bytes(encryptionPublicKey),
    expiresAt: BigInt(input.expiresAt),
    termsDigest: await digestTerms(input.privateMemo),
  };
  const invoiceSalt = random32();
  const result = await session.contract.callTx.createInvoice(opening, invoiceSalt);
  const commitment = result.private.result;

  session.providers.privateStateProvider.setContractAddress(session.address);
  const privateState = await session.providers.privateStateProvider.get(PRIVATE_STATE_ID);
  if (privateState === null) throw new Error('Merchant private state disappeared after invoice creation. Export recovery data before continuing.');
  const commitmentHex = hex(commitment);
  privateState.invoices[commitmentHex] = { opening, invoiceSalt, privateMemo: input.privateMemo };
  await session.providers.privateStateProvider.set(PRIVATE_STATE_ID, privateState);

  const state = await session.providers.publicDataProvider.queryContractState(session.address);
  if (state === null) throw new Error('The indexer did not expose the invoice book after creation.');
  const publicLedger = ledger(state.data);
  if (!publicLedger.invoices.member(commitment)) throw new Error('The indexer does not show the new invoice commitment.');

  return {
    transactionId: result.public.txId,
    request: {
      version: 'nightparcel.invoice.v2',
      network: configuration.networkId,
      networkTag: hex(publicLedger.networkTag),
      contractAddress: session.address,
      merchantKey: hex(publicLedger.merchantKey),
      invoiceCommitment: commitmentHex,
      tokenColor: hex(publicLedger.tokenColor),
      recipient: addresses.shieldedAddress,
      opening: {
        invoiceId: hex(opening.invoiceId),
        amount: opening.amount.toString(),
        payeeCoinPublicKey: coinPublicKey,
        payeeEncryptionPublicKey: encryptionPublicKey,
        expiresAt: Number(opening.expiresAt),
        termsDigest: hex(opening.termsDigest),
      },
      invoiceSalt: hex(invoiceSalt),
      privateMemo: input.privateMemo,
      termsEncoding: 'nightparcel.terms.utf8-sha256.v1',
    },
  };
}
