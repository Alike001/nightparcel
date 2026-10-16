import { type Witnesses } from './managed/nightparcel/contract/index.js';

export type NightParcelPrivateState = {
  readonly merchantSecret: Uint8Array;
};

export const createNightParcelPrivateState = (
  merchantSecret: Uint8Array,
): NightParcelPrivateState => ({ merchantSecret });

export const witnesses: Witnesses<NightParcelPrivateState> = {
  merchantSecret: ({ privateState }) => [privateState, privateState.merchantSecret],
};
