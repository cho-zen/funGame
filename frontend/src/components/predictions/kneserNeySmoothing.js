/**
 * Kneser-Ney Smoothing
 * Advanced smoothing technique that considers continuation probabilities
 */
export function calculateKneserNeySmoothing(data, higherOrderMarkov) {
  if (data.length < 10) return Array(10).fill(0.1);

  const D = 0.75; // Discount factor
  const predictions = Array(10).fill(0);

  // Calculate continuation counts
  const continuationCounts = Array(10).fill(0);
  const contextCounts = {};

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    const key = `${prev}-${curr}`;
    if (!contextCounts[key]) {
      contextCounts[key] = true;
      continuationCounts[curr]++;
    }
  }

  const totalContinuations = continuationCounts.reduce((a, b) => a + b, 0);
  const lastDigit = data[data.length - 1];

  if (higherOrderMarkov[1]?.transitions[lastDigit.toString()]) {
    const counts = higherOrderMarkov[1].transitions[lastDigit.toString()];
    const total = counts.reduce((a, b) => a + b, 0);
    const numNonZero = counts.filter(c => c > 0).length;

    for (let i = 0; i < 10; i++) {
      const discountedCount = Math.max(counts[i] - D, 0);
      const backoff = (D * numNonZero / total) * (continuationCounts[i] / totalContinuations);
      predictions[i] = (discountedCount / total) + backoff;
    }
  } else {
    return continuationCounts.map(c => c / totalContinuations);
  }

  return predictions;
}

export default calculateKneserNeySmoothing;
