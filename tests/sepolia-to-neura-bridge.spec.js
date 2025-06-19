import { ethers } from 'ethers';
import BridgeDepositWatcher from '../utils/BridgeDepositWatcher.js';

const { expect } = require('@playwright/test');
const { testWithoutSepolia: test } = require('../test-utils/testFixtures');
const { waitForAnyDepositInSubgraph } = require('../utils/subgraphQueryUtil');
const { TEST_AMOUNT } = require('../constants/testConstants');
const { TEST_TIMEOUT } = require('../constants/timeoutConstants');
const BalanceTracker = require('../utils/BalanceTracker');

require('dotenv').config();

test.describe('Sepolia to Neura Bridge UI Automation', () => {

    test('Verify Sepolia to Neura only approve transaction', async ({ neuraBridgePage, context }) => {
        test.setTimeout(TEST_TIMEOUT);

        try {
            // Step 2: Initialize bridge with options (with wallet connection, no network switch)
            await neuraBridgePage.initializeBridgeWithOptions({
                context,
                walletConnection: {
                    connect: true
                },
                switchNetworkDirection: false
            });

            // Step 3: Record balances and perform the bridge operation
            const balanceTracker = new BalanceTracker();
            const beforeBalances = await balanceTracker.recordBalances();
            const watcher = new BridgeDepositWatcher();
            await watcher.clearAnkrAllowance();
            await neuraBridgePage.fillAmount(TEST_AMOUNT);
            await neuraBridgePage.clickBridgeButtonApprovingCustomChain(context, true, TEST_AMOUNT);
            await neuraBridgePage.approveTokenTransfer(context);
            await neuraBridgePage.cancelTransaction(context);
            await neuraBridgePage.closeBridgeModal();

            const afterBalances = await balanceTracker.recordBalances();
            const balances = balanceTracker.compareBalances(beforeBalances, afterBalances);

            // Step 4: Verify balance changes
            // The ANKR balance should decrease by exactly the test amount after bridging from Sepolia to Neura
            const expectedAnkrDiff = ethers.utils.parseUnits(TEST_AMOUNT, 18).mul(-1);
            expect(balances.ankrDiff.eq(expectedAnkrDiff)).toBe(true);
        } catch (error) {
            console.error(`❌ Error in Sepolia to Neura bridge test: ${error.message}`);
            throw error;
        }
    });

    test('Verify Sepolia to Neura only bridge transaction', async ({ neuraBridgePage, context }) => {
        test.setTimeout(TEST_TIMEOUT);
        try {
            // Step 1: Initialize bridge with options (with wallet connection, no network switch)
            await neuraBridgePage.initializeBridgeWithOptions({
                context,
                walletConnection: {
                    connect: true
                },
                switchNetworkDirection: false
            });

            // Step 3: Record balances and perform the bridge operation
            const balanceTracker = new BalanceTracker();
            const beforeBalances = await balanceTracker.recordBalances();
            await neuraBridgePage.fillAmount(TEST_AMOUNT);
            await neuraBridgePage.clickBridgeButtonApprovingCustomChain(context, false, TEST_AMOUNT);
            await neuraBridgePage.clickDescLoc(neuraBridgePage.selectors.bridgeDescriptors.bridgeTokensBtn);
            await neuraBridgePage.approveBridgingTokens(context);

            const afterBalances = await balanceTracker.recordBalances();
            const balances = balanceTracker.compareBalances(beforeBalances, afterBalances);

            // Step 4: Verify balance changes
            // The ANKR balance should decrease by exactly the test amount after bridging from Sepolia to Neura
            const expectedAnkrDiff = ethers.utils.parseUnits(TEST_AMOUNT, 18).mul(-1);
            expect(balances.ankrDiff.eq(expectedAnkrDiff)).toBe(true);
        } catch (error) {
            console.error(`❌ Error in Sepolia to Neura bridge test: ${error.message}`);
            throw error;
        }
    });

    test('Verify Sepolia to Neura Bridge approving and bridging transaction via UI',
        { tag: '@scheduledRun' },
        async ({ neuraBridgePage, context }) => {
        test.setTimeout(TEST_TIMEOUT);

        // Step 1: Setup test data
        const from = process.env.MY_ADDRESS.toLowerCase();
        const rawAmount = ethers.utils.parseUnits(TEST_AMOUNT, 18);
        const amount = rawAmount.toString();

        try {
            // Step 2: Initialize bridge with options (with wallet connection, no network switch)
            await neuraBridgePage.initializeBridgeWithOptions({
                context,
                walletConnection: {
                    connect: true
                },
                switchNetworkDirection: false
            });

            // Step 3: Record balances and perform the bridge operation
            const watcher = new BridgeDepositWatcher();
            const balanceTracker = new BalanceTracker(watcher);
            const beforeBalances = await balanceTracker.recordBalances();
            await watcher.clearAnkrAllowance();
            await neuraBridgePage.fillAmount(TEST_AMOUNT);
            await neuraBridgePage.clickBridgeButtonApprovingCustomChain(context, true, TEST_AMOUNT);
            await neuraBridgePage.approveTokenTransfer(context);
            await neuraBridgePage.approveBridgingTokens(context);
            const blockStart = await watcher.getFreshBlockNumber();
            console.log('Block start', blockStart);
            const afterBalances = await balanceTracker.recordBalances();
            const balances = balanceTracker.compareBalances(beforeBalances, afterBalances);

            const depositTxnInSubgraph = await waitForAnyDepositInSubgraph(from, amount);
            expect(depositTxnInSubgraph).toBeTruthy();
            const subgraphTxHash = depositTxnInSubgraph[0].transactionHash;
            const { txHash, parsed } = await watcher.waitForNextDeposit(blockStart);
            console.log('Deposit hash from event →', txHash);
            expect(txHash).toEqual(subgraphTxHash);

            // Step 4: Verify balance changes
            // The ANKR balance should decrease by exactly the test amount after bridging from Sepolia to Neura
            const expectedAnkrDiff = ethers.utils.parseUnits(TEST_AMOUNT, 18).mul(-1);
            expect(balances.ankrDiff.eq(expectedAnkrDiff)).toBe(true);
        } catch (error) {
            console.error(`❌ Error in Sepolia to Neura bridge test: ${error.message}`);
            throw error;
        }
    });

    test('Verify Sepolia to Neura approve and then bridge transaction', async ({ neuraBridgePage, context }) => {
        test.setTimeout(TEST_TIMEOUT);

        // Step 1: Setup test data
        const from = process.env.MY_ADDRESS.toLowerCase();
        const rawAmount = ethers.utils.parseUnits(TEST_AMOUNT, 18);
        const amount = rawAmount.toString();
        try {
            // Step 2: Initialize bridge with options (with wallet connection, no network switch)
            await neuraBridgePage.initializeBridgeWithOptions({
                context,
                walletConnection: {
                    connect: true
                },
                switchNetworkDirection: false
            });

            // Step 3: Record balances and perform the bridge operation
            const balanceTracker = new BalanceTracker();
            const beforeBalances = await balanceTracker.recordBalances();
            const watcher = new BridgeDepositWatcher();
            await watcher.clearAnkrAllowance();
            await neuraBridgePage.fillAmount(TEST_AMOUNT);
            await neuraBridgePage.clickBridgeButtonApprovingCustomChain(context, true, TEST_AMOUNT);
            await neuraBridgePage.approveTokenTransfer(context);
            await neuraBridgePage.cancelTransaction(context);
            await neuraBridgePage.closeBridgeModal();
            await neuraBridgePage.fillAmount(TEST_AMOUNT);
            await neuraBridgePage.clickBridgeButton(false, TEST_AMOUNT);
            await neuraBridgePage.clickDescLoc(neuraBridgePage.selectors.bridgeDescriptors.bridgeTokensBtn);
            await neuraBridgePage.approveBridgingTokens(context);
            const deposit = await waitForAnyDepositInSubgraph(from, amount);
            expect(deposit).toBeTruthy();

            const afterBalances = await balanceTracker.recordBalances();
            const balances = balanceTracker.compareBalances(beforeBalances, afterBalances);

            // Step 4: Verify balance changes
            // The ANKR balance should decrease by exactly the test amount after bridging from Sepolia to Neura
            const expectedAnkrDiff = ethers.utils.parseUnits(TEST_AMOUNT, 18).mul(-1);
            expect(balances.ankrDiff.eq(expectedAnkrDiff)).toBe(true);
        } catch (error) {
            console.error(`❌ Error in Sepolia to Neura bridge test: ${error.message}`);
            throw error;
        }
    });
});
