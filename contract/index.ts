import path from 'node:path';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

export {
  Contract,
  ledger,
  type ImpureCircuits,
  type InvoiceOpening,
  type Ledger,
  type SettlementEvidence,
  type Witnesses,
} from './managed/nightparcel/contract/index.js';
import { Contract } from './managed/nightparcel/contract/index.js';
import { Contract as DemoTokenContract } from './managed/demo-token/contract/index.js';
import { witnesses } from './witnesses.js';

const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');
export const zkConfigPath = path.resolve(currentDir, 'managed', 'nightparcel');
export const demoTokenZkConfigPath = path.resolve(currentDir, 'managed', 'demo-token');

export const CompiledNightParcelContract = CompiledContract.make(
  'NightParcelContract',
  Contract,
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

export const CompiledDemoTokenContract = CompiledContract.make(
  'NightParcelDemoTokenContract',
  DemoTokenContract,
).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets(demoTokenZkConfigPath),
);

export {
  Contract as DemoTokenContract,
  ledger as demoTokenLedger,
  type Ledger as DemoTokenLedger,
} from './managed/demo-token/contract/index.js';
