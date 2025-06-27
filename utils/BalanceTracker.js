import BridgeDepositWatcher from './BridgeDepositWatcher.js';
import { parseToEth, parseEther, createBigNumber } from './ethersUtil.js';

export default class BalanceTracker {

    /** Current Sepolia balances */
    static async getSepoliaBalances() {
        const watcher    = new BridgeDepositWatcher();
        const ankrBalStr = await watcher.getAnkrBalance();   // "797.75"
        const ethBalStr  = await watcher.getEthBalance();    // "1.234"

        return {
            ankr:   ankrBalStr,
            eth:    ethBalStr,
            ankrBN: parseToEth(ankrBalStr),
            ethBN:  parseEther(ethBalStr),
        };
    }

    /** Current Neura balances */
    static async getNeuraBalances() {
        const watcher    = new BridgeDepositWatcher();
        const ankrBalStr = await watcher.getAnkrBalanceOnNeura();

        return {
            ankr:   ankrBalStr,
            ankrBN: parseToEth(ankrBalStr),
        };
    }

    /** Sepolia + Neura snapshot */
    static async getAllBalances() {
        return {
            sepolia: await this.getSepoliaBalances(),
            neura:   await this.getNeuraBalances(),
        };
    }

    /**
     * Compares old and current balances considering the amount and direction
     * @param {Object} oldBalances - Result from getAllBalances()
     * @param {string} amount - The amount being transferred
     * @param {boolean} isNeuraToSepolia - Direction flag (true if Neura to Sepolia, false if Sepolia to Neura)
     * @returns {Object} - Comparison result with differences and validation flags
     */
    static async compareBalances(oldBalances, amount, isNeuraToSepolia) {
        const currentBalances = await this.getAllBalances();
        const amountBN  = parseEther(amount);
        const tolerance = createBigNumber('10000000000000');

        console.log('➖ Transfer amount (wei):', amountBN.toString());
        console.log('⚖️ Tolerance (wei):',      tolerance.toString());

        const sepoliaDiff = this.getBalanceDifference(
            oldBalances.sepolia,
            currentBalances.sepolia
        );
        const neuraDiff   = this.getNeuraBalanceDifference(
            oldBalances.neura,
            currentBalances.neura
        );

        console.table({
            'Sepolia ANKR diff (wei)': sepoliaDiff.ankrDiff.toString(),
            'Neura   ANKR diff (wei)': neuraDiff.ankrDiff.toString(),
        });

        const calcError   = diffBN => diffBN.abs().sub(amountBN).abs();
        const neuraError     = calcError(neuraDiff.ankrDiff);
        const sepoliaError   = calcError(sepoliaDiff.ankrDiff);

        console.table({
            'Neura error (wei)':   neuraError.toString(),
            'Sepolia error (wei)': sepoliaError.toString(),
        });

        const isNeuraDecreased   = neuraDiff.ankrDiff.isNegative();
        const isSepoliaDecreased = sepoliaDiff.ankrDiff.isNegative();

        /* ---------- build result once, then extend per direction ---------- */
        const result = {
            sepoliaDiff,
            neuraDiff,
            isNeuraAmountCorrect:   neuraError.lte(tolerance),
            isSepoliaAmountCorrect: sepoliaError.lte(tolerance),
        };

        /* ---------- direction-specific flags ---------- */
        if (isNeuraToSepolia) {
            Object.assign(result, {
                isNeuraDecreased,
                isSepoliaIncreased: !isSepoliaDecreased,
            });
            console.log('🔄 Direction: Neura ➜ Sepolia');
        } else {
            Object.assign(result, {
                isSepoliaDecreased,
                isNeuraIncreased: !isNeuraDecreased,
            });
            console.log('🔄 Direction: Sepolia ➜ Neura');
        }

        console.table({
            'isNeuraAmountCorrect':   result.isNeuraAmountCorrect,
            'isSepoliaAmountCorrect': result.isSepoliaAmountCorrect
        });

        result.amountBN = amountBN;
        result.tolerance = tolerance;

        return result;
    }

    /* -------------- Diff helpers -------------- */
    static getBalanceDifference(beforeB, afterB) {
        const ankrDiff = afterB.ankrBN.sub(beforeB.ankrBN);
        const hasEth   = !!beforeB.ethBN && !!afterB.ethBN;
        const ethDiff  = hasEth ? afterB.ethBN.sub(beforeB.ethBN) : null;

        const label = hasEth ? 'Sepolia' : 'Neura';
        console.log(`🟡 ${label} ANKR  before ${beforeB.ankr} → after ${afterB.ankr}`);

        if (hasEth) {
            console.log(`🟠 ${label} ETH   before ${beforeB.eth}  → after ${afterB.eth}`);
            console.log('📉 ETH  diff (wei):', ethDiff.toString());
        }

        console.log('📉 ANKR diff (wei):', ankrDiff.toString());
        return {
            ankrBeforeBN: beforeB.ankrBN,
            ankrAfterBN:  afterB.ankrBN,
            ankrDiff,
            ...(hasEth && {
                ethBeforeBN: beforeB.ethBN,
                ethAfterBN:  afterB.ethBN,
                ethDiff,
            }),
        };
    }

    /** Compare two Neura-only snapshots */
    static getNeuraBalanceDifference(beforeB, afterB) {
        const ankrDiff = afterB.ankrBN.sub(beforeB.ankrBN);
        console.log(`🪙 ANKR before ${beforeB.ankr} → after ${afterB.ankr}`);
        return {
            ankrBeforeBN: beforeB.ankrBN,
            ankrAfterBN:  afterB.ankrBN,
            ankrDiff,
        };
    }
}
