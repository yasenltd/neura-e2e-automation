import MetamaskPage from '../../pages/wallets/MetamaskPage.js';

/**
 * Factory class to create wallet instances
 */
class WalletFactory {
  static async createWallet(walletType) {
    let result;
    switch (walletType.toLowerCase()) {
      case 'metamask':
        result = await MetamaskPage.initialize();
        return {
          wallet: new MetamaskPage(result.page),
          context: result.context,
        };
      default:
        throw new Error(`Unsupported wallet type: ${walletType}`);
    }
  }
}

export default WalletFactory;
