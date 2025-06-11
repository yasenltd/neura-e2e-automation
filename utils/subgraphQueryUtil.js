const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config();
const TokensDepositedQuery = require('../models/TokensDepositedQuery');

/**
 * Execute a GraphQL query against the specified subgraph URL
 * @param {string} query - The GraphQL query to execute
 * @param {string} url - The URL of the subgraph (optional, defaults to SUBGRAPH_URL from env)
 * @returns {Promise<Object>} - The query result
 */
async function executeQuery(query, url = process.env.SUBGRAPH_URL) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });

  return await res.json();
}

/**
 * Get the tokens deposited for a recipient
 * @param {string} recipient - The recipient address
 * @returns {Promise<Object>} - The query result
 */
async function getTokensDeposited(recipient) {
  const tokensDepositedQuery = new TokensDepositedQuery();
  const query = tokensDepositedQuery.getQuery(recipient);
  return executeQuery(query);
}

/**
 * Wait for any deposit in the subgraph
 * @param {string} recipient - The recipient address
 * @param {string} expectedAmount - The expected amount
 * @param {number} retries - The number of retries (default: 6)
 * @param {number} delay - The delay between retries in milliseconds (default: 4000)
 * @returns {Promise<Array>} - The matching deposit events
 */
async function waitForAnyDeposit(recipient, expectedAmount, retries = 6, delay = 4000) {
  for (let i = 0; i < retries; i++) {
    const data = await getTokensDeposited(recipient);
    const allMatches = data?.data?.tokensDepositeds?.filter(
      d =>
        d.recipient.toLowerCase() === recipient.toLowerCase() &&
        d.amount === expectedAmount
    );

    if (allMatches?.length >= 1) {
      const sorted = allMatches
        .sort((a, b) => Number(b.nonce) - Number(a.nonce)) // sort by nonce desc
        .slice(0, 1);
      console.log(`✅ Subgraph confirmed latest deposit events:`);
      sorted.forEach((m, idx) => {
        console.log(`  #${idx + 1} nonce=${m.nonce}, tx=${m.transactionHash}`);
      });
      return sorted;
    }

    console.log(`⏳ Subgraph retry ${i + 1}/${retries}: found ${allMatches?.length || 0}/2`);
    await new Promise(res => setTimeout(res, delay));
  }

  throw new Error(`❌ Subgraph did not index 2 matching deposit events in time`);
}

/**
 * Waits for a deposit by `from` address to appear in the subgraph.
 * Returns the latest deposit event for that address.
 * @param {string} recipient - The recipient address
 * @param {string} expectedAmount - The expected amount
 * @param {number} retries - The number of retries (default: 6)
 * @param {number} delay - The delay between retries in milliseconds (default: 4000)
 * @returns {Promise<Array>} - The matching deposit events
 */
async function waitForAnyDepositInSubgraph(recipient, expectedAmount, retries = 6, delay = 4000) {
  return await waitForAnyDeposit(recipient, expectedAmount, retries, delay);
}

module.exports = {
  waitForAnyDepositInSubgraph
};