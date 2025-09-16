/**
 * SELIC Backend Integration Service
 * Connects frontend to SELIC image processing backend
 */

class SELICBackendService {
  constructor(baseUrl = 'http://localhost:8001') {
    this.baseUrl = baseUrl;
    this.isAvailable = false;
    this.checkAvailability();
  }

  async checkAvailability() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      this.isAvailable = response.ok;
      return this.isAvailable;
    } catch (error) {
      console.warn('SELIC backend not available:', error.message);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Process image using SELIC backend service
   * @param {File} imageFile - The image file to process
   * @returns {Promise<Object>} Processing results
   */
  async processImage(imageFile) {
    if (!this.isAvailable) {
      throw new Error('SELIC backend service not available');
    }

    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await fetch(`${this.baseUrl}/process-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Convert base64 image back to blob for frontend use
      if (result.processed_image) {
        const binaryString = atob(result.processed_image);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        result.processedBlob = new Blob([bytes], { type: 'image/jpeg' });
      }

      return result;
    } catch (error) {
      console.error('SELIC processing failed:', error);
      throw error;
    }
  }

  /**
   * Analyze image semantics only (no compression)
   * @param {File} imageFile - The image file to analyze
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeImage(imageFile) {
    if (!this.isAvailable) {
      throw new Error('SELIC backend service not available');
    }

    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await fetch(`${this.baseUrl}/analyze-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Image analysis failed:', error);
      throw error;
    }
  }

  /**
   * Compress image with optimization
   * @param {File} imageFile - The image file to compress
   * @returns {Promise<Object>} Compression results
   */
  async compressImage(imageFile) {
    if (!this.isAvailable) {
      throw new Error('SELIC backend service not available');
    }

    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await fetch(`${this.baseUrl}/compress-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Convert base64 image back to blob
      if (result.compressed_image) {
        const binaryString = atob(result.compressed_image);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        result.compressedBlob = new Blob([bytes], { type: 'image/jpeg' });
      }

      return result;
    } catch (error) {
      console.error('Image compression failed:', error);
      throw error;
    }
  }
}

/**
 * Enhanced SELIC Integration with fallback to local processing
 */
export class EnhancedSELICIntegration {
  constructor() {
    this.backendService = new SELICBackendService();
    this.localProcessor = null; // Fallback to local processing
    this.isReady = false;
    this.initialize();
  }

  async initialize() {
    // Always initialize local processor as fallback
    try {
      console.log('Loading SELIC module...');
      
      // Import the module
      const selicModule = await import('./selic-inspired-fixed.js');
      console.log('Module loaded successfully');
      console.log('Available exports:', Object.keys(selicModule));
      
      // Try to get the class - try multiple ways
      let SELICIntegrationClass = null;
      
      if (selicModule.SELICIntegration) {
        SELICIntegrationClass = selicModule.SELICIntegration;
        console.log('Found named export SELICIntegration');
      } else if (selicModule.default) {
        SELICIntegrationClass = selicModule.default;
        console.log('Using default export');
      } else {
        console.error('Available exports:', Object.keys(selicModule));
        throw new Error('SELICIntegration class not found in any export');
      }
      
      console.log('Creating SELICIntegration instance...');
      this.localProcessor = new SELICIntegrationClass();
      
      // Check if backend is available
      const backendAvailable = await this.backendService.checkAvailability();
      console.log('Backend available:', backendAvailable);
      
      // Wait for local processor to be ready
      await new Promise(resolve => {
        const checkReady = () => {
          if (this.localProcessor.semanticProcessor.isReady) {
            console.log('SELIC local processor ready');
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });
      
      this.isReady = true;
      console.log('SELIC integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SELIC integration:', error);
      throw new Error('Failed to initialize SELIC: ' + error.message);
    }
  }

  async processImage(imageFile, originalMetadata = {}, userPreferences = {}) {
    if (!this.isReady) {
      throw new Error('SELIC integration not ready');
    }

    try {
      // Try backend service first
      if (this.backendService.isAvailable && !userPreferences.manualQuality) {
        // Only use backend when no manual quality is specified
        const result = await this.backendService.processImage(imageFile);
        
        return {
          optimizedImage: result.processedBlob,
          semantics: {
            description: result.semantics.description,
            confidence: result.semantics.confidence,
            analysisMetadata: {
              estimatedComplexity: result.semantics.complexity,
              brightness: result.semantics.brightness,
              dominantColors: result.semantics.dominant_colors,
              aspectRatio: imageFile.size,
              resolution: `${imageFile.width || 0}x${imageFile.height || 0}`
            }
          },
          compressionSettings: {
            quality: result.compression.quality / 100,
            format: result.compression.format,
            bitAllocation: {},
            priorityRegions: [],
            qualityMode: userPreferences.qualityMode || 'balanced',
            isManual: userPreferences.manualQuality !== null,
            aiSuggested: result.compression.quality / 100
          },
          enhancedMetadata: {
            ...originalMetadata,
            ...result.enhanced_metadata,
            suggestions: result.suggestions
          },
          originalSize: result.compression.original_size,
          optimizedSize: result.compression.optimized_size,
          compressionRatio: result.compression.compression_ratio,
          qualityInfo: {
            used: userPreferences.manualQuality || (result.compression.quality / 100),
            aiSuggested: result.compression.quality / 100,
            mode: userPreferences.qualityMode || 'balanced',
            isManual: userPreferences.manualQuality !== null && userPreferences.manualQuality !== undefined,
            range: {
              min: 0.3,
              max: 0.95,
              suggested: result.compression.quality / 100
            }
          },
          backendProcessed: true
        };
      } else if (this.localProcessor) {
        // Fallback to local processing with user preferences
        const result = await this.localProcessor.processImage(imageFile, originalMetadata, userPreferences);
        return {
          ...result,
          backendProcessed: false
        };
      } else {
        throw new Error('No processing method available');
      }
    } catch (error) {
      console.error('Enhanced SELIC processing failed:', error);
      throw error;
    }
  }

  async analyzeSemantics(imageFile) {
    if (!this.isReady) {
      throw new Error('SELIC integration not ready');
    }

    try {
      if (this.backendService.isAvailable) {
        const result = await this.backendService.analyzeImage(imageFile);
        return {
          description: result.semantics.description,
          confidence: result.semantics.confidence,
          analysisMetadata: {
            estimatedComplexity: result.semantics.complexity,
            brightness: result.semantics.brightness,
            dominantColors: result.semantics.dominant_colors
          },
          backendProcessed: true
        };
      } else if (this.localProcessor) {
        const semantics = await this.localProcessor.semanticProcessor.extractSemantics(imageFile);
        return {
          ...semantics,
          backendProcessed: false
        };
      } else {
        throw new Error('No analysis method available');
      }
    } catch (error) {
      console.error('Semantic analysis failed:', error);
      throw error;
    }
  }

  isBackendAvailable() {
    return this.backendService.isAvailable;
  }

  async isServiceReady() {
    return this.isReady;
  }
}

// Export default instance
export const selicService = new EnhancedSELICIntegration();
