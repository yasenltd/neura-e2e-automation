import { expect } from '@playwright/test';
import { testWithoutSepolia as test} from './fixtures/bridgeFixture.js';
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

    test('Verify Sepolia to Neura only approve transaction', async ({ bridgePage, context }) => {
        test.setTimeout(TEST_TIMEOUT);

        try {
            await bridgePage.initializeBridgeWithOptions({
                context,
                walletConnection: {
                    connect: true
                },
                switchNetworkDirection: false
            });

            const watcher = new BridgeDepositWatcher();
            await watcher.clearAnkrAllowance();

            await bridgePage.fillAmount(TEST_AMOUNT);
            await bridgePage.clickBridgeButtonApprovingCustomChain(context, true, TEST_AMOUNT);
            await bridgePage.approveTokenTransfer(context);
            await bridgePage.cancelTransaction(context);
            await bridgePage.closeBridgeModal();

            const newBalances = await BalanceTracker.getAllBalances();
            await bridgePage.verifyUIBalanceMatchesChain(newBalances);
            await bridgePage.switchNetworkDirection();
            await bridgePage.reloadPreservingAuth();
            await bridgePage.verifyUIBalanceMatchesNeuraChain(newBalances);
        } catch (error) {
            console.error(`❌ Error in Sepolia to Neura bridge test: ${error.message}`);
            throw error;
        }
    });

    test('Verify Sepolia to Neura Bridge approving and bridging transaction via UI', { tag: '@scheduledRun' }, async ({ bridgePage, context }) => {
        test.setTimeout(TEST_TIMEOUT);

        const from = process.env.MY_ADDRESS.toLowerCase();
        const rawAmount = parseToEth(TEST_AMOUNT);
        const amount = rawAmount.toString();

        try {
            await bridgePage.initializeBridgeWithOptions({
                context,
                walletConnection: {
                    connect: true
                },
                switchNetworkDirection: false
            });

            const beforeBalances = await BalanceTracker.getAllBalances();
            const watcher = new BridgeDepositWatcher();
            await watcher.clearAnkrAllowance();

            await bridgePage.fillAmount(TEST_AMOUNT);
            await bridgePage.clickBridgeButtonApprovingCustomChain(context, true, TEST_AMOUNT);
            await bridgePage.approveTokenTransfer(context);
            await bridgePage.approveBridgingTokens(context);

            const blockStart = await watcher.getFreshBlockNumber();
            const subgraphTxHash = await getDepositTransactionHash(from, amount);
            const { txHash, parsed } = await watcher.waitForNextDeposit(blockStart);
            // TO DO: Uncomment the following line when the subgraph is ready
            // expect(txHash).toEqual(subgraphTxHash);

            const result = await BalanceTracker.compareBalances(beforeBalances, TEST_AMOUNT, false);
            await assertionHelpers.assertSepoliaToNeuraBalanceChanges(result);
            const newBalances = await BalanceTracker.getAllBalances();
            await bridgePage.verifyUIBalanceMatchesChain(newBalances);
            await bridgePage.switchNetworkDirection();
            await bridgePage.reloadPreservingAuth();
            await bridgePage.verifyUIBalanceMatchesNeuraChain(newBalances);
        } catch (error) {
            console.error(`❌ Error in Sepolia to Neura bridge test: ${error.message}`);
            throw error;
        }
    });

    test('Verify Sepolia to Neura approve and then bridge transaction', async ({ bridgePage, context }) => {
        test.setTimeout(TEST_TIMEOUT);

        const from = process.env.MY_ADDRESS.toLowerCase();
        const rawAmount = parseToEth(TEST_AMOUNT);
        const amount = rawAmount.toString();
        try {
            await bridgePage.initializeBridgeWithOptions({
                context,
                walletConnection: {
                    connect: true
                },
                switchNetworkDirection: false
            });

            const beforeBalances = await BalanceTracker.getAllBalances();
            const watcher = new BridgeDepositWatcher();
            await watcher.clearAnkrAllowance();

            await bridgePage.fillAmount(TEST_AMOUNT);
            await bridgePage.clickBridgeButtonApprovingCustomChain(context, true, TEST_AMOUNT);
            await bridgePage.approveTokenTransfer(context);
            await bridgePage.cancelTransaction(context);
            await bridgePage.closeBridgeModal();
            await bridgePage.fillAmount(TEST_AMOUNT);
            await bridgePage.clickBridgeButton(false, TEST_AMOUNT);
            await bridgePage.clickDescLoc(bridgePage.selectors.bridgeDescriptors.bridgeTokensBtn);
            await bridgePage.approveBridgingTokens(context);

            const blockStart = await watcher.getFreshBlockNumber();
            const subgraphTxHash = await getDepositTransactionHash(from, amount);
            const { txHash, parsed } = await watcher.waitForNextDeposit(blockStart);
            expect(txHash).toEqual(subgraphTxHash);

            const result = await BalanceTracker.compareBalances(beforeBalances, TEST_AMOUNT, false);
            await assertionHelpers.assertSepoliaToNeuraBalanceChanges(result);
            const newBalances = await BalanceTracker.getAllBalances();
            await bridgePage.verifyUIBalanceMatchesChain(newBalances);
            await bridgePage.switchNetworkDirection();
            await bridgePage.reloadPreservingAuth();
            await bridgePage.verifyUIBalanceMatchesNeuraChain(newBalances);
        } catch (error) {
            console.error(`❌ Error in Sepolia to Neura bridge test: ${error.message}`);
            throw error;
        }
    });
});
