import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectWallet, diagnoseConnectedWallet, isCompatibleConnectorVersion, validateRequest } from './connector';

const valid = () => ({
  version: 'nightparcel.invoice.v1',
  network: 'undeployed',
  contractAddress: 'ab'.repeat(32),
  invoiceCommitment: 'cd'.repeat(32),
  tokenColor: 'ef'.repeat(32),
  amount: '125',
  recipient: 'mn_shield-addr_test',
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
});

describe('invoice request validation', () => {
  it('accepts a complete unexpired request', () => {
    expect(validateRequest(valid()).amount).toBe('125');
  });

  it('rejects zero, expired, and incomplete requests before wallet interaction', () => {
    expect(() => validateRequest({ ...valid(), amount: '0' })).toThrow('positive');
    expect(() => validateRequest({ ...valid(), expiresAt: 1 })).toThrow('expired');
    const incomplete = valid() as Partial<ReturnType<typeof valid>>;
    delete incomplete.recipient;
    expect(() => validateRequest(incomplete)).toThrow('recipient');
  });
});

describe('connector compatibility', () => {
  it('accepts stable connector API 4 releases and rejects other majors or malformed versions', () => {
    expect(isCompatibleConnectorVersion('4.0.1')).toBe(true);
    expect(isCompatibleConnectorVersion('4.9.0')).toBe(true);
    expect(isCompatibleConnectorVersion('3.1.5')).toBe(false);
    expect(isCompatibleConnectorVersion('5.0.0')).toBe(false);
    expect(isCompatibleConnectorVersion('Lace 4')).toBe(false);
  });
});

const detectedWallet = (apiVersion = '4.0.1') => ({
  key: 'generated-wallet-key',
  name: 'Disposable Lace',
  api: {
    apiVersion,
    rdns: 'io.lace.wallet',
    name: 'Disposable Lace',
    icon: '',
    connect: vi.fn(),
  } as unknown as InitialAPI,
});

const connectedApi = (overrides: { network?: string; dust?: bigint } = {}) => {
  const network = overrides.network ?? 'undeployed';
  return {
    getConnectionStatus: vi.fn().mockResolvedValue({ status: 'connected', networkId: network }),
    getConfiguration: vi.fn().mockResolvedValue({
      networkId: network,
      indexerUri: 'http://127.0.0.1:8088/api/v3/graphql',
      indexerWsUri: 'ws://127.0.0.1:8088/api/v3/graphql/ws',
      substrateNodeUri: 'ws://127.0.0.1:9944',
      proverServerUri: 'http://127.0.0.1:6300',
    }),
    getShieldedAddresses: vi.fn().mockResolvedValue({
      shieldedAddress: `mn_shield-addr_undeployed1${'a'.repeat(72)}`,
      shieldedCoinPublicKey: 'coin-key',
      shieldedEncryptionPublicKey: 'encryption-key',
    }),
    getShieldedBalances: vi.fn().mockResolvedValue({ token: 125n }),
    getUnshieldedBalances: vi.fn().mockResolvedValue({}),
    getDustBalance: vi.fn().mockResolvedValue({ balance: overrides.dust ?? 10n, cap: 100n }),
    makeTransfer: vi.fn(),
    submitTransaction: vi.fn(),
    getTxHistory: vi.fn(),
    getProvingProvider: vi.fn(),
  } as unknown as ConnectedAPI;
};

describe('sanitized wallet readiness diagnostic', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('accepts a complete local connector without retaining the full address', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const api = connectedApi();
    const fullAddress = (await api.getShieldedAddresses()).shieldedAddress;
    const result = await diagnoseConnectedWallet(detectedWallet(), api, 'undeployed');

    expect(result.readyForTransfer).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.wallet.accountFingerprint).toMatch(/^[0-9a-f]{16}$/);
    expect(JSON.stringify(result)).not.toContain(fullAddress);
  });

  it('keeps wrong-network and zero-DUST wallets blocked', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('CORS')));
    const result = await diagnoseConnectedWallet(detectedWallet(), connectedApi({ network: 'preview', dust: 0n }), 'undeployed');

    expect(result.readyForTransfer).toBe(false);
    expect(result.issues.join(' ')).toContain('network does not match');
    expect(result.issues.join(' ')).toContain('DUST balance is zero');
    expect(result.proofServer.browserReachability).toBe('cors-or-unreachable');
  });
});

describe('connector runtime compatibility', () => {
  afterEach(() => vi.unstubAllGlobals());

  const authorize = (api: ConnectedAPI) => {
    const wallet = detectedWallet();
    wallet.api.connect = vi.fn().mockResolvedValue(api);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    return { wallet, connect: () => connectWallet(wallet, 'undeployed') };
  };

  it('continues without runtime hintUsage and records a non-blocking compatibility limitation', async () => {
    const { connect } = authorize(connectedApi());

    const result = await connect();

    expect(result.diagnostic.readyForTransfer).toBe(true);
    expect(result.diagnostic.compatibilityLimitations).toEqual([
      expect.stringContaining('does not expose Connector API hintUsage'),
    ]);
  });

  it('awaits working hintUsage before running strict diagnostics', async () => {
    const api = connectedApi();
    const hintUsage = vi.fn().mockResolvedValue(undefined);
    api.hintUsage = hintUsage;
    const { connect } = authorize(api);

    const result = await connect();

    expect(hintUsage).toHaveBeenCalledOnce();
    expect(hintUsage).toHaveBeenCalledWith(expect.arrayContaining([
      'getConfiguration',
      'getShieldedAddresses',
      'getDustBalance',
      'makeTransfer',
      'submitTransaction',
    ]));
    expect(result.diagnostic.compatibilityLimitations).toEqual([]);
    expect(result.diagnostic.readyForTransfer).toBe(true);
  });

  it('propagates an explicit permission rejection from hintUsage', async () => {
    const api = connectedApi();
    api.hintUsage = vi.fn().mockRejectedValue(new Error('PermissionRejected: transaction access denied'));
    const { connect } = authorize(api);

    await expect(connect()).rejects.toThrow('PermissionRejected');
  });

  it('keeps a wallet without a required transaction method blocked', async () => {
    const api = connectedApi();
    Reflect.deleteProperty(api, 'makeTransfer');
    const { connect } = authorize(api);

    const result = await connect();

    expect(result.diagnostic.readyForTransfer).toBe(false);
    expect(result.diagnostic.issues).toContain('Required connector method makeTransfer is unavailable.');
  });

  it('rejects a wallet connected to the wrong network', async () => {
    const { connect } = authorize(connectedApi({ network: 'preview' }));

    await expect(connect()).rejects.toThrow('network does not match undeployed');
  });

  it('keeps a wallet without DUST blocked', async () => {
    const { connect } = authorize(connectedApi({ dust: 0n }));

    const result = await connect();

    expect(result.diagnostic.readyForTransfer).toBe(false);
    expect(result.diagnostic.issues).toContain('DUST balance is zero.');
  });
});
