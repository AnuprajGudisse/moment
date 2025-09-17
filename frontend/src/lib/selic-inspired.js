/**
 * SELIC-Inspired Image Processing for Moment with Configurable Quality
 * Integrates semantic analysis with compression optimization
 */

// Mock semantic analysis service (would integrate with actual AI models in production)
export class SemanticImageProcessor {
  constructor() {
    this.isReady = false;
    this.initialize();
  }

  async initialize() {
    // In production, this would load BLIP/BERT models or connect to API
    console.log("Initializing semantic processor...");
    // Simulate model loading time
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.isReady = true;
  }

  /**
   * Extract semantic description from image
   * @param {File|Blob} imageFile - The image to analyze
   * @returns {Promise<Object>} Semantic analysis results
   */
  async extractSemantics(imageFile) {
    if (!this.isReady) {
      throw new Error("Semantic processor not ready");
    }

    // Create image element for analysis
    const imageUrl = URL.createObjectURL(imageFile);
    const img = await this.loadImage(imageUrl);
    
    try {
      // Mock semantic analysis (replace with actual BLIP/BERT integration)
      const semantics = await this.analyzeImage(img);
      return semantics;
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  async loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  /**
   * Mock semantic analysis - in production would use actual AI models
   */
  async analyzeImage(img) {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock analysis based on basic image characteristics
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 224; // Standard input size for vision models
    canvas.height = 224;
    ctx.drawImage(img, 0, 0, 224, 224);
    
    const imageData = ctx.getImageData(0, 0, 224, 224);
    const brightness = this.calculateBrightness(imageData);
    const colorProfile = this.analyzeColors(imageData);
    
    // Generate semantic description based on analysis
    const description = this.generateDescription(brightness, colorProfile, img.width, img.height);
    
    return {
      description,
      semanticVector: this.generateSemanticVector(description),
      confidence: 0.85,
      analysisMetadata: {
        brightness,
        dominantColors: colorProfile.dominant,
        colorDistribution: colorProfile.distribution,
        aspectRatio: img.width / img.height,
        resolution: `${img.width}x${img.height}`,
        estimatedComplexity: this.estimateComplexity(imageData)
      }
    };
  }

  calculateBrightness(imageData) {
    const data = imageData.data;
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      total += (r + g + b) / 3;
    }
    return total / (data.length / 4) / 255;
  }

  analyzeColors(imageData) {
    const data = imageData.data;
    const colorCounts = {};
    
    for (let i = 0; i < data.length; i += 4) {
      const r = Math.floor(data[i] / 32) * 32;
      const g = Math.floor(data[i + 1] / 32) * 32;
      const b = Math.floor(data[i + 2] / 32) * 32;
      const color = `${r},${g},${b}`;
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    }
    
    const sorted = Object.entries(colorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    return {
      dominant: sorted.map(([color]) => color.split(',').map(Number)),
      distribution: sorted.map(([color, count]) => ({
        color: color.split(',').map(Number),
        percentage: count / (data.length / 4)
      }))
    };
  }

  generateDescription(brightness, colorProfile, width, height) {
    const brightnessTerm = brightness > 0.7 ? "bright" : brightness > 0.3 ? "medium-lit" : "dark";
    const orientationTerm = width > height ? "landscape" : height > width ? "portrait" : "square";
    const sizeTerm = width * height > 2000000 ? "high-resolution" : "standard-resolution";
    
    const dominantColor = this.getColorName(colorProfile.dominant[0]);
    
    return `A ${brightnessTerm} ${orientationTerm} ${sizeTerm} image with predominant ${dominantColor} tones`;
  }

  getColorName([r, g, b]) {
    if (r > g && r > b) return "red";
    if (g > r && g > b) return "green";
    if (b > r && b > g) return "blue";
    if (r > 200 && g > 200 && b > 200) return "white";
    if (r < 50 && g < 50 && b < 50) return "black";
    if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30) return "gray";
    return "mixed";
  }

  generateSemanticVector(description) {
    // Mock semantic vector generation
    // In production, this would use BERT or similar transformer model
    const words = description.toLowerCase().split(' ');
    const vector = new Array(768).fill(0); // BERT-like dimension
    
    // Simple hash-based vector generation for demo
    words.forEach((word, idx) => {
      const hash = this.simpleHash(word);
      for (let i = 0; i < 768; i++) {
        vector[i] += Math.sin(hash + i + idx) * 0.1;
      }
    });
    
    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  estimateComplexity(imageData) {
    // Estimate image complexity based on edge detection
    const data = imageData.data;
    const width = imageData.width;
    let edgeCount = 0;
    
    for (let y = 1; y < imageData.height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const currentPixel = data[idx] + data[idx + 1] + data[idx + 2];
        const rightPixel = data[idx + 4] + data[idx + 5] + data[idx + 6];
        const bottomPixel = data[((y + 1) * width + x) * 4] + data[((y + 1) * width + x) * 4 + 1] + data[((y + 1) * width + x) * 4 + 2];
        
        if (Math.abs(currentPixel - rightPixel) > 50 || Math.abs(currentPixel - bottomPixel) > 50) {
          edgeCount++;
        }
      }
    }
    
    return edgeCount / (width * imageData.height);
  }
}

/**
 * Enhanced SELIC-inspired compression optimizer with configurable quality
 */
export class CompressionOptimizer {
  constructor(semanticProcessor) {
    this.semanticProcessor = semanticProcessor;
  }

  /**
   * Optimize compression settings based on semantic analysis and user preferences
   * @param {Object} semantics - Semantic analysis results
   * @param {Object} userPreferences - User quality preferences
   */
  async optimizeCompression(semantics, userPreferences = {}) {
    const {
      manualQuality = null,
      qualityMode = 'balanced', // 'quality', 'balanced', 'size'
      format = 'auto'
    } = userPreferences;

    const { analysisMetadata } = semantics;
    
    // Calculate AI-suggested quality
    const aiSuggestedQuality = this.calculateOptimalQuality(analysisMetadata, qualityMode);
    
    // Use manual quality if provided, otherwise use AI suggestion
    const finalQuality = manualQuality !== null 
      ? Math.min(0.95, Math.max(0.3, manualQuality))
      : aiSuggestedQuality;

    // SELIC-inspired optimization rules
    const compressionSettings = {
      quality: finalQuality,
      format: format === 'auto' ? this.selectOptimalFormat(analysisMetadata) : format,
      resizeStrategy: this.determineResizeStrategy(analysisMetadata),
      priorityRegions: this.identifyPriorityRegions(semantics),
      bitAllocation: this.calculateBitAllocation(semantics),
      isManual: manualQuality !== null,
      aiSuggested: aiSuggestedQuality,
      qualityMode: qualityMode,
      qualityRange: this.getQualityRange(analysisMetadata, qualityMode)
    };

    return compressionSettings;
  }

  calculateOptimalQuality(metadata, qualityMode = 'balanced') {
    let baseQuality;
    
    // Set base quality based on mode
    switch (qualityMode) {
      case 'quality':
        baseQuality = 0.90;
        break;
      case 'size':
        baseQuality = 0.70;
        break;
      case 'balanced':
      default:
        baseQuality = 0.85;
        break;
    }
    
    let quality = baseQuality;
    
    // Adjust based on complexity
    if (metadata.estimatedComplexity > 0.3) {
      const adjustment = qualityMode === 'size' ? 0.03 : 0.08;
      quality += adjustment; // Higher quality for complex images
    }
    
    // Adjust based on brightness
    if (metadata.brightness < 0.3) {
      quality += 0.04; // Higher quality for dark images to preserve detail
    }
    
    // Adjust based on resolution
    if (metadata.resolution && (metadata.resolution.includes('4000') || metadata.resolution.includes('6000'))) {
      const reduction = qualityMode === 'quality' ? 0.02 : 0.05;
      quality -= reduction; // Slightly lower quality for very high-res images
    }
    
    // Respect mode limits
    const limits = {
      quality: { min: 0.75, max: 0.95 },
      balanced: { min: 0.65, max: 0.90 },
      size: { min: 0.40, max: 0.80 }
    };
    
    const limit = limits[qualityMode] || limits.balanced;
    return Math.min(limit.max, Math.max(limit.min, quality));
  }

  getQualityRange(metadata, qualityMode) {
    const baseQuality = this.calculateOptimalQuality(metadata, qualityMode);
    return {
      min: Math.max(0.3, baseQuality - 0.15),
      max: Math.min(0.95, baseQuality + 0.10),
      suggested: baseQuality
    };
  }

  selectOptimalFormat(metadata) {
    // SELIC would consider semantic content for format selection
    if (metadata.estimatedComplexity > 0.4) {
      return 'image/jpeg'; // Better for complex, natural images
    }
    
    if (metadata.dominantColors.length <= 3) {
      return 'image/webp'; // Better for simple graphics
    }
    
    return 'image/jpeg'; // Default fallback
  }

  determineResizeStrategy(metadata) {
    const [width, height] = metadata.resolution.split('x').map(Number);
    
    // SELIC-inspired intelligent resizing
    if (width * height > 4000000) { // > 4MP
      return {
        maxDimension: 2048,
        preserveAspect: true,
        smartCrop: true
      };
    }
    
    return {
      maxDimension: Math.max(width, height),
      preserveAspect: true,
      smartCrop: false
    };
  }

  identifyPriorityRegions(semantics) {
    // In SELIC, this would use attention mechanisms
    // Mock implementation based on semantic description
    const description = semantics.description.toLowerCase();
    
    const priorities = [];
    
    if (description.includes('portrait')) {
      priorities.push({ region: 'center', weight: 1.5, reason: 'likely face/subject' });
    }
    
    if (description.includes('bright')) {
      priorities.push({ region: 'highlights', weight: 1.2, reason: 'preserve bright details' });
    }
    
    if (description.includes('dark')) {
      priorities.push({ region: 'shadows', weight: 1.3, reason: 'preserve shadow details' });
    }
    
    return priorities;
  }

  calculateBitAllocation(semantics) {
    // SELIC-style semantic-guided bit allocation
    const base = 1.0;
    const metadata = semantics.analysisMetadata;
    
    return {
      highFrequency: base * (1 + metadata.estimatedComplexity),
      midFrequency: base,
      lowFrequency: base * (1 - metadata.estimatedComplexity * 0.3),
      semanticRegions: base * 1.4 // Extra bits for semantically important regions
    };
  }

  /**
   * Apply optimized compression with configurable quality
   */
  async applyOptimizedCompression(imageFile, settings) {
    // Mock compression application with configurable quality
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(
          (blob) => resolve(blob),
          settings.format,
          settings.quality
        );
      };
      
      img.src = URL.createObjectURL(imageFile);
    });
  }
}

/**
 * Enhanced metadata generator using semantic information
 */
export class SemanticMetadataGenerator {
  static generateEnhancedMetadata(originalMetadata, semantics, compressionSettings) {
    return {
      ...originalMetadata,
      semantic: {
        description: semantics.description,
        confidence: semantics.confidence,
        complexity: semantics.analysisMetadata.estimatedComplexity,
        dominantColors: semantics.analysisMetadata.dominantColors,
        brightness: semantics.analysisMetadata.brightness,
        estimatedCompression: compressionSettings.quality
      },
      compression: {
        algorithm: 'selic-inspired',
        quality: compressionSettings.quality,
        qualityMode: compressionSettings.qualityMode,
        isManualQuality: compressionSettings.isManual,
        aiSuggested: compressionSettings.aiSuggested,
        format: compressionSettings.format,
        bitAllocation: compressionSettings.bitAllocation,
        priorityRegions: compressionSettings.priorityRegions.length
      },
      enhanced: true,
      generatedAt: new Date().toISOString()
    };
  }
}

// Main integration class with quality controls
export class SELICIntegration {
  constructor() {
    this.semanticProcessor = new SemanticImageProcessor();
    this.compressionOptimizer = new CompressionOptimizer(this.semanticProcessor);
  }

  async processImage(imageFile, originalMetadata = {}, userPreferences = {}) {
    try {
      // Step 1: Extract semantic information
      const semantics = await this.semanticProcessor.extractSemantics(imageFile);
      
      // Step 2: Optimize compression settings with user preferences
      const compressionSettings = await this.compressionOptimizer.optimizeCompression(semantics, userPreferences);
      
      // Step 3: Generate enhanced metadata
      const enhancedMetadata = SemanticMetadataGenerator.generateEnhancedMetadata(
        originalMetadata,
        semantics,
        compressionSettings
      );
      
      // Step 4: Apply optimized compression
      const optimizedBlob = await this.compressionOptimizer.applyOptimizedCompression(imageFile, compressionSettings);
      
      return {
        optimizedImage: optimizedBlob,
        semantics,
        compressionSettings,
        enhancedMetadata,
        originalSize: imageFile.size,
        optimizedSize: optimizedBlob.size,
        compressionRatio: imageFile.size / optimizedBlob.size,
        qualityInfo: {
          used: compressionSettings.quality,
          aiSuggested: compressionSettings.aiSuggested,
          mode: compressionSettings.qualityMode,
          isManual: compressionSettings.isManual,
          range: compressionSettings.qualityRange
        }
      };
    } catch (error) {
      console.error('SELIC processing failed:', error);
      throw error;
    }
  }

  async isReady() {
    return this.semanticProcessor.isReady;
  }
}

// Export the class both as named and default export
export { SELICIntegration };
export default SELICIntegration;
