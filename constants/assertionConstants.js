/**
 * Constants for test assertions
 */

const metaMaskIntegrationAssertions = {
  neuraWalletLabels: ['ANKR', 'Neura Chain'],
  networkLabels: {
    sepolia: ['Sepolia'],
  },
  activityLabel: ['Activity'],
};

const neuraBridgeAssertions = {
  pageLayout: {
    title: 'Bridge',
    networks: {
      sepolia: ['Sepolia', 'Testnet'],
      neuraTestnet: ['Neura Testnet', 'testnet'],
    },
  },
};

export {
  neuraBridgeAssertions,
  metaMaskIntegrationAssertions,
};
