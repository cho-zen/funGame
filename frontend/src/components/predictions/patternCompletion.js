/**
 * Pattern Completion
 * Finds similar patterns in history and predicts based on what followed them
 */
export function calculatePatternCompletion(data) {
  if (data.length < 10) return Array(10).fill(0.1);

  const predictions = Array(10).fill(0);
  const targetPattern = data.slice(-4).join('');
  const scores = Array(10).fill(0);

  for (let i = 0; i < data.length - 5; i++) {
    const pattern = data.slice(i, i + 4).join('');
    let similarity = 0;

    for (let j = 0; j < 4; j++) {
      if (pattern[j] === targetPattern[j]) similarity++;
      else if (Math.abs(parseInt(pattern[j]) - parseInt(targetPattern[j])) <= 1) similarity += 0.5;
    }

    if (similarity >= 2) {
      const nextDigit = data[i + 4];
      scores[nextDigit] += similarity;
    }
  }

  const total = scores.reduce((a, b) => a + b, 0);
  return total > 0 ? scores.map(s => s / total) : Array(10).fill(0.1);
}

export default calculatePatternCompletion;
