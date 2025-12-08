/**
 * Entropy Weighting
 * Calculates entropy of recent data to weight pattern vs frequency methods
 */
export function calculateEntropyWeighting(data, windowSize = 20) {
  if (data.length < windowSize) {
    return { entropy: 0.5, patternWeight: 0.5, frequencyWeight: 0.5 };
  }

  const recent = data.slice(-windowSize);
  const freq = Array(10).fill(0);
  recent.forEach(d => freq[d]++);

  // Calculate Shannon entropy
  const entropy = freq.reduce((ent, count) => {
    if (count === 0) return ent;
    const p = count / windowSize;
    return ent - p * Math.log2(p);
  }, 0);

  const maxEntropy = Math.log2(10);
  const normalizedEntropy = entropy / maxEntropy;

  return {
    entropy: normalizedEntropy,
    patternWeight: 1 - normalizedEntropy,
    frequencyWeight: normalizedEntropy
  };
}

export default calculateEntropyWeighting;
