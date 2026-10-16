import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { NetworkConfig } from './config.js';
import type { NightParcelWallet } from './wallet.js';

export type NightParcelProviders = MidnightProviders<any>;

export function buildProviders(
  wallet: NightParcelWallet,
  zkConfigPath: string,
  config: NetworkConfig,
  label: string,
): NightParcelProviders {
  const zkConfigProvider = new NodeZkConfigProvider<any>(zkConfigPath);
  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: `nightparcel-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      privateStoragePasswordProvider: () => 'NightParcel-Local-Test-Password!',
      accountId: wallet.getCoinPublicKey(),
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider: wallet,
    midnightProvider: wallet,
  };
}
