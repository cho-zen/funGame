/**
 * Sequence Momentum
 * Predicts based on the derivative (trend) of recent values
 */
export function calculateSequenceMomentum(data) {
  if (data.length < 10) return Array(10).fill(0.1);

  const predictions = Array(10).fill(0);
  const recent = data.slice(-5);

  // Calculate first derivative
  const firstDeriv = [];
  for (let i = 1; i < recent.length; i++) {
    firstDeriv.push(recent[i] - recent[i - 1]);
  }

  const avgFirstDeriv = firstDeriv.reduce((a, b) => a + b, 0) / firstDeriv.length;
  const lastDigit = data[data.length - 1];
  const predicted = Math.round(lastDigit + avgFirstDeriv);

  // Create probability distribution based on distance from predicted value
  for (let i = 0; i < 10; i++) {
    const distance = Math.abs(i - predicted);
    predictions[i] = Math.exp(-distance * 0.5);
  }

  const total = predictions.reduce((a, b) => a + b, 0);
  return predictions.map(p => p / total);
}

export default calculateSequenceMomentum;
