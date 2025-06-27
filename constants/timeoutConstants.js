/**
 * Timeout constants for the Neura E2E Automation project
 * Centralize all timeout values to ensure consistency and maintainability
 */

function envOr(name, fallback) {
  const v = process.env[name];
  return v != null && !isNaN(parseInt(v, 10))
      ? parseInt(v, 10)
      : fallback;
}

export const TEST_TIMEOUT = envOr('TEST_TIMEOUT', 90_000);
export const DEFAULT_TIMEOUT = envOr('DEFAULT_TIMEOUT', 1_000);
export const LONG_TIMEOUT = envOr('LONG_TIMEOUT', 5_000);
export const METAMASK_POPUP_TIMEOUT = envOr('METAMASK_POPUP_TIMEOUT', 3_000);
export const WALLET_OPERATION_TIMEOUT = envOr('WALLET_OPERATION_TIMEOUT', 3_000);
export const AMOUNT_FILL_TIMEOUT = envOr('AMOUNT_FILL_TIMEOUT', 3_000);
export const TRANSACTION_APPROVAL_TIMEOUT = envOr('TRANSACTION_APPROVAL_TIMEOUT', 7_000);
export const NETWORK_OPERATION_TIMEOUT = envOr('NETWORK_OPERATION_TIMEOUT', 2_500);
export const BRIDGE_OPERATION_TIMEOUT = envOr('BRIDGE_OPERATION_TIMEOUT', 60_000);
export const TOKEN_TRANSFER_TIMEOUT = envOr('TOKEN_TRANSFER_TIMEOUT', 90_000);
