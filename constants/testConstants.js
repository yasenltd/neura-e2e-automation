/**
 * Constants used in tests and bridge operations
 */

const TEST_AMOUNT = '0.25';

const BridgeOperationType = {
  APPROVE_ONLY: 'approveOnly',
  BRIDGE_ONLY: 'bridgeOnly',
  APPROVE_AND_BRIDGE: 'approveAndBridge'
};

const TransactionAction = {
  CONFIRM: 'confirm',
  CONFIRM_CHAIN: 'confirm_chain',
  CANCEL: 'cancel'
};

module.exports = {
  TEST_AMOUNT,
  BridgeOperationType,
  TransactionAction
};