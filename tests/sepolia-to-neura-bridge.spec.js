import { expect } from '@playwright/test';
import {getConfig, testWithoutSepolia as test} from '../test-utils/testFixtures.js';
import BalanceTracker                                     from '../utils/BalanceTracker.js';
import BridgeDepositWatcher                              from '../utils/BridgeDepositWatcher.js';
import { TEST_AMOUNT }                                   from '../constants/testConstants.js';
import { TEST_TIMEOUT }                                  from '../constants/timeoutConstants.js';
import { getDepositTransactionHash } from '../utils/subgraphQueryUtil.js';
import { parseToEth }                from '../utils/ethersUtil.js';
import dotenv from 'dotenv';
import * as assertionHelpers from "../utils/AssertionHelpers.js";
dotenv.config();

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
            const watcher = new BridgeDepositWatcher();
            await watcher.clearAnkrAllowance();

            await neuraBridgePage.fillAmount(TEST_AMOUNT);
            await neuraBridgePage.clickBridgeButtonApprovingCustomChain(context, true, TEST_AMOUNT);
            await neuraBridgePage.approveTokenTransfer(context);
            await neuraBridgePage.cancelTransaction(context);
            await neuraBridgePage.closeBridgeModal();

            const newBalances = await BalanceTracker.getAllBalances();
            await neuraBridgePage.verifyUIBalanceMatchesChain(newBalances);
            await neuraBridgePage.switchNetworkDirection();
            await neuraBridgePage.reloadWithAuthCheck();
            await neuraBridgePage.verifyUIBalanceMatchesNeuraChain(newBalances);
        } catch (error) {
            console.error(`❌ Error in Sepolia to Neura bridge test: ${error.message}`);
            throw error;
        }
    });

    test('Verify Sepolia to Neura Bridge approving and bridging transaction via UI',
        { tag: '@testRun' },
        async ({ neuraBridgePage, context }) => {
        test.setTimeout(TEST_TIMEOUT);

        // Step 1: Setup test data
        const from = process.env.MY_ADDRESS.toLowerCase();
        const rawAmount = parseToEth(TEST_AMOUNT);
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
            const beforeBalances = await BalanceTracker.getAllBalances();
            const watcher = new BridgeDepositWatcher();
            await watcher.clearAnkrAllowance();

            await neuraBridgePage.fillAmount(TEST_AMOUNT);
            await neuraBridgePage.clickBridgeButtonApprovingCustomChain(context, true, TEST_AMOUNT);
            await neuraBridgePage.approveTokenTransfer(context);
            await neuraBridgePage.approveBridgingTokens(context);

            const blockStart = await watcher.getFreshBlockNumber();
            const subgraphTxHash = await getDepositTransactionHash(from, amount);
            const { txHash, parsed } = await watcher.waitForNextDeposit(blockStart);
            // TO DO: Uncomment the following line when the subgraph is ready
            // expect(txHash).toEqual(subgraphTxHash);

            const result = await BalanceTracker.compareBalances(beforeBalances, TEST_AMOUNT, false);
            await assertionHelpers.assertSepoliaToNeuraBalanceChanges(result);

            const newBalances = await BalanceTracker.getAllBalances();
            await neuraBridgePage.verifyUIBalanceMatchesChain(newBalances);
            await neuraBridgePage.switchNetworkDirection();
            await neuraBridgePage.reloadWithAuthCheck();
            await neuraBridgePage.verifyUIBalanceMatchesNeuraChain(newBalances);
        } catch (error) {
            console.error(`❌ Error in Sepolia to Neura bridge test: ${error.message}`);
            throw error;
        }
    });

    test('Verify Sepolia to Neura approve and then bridge transaction', async ({ neuraBridgePage, context }) => {
        test.setTimeout(TEST_TIMEOUT);

        // Step 1: Setup test data
        const from = process.env.MY_ADDRESS.toLowerCase();
        const rawAmount = parseToEth(TEST_AMOUNT);
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
            const beforeBalances = await BalanceTracker.getAllBalances();

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

            const blockStart = await watcher.getFreshBlockNumber();
            const subgraphTxHash = await getDepositTransactionHash(from, amount);
            const { txHash, parsed } = await watcher.waitForNextDeposit(blockStart);
            expect(txHash).toEqual(subgraphTxHash);

            const result = await BalanceTracker.compareBalances(beforeBalances, TEST_AMOUNT, false);
            await assertionHelpers.assertSepoliaToNeuraBalanceChanges(result);

            const newBalances = await BalanceTracker.getAllBalances();
            await neuraBridgePage.verifyUIBalanceMatchesChain(newBalances);
            await neuraBridgePage.switchNetworkDirection();
            await neuraBridgePage.reloadWithAuthCheck();
            await neuraBridgePage.verifyUIBalanceMatchesNeuraChain(newBalances);
        } catch (error) {
            console.error(`❌ Error in Sepolia to Neura bridge test: ${error.message}`);
            throw error;
        }
    });
});
