import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import {
  Contract,
  ledger,
  pureCircuits,
  type InvoiceOpening,
  type Ledger,
  type SettlementEvidence,
  type Witnesses,
} from '../../../../contract/managed/nightparcel/contract/index.js';

export type StoredInvoice = {
  opening: InvoiceOpening;
  invoiceSalt: Uint8Array;
  privateMemo: string;
};

export type NightParcelPrivateState = {
  merchantSecret: Uint8Array;
  invoices: Record<string, StoredInvoice>;
};

export const PRIVATE_STATE_ID = 'NightParcelMerchantState';
export const ZK_ASSETS_PATH = 'managed/nightparcel';

export const createPrivateState = (merchantSecret: Uint8Array): NightParcelPrivateState => ({
  merchantSecret,
  invoices: {},
});

const witnesses: Witnesses<NightParcelPrivateState> = {
  merchantSecret: ({ privateState }) => [privateState, privateState.merchantSecret],
};

export const CompiledNightParcelContract = CompiledContract.make(
  'NightParcelContract',
  Contract,
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(ZK_ASSETS_PATH),
);

export {
  Contract,
  ledger,
  pureCircuits,
  type InvoiceOpening,
  type Ledger,
  type SettlementEvidence,
};

export type NightParcelCircuits = 'createInvoice' | 'cancelInvoice' | 'acknowledgeReceipt';
