/**
 * Higher-Order Markov Chains
 * Builds transition probability matrices for orders 1-5
 */
export function calculateHigherOrderMarkov(data) {
  if (data.length < 6) return {};

  const orders = {};
  for (let order = 1; order <= 5; order++) {
    const transitions = {};

    for (let i = 0; i < data.length - order; i++) {
      const context = data.slice(i, i + order).join(',');
      const next = data[i + order];

      if (!transitions[context]) transitions[context] = Array(10).fill(0);
      transitions[context][next]++;
    }

    const probabilities = {};
    Object.keys(transitions).forEach(ctx => {
      const total = transitions[ctx].reduce((a, b) => a + b, 0);
      probabilities[ctx] = transitions[ctx].map(count => total > 0 ? count / total : 0);
    });

    orders[order] = { transitions, probabilities };
  }

  return orders;
}

export default calculateHigherOrderMarkov;
