/**
 * Positional Patterns
 * Analyzes patterns based on position in a cycle (default: 60-step cycle)
 */
export function calculatePositionalPatterns(data, cycleLength = 60) {
  if (data.length < cycleLength) return Array(10).fill(0.1);

  const predictions = Array(10).fill(0);
  const position = data.length % cycleLength;

  for (let i = position; i < data.length - 1; i += cycleLength) {
    if (i >= 0 && i < data.length - 1) {
      predictions[data[i + 1]]++;
    }
  }

  const total = predictions.reduce((a, b) => a + b, 0);
  return total > 0 ? predictions.map(p => p / total) : Array(10).fill(0.1);
}

export default calculatePositionalPatterns;
