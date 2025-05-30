/**
 * Selectors for MetaMask extension elements
 */
module.exports = {
  general: {
    cellCss: 'span',
  },
  onboarding: {
    agreementCheckbox: 'onboarding-terms-checkbox',
    importExistingButton: 'onboarding-import-wallet',
    denyMetricsButton: 'metametrics-no-thanks',
    doneButton: 'onboarding-complete-done',
    extensionNextButton: 'pin-extension-next',
    extensionDoneButton: 'pin-extension-done',
  },
  seedPhrase: {
    dropdown: '.dropdown__select',
    confirmButton: 'import-srp-confirm',
    wordInputPrefix: 'import-srp__srp-word-',
  },
  password: {
    newInput: 'create-password-new',
    confirmInput: 'create-password-confirm',
    termsCheckbox: 'create-password-terms',
    importButton: 'create-password-import',
  },
  connection: {
    connectWalletButton: '[data-testid="confirm-btn"]',
  },
  network: {
    searchSelector: 'network-redesign-modal-search-input',
    networkSelector: 'network-display',
    popOverSelector: 'popover-close',
    addRpcDropdownButton: 'test-add-rpc-drop-down',
    addRpcUrlInModalButton: 'button:has-text("Add RPC URL")',
    addUrlButton: '.mm-button-primary',
    addCustomNetworkButton: '[class*="mm-button-secondary"]',
    networkForm: {
      networkName: 'network-form-network-name',
      rpcUrl: 'rpc-url-input-test',
      chainId: 'network-form-chain-id',
      currencySymbol: 'network-form-ticker-input',
      blockExplorer: 'test-explorer-drop-down',
      saveButton: 'button.mm-button-primary:has-text("Save")',
    },
  },
  transaction: {
    confirm: '[data-testid="confirm-footer-button"]',
    submit: '[data-testid="confirmation-submit-button"]',
    cancel: '[data-testid="confirm-footer-cancel-button"]',
  },
};
