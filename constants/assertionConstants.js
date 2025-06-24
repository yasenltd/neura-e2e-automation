/**
 * Constants for test assertions
 */

const metaMaskIntegrationAssertions = {
  neuraWalletLabels: ['ANKR', 'Neura Chain'],
  networkLabels: {
    bscTestnet: ['BSC Testnet'],
    sepolia: ['Sepolia'],
  },
  activityLabel: ['Activity'],
};

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

export {
  neuraBridgeAssertions,
  metaMaskIntegrationAssertions,
};
