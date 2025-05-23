/**
 * TokensDepositedQuery.js
 * A model class for the tokensDepositeds GraphQL query
 */

/**
 * Class representing a tokensDepositeds GraphQL query
 */
class TokensDepositedQuery {
  /**
   * Get the tokensDepositeds query for a recipient
   * @param {string} recipient - The recipient address
   * @returns {string} - The GraphQL query
   */
  getQuery(recipient) {
    return `
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
  }
}

module.exports = TokensDepositedQuery;