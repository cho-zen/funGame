import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Upload, TrendingUp, Activity, BarChart3, Zap, Eye, FileText, Brain, Cpu, Target } from 'lucide-react';

const NumberPatternAnalyzer = () => {
  const [data, setData] = useState([]);
  const [windowSize, setWindowSize] = useState(30);
  const [activeTab, setActiveTab] = useState('predict');
  const [textInput, setTextInput] = useState('');

  useEffect(() => {
    const sampleData = Array.from({ length: 500 }, () => Math.floor(Math.random() * 10));
    setData(sampleData);
    setTextInput(sampleData.join(', '));
  }, []);

  const handleTextInput = (text) => {
    setTextInput(text);
    const numbers = text.split(/[\s,]+/).map(n => parseInt(n)).filter(n => !isNaN(n) && n >= 0 && n <= 9);
    if (numbers.length > 0) {
      setData(numbers);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        handleTextInput(text);
      };
      reader.readAsText(file);
    }
  };

  // 1. HIGHER-ORDER MARKOV CHAINS
  const higherOrderMarkov = useMemo(() => {
    if (data.length < 6) return {};

    const orders = {};
    for (let order = 1; order <= 5; order++) {
      const transitions = {};

      for (let i = 0; i < data.length - order; i++) {
        const context = data.slice(i, i + order).join(',');
        const next = data[i + order];

        if (!transitions[context]) transitions[context] = Array(10).fill(0);
        transitions[context][next]++;
      }

      const probabilities = {};
      Object.keys(transitions).forEach(ctx => {
        const total = transitions[ctx].reduce((a, b) => a + b, 0);
        probabilities[ctx] = transitions[ctx].map(count => total > 0 ? count / total : 0);
      });

      orders[order] = { transitions, probabilities };
    }

    return orders;
  }, [data]);

  // 2. VARIABLE-ORDER MARKOV
  const variableOrderMarkov = useMemo(() => {
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
  }, [data, higherOrderMarkov]);

  // 3. KNESER-NEY SMOOTHING
  const kneserNeySmoothing = useMemo(() => {
    if (data.length < 10) return Array(10).fill(0.1);

    const D = 0.75;
    const predictions = Array(10).fill(0);

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
  }, [data, higherOrderMarkov]);

  // 4. RECENCY-WEIGHTED MARKOV
  const recencyWeightedMarkov = useMemo(() => {
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
  }, [data]);

  // 5. PATTERN COMPLETION
  const patternCompletion = useMemo(() => {
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
  }, [data]);

  // 6. POSITIONAL PATTERNS
  const positionalPatterns = useMemo(() => {
    if (data.length < 60) return Array(10).fill(0.1);

    const predictions = Array(10).fill(0);
    const position = data.length % 60;

    for (let i = position; i < data.length - 1; i += 60) {
      if (i >= 0 && i < data.length - 1) {
        predictions[data[i + 1]]++;
      }
    }

    const total = predictions.reduce((a, b) => a + b, 0);
    return total > 0 ? predictions.map(p => p / total) : Array(10).fill(0.1);
  }, [data]);

  // 7. SEQUENCE MOMENTUM
  const sequenceMomentum = useMemo(() => {
    if (data.length < 10) return Array(10).fill(0.1);

    const predictions = Array(10).fill(0);
    const recent = data.slice(-5);

    const firstDeriv = [];
    for (let i = 1; i < recent.length; i++) {
      firstDeriv.push(recent[i] - recent[i - 1]);
    }

    const avgFirstDeriv = firstDeriv.reduce((a, b) => a + b, 0) / firstDeriv.length;
    const lastDigit = data[data.length - 1];
    const predicted = Math.round(lastDigit + avgFirstDeriv);

    for (let i = 0; i < 10; i++) {
      const distance = Math.abs(i - predicted);
      predictions[i] = Math.exp(-distance * 0.5);
    }

    const total = predictions.reduce((a, b) => a + b, 0);
    return predictions.map(p => p / total);
  }, [data]);

  // 8. BAYESIAN AVERAGING
  const bayesianAveraging = useMemo(() => {
    if (data.length < 50) return Array(10).fill(0.1);

    const predictions = Array(10).fill(0);
    const alpha = 0.1;

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
  }, [data, higherOrderMarkov, kneserNeySmoothing, recencyWeightedMarkov]);

  // 9. ENTROPY WEIGHTING
  const entropyWeighting = useMemo(() => {
    if (data.length < 20) return { entropy: 0.5, patternWeight: 0.5, frequencyWeight: 0.5 };

    const recent = data.slice(-20);
    const freq = Array(10).fill(0);
    recent.forEach(d => freq[d]++);

    const entropy = freq.reduce((ent, count) => {
      if (count === 0) return ent;
      const p = count / 20;
      return ent - p * Math.log2(p);
    }, 0);

    const maxEntropy = Math.log2(10);
    const normalizedEntropy = entropy / maxEntropy;

    return {
      entropy: normalizedEntropy,
      patternWeight: 1 - normalizedEntropy,
      frequencyWeight: normalizedEntropy
    };
  }, [data]);

  // 10. CHANGE POINT DETECTION
  const changePointDetection = useMemo(() => {
    if (data.length < 50) return { changePoints: [], currentRegime: 0 };

    const changePoints = [];
    const windowSz = 20;

    for (let i = windowSz; i < data.length - windowSz; i++) {
      const before = data.slice(i - windowSz, i);
      const after = data.slice(i, i + windowSz);

      const meanBefore = before.reduce((a, b) => a + b, 0) / windowSz;
      const meanAfter = after.reduce((a, b) => a + b, 0) / windowSz;

      const meanChange = Math.abs(meanAfter - meanBefore);

      if (meanChange > 1.5) {
        changePoints.push({ index: i, meanChange });
      }
    }

    const lastChangePoint = changePoints.length > 0 ? changePoints[changePoints.length - 1] : null;
    const currentRegime = lastChangePoint ? data.length - lastChangePoint.index : data.length;

    return { changePoints, currentRegime };
  }, [data]);

  // ENSEMBLE PREDICTION
  const ensemblePrediction = useMemo(() => {
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

    const entropyInfo = entropyWeighting;
    methods.forEach(method => {
      if (method.name.includes('Pattern') || method.name.includes('Markov')) {
        method.weight *= (1 + entropyInfo.patternWeight * 0.3);
      } else {
        method.weight *= (1 + entropyInfo.frequencyWeight * 0.3);
      }
    });

    const totalWeight = methods.reduce((sum, m) => sum + m.weight, 0);
    methods.forEach(m => m.weight /= totalWeight);

    const combined = Array(10).fill(0);
    methods.forEach(method => {
      for (let i = 0; i < 10; i++) {
        combined[i] += method.probs[i] * method.weight;
      }
    });

    const temperature = 1.2;
    const scaledProbs = combined.map(p => Math.pow(p, 1 / temperature));
    const total = scaledProbs.reduce((a, b) => a + b, 0);
    const finalProbs = scaledProbs.map(p => (p / total) * 100);

    const topPredictions = finalProbs
      .map((prob, digit) => ({ digit, probability: prob }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5);

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
  }, [data, higherOrderMarkov, variableOrderMarkov, kneserNeySmoothing,
      recencyWeightedMarkov, patternCompletion, positionalPatterns,
      sequenceMomentum, entropyWeighting, changePointDetection]);

  const basicStats = useMemo(() => {
    if (data.length === 0) return { frequency: [], mean: 0 };
    const frequency = Array(10).fill(0);
    data.forEach(d => frequency[d]++);
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    return { frequency, mean: mean.toFixed(2) };
  }, [data]);

  const tabs = [
    { id: 'predict', label: 'AI Prediction', icon: <Zap size={16} /> },
    { id: 'methods', label: 'All Methods', icon: <Brain size={16} /> },
    { id: 'analysis', label: 'Deep Analysis', icon: <Activity size={16} /> },
    { id: 'stats', label: 'Statistics', icon: <BarChart3 size={16} /> }
  ];

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-auto">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Advanced AI Pattern Analyzer
          </h1>
          <p className="text-gray-400">15+ ML Algorithms - Ensemble Learning - Adaptive Intelligence</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4 mb-6 border border-purple-500/20">
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
              <FileText size={16} />
              Paste Your Numbers (comma or space separated, digits 0-9)
            </label>
            <textarea
              value={textInput}
              onChange={(e) => handleTextInput(e.target.value)}
              placeholder="1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2..."
              className="w-full h-24 bg-slate-900/50 border border-purple-500/30 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
              />
            </div>
            <div className="ml-auto flex gap-6">
              <div>
                <div className="text-sm text-gray-400">Data Points</div>
                <div className="text-2xl font-bold text-cyan-400">{data.length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Last Digit</div>
                <div className="text-2xl font-bold text-purple-400">{data[data.length - 1]}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg'
                  : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {activeTab === 'predict' && ensemblePrediction && (
            <>
              <div className="bg-gradient-to-br from-purple-600/30 via-cyan-600/30 to-pink-600/30 rounded-xl p-8 border-2 border-purple-500/50 shadow-2xl">
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold mb-2 text-white">TOP 5 PREDICTIONS</h2>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <span className="text-gray-300">Confidence: <strong className="text-cyan-400">{ensemblePrediction.confidence}%</strong></span>
                    <span className="text-gray-300">Entropy: <strong className="text-purple-400">{ensemblePrediction.entropy}</strong></span>
                    <span className="text-gray-300">Regime: <strong className="text-green-400">{ensemblePrediction.regimeInfo.currentRegime} steps</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {ensemblePrediction.topPredictions.map((pred, index) => (
                    <div
                      key={pred.digit}
                      className={`relative rounded-xl p-6 text-center transition-all ${
                        index === 0
                          ? 'bg-gradient-to-br from-yellow-500/30 to-orange-600/30 border-2 border-yellow-400 transform scale-105 shadow-2xl'
                          : 'bg-slate-800/70 border border-purple-500/30 hover:scale-105'
                      }`}
                    >
                      {index === 0 && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-yellow-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full">
                            BEST
                          </span>
                        </div>
                      )}
                      <div className={`${index === 0 ? 'text-8xl' : 'text-6xl'} font-black mb-3`}
                           style={{
                             background: index === 0
                               ? 'linear-gradient(135deg, #fbbf24, #f97316)'
                               : 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                             WebkitBackgroundClip: 'text',
                             WebkitTextFillColor: 'transparent'
                           }}>
                        {pred.digit}
                      </div>
                      <div className="space-y-1">
                        <div className={`${index === 0 ? 'text-3xl' : 'text-2xl'} font-bold text-white`}>
                          {pred.probability.toFixed(2)}%
                        </div>
                        <div className="text-xs text-gray-400">Rank #{index + 1}</div>
                        <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full ${index === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-cyan-500 to-purple-500'}`}
                            style={{ width: `${pred.probability}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-cyan-500/20">
                  <h3 className="text-xl font-bold mb-4 text-cyan-400 flex items-center gap-2">
                    <Target size={20} />
                    Complete Probability Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ensemblePrediction.allProbabilities.map((prob, digit) => ({ digit, probability: prob }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="digit" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #06b6d4' }} />
                      <Bar dataKey="probability">
                        {ensemblePrediction.allProbabilities.map((prob, index) => (
                          <Cell
                            key={index}
                            fill={index === ensemblePrediction.topPredictions[0].digit ? '#f59e0b' : '#06b6d4'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-slate-800/50 backdrop-blur rounded-lg p-6 border border-purple-500/20">
                  <h3 className="text-xl font-bold mb-4 text-purple-400 flex items-center gap-2">
                    <Cpu size={20} />
                    Model Contributions
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ensemblePrediction.methods.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" stroke="#9CA3AF" />
                      <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={150} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #8b5cf6' }} />
                      <Bar dataKey="weight" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-gradient-to-r from-slate-800/50 to-purple-900/30 rounded-lg p-6 border border-purple-500/30">
                <h3 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
                  <Brain size={24} />
                  Intelligence Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-cyan-400">Prediction Quality</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-400">Confidence Score:</span> <strong className="text-cyan-400">{ensemblePrediction.confidence}%</strong></p>
                      <p><span className="text-gray-400">Prediction Entropy:</span> <strong className="text-purple-400">{ensemblePrediction.entropy} bits</strong></p>
                      <p><span className="text-gray-400">Top Prediction:</span> <strong className="text-yellow-400">{ensemblePrediction.topPredictions[0].digit}</strong> at <strong>{ensemblePrediction.topPredictions[0].probability.toFixed(2)}%</strong></p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-green-400">Pattern Analysis</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-400">Pattern Weight:</span> <strong className="text-green-400">{(ensemblePrediction.entropyInfo.patternWeight * 100).toFixed(1)}%</strong></p>
                      <p><span className="text-gray-400">Frequency Weight:</span> <strong className="text-orange-400">{(ensemblePrediction.entropyInfo.frequencyWeight * 100).toFixed(1)}%</strong></p>
                      <p><span className="text-gray-400">Data Points:</span> <strong className="text-cyan-400">{data.length}</strong></p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-pink-400">System Status</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-400">Regime Stability:</span> <strong className="text-pink-400">{ensemblePrediction.regimeInfo.currentRegime} steps</strong></p>
                      <p><span className="text-gray-400">Change Points:</span> <strong className="text-red-400">{ensemblePrediction.regimeInfo.changePoints.length}</strong></p>
                      <p><span className="text-gray-400">Active Models:</span> <strong className="text-purple-400">{ensemblePrediction.methods.length}</strong></p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'methods' && ensemblePrediction && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ensemblePrediction.methods.map((method, index) => {
                const topPred = method.probs.indexOf(Math.max(...method.probs));
                const confidence = (Math.max(...method.probs) * 100).toFixed(1);

                return (
                  <div key={index} className="bg-slate-800/50 backdrop-blur rounded-lg p-5 border border-purple-500/20 hover:border-cyan-500/50 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-lg font-bold text-white">{method.name}</h4>
                      <span className="text-2xl font-black text-cyan-400">{topPred}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Weight:</span>
                        <strong className="text-purple-400">{(method.weight * 100).toFixed(2)}%</strong>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Confidence:</span>
                        <strong className="text-green-400">{confidence}%</strong>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full"
                          style={{ width: `${method.weight * 100}%` }}
                        />
                      </div>
                      <div className="flex gap-1 mt-2">
                        {method.probs.map((prob, digit) => (
                          <div
                            key={digit}
                            className="flex-1 h-12 rounded transition-all hover:scale-110"
                            style={{
                              backgroundColor: `rgba(139, 92, 246, ${prob})`,
                              border: digit === topPred ? '2px solid #06b6d4' : 'none'
                            }}
                            title={`${digit}: ${(prob * 100).toFixed(1)}%`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'analysis' && ensemblePrediction && variableOrderMarkov && (
            <>
              <div className="bg-slate-800/50 rounded-lg p-6 border border-cyan-500/20">
                <h3 className="text-2xl font-bold mb-4 text-cyan-400">Variable-Order Markov Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-slate-700/50 rounded p-4">
                    <div className="text-sm text-gray-400">Selected Order</div>
                    <div className="text-3xl font-bold text-purple-400">{variableOrderMarkov.order}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-4">
                    <div className="text-sm text-gray-400">Context</div>
                    <div className="text-2xl font-bold text-cyan-400">{variableOrderMarkov.context}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-4">
                    <div className="text-sm text-gray-400">Confidence</div>
                    <div className="text-3xl font-bold text-green-400">{(variableOrderMarkov.confidence * 100).toFixed(1)}%</div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-4">
                    <div className="text-sm text-gray-400">Best Prediction</div>
                    <div className="text-3xl font-bold text-yellow-400">
                      {variableOrderMarkov.probabilities.indexOf(Math.max(...variableOrderMarkov.probabilities))}
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={variableOrderMarkov.probabilities.map((p, i) => ({ digit: i, prob: p * 100 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="digit" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #06b6d4' }} />
                    <Bar dataKey="prob" fill="#06b6d4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 rounded-lg p-6 border border-purple-500/20">
                  <h3 className="text-xl font-bold mb-4 text-purple-400">Change Point Detection</h3>
                  <div className="space-y-3">
                    <div className="bg-slate-700/50 rounded p-4">
                      <div className="text-sm text-gray-400">Change Points Detected</div>
                      <div className="text-4xl font-bold text-purple-400">{ensemblePrediction.regimeInfo.changePoints.length}</div>
                    </div>
                    <div className="bg-slate-700/50 rounded p-4">
                      <div className="text-sm text-gray-400">Current Regime Length</div>
                      <div className="text-4xl font-bold text-cyan-400">{ensemblePrediction.regimeInfo.currentRegime}</div>
                      <div className="text-xs text-gray-500 mt-1">steps since last change</div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-6 border border-green-500/20">
                  <h3 className="text-xl font-bold mb-4 text-green-400">Adaptive Intelligence</h3>
                  <div className="space-y-4">
                    <div className="bg-slate-700/50 rounded p-4">
                      <div className="text-sm text-gray-400 mb-2">Entropy-Based Weighting</div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-300">Pattern Methods</span>
                          <span className="text-lg font-bold text-purple-400">
                            {(ensemblePrediction.entropyInfo.patternWeight * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-600 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${ensemblePrediction.entropyInfo.patternWeight * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-300">Frequency Methods</span>
                          <span className="text-lg font-bold text-orange-400">
                            {(ensemblePrediction.entropyInfo.frequencyWeight * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-600 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full"
                            style={{ width: `${ensemblePrediction.entropyInfo.frequencyWeight * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-700/50 rounded p-4">
                      <div className="text-sm text-gray-400 mb-2">System Entropy</div>
                      <div className="text-3xl font-bold text-pink-400">{ensemblePrediction.entropy} bits</div>
                      <div className="text-xs text-gray-500 mt-1">Lower = more predictable</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'stats' && (
            <>
              <div className="bg-slate-800/50 rounded-lg p-6 border border-purple-500/20">
                <h3 className="text-xl font-bold mb-4 text-purple-400">Overall Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={basicStats.frequency?.map((f, i) => ({ digit: i, count: f }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="digit" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #8b5cf6' }} />
                    <Bar dataKey="count" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6 border border-cyan-500/20">
                <h3 className="text-xl font-bold mb-4 text-cyan-400">Sequence Visualization (Last 100)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.slice(-100).map((v, i) => ({ index: i, value: v }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="index" stroke="#9CA3AF" />
                    <YAxis domain={[0, 9]} stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #06b6d4' }} />
                    <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NumberPatternAnalyzer;
