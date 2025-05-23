const { ethers } = require('ethers');

/**
 * Waits for an event to appear with retries.
 */
async function waitForEventWithRetry(contract, filter, fromBlock, retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    const events = await contract.queryFilter(filter, fromBlock, 'latest');
    if (events.length > 0) {
      console.log(`✅ Event found on retry #${i + 1}`);
      return events;
    }
    console.log(`⏳ [${i + 1}/${retries}] Waiting for event...`);
    await new Promise(res => setTimeout(res, delay));
  }
  return [];
}

/**
 * Confirms a bridge transfer by checking deposit and approval events with retries.
 */
async function verifyBridgeTransfer({
                                      sourceBridge,
                                      targetBridge,
                                      sender,
                                      recipient,
                                      amount,
                                      sourceChainId,
                                      targetChainId,
                                      fromBlock,
                                      retries = 5,
                                      retryDelay = 5000
                                    }) {
  try {
    const depositFilter = sourceBridge.filters.TokensDeposited(sender, recipient);
    const depositEvents = await waitForEventWithRetry(sourceBridge, depositFilter, fromBlock, retries, retryDelay);

    if (depositEvents.length === 0) {
      console.warn('❌ Deposit event not found after retries.');
      return false;
    }

    const latestEvent = depositEvents[depositEvents.length - 1];
    const nonce = latestEvent.args.nonce.toNumber();
    console.log(`✅ Found nonce: ${nonce}`);

    const messageHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'address', 'uint256', 'uint256', 'uint256'],
        [amount, recipient, nonce, targetChainId, sourceChainId]
      )
    );

    const approvalFilter = targetBridge.filters.BridgeTransferApproved(messageHash);
    const approvalEvents = await waitForEventWithRetry(targetBridge, approvalFilter, fromBlock, retries, retryDelay);

    const confirmed = approvalEvents.length > 0;
    console.log(confirmed ? '✅ Bridge transfer confirmed.' : '⏳ Approval not yet finalized.');
    return confirmed;
  } catch (err) {
    console.error('❌ Error verifying bridge transfer:', err);
    return false;
  }
}

module.exports = { verifyBridgeTransfer };