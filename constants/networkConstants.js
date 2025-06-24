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
    explorer: 'https://devnet-blockscout.infra.neuraprotocol.io/'
  },
  neuraTestnet: {
    networkName: 'Neura Testnet',
    rpcUrl: process.env.NEURA_TESTNET_RPC_URL,
    chainId: '267',
    currencySymbol: 'ANKR',
    name: 'Neura Testnet',
    explorer: 'https://testnet-explorer.neura.network'
  },
  sepolia: {
    networkName: 'Sepolia',
    rpcUrl: process.env.SEPOLIA_RPC_URL,
    chainId: '11155111',
    currencySymbol: 'SepoliaETH',
    name: 'Sepolia',
    explorer: process.env.SEPOLIA_EXPLORER
  }
};

export default networks;
