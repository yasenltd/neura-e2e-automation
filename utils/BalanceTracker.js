const { ethers } = require('ethers');
const BridgeDepositWatcher = require('./BridgeDepositWatcher');
const { parseToEth } = require('./ethersUtil');

/**
 * Utility class for tracking and comparing token balances before and after operations
 */
class BalanceTracker {
    /**
     * Creates a new BalanceTracker instance
     * @param {BridgeDepositWatcher} [watcher] - Optional BridgeDepositWatcher instance. If not provided, creates a new one.
     */
    constructor(watcher = null) {
        this.watcher = watcher || new BridgeDepositWatcher();
    }

    /**
     * Records current balances
     * @returns {Promise<Object>} - Current balance snapshot
     */
    async recordBalances() {
        const ankrBalance = await this.watcher.getAnkrBalance();
        const ethBalance = await this.watcher.getEthBalance();
        return {
            ankr: ankrBalance,
            eth: ethBalance,
            ankrBN: parseToEth(ankrBalance),
            ethBN: ethers.utils.parseEther(ethBalance)
        };
    }

    /**
     * Records current balances
     * @returns {Promise<Object>} - Current balance snapshot
     */
    async recordNeuraBalances() {
        const ankrBalance = await this.watcher.getAnkrBalanceOnNeura();
        return {
            ankr: ankrBalance,
            ankrBN: parseToEth(ankrBalance),
        };
    }

    /**
     * Compares two balance snapshots and calculates differences
     * @param {Object} beforeBalances - Balance snapshot before operation
     * @param {Object} afterBalances - Balance snapshot after operation
     * @returns {Object} - Balance comparison results
     */
    compareBalances(beforeBalances, afterBalances) {
        const ankrDiff = afterBalances.ankrBN.sub(beforeBalances.ankrBN);

        // Check if ETH balances exist in both objects
        const hasEthBalances = beforeBalances.ethBN && afterBalances.ethBN;

        // Only calculate ETH diff if both balances exist
        const ethDiff = hasEthBalances ? afterBalances.ethBN.sub(beforeBalances.ethBN) : null;

        console.log(`🪙 ANKR before: ${beforeBalances.ankr}`);
        console.log(`🪙 ANKR after : ${afterBalances.ankr}`);

        if (hasEthBalances) {
            console.log(`💰 ETH before : ${beforeBalances.eth}`);
            console.log(`💰 ETH after  : ${afterBalances.eth}`);
            console.log('💡 ETH diff :', ethDiff.toString());
        }

        console.log('💡 ANKR diff:', ankrDiff.toString());

        const result = {
            ankrBeforeBN: beforeBalances.ankrBN,
            ankrAfterBN: afterBalances.ankrBN,
            ankrDiff
        };

        // Only include ETH properties if ETH balances exist
        if (hasEthBalances) {
            result.ethBeforeBN = beforeBalances.ethBN;
            result.ethAfterBN = afterBalances.ethBN;
            result.ethDiff = ethDiff;
        }

        return result;
    }

    /**
     * Compares two balance snapshots and calculates differences
     * @param {Object} beforeBalances - Balance snapshot before operation
     * @param {Object} afterBalances - Balance snapshot after operation
     * @returns {Object} - Balance comparison results
     */
    compareNeuraBalances(beforeBalances, afterBalances) {
        const ankrDiff = afterBalances.ankrBN.sub(beforeBalances.ankrBN);

        console.log(`🪙 ANKR before: ${beforeBalances.ankr}`);
        console.log(`🪙 ANKR after : ${afterBalances.ankr}`);
        console.log('💡 ANKR diff:', ankrDiff.toString());

        return {
            ankrBeforeBN: beforeBalances.ankrBN,
            ankrAfterBN: afterBalances.ankrBN,
            ankrDiff,
        };
    }
}

module.exports = BalanceTracker; 
