/**
 * Bayesian Averaging
 * Combines multiple models with Bayesian smoothing
 */
export function calculateBayesianAveraging(data, higherOrderMarkov, kneserNeySmoothing, recencyWeightedMarkov) {
  if (data.length < 50) return Array(10).fill(0.1);

  const predictions = Array(10).fill(0);
  const alpha = 0.1; // Smoothing parameter

  const models = [
    higherOrderMarkov[1]?.probabilities[data[data.length - 1]?.toString()] || Array(10).fill(0),
    higherOrderMarkov[2]?.probabilities[data.slice(-2).join(',')] || Array(10).fill(0),
    kneserNeySmoothing,
    recencyWeightedMarkov
  ];

  models.forEach(model => {
    for (let i = 0; i < 10; i++) {
      predictions[i] += model[i] + alpha;
    }
  });

  const total = predictions.reduce((a, b) => a + b, 0);
  return predictions.map(p => p / total);
}

export default calculateBayesianAveraging;
