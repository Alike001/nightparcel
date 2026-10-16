import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types';

export const PERSISTENT_DB_NAME = 'nightparcel-browser-private-state';
const CANARY_ADDRESS = 'nightparcel-passphrase-check';
const CANARY_ID = 'canary';

export class WrongPassphraseError extends Error {
  constructor(cause: unknown) {
    super('That passphrase cannot open NightParcel private state for this wallet account.', { cause });
    this.name = 'WrongPassphraseError';
  }
}

export async function persistentPrivateStateProvider<PSI extends string, PS>(options: {
  accountId: string;
  passphrase: string;
}): Promise<PrivateStateProvider<PSI, PS>> {
  const { levelPrivateStateProvider } = await import('@midnight-ntwrk/midnight-js-level-private-state-provider');
  const provider = levelPrivateStateProvider<PSI, PS>({
    midnightDbName: PERSISTENT_DB_NAME,
    accountId: options.accountId,
    privateStoragePasswordProvider: () => options.passphrase,
    cryptoBackend: 'webcrypto',
  });

  const canary = provider as unknown as PrivateStateProvider<string, { ok: true }>;
  canary.setContractAddress(CANARY_ADDRESS as ContractAddress);
  try {
    const existing = await canary.get(CANARY_ID);
    if (existing === null) await canary.set(CANARY_ID, { ok: true });
  } catch (error) {
    throw new WrongPassphraseError(error);
  }
  return provider;
}
