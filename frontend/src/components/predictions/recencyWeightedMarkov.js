/**
 * Recency-Weighted Markov
 * Weights transitions by how recently they occurred
 */
export function calculateRecencyWeightedMarkov(data) {
  if (data.length < 10) return Array(10).fill(0.1);

  const predictions = Array(10).fill(0);
  const lastDigit = data[data.length - 1];
  const decayFactor = 0.95;

  let totalWeight = 0;
  for (let i = data.length - 2; i >= 0; i--) {
    if (data[i] === lastDigit) {
      const weight = Math.pow(decayFactor, data.length - 2 - i);
      predictions[data[i + 1]] += weight;
      totalWeight += weight;
    }
  }

  if (totalWeight > 0) {
    return predictions.map(p => p / totalWeight);
  }
  return Array(10).fill(0.1);
}

export default calculateRecencyWeightedMarkov;
