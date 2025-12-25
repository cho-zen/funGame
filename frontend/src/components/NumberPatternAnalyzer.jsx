import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Upload, TrendingUp, Activity, BarChart3, Zap, Eye, FileText, Brain, Cpu, Target, Wifi, X, Loader2 } from 'lucide-react';

// API URL - uses environment variable in production, localhost in development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Import prediction methods from the predictions folder
import {
  calculateHigherOrderMarkov,
  calculateVariableOrderMarkov,
  calculateKneserNeySmoothing,
  calculateRecencyWeightedMarkov,
  calculatePatternCompletion,
  calculatePositionalPatterns,
  calculateSequenceMomentum,
  calculateBayesianAveraging,
  calculateEntropyWeighting,
  calculateChangePointDetection,
  calculateEnsemblePrediction
} from './predictions';

const NumberPatternAnalyzer = () => {
  const [data, setData] = useState([]);
  const [windowSize, setWindowSize] = useState(30);
  const [activeTab, setActiveTab] = useState('predict');
  const [textInput, setTextInput] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectUsername, setConnectUsername] = useState('');
  const [connectPassword, setConnectPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [connectLogs, setConnectLogs] = useState([]);


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

  const handleConnect = () => {
    if (!connectUsername || !connectPassword) {
      setConnectError('Please enter both username and password');
      return;
    }

    setIsConnecting(true);
    setConnectError('');
    setConnectLogs([]);

    const params = new URLSearchParams({
      username: connectUsername,
      password: connectPassword,
      pages: '15'
    });

    const eventSource = new EventSource(`${API_URL}/api/scrape/stream?${params}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'log') {
          setConnectLogs(prev => [...prev, { message: data.message, type: data.log_type }]);
        } else if (data.type === 'error') {
          setConnectError(data.message);
          setIsConnecting(false);
          eventSource.close();
        } else if (data.type === 'complete') {
          // Extract numbers from the scraped data (oldest first, newest last)
          const numbers = data.data.data.Number.map(n => parseInt(n)).filter(n => !isNaN(n) && n >= 0 && n <= 9);
          // Reverse to get oldest first, newest last
          const orderedNumbers = numbers.reverse();
          const numbersText = orderedNumbers.join(', ');
          setTextInput(numbersText);
          setData(orderedNumbers);
          setIsConnecting(false);
          eventSource.close();
          // Keep modal open to show completion, user can close manually
        }
      } catch (e) {
        console.error('Error parsing SSE data:', e);
      }
    };

    eventSource.onerror = () => {
      setConnectError('Connection failed. Make sure the backend is running.');
      setIsConnecting(false);
      eventSource.close();
    };
  };

  // Use imported prediction methods
  const higherOrderMarkov = useMemo(() => calculateHigherOrderMarkov(data), [data]);

  const variableOrderMarkov = useMemo(() =>
    calculateVariableOrderMarkov(data, higherOrderMarkov),
    [data, higherOrderMarkov]
  );

  const kneserNeySmoothing = useMemo(() =>
    calculateKneserNeySmoothing(data, higherOrderMarkov),
    [data, higherOrderMarkov]
  );

  const recencyWeightedMarkov = useMemo(() =>
    calculateRecencyWeightedMarkov(data),
    [data]
  );

  const patternCompletion = useMemo(() =>
    calculatePatternCompletion(data),
    [data]
  );

  const positionalPatterns = useMemo(() =>
    calculatePositionalPatterns(data),
    [data]
  );

  const sequenceMomentum = useMemo(() =>
    calculateSequenceMomentum(data),
    [data]
  );

  const entropyWeighting = useMemo(() =>
    calculateEntropyWeighting(data),
    [data]
  );

  const changePointDetection = useMemo(() =>
    calculateChangePointDetection(data),
    [data]
  );

  const bayesianAveraging = useMemo(() =>
    calculateBayesianAveraging(data, higherOrderMarkov, kneserNeySmoothing, recencyWeightedMarkov),
    [data, higherOrderMarkov, kneserNeySmoothing, recencyWeightedMarkov]
  );

  const ensemblePrediction = useMemo(() =>
    calculateEnsemblePrediction(
      data,
      higherOrderMarkov,
      variableOrderMarkov,
      kneserNeySmoothing,
      recencyWeightedMarkov,
      patternCompletion,
      positionalPatterns,
      sequenceMomentum,
      entropyWeighting,
      changePointDetection
    ),
    [data, higherOrderMarkov, variableOrderMarkov, kneserNeySmoothing,
      recencyWeightedMarkov, patternCompletion, positionalPatterns,
      sequenceMomentum, entropyWeighting, changePointDetection]
  );

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
            <button
              onClick={() => setShowConnectModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-full text-white font-semibold transition-all shadow-lg hover:shadow-cyan-500/25"
            >
              <Wifi size={18} />
              Connect
            </button>
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
                             color: index === 0 ? '#fbbf24' : '#06b6d4'
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

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`bg-slate-800 rounded-xl p-6 w-full border border-purple-500/30 shadow-2xl transition-all duration-300 ${isConnecting || connectLogs.length > 0 ? 'max-w-4xl' : 'max-w-md'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Wifi size={24} className="text-cyan-400" />
                Connect to Data Source
              </h3>
              <button
                onClick={() => {
                  setShowConnectModal(false);
                  setConnectError('');
                  setConnectLogs([]);
                }}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={isConnecting}
              >
                <X size={24} />
              </button>
            </div>

            <div className={`${isConnecting || connectLogs.length > 0 ? 'flex gap-6' : ''}`}>
              {/* Left side - Credentials */}
              <div className={`space-y-4 ${isConnecting || connectLogs.length > 0 ? 'w-1/3 min-w-[250px]' : 'w-full'}`}>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Username</label>
                  <input
                    type="text"
                    value={connectUsername}
                    onChange={(e) => setConnectUsername(e.target.value)}
                    placeholder="Enter your username"
                    disabled={isConnecting}
                    className="w-full bg-slate-900/50 border border-purple-500/30 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Password</label>
                  <input
                    type="password"
                    value={connectPassword}
                    onChange={(e) => setConnectPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={isConnecting}
                    className="w-full bg-slate-900/50 border border-purple-500/30 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                  />
                </div>

                {connectError && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                    {connectError}
                  </div>
                )}

                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 rounded-lg text-white font-semibold transition-all"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Wifi size={20} />
                      Fetch Data
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  This will scrape data from playrep.pro and load it into the analyzer.
                </p>
              </div>

              {/* Right side - Logs */}
              {(isConnecting || connectLogs.length > 0) && (
                <div className="flex-1 border-l border-purple-500/30 pl-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity size={18} className="text-cyan-400" />
                    <span className="text-sm font-semibold text-gray-300">Live Logs</span>
                    {isConnecting && (
                      <span className="ml-auto flex items-center gap-1 text-xs text-cyan-400">
                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                        Processing
                      </span>
                    )}
                  </div>
                  <div className="bg-slate-900/70 rounded-lg p-3 h-80 overflow-y-auto font-mono text-xs space-y-1 scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-slate-800">
                    {connectLogs.map((log, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-2 ${
                          log.type === 'success' ? 'text-green-400' :
                          log.type === 'warning' ? 'text-yellow-400' :
                          log.type === 'error' ? 'text-red-400' :
                          'text-gray-300'
                        }`}
                      >
                        <span className="text-gray-500 select-none">[{String(index + 1).padStart(2, '0')}]</span>
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                          log.type === 'success' ? 'bg-green-400' :
                          log.type === 'warning' ? 'bg-yellow-400' :
                          log.type === 'error' ? 'bg-red-400' :
                          'bg-cyan-400'
                        }`}></span>
                        <span>{log.message}</span>
                      </div>
                    ))}
                    {connectLogs.length === 0 && isConnecting && (
                      <div className="text-gray-500 animate-pulse">Initializing connection...</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NumberPatternAnalyzer;
