/**
 * Constants related to bridge operations
 */

// Enum for bridge operation types
const BridgeOperationType = {
  APPROVE_ONLY: 'approveOnly',
  BRIDGE_ONLY: 'bridgeOnly',
  APPROVE_AND_BRIDGE: 'approveAndBridge'
};

// Enum for transaction actions
const TransactionAction = {
  CONFIRM: 'confirm',
  CANCEL: 'cancel'
};

module.exports = {
  BridgeOperationType,
  TransactionAction
};