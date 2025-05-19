# Neura E2E Automation Framework

This repository contains an automated end-to-end testing framework for the Neura Bridge UI, built using Playwright. The framework allows for comprehensive testing of the Neura Bridge application, including wallet integration, network switching, and token bridging operations.

## Features

- End-to-end UI testing for Neura Bridge application
- MetaMask wallet integration
- Network switching between Holesky and Neura Testnet
- Token bridging verification
- Page layout validation
- Transaction verification on blockchain

## Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)
- Chrome browser
- MetaMask extension

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/neura-labs/neura-e2e-automation.git
   cd neura-e2e-automation
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

1. Create a `.env` file in the root directory with the following variables:
   ```
   PRIVATE_KEY=your_wallet_seed_phrase
   WALLET_PASSWORD=your_wallet_password
   DAPP_URL=https://url-to-neura-bridge-app
   HOLESKY_RPC_URL=https://holesky-rpc-url
   NEURA_RPC_URL=https://neura-testnet-rpc-url
   ```

## Running Tests

Run all tests:
```bash
npm test
```

Run a specific test:
```bash
npx playwright test tests/neura-bridge.spec.js
```

Run tests with UI mode:
```bash
npx playwright test --ui
```

View the HTML report:
```bash
npm run report
```

Format code:
```bash
npm run format
```

## Project Structure

- `/abi` - Contains ABI (Application Binary Interface) definitions for smart contracts
- `/constants` - Contains constant values used across the framework
- `/extensions` - Extension-related utilities
- `/factory` - Factory classes for creating wallet instances
- `/locators` - UI element selectors
- `/pages` - Page Object Model implementations
- `/scripts` - Helper scripts for the framework
- `/tests` - Test specifications
- `/user_data` - User-specific data for testing
- `/utils` - Utility functions

## Test Descriptions

The framework includes tests for:

1. **Neura Bridge Page Layout** - Verifies the UI elements and layout of the bridge page
2. **Network Switching** - Tests the functionality to switch between Holesky and Neura Testnet
3. **Wallet Connection** - Verifies MetaMask wallet connection
4. **Token Bridging** - Tests the complete flow of bridging tokens between networks
5. **Claim Tokens** - Verifies the token claiming functionality