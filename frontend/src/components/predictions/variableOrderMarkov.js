/**
 * Variable-Order Markov
 * Dynamically selects the best order based on context availability and confidence
 */
export function calculateVariableOrderMarkov(data, higherOrderMarkov) {
  if (data.length < 10) return null;

  const lastDigits = data.slice(-5);

  for (let order = 5; order >= 1; order--) {
    const context = lastDigits.slice(-order).join(',');
    if (higherOrderMarkov[order]?.probabilities[context]) {
      const probs = higherOrderMarkov[order].probabilities[context];
      const confidence = Math.max(...probs);

      if (confidence > 0.1 || order === 1) {
        return { order, context, probabilities: probs, confidence };
      }
    }
  }

  return null;
}

export default calculateVariableOrderMarkov;
