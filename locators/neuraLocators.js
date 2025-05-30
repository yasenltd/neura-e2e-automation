/**
 * Selectors for DApp example page elements
 */
module.exports = {
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
        selectMetaMaskWallet: 'rk-wallet-option-io.metamask',
        connectWalletBridgeWidgetButton: ':nth-child(6) > button',
        settingsButton: '.flex.items-center.gap-1 > button:nth-child(1)',
        connectMetaWalletButton: '[data-testid="confirm-btn"]',
        signMessage: '[data-testid="rk-auth-message-button"]',
        disconnectWallet: '[data-testid="rk-disconnect-button"]',
    },
    walletScreen: {
        activityLabel: {css: '.flex-col.flex-1 > span'},
        testNetLabels: {css: '.space-x-2.w-full.flex > div > div'},
        expandWallet: {css: '.flex.items-center.gap-2 > div > div'},
        amountField: {css: '.relative.h-28.border.rounded-lg > input'},
        neuraLabels: {css: '.flex.items-center.gap-2.mb-4 > div:nth-child(2) > div'},
    },
    status: {
        networkInfo: '#network',
        chainId: '#chainId',
    },
    sourceChainModal: {
        selectSourceChainTitle: {
          css: 'h2[data-slot="dialog-title"]:has-text("Select Source Chain")'
        },
        closeChainModal: {css: '#radix-«R1jqhdbH1» > button'},
        openNetworkSourceMenu: {css: '.animate-ease-in-out'},
        networkLabels: {css: '.justify-between.items-center > div > span.text-md.font-normal.leading-5.text-gray-900'},
        activeChain: {css: '.selector-item-active'},
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
        toLabel: {text: 'To'},
        fromLabel: {text: 'From'},
        limitLabel: {text: 'Max'},
        bridgeLabel: {text: 'Bridge'},
        enterAmountBtnLabel: {text: 'Enter Amount'},
        closeBridgeModalButton: {css: '#radix-«R13qhdbH1» > button'},
        switchBridgeBtn: {css: '.relative.h-0.mt-6 > button'},
        amountLabel: {css: '.justify-between.items-center > div > p'},
        connectWallet: {css: 'button[data-slot="button"]:has-text("Connect Wallet")'},
        bridgeBtn: {css: 'button[data-slot="button"]:has-text("Bridge")'},
        bridgeTokensBtn: {css: 'button[data-slot="button"]:has-text("Bridge Tokens")'},
        claimTokensBtn: {css: 'button[data-slot="button"]:has-text("Claim Tokens")'},
        claimTransactionButton: {css: 'button[data-slot="button"]:has-text("Claim")'},
        approveTokenTransferButton: {css: 'button[data-slot="button"]:has-text("Approve Token Transfer")'},
        claimLink: {link: 'Claim'},
        faucetLink: {link: 'Faucet'},
        howItWorks: {link: 'How it works'},
        bridgeTabBtn: {css: 'a[href="/"]'},
        howItWorksBtn: {css: 'a[href="#"]'},
        claimBtn: {css: 'a[href="/claim"]'},
        faucetBtn: {css: 'a[href="/faucet"]'},
        bridgeLabels: {css: '.flex.justify-between.items-center'},
        neuraLogo: {css: '.flex.items-center.gap-4.md\\:gap-6 > img'},
        neuraBridgeTitleLabel: {css: '.relative.flex.items-center.justify-center > h2'},
        previewDataTableLabels: '.space-y-6.py-4 > div.space-y-4 > div > div > p',
        previewDataTableValues: '.space-y-6.py-4 > div.space-y-4 > div > div > div > p',
        bridgeTokenLabel: {css: 'h2[data-slot="dialog-title"]:has-text("Bridge Tokens")'},
        previewTransactionLabel: {css: 'h2[data-slot="dialog-title"]:has-text("Preview Transaction")'},
        transactionHash: {css: '.space-y-6.py-4 > div.space-y-4 > div > div > div > a'},
    },
    faucetDescriptors: {
        neuraFaucetTitleLabel: {css: '.flex.flex-col.items-center.mb-2 > h1'},
        neuraFaucetLabel: {css: '.relative.z-10.flex.flex-col.flex-1 p'},
        connectWalletButton: {css: '.flex.flex-col.gap-4 > div:nth-child(1) > div > button'},
        claimTokensButton: {css: '.flex.flex-col.gap-4 > div.w-full.space-y-4 > div:nth-child(2) > button'},
    },
    claimTokensDescriptors: {
        tableLabel: {css: '.bg-white.rounded-lg.px-8.py-3.grid.grid-cols-5'},
        filterButton: {css: 'button[data-slot="button"]:has-text("All")'},
        claimButton: {css: 'button[data-slot="button"]:has-text("Claim")'},
        pendingButton: {css: 'button[data-slot="button"]:has-text("Pending")'},
        refreshTableButton: {css: 'button[aria-label="Refresh transactions"]'},
        nextPageButton: {css: 'button[aria-label="Next page"]'},
        previousPageButton: {css: 'button[aria-label="Previous page"]'},
    }
};
