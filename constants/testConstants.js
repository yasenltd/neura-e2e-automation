/**
 * Constants used in tests and bridge operations
 */

// Test constants
const TEST_AMOUNT = '0.25'; // Amount used for bridge tests
const TEST_TIMEOUT = 180_000; // Timeout for bridge operations in case of network delays

// Enum for bridge operation types
const BridgeOperationType = {
  APPROVE_ONLY: 'approveOnly',
  BRIDGE_ONLY: 'bridgeOnly',
  APPROVE_AND_BRIDGE: 'approveAndBridge'
};

// Enum for transaction actions
const TransactionAction = {
  CONFIRM: 'confirm',
  CONFIRM_CHAIN: 'confirm_chain',
  CANCEL: 'cancel'
};

module.exports = {
  TEST_AMOUNT,
  TEST_TIMEOUT,
  BridgeOperationType,
  TransactionAction
};