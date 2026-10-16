// Adapted from midnightntwrk/midnight-examples under Apache-2.0.
import {
  type CoinPublicKey,
  DustSecretKey,
  type EncPublicKey,
  type FinalizedTransaction,
  LedgerParameters,
  ZswapSecretKeys,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type {
  WalletProvider,
  MidnightProvider,
  UnboundTransaction,
} from '@midnight-ntwrk/midnight-js-types';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import {
  type FacadeState,
  type ShieldedAddress,
  type UnshieldedKeystore,
  type WalletFacade,
} from '@midnight-ntwrk/wallet-sdk';
import {
  ShieldedAddress as ShieldedAddressValue,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
} from '@midnight-ntwrk/wallet-sdk';
import {
  type DustWalletOptions,
  type EnvironmentConfiguration,
  FluentWalletBuilder,
} from '@midnight-ntwrk/testkit-js';
import type { Logger } from 'pino';
import { Effect } from 'effect';
import * as Rx from 'rxjs';

export function localWalletSeed(actor: 'merchant' | 'payer'): string {
  const variable = actor === 'merchant'
    ? 'NIGHTPARCEL_LOCAL_MERCHANT_SEED'
    : 'NIGHTPARCEL_LOCAL_PAYER_SEED';
  const seed = process.env[variable];
  if (!seed || !/^[0-9a-fA-F]{64}$/.test(seed)) {
    throw new Error(`${variable} must contain a 32-byte hex seed for the disposable local network`);
  }
  return seed;
}

export class NightParcelWallet implements MidnightProvider, WalletProvider {
  private constructor(
    private readonly logger: Logger,
    readonly wallet: WalletFacade,
    private readonly zswapSecretKeys: ZswapSecretKeys,
    private readonly dustSecretKey: DustSecretKey,
    readonly unshieldedKeystore: UnshieldedKeystore,
  ) {}

  static async build(
    logger: Logger,
    env: EnvironmentConfiguration,
    seed: string,
  ): Promise<NightParcelWallet> {
    const dustOptions: DustWalletOptions = {
      ledgerParams: LedgerParameters.initialParameters(),
      additionalFeeOverhead: 1_000n,
      feeBlocksMargin: 5,
    };
    const built = await FluentWalletBuilder.forEnvironment(env)
      .withDustOptions(dustOptions)
      .withSeed(seed)
      .buildWithoutStarting();
    const { wallet, seeds, keystore } = built as {
      wallet: WalletFacade;
      seeds: { shielded: Uint8Array; dust: Uint8Array };
      keystore: UnshieldedKeystore;
    };
    return new NightParcelWallet(
      logger,
      wallet,
      ZswapSecretKeys.fromSeed(seeds.shielded),
      DustSecretKey.fromSeed(seeds.dust),
      keystore,
    );
  }

  getCoinPublicKey(): CoinPublicKey {
    return this.zswapSecretKeys.coinPublicKey;
  }

  getEncryptionPublicKey(): EncPublicKey {
    return this.zswapSecretKeys.encryptionPublicKey;
  }

  getShieldedAddress(): ShieldedAddress {
    return new ShieldedAddressValue(
      ShieldedCoinPublicKey.fromHexString(this.getCoinPublicKey()),
      ShieldedEncryptionPublicKey.fromHexString(this.getEncryptionPublicKey()),
    );
  }

  async balanceTx(tx: UnboundTransaction, ttl: Date = ttlOneHour()): Promise<FinalizedTransaction> {
    const recipe = await this.wallet.balanceUnboundTransaction(
      tx,
      { shieldedSecretKeys: this.zswapSecretKeys, dustSecretKey: this.dustSecretKey },
      { ttl },
    );
    const signed = await this.wallet.signRecipe(recipe, (payload) =>
      this.unshieldedKeystore.signData(payload),
    );
    return this.wallet.finalizeRecipe(signed);
  }

  submitTx(tx: FinalizedTransaction): Promise<string> {
    return this.wallet.submitTransaction(tx);
  }

  async transferShielded(
    tokenType: string,
    amount: bigint,
    receiverAddress: ShieldedAddress,
  ): Promise<{ transactionId: string; proofMilliseconds: number; submitMilliseconds: number }> {
    const proofStarted = Date.now();
    const recipe = await this.wallet.transferTransaction(
      [{ type: 'shielded', outputs: [{ type: tokenType, receiverAddress, amount }] }],
      { shieldedSecretKeys: this.zswapSecretKeys, dustSecretKey: this.dustSecretKey },
      { ttl: ttlOneHour(), payFees: true },
    );
    const signed = await this.wallet.signRecipe(recipe, (payload) =>
      this.unshieldedKeystore.signData(payload),
    );
    const finalized = await this.wallet.finalizeRecipe(signed);
    const proofMilliseconds = Date.now() - proofStarted;
    const submitStarted = Date.now();
    const transactionId = await this.wallet.submitTransaction(finalized);
    return {
      transactionId,
      proofMilliseconds,
      submitMilliseconds: Date.now() - submitStarted,
    };
  }

  async shieldedBalance(tokenType: string): Promise<bigint> {
    const state = await Rx.firstValueFrom(this.wallet.state());
    return state.shielded.balances[tokenType] ?? 0n;
  }

  async historyEntry(hash: string): Promise<{
    hash: string;
    timestamp: number;
    status: 'SUCCESS' | 'FAILURE' | 'PARTIAL_SUCCESS';
  }> {
    const state = await Rx.firstValueFrom(this.wallet.state());
    return Effect.runPromise(
      state.shielded.services.transactionHistory.getTransactionDetails(hash),
    );
  }

  async start(): Promise<void> {
    await this.wallet.start(this.zswapSecretKeys, this.dustSecretKey);
  }

  stop(): Promise<void> {
    return this.wallet.stop();
  }
}

function isComplete(progress: unknown): boolean {
  if (progress === null || typeof progress !== 'object') return false;
  const candidate = progress as { isStrictlyComplete?: () => boolean };
  return candidate.isStrictlyComplete?.() === true;
}

export async function syncWallet(
  logger: Logger,
  wallet: WalletFacade,
  timeout = 600_000,
): Promise<FacadeState> {
  return Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.filter(
        (state) =>
          isComplete(state.shielded.state.progress) &&
          isComplete(state.unshielded.progress) &&
          isComplete(state.dust.state.progress),
      ),
      Rx.tap(() => logger.info('Wallet sync complete')),
      Rx.timeout({
        each: timeout,
        with: () => Rx.throwError(() => new Error(`Wallet sync timeout after ${timeout}ms`)),
      }),
    ),
  );
}

export async function waitForShieldedBalance(
  wallet: NightParcelWallet,
  tokenType: string,
  expected: bigint,
  timeout = 300_000,
): Promise<bigint> {
  const deadline = Date.now() + timeout;
  let current = await wallet.shieldedBalance(tokenType);
  while (current !== expected && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    current = await wallet.shieldedBalance(tokenType);
  }
  return current;
}
