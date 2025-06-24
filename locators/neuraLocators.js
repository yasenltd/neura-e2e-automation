/**
 * Selectors for DApp example page elements
 */
export default {
    roles: {
        link: 'link',
        text: 'text',
    },
    general: {
        cellCss: 'span',
        cellParagraphCss: '> p',
        cellDivParagraphCss: 'div > p',
    },
    connection: {
        connectWalletButton: {
            role: 'button',
            name: 'Connect Wallet'
        },
        avatarButton: {
            alt: 'Account Avatar',
        },
        selectMetaMaskWallet: { text: 'MetaMask', options: { exact: true } },
        settingsButton: {
            text: 'Settings'
        },
        connectMetaWalletButton: '[data-testid="confirm-btn"]',
        signMessage: '[data-testid="rk-auth-message-button"]',
        disconnectWallet: '[data-testid="rk-disconnect-button"]',
    },
    walletScreen: {
        activityLabel: { css: '.flex-col.flex-1 > span' },
        testNetLabels: { css: '.space-x-2.w-full.flex > div > div' },
        expandWallet: { css: '.flex.items-center.gap-2 > div > div' },
        amountField: { css: '.relative.h-28.border.rounded-lg > input' },
        neuraContainer: { css: '.relative.p-4.flex.items-center > div' },
        neuraBalance: { css: '.text-xl.font-semibold' },
    },
    status: {
        networkInfo: '#network',
        chainId: '#chainId',
    },
    sourceChainModal: {
        selectSourceChainTitle: {
            css: 'h2[data-slot="dialog-title"]:has-text("Select Source Chain")'
        },
        closeChainModal: { css: '#radix-«R8jqhdbH1» > button' },
        openNetworkSourceMenu: { css: '.animate-ease-in-out' },
        neuraLabel: { text: 'Neura Testnet', options: { exact: true } },
        sepoliaLabel: { text: 'Sepolia', options: { exact: true } },
        bscTestnet: { text: 'BSC Testnet', options: { exact: true } },
        activeChain: { css: '.selector-item-active' },
    },
    claimPageDescriptors: {
        title: {
            role: 'heading',
            name: 'Bridged Tokens'
        },
        subTitle: {
            text: 'Claim your bridged tokens'
        }
    },
    bridgeDescriptors: {
        burgerMenuButton: {
            alt: 'Menu'
        },
        bridgeButtonInBurgerMenu: {
            role: 'button',
            name: 'bridge'
        },
        claimButtonInBurgerMenu: {
            role: 'button',
            name: 'claim'
        },
        faucetButtonInBurgerMenu: {
            role: 'button',
            name: 'faucet'
        },
        bridgeLabel: {
            role: 'heading',
            name: 'Bridge',
            options: { level: 2 }
        },
        fromLabel: { text: 'From' },
        toLabel: { text: 'To', options: { exact: true } },
        amountLabel: { text: 'Amount' },
        limitLabel: {
            role: 'button',
            name: 'Max'
        },
        ankrBalanceLabel: { /* ── parent ── */
            parent: { css: '.relative.h-28.border.rounded-lg' },
            child:  { text: /([0-9]+(?:\.[0-9]+)?)\s*ANKR/ }
        },
        connectWalletButtonInWidget: { css: 'button[data-slot="button"]:has-text("Connect Wallet")' },
        enterAmountBtnLabel: { text: 'Enter Amount' },
        closeBridgeModalButton: { css: '#radix-«R6jqhdbH1» > button' },
        switchBridgeBtn: { css: '.relative.h-0.mt-6 > button' },
        bridgeBtn: { css: 'button[data-slot="button"]:has-text("Bridge")' },
        bridgeTokensBtn: { css: 'button[data-slot="button"]:has-text("Bridge Tokens")' },
        claimTransactionButton: { css: 'button[data-slot="button"]:has-text("Claim")' },
        refreshClaimTransactionButton: { role: 'button', name: 'Refresh transactions' },
        approveTokenTransferButton: { css: 'button[data-slot="button"]:has-text("Approve Token Transfer")' },
        bridgeTabBtn: { css: 'a[href="/"]' },
        howItWorksBtn: { css: 'a[href="#"]' },
        claimBtn: { css: 'a[href="/claim"]' },
        faucetBtn: { css: 'a[href="/faucet"]' },
        bridgeLabels: { css: '.flex.justify-between.items-center' },
        neuraLogo: { css: '.flex.items-center.gap-4.md\\:gap-6 > img' },
    },
    previewTransactionDescriptors: {
        titleLabel: { text: 'Preview Transaction', options: { exact: true } },
        fromChainLabel: { text: 'From Chain:', options: { exact: true } },
        toChainLabel: { text: 'To Chain:', options: { exact: true } },
        amountLabel: { text: 'Amount:', options: { exact: true } },
        neuraLabel: { text: 'Neura Testnet', options: { exact: true } },
        sepoliaLabel: { text: 'Sepolia', options: { exact: true } },
        ankrBalance: { text: /([0-9.]+)\s*ANKR/ },
        approveButton: { text: 'Approve Token Transfer', options: { exact: true } },
        bridgeButton: { text: 'Bridge Tokens', options: { exact: true } },
        transactionHash: { css: '.space-y-6.py-4 > div.space-y-4 > div > div > div > a' },
    },
    claimTokensDescriptors: {
        tableLabel: { css: '.bg-white.rounded-lg.px-8.py-3.grid.grid-cols-5' },
        filterButton: { css: 'button[data-slot="button"]:has-text("All")' },
        claimButton: { css: 'button[data-slot="button"]:has-text("Claim")' },
        pendingButton: { css: 'button[data-slot="button"]:has-text("Pending")' },
        refreshTableButton: { css: 'button[aria-label="Refresh transactions"]' },
        nextPageButton: { css: 'button[aria-label="Next page"]' },
        previousPageButton: { css: 'button[aria-label="Previous page"]' },
    }
};
