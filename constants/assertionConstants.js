/**
 * Constants for test assertions
 */

// MetaMask integration assertions
const metaMaskIntegrationAssertions = {
  neuraWalletLabels: ['ANKR', 'Neura Chain'],
  networkLabels: {
    bscTestnet: ['BSC Testnet'],
    sepolia: ['Sepolia'],
  },
  activityLabel: ['Activity'],
};

// Neura Bridge Page Layout assertions
const neuraBridgeAssertions = {
  pageLayout: {
    title: 'Bridge',
    networks: {
      sepolia: ['Sepolia', 'testnet'],
      neuraTestnet: ['Neura Testnet', 'testnet'],
      bscTestnet: ['BSC Testnet', 'testnet'],
    },
  },
};

module.exports = {
  neuraBridgeAssertions,
  metaMaskIntegrationAssertions,
};
