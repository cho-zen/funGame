/**
 * Ensemble Prediction
 * Combines all prediction methods with adaptive weighting
 */
export function calculateEnsemblePrediction(
  data,
  higherOrderMarkov,
  variableOrderMarkov,
  kneserNeySmoothing,
  recencyWeightedMarkov,
  patternCompletion,
  positionalPatterns,
  sequenceMomentum,
  entropyInfo,
  changePointDetection
) {
  if (data.length < 20) return null;

  const methods = [
    { name: 'Markov 1st Order', probs: higherOrderMarkov[1]?.probabilities[data[data.length - 1]?.toString()] || Array(10).fill(0.1), weight: 0.15 },
    { name: 'Markov 2nd Order', probs: higherOrderMarkov[2]?.probabilities[data.slice(-2).join(',')] || Array(10).fill(0.1), weight: 0.14 },
    { name: 'Markov 3rd Order', probs: higherOrderMarkov[3]?.probabilities[data.slice(-3).join(',')] || Array(10).fill(0.1), weight: 0.12 },
    { name: 'Variable Order Markov', probs: variableOrderMarkov?.probabilities || Array(10).fill(0.1), weight: 0.15 },
    { name: 'Kneser-Ney Smoothing', probs: kneserNeySmoothing, weight: 0.11 },
    { name: 'Recency-Weighted', probs: recencyWeightedMarkov, weight: 0.10 },
    { name: 'Pattern Completion', probs: patternCompletion, weight: 0.10 },
    { name: 'Positional Cycles', probs: positionalPatterns, weight: 0.06 },
    { name: 'Sequence Momentum', probs: sequenceMomentum, weight: 0.07 }
  ];

  // Adjust weights based on entropy
  methods.forEach(method => {
    if (method.name.includes('Pattern') || method.name.includes('Markov')) {
      method.weight *= (1 + entropyInfo.patternWeight * 0.3);
    } else {
      method.weight *= (1 + entropyInfo.frequencyWeight * 0.3);
    }
  });

  // Normalize weights
  const totalWeight = methods.reduce((sum, m) => sum + m.weight, 0);
  methods.forEach(m => m.weight /= totalWeight);

  // Combine predictions
  const combined = Array(10).fill(0);
  methods.forEach(method => {
    for (let i = 0; i < 10; i++) {
      combined[i] += method.probs[i] * method.weight;
    }
  });

  // Apply temperature scaling
  const temperature = 1.2;
  const scaledProbs = combined.map(p => Math.pow(p, 1 / temperature));
  const total = scaledProbs.reduce((a, b) => a + b, 0);
  const finalProbs = scaledProbs.map(p => (p / total) * 100);

  // Get top predictions
  const topPredictions = finalProbs
    .map((prob, digit) => ({ digit, probability: prob }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);

  // Calculate confidence from entropy
  const entropy = finalProbs.reduce((ent, prob) => {
    if (prob === 0) return ent;
    const p = prob / 100;
    return ent - p * Math.log2(p);
  }, 0);
  const maxEntropy = Math.log2(10);
  const confidence = (1 - entropy / maxEntropy) * 100;

  return {
    topPredictions,
    allProbabilities: finalProbs,
    methods: methods.sort((a, b) => b.weight - a.weight),
    confidence: confidence.toFixed(1),
    entropy: entropy.toFixed(2),
    regimeInfo: changePointDetection,
    entropyInfo
  };
}

export default calculateEnsemblePrediction;
