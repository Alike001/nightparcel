import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { Transaction, type FinalizedTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { MidnightProviders, MidnightProvider, WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import { fromHex, parseCoinPublicKeyToHex, parseEncPublicKeyToHex, toHex } from '@midnight-ntwrk/midnight-js-utils';
import {
  PRIVATE_STATE_ID,
  ZK_ASSETS_PATH,
  type NightParcelCircuits,
  type NightParcelPrivateState,
} from './contract';
import { persistentPrivateStateProvider } from './private-state';

export type NightParcelProviders = MidnightProviders<
  NightParcelCircuits,
  typeof PRIVATE_STATE_ID,
  NightParcelPrivateState
>;

export async function createBrowserProviders(
  api: ConnectedAPI,
  passphrase: string,
): Promise<NightParcelProviders> {
  const configuration = await api.getConfiguration();
  setNetworkId(configuration.networkId);
  const publicDataProvider = indexerPublicDataProvider(
    configuration.indexerUri,
    configuration.indexerWsUri,
    window.WebSocket as unknown as Parameters<typeof indexerPublicDataProvider>[2],
  );
  const zkConfigProvider = new FetchZkConfigProvider<NightParcelCircuits>(
    new URL(ZK_ASSETS_PATH, window.location.origin).toString(),
    fetch.bind(window),
  );
  if (!configuration.proverServerUri) throw new Error('Lace did not provide a local proof-server URL.');
  const proofProvider = httpClientProofProvider(configuration.proverServerUri, zkConfigProvider);
  const addresses = await api.getShieldedAddresses();
  const coinPublicKey = parseCoinPublicKeyToHex(addresses.shieldedCoinPublicKey, configuration.networkId);
  const encryptionPublicKey = parseEncPublicKeyToHex(addresses.shieldedEncryptionPublicKey, configuration.networkId);

  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => encryptionPublicKey,
    balanceTx: async (transaction) => {
      const { tx } = await api.balanceUnsealedTransaction(toHex(transaction.serialize()));
      return Transaction.deserialize('signature', 'proof', 'binding', fromHex(tx)) satisfies FinalizedTransaction;
    },
  };
  const midnightProvider: MidnightProvider = {
    submitTx: async (transaction) => {
      await api.submitTransaction(toHex(transaction.serialize()));
      const [transactionId] = transaction.identifiers();
      if (!transactionId) throw new Error('Submitted contract transaction has no identifier.');
      return transactionId;
    },
  };

  return {
    privateStateProvider: await persistentPrivateStateProvider({ accountId: coinPublicKey, passphrase }),
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  };
}
