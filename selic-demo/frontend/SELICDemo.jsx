/**
 * SELIC Integration Demo & Test Component with Simple Quality Controls
 * Demonstrates 70%, 80%, and 90% quality options
 */

import React, { useState, useRef } from 'react';
import { EnhancedSELICIntegration } from '../lib/selic-backend';
import Button from './Button';
import Label from './Label';

export default function SELICDemo() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [selicReady, setSelicReady] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(0.80); // Default to 80%
  const inputRef = useRef(null);
  const selicRef = useRef(null);

  // Initialize SELIC
  React.useEffect(() => {
    const initSELIC = async () => {
      try {
        selicRef.current = new EnhancedSELICIntegration();
        await selicRef.current.initialize();
        setSelicReady(true);
      } catch (err) {
        setError('Failed to initialize SELIC: ' + err.message);
      }
    };
    initSELIC();
  }, []);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setResults(null);
      setError(null);
    }
  };

  const processImage = async () => {
    if (!selectedFile || !selicRef.current) return;

    setProcessing(true);
    setError(null);

    try {
      // Use selected quality percentage
      const userPreferences = {
        manualQuality: selectedQuality,
        qualityMode: 'manual'
      };

      console.log('Processing with quality:', selectedQuality, 'userPreferences:', userPreferences);
      const result = await selicRef.current.processImage(selectedFile, {}, userPreferences);
      console.log('Processing result:', result);
      setResults(result);
    } catch (err) {
      setError('Processing failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🧠 SELIC Demo</h1>
        <p className="text-[var(--muted)]">
          Semantic-Enhanced Learned Image Compression with Quality Control
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className={`w-3 h-3 rounded-full ${selicReady ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm">
            {selicReady ? 'SELIC Ready' : 'Initializing...'}
            {selicRef.current?.isBackendAvailable() && ' (Backend Available)'}
          </span>
        </div>
      </div>

      {/* File Selection */}
      <div className="bg-[var(--card-bg)] rounded-lg p-6 border border-[var(--border)]">
        <Label>Select Image for Analysis</Label>
        <div className="mt-2 flex items-center gap-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="block w-full text-sm text-[var(--text)]
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-medium
              file:bg-[var(--ring)] file:text-white
              hover:file:bg-[var(--ring)]/90"
          />
          <Button 
            onClick={processImage} 
            disabled={!selectedFile || !selicReady || processing}
          >
            {processing ? 'Processing...' : 'Analyze & Optimize'}
          </Button>
        </div>

        {/* Quality Controls */}
        {selectedFile && (
          <div className="mt-6 space-y-4">
            <Label>Compression Quality</Label>
            
            {/* Quality Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Choose Quality Level</label>
              <div className="flex gap-2">
                {[
                  { value: 0.70, label: '70%', desc: 'Smaller file, good quality' },
                  { value: 0.80, label: '80%', desc: 'Balanced size & quality' },
                  { value: 0.90, label: '90%', desc: 'High quality, larger file' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedQuality(option.value)}
                    className={`flex-1 px-4 py-3 text-sm rounded border transition-colors ${
                      selectedQuality === option.value 
                        ? 'bg-[var(--ring)] text-white border-[var(--ring)]' 
                        : 'bg-[var(--hover)] border-[var(--border)] text-[var(--text)] hover:bg-[var(--ring)]/10'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs opacity-75 mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedFile && (
          <div className="mt-4 p-3 bg-[var(--hover)] rounded border">
            <div className="text-sm">
              <strong>Selected:</strong> {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Error</div>
          <div className="text-red-600 text-sm mt-1">{error}</div>
        </div>
      )}

      {/* Processing Status */}
      {processing && (
        <div className="bg-[var(--card-bg)] rounded-lg p-6 border border-[var(--border)]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--ring)] mb-4"></div>
            <h3 className="text-lg font-medium mb-2">🧠 AI Processing</h3>
            <p className="text-[var(--muted)]">
              Analyzing semantic content and applying {Math.round(selectedQuality * 100)}% quality compression...
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Semantic Analysis Results */}
          <div className="bg-[var(--card-bg)] rounded-lg p-6 border border-[var(--border)]">
            <h3 className="text-xl font-bold mb-4">🧠 Semantic Analysis</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">AI Description</h4>
                <p className="text-[var(--muted)] mb-4">{results.semantics.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Confidence:</span>
                    <span className="font-medium">{(results.semantics.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Complexity:</span>
                    <span className="font-medium">{(results.semantics.analysisMetadata.estimatedComplexity * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Brightness:</span>
                    <span className="font-medium">{(results.semantics.analysisMetadata.brightness * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Dominant Colors</h4>
                <div className="flex flex-wrap gap-2">
                  {results.semantics.analysisMetadata.dominantColors?.slice(0, 5).map((color, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-8 rounded border border-[var(--border)]"
                      style={{ backgroundColor: `rgb(${color.join(',')})` }}
                      title={`RGB(${color.join(', ')})`}
                    />
                  ))}
                </div>
                
                <div className="mt-4">
                  <h5 className="text-sm font-medium mb-1">Processing Method</h5>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    results.backendProcessed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {results.backendProcessed ? '🌐 Backend AI' : '💻 Local Processing'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Compression Results */}
          <div className="bg-[var(--card-bg)] rounded-lg p-6 border border-[var(--border)]">
            <h3 className="text-xl font-bold mb-4">📊 Compression Results</h3>
            
            {/* Quality Information */}
            <div className="mb-6 p-4 bg-[var(--hover)] rounded-lg">
              <h4 className="font-medium mb-3">Quality Settings</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[var(--muted)]">Selected Quality:</span>
                  <div className="font-medium">{Math.round(selectedQuality * 100)}%</div>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Used Quality:</span>
                  <div className="font-medium">{results.qualityInfo?.used ? Math.round(results.qualityInfo.used * 100) : Math.round(selectedQuality * 100)}%</div>
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-[var(--ring)] mb-1">
                  {formatFileSize(results.originalSize)}
                </div>
                <div className="text-sm text-[var(--muted)]">Original Size</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {formatFileSize(results.optimizedSize)}
                </div>
                <div className="text-sm text-[var(--muted)]">Optimized Size</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {((results.originalSize - results.optimizedSize) / results.originalSize * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-[var(--muted)]">Savings</div>
              </div>
            </div>

            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium mb-2">Compression Details</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Quality Used:</span>
                    <span>{Math.round((results.compressionSettings?.quality || selectedQuality) * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <span>{results.compressionSettings?.format || 'JPEG'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compression Ratio:</span>
                    <span>{results.compressionRatio.toFixed(1)}:1</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium mb-2">AI Insights</h5>
                {results.enhancedMetadata?.suggestions ? (
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>Caption:</strong> {results.enhancedMetadata.suggestions.caption}
                    </div>
                    <div>
                      <strong>Tags:</strong> {results.enhancedMetadata.suggestions.hashtags?.join(', ') || 'None'}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-[var(--muted)]">
                    Enhanced AI suggestions available with backend processing
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Image Comparison */}
          <div className="bg-[var(--card-bg)] rounded-lg p-6 border border-[var(--border)]">
            <h3 className="text-xl font-bold mb-4">🖼 Image Comparison</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Original</h4>
                <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Original"
                    className="w-full h-64 object-contain bg-[var(--hover)]"
                  />
                </div>
                <div className="text-center text-sm text-[var(--muted)] mt-2">
                  {formatFileSize(results.originalSize)}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Optimized ({Math.round(selectedQuality * 100)}% Quality)</h4>
                <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                  <img
                    src={URL.createObjectURL(results.optimizedImage)}
                    alt="Optimized"
                    className="w-full h-64 object-contain bg-[var(--hover)]"
                  />
                </div>
                <div className="text-center text-sm text-[var(--muted)] mt-2">
                  {formatFileSize(results.optimizedSize)} ({((results.originalSize - results.optimizedSize) / results.originalSize * 100).toFixed(1)}% savings)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
