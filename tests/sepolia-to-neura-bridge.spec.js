import {ethers} from 'ethers';

const {expect} = require('@playwright/test');
const {testWithNeuraAndSepolia: test} = require('../test-utils/testFixtures');
const {waitForAnyDepositInSubgraph} = require('../utils/subgraphQueryUtil');
const {BridgeOperationType, TEST_AMOUNT, TEST_TIMEOUT} = require('../constants/testConstants');

require('dotenv').config();

test.describe('Sepolia to Neura Bridge UI Automation', () => {

    test('Verify Sepolia to Neura only approve transaction', async ({neuraBridgePage, context}) => {
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
            const balances = await neuraBridgePage.recordAndCompareBalances(async () => {
                await neuraBridgePage.fillAmount(TEST_AMOUNT);
                await neuraBridgePage.performSepoliaToNeuraOperation(context, BridgeOperationType.APPROVE_ONLY);
                await neuraBridgePage.cancelTransaction(context);
                await neuraBridgePage.closeBridgeModal();
            });

            // Step 4: Verify balance changes
            // The balance should decrease or remain the same after bridging from Sepolia to Neura
            expect(balances.ankrDiff.lte(ethers.constants.Zero)).toBe(true);
        } catch (error) {
            console.error(`❌ Error in Sepolia to Neura bridge test: ${error.message}`);
            throw error;
        }
    });

    test('Verify Sepolia to Neura only bridge transaction', async ({neuraBridgePage, context}) => {
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
            const balances = await neuraBridgePage.recordAndCompareBalances(async () => {
                await neuraBridgePage.fillAmount(TEST_AMOUNT);
                await neuraBridgePage.performSepoliaToNeuraOperation(context, BridgeOperationType.BRIDGE_ONLY);
            });

            // Step 4: Verify balance changes
            // The balance should decrease or remain the same after bridging from Sepolia to Neura
            expect(balances.ankrDiff.lte(ethers.constants.Zero)).toBe(true);
        } catch (error) {
            console.error(`❌ Error in Sepolia to Neura bridge test: ${error.message}`);
            throw error;
        }
    });

    test('Verify Sepolia to Neura Bridge', async ({neuraBridgePage, context}) => {
        test.setTimeout(TEST_TIMEOUT);

        // Step 1: Setup test data
        const from = process.env.MY_ADDRESS.toLowerCase();
        const rawAmount = ethers.utils.parseUnits(TEST_AMOUNT, 18); // BigNumber
        const amount = rawAmount.toString(); // String representation of the amount in wei

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
            const balances = await neuraBridgePage.recordAndCompareBalances(async () => {
                await neuraBridgePage.fillAmount(TEST_AMOUNT);
                await neuraBridgePage.performSepoliaToNeuraOperation(context, BridgeOperationType.APPROVE_AND_BRIDGE);
                const deposit = await waitForAnyDepositInSubgraph(from, amount);
                expect(deposit).toBeTruthy();
            });

            // Step 4: Verify balance changes
            // The balance should decrease or remain the same after bridging from Sepolia to Neura
            expect(balances.ankrDiff.lte(ethers.constants.Zero)).toBe(true);
        } catch (error) {
            console.error(`❌ Error in Sepolia to Neura bridge test: ${error.message}`);
            throw error;
        }
    });

    test('Verify Sepolia to Neura approve and then bridge transaction', async ({neuraBridgePage, context}) => {
        test.setTimeout(TEST_TIMEOUT);

        // Step 1: Setup test data
        const from = process.env.MY_ADDRESS.toLowerCase();
        const rawAmount = ethers.utils.parseUnits(TEST_AMOUNT, 18); // BigNumber
        const amount = rawAmount.toString(); // String representation of the amount in wei

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
            const balances = await neuraBridgePage.recordAndCompareBalances(async () => {
                await neuraBridgePage.fillAmount(TEST_AMOUNT);
                await neuraBridgePage.performSepoliaToNeuraOperation(context, BridgeOperationType.APPROVE_ONLY);
                await neuraBridgePage.cancelTransaction(context);
                await neuraBridgePage.closeBridgeModal();
                await neuraBridgePage.fillAmount(TEST_AMOUNT);
                await neuraBridgePage.performSepoliaToNeuraOperation(context, BridgeOperationType.BRIDGE_ONLY);
                const deposit = await waitForAnyDepositInSubgraph(from, amount);
                expect(deposit).toBeTruthy();
            });

            // Step 4: Verify balance changes
            // The balance should decrease or remain the same after bridging from Sepolia to Neura
            expect(balances.ankrDiff.lte(ethers.constants.Zero)).toBe(true);
        } catch (error) {
            console.error(`❌ Error in Sepolia to Neura bridge test: ${error.message}`);
            throw error;
        }
    });
});
