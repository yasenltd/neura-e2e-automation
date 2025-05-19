// Top of the file
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const SUBGRAPH_URL = 'https://http-testnet-graph-eth.infra.neuraprotocol.io/subgraphs/name/test-eth';

/**
 * Waits for a deposit by `from` address to appear in the subgraph.
 * Returns the latest deposit event for that address.
 */
export async function waitForAnyDepositInSubgraph(recipient, expectedAmount, retries = 6, delay = 4000) {
  const query = `
    query {
      tokensDepositeds(
        first: 5,
        orderBy: blockNumber,
        orderDirection: desc,
        where: {
          recipient: "${recipient.toLowerCase()}"
        }
      ) {
        transactionHash
        amount
        recipient
        nonce
        blockNumber
        blockTimestamp
      }
    }
  `;

  for (let i = 0; i < retries; i++) {
    const res = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    const allMatches = data?.data?.tokensDepositeds?.filter(
      d =>
        d.recipient.toLowerCase() === recipient.toLowerCase() &&
        d.amount === expectedAmount
    );

    if (allMatches?.length >= 2) {
      const sorted = allMatches
        .sort((a, b) => Number(b.nonce) - Number(a.nonce)) // 🧠 sort by nonce desc
        .slice(0, 2); // only keep top 2

      console.log(`✅ Subgraph confirmed 2 latest deposit events:`);
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

module.exports = { waitForAnyDepositInSubgraph };
