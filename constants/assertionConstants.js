/**
 * Constants for test assertions
 * Contains all expected values used in test assertions to avoid hardcoding
 */

// MetaMask integration assertions
const metaMaskIntegrationAssertions = {
  neuraWalletLabels: ['ANKR', 'Neura Chain'],
  networkLabels: {
    bscTestnet: ['BSC Testnet'],
    holesky: ['Holesky'],
  },
  activityLabel: ['Activity'],
};

// Neura Bridge Page Layout assertions
const neuraBridgeAssertions = {
  pageLayout: {
    title: 'Bridge',
    networks: {
      holesky: ['Holesky', 'testnet'],
      neuraTestnet: ['Neura Testnet', 'testnet'],
      bscTestnet: ['BSC Testnet', 'testnet'],
    },
    labels: {
      to: 'To',
      from: 'From',
      amount: 'Amount',
      enterAmount: 'Enter Amount',
      limit: 'Max'
    },
  },
  // Preview Transaction Layout assertions
  previewTransactionLayout: {
    title: 'Preview Transaction',
    bridgeTokenButton: 'Bridge Tokens',
    approveTokenTransferButton: 'Approve Token Transfer',
    previewLabels: {
      fromChain: 'From Chain:',
      toChain: 'To Chain:',
      amount: 'Amount:',
    },
    previewValues: {
      fromChain: 'Holesky',
      toChain: 'Neura Testnet',
      amount: '0 ANKR',
    },
  },
};

const neuraFaucetAssertions = {
  // Neura Faucet Page Layout assertions
  pageLayout: {
    title: 'Neura Faucet',
    walletSelectionLabel: 'Select the wallet you want to claim from',
    disconnectLabel: 'Disconnect',
    connectWalletLabel: 'Connect Wallet',
    claimButton: 'Claim Tokens',
  },
};

module.exports = {
  neuraBridgeAssertions,
  neuraFaucetAssertions,
  metaMaskIntegrationAssertions,
};
