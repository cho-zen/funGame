/**
 * Change Point Detection
 * Detects regime changes in the data sequence
 */
export function calculateChangePointDetection(data, windowSize = 20, threshold = 1.5) {
  if (data.length < 50) return { changePoints: [], currentRegime: 0 };

  const changePoints = [];

  for (let i = windowSize; i < data.length - windowSize; i++) {
    const before = data.slice(i - windowSize, i);
    const after = data.slice(i, i + windowSize);

    const meanBefore = before.reduce((a, b) => a + b, 0) / windowSize;
    const meanAfter = after.reduce((a, b) => a + b, 0) / windowSize;

    const meanChange = Math.abs(meanAfter - meanBefore);

    if (meanChange > threshold) {
      changePoints.push({ index: i, meanChange });
    }
  }

  const lastChangePoint = changePoints.length > 0 ? changePoints[changePoints.length - 1] : null;
  const currentRegime = lastChangePoint ? data.length - lastChangePoint.index : data.length;

  return { changePoints, currentRegime };
}

export default calculateChangePointDetection;
