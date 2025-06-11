import axios from 'axios';
import 'dotenv/config';

/**
 * Fetch the latest transaction for a given address from Neura (Blockscout) or Sepolia (Etherscan).
 * @param {string} address - The wallet address.
 * @param {string} network - 'neura' or 'sepolia'.
 * @returns {Promise<object|null>} - The latest transaction object or null.
 */
export async function getLatestTransaction(address, network) {
    try {
        let url;

        switch (network.toLowerCase()) {
            case 'neura':
                url = `https://testnet-explorer.neuraprotocol.io/api?module=account&action=txlist&address=${address}&sort=desc&page=1&offset=1`;
                break;

            case 'sepolia':
                if (!process.env.SEPOLIA_ETHERSCAN_API_KEY) {
                    throw new Error('Missing SEPOLIA_ETHERSCAN_API_KEY in .env');
                }
                url = `https://api-sepolia.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&page=1&offset=1&apikey=${process.env.SEPOLIA_ETHERSCAN_API_KEY}`;
                break;

            default:
                throw new Error(`Unsupported network: ${network}`);
        }

        const response = await axios.get(url);
        const txns = response.data.result;

        if (Array.isArray(txns) && txns.length > 0) {
            return txns[0];
        }

        return null;
    } catch (err) {
        console.error(`[getLatestTransaction] Error for ${network}:`, err.message);
        return null;
    }
}
