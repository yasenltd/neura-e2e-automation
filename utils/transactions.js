import axios from 'axios';
import 'dotenv/config';
import networks from '../constants/networkConstants.js';

/**
 * Fetch the latest transaction for a given address from Neura (Blockscout) or Sepolia (Etherscan).
 * @param {string} address - The wallet address.
 * @param {object} networkConfig - The network configuration object from networks.
 * @returns {Promise<object|null>} - The latest transaction object or null.
 */
export async function getLatestTransaction(address, networkConfig) {
    try {
        let url;

        if (!networkConfig) {
            throw new Error('Invalid network configuration');
        }

        if (networkConfig.name === networks.sepolia.name) {
            if (!process.env.SEPOLIA_ETHERSCAN_API_KEY) {
                throw new Error('Missing SEPOLIA_ETHERSCAN_API_KEY in .env');
            }
            url = `https://api-sepolia.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&page=1&offset=1&apikey=${process.env.SEPOLIA_ETHERSCAN_API_KEY}`;
        } else {
            url = `${networkConfig.explorer}/api?module=account&action=txlist&address=${address}&sort=desc&page=1&offset=1`;
        }

        const response = await axios.get(url);
        const txns = response.data.result;

        if (Array.isArray(txns) && txns.length > 0) {
            return txns[0];
        }

        return null;
    } catch (err) {
        console.error(`[getLatestTransaction] Error for ${networkConfig.name}:`, err.message);
        return null;
    }
}
