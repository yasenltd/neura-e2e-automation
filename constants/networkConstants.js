/**
 * Network configuration constants for common blockchain networks
 */
const networks = {
  neuraDevnet: {
    networkName: 'Neura Devnet',
    rpcUrl: process.env.NEURA_DEVNET_RPC_URL,
    chainId: '268',
    currencySymbol: 'ANKR',
    name: 'Neura Devnet',
    explorer: process.env.NEURA_DEVNET_EXPLORER
  },
  neuraTestnet: {
    networkName: 'Neura Testnet',
    rpcUrl: process.env.NEURA_TESTNET_RPC_URL,
    chainId: '267',
    currencySymbol: 'ANKR',
    name: 'Neura Testnet',
    explorer: process.env.NEURA_TESTNET_EXPLORER
  },
  sepolia: {
    networkName: 'Sepolia',
    rpcUrl: process.env.SEPOLIA_RPC_URL,
    chainId: '11155111',
    currencySymbol: 'SepoliaETH',
    name: 'Sepolia',
    explorer: process.env.SEPOLION_EXPLORER
  }
};

module.exports = networks;