"""
SELIC-Inspired Image Compression Service for Moment Backend
Implements semantic-enhanced compression using modern Python libraries
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageEnhance
import io
import base64
import json
from typing import Optional, Dict, Any, List
import numpy as np
from dataclasses import dataclass
import logging
from datetime import datetime

# For semantic analysis (mock implementation - would use actual models in production)
# from transformers import BlipProcessor, BlipForConditionalGeneration, BertTokenizer, BertModel
# import torch

app = FastAPI(title="SELIC Image Processing Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class SemanticAnalysis:
    description: str
    confidence: float
    complexity: float
    brightness: float
    dominant_colors: List[List[int]]
    estimated_quality: float

@dataclass
class CompressionSettings:
    quality: int
    format: str
    optimization_level: str
    bit_allocation: Dict[str, float]
    priority_regions: List[Dict[str, Any]]

class SELICProcessor:
    """SELIC-inspired image processor"""
    
    def __init__(self):
        self.initialized = False
        # In production, initialize actual ML models here
        # self.blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        # self.blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
        # self.bert_tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
        # self.bert_model = BertModel.from_pretrained('bert-base-uncased')
        self.initialized = True
        logger.info("SELIC processor initialized")

    def analyze_semantics(self, image: Image.Image) -> SemanticAnalysis:
        """Extract semantic information from image"""
        try:
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize for analysis (standard 224x224 for vision models)
            analysis_size = (224, 224)
            img_resized = image.resize(analysis_size, Image.Resampling.LANCZOS)
            img_array = np.array(img_resized)
            
            # Basic image analysis
            brightness = self._calculate_brightness(img_array)
            complexity = self._estimate_complexity(img_array)
            dominant_colors = self._extract_dominant_colors(img_array)
            
            # Mock semantic description (replace with actual BLIP inference)
            description = self._generate_mock_description(
                brightness, complexity, dominant_colors, image.size
            )
            
            # Estimate optimal compression quality based on analysis
            estimated_quality = self._calculate_optimal_quality(
                brightness, complexity, image.size
            )
            
            return SemanticAnalysis(
                description=description,
                confidence=0.85,  # Mock confidence
                complexity=complexity,
                brightness=brightness,
                dominant_colors=dominant_colors,
                estimated_quality=estimated_quality
            )
            
        except Exception as e:
            logger.error(f"Semantic analysis failed: {e}")
            raise HTTPException(status_code=500, detail=f"Semantic analysis failed: {str(e)}")

    def _calculate_brightness(self, img_array: np.ndarray) -> float:
        """Calculate average brightness of image"""
        gray = np.mean(img_array, axis=2)
        return float(np.mean(gray) / 255.0)

    def _estimate_complexity(self, img_array: np.ndarray) -> float:
        """Estimate image complexity using edge detection"""
        gray = np.mean(img_array, axis=2)
        
        # Simple edge detection (Sobel-like)
        dy, dx = np.gradient(gray)
        edge_magnitude = np.sqrt(dx**2 + dy**2)
        
        # Normalize complexity score
        complexity = np.mean(edge_magnitude) / 128.0
        return min(1.0, max(0.0, complexity))

    def _extract_dominant_colors(self, img_array: np.ndarray, n_colors: int = 5) -> List[List[int]]:
        """Extract dominant colors using color quantization"""
        pixels = img_array.reshape(-1, 3)
        
        # Simple color clustering (would use k-means in production)
        unique_colors, counts = np.unique(pixels, axis=0, return_counts=True)
        
        # Sort by frequency and take top N
        sorted_indices = np.argsort(counts)[::-1]
        dominant = unique_colors[sorted_indices[:n_colors]]
        
        return [color.tolist() for color in dominant]

    def _generate_mock_description(self, brightness: float, complexity: float, 
                                 dominant_colors: List[List[int]], size: tuple) -> str:
        """Generate mock semantic description (replace with BLIP)"""
        brightness_term = "bright" if brightness > 0.7 else "medium-lit" if brightness > 0.3 else "dark"
        complexity_term = "highly detailed" if complexity > 0.4 else "simple"
        orientation = "landscape" if size[0] > size[1] else "portrait" if size[1] > size[0] else "square"
        
        # Analyze dominant color
        if dominant_colors:
            r, g, b = dominant_colors[0]
            if r > g and r > b:
                color_term = "red-toned"
            elif g > r and g > b:
                color_term = "green-toned"
            elif b > r and b > g:
                color_term = "blue-toned"
            else:
                color_term = "neutral-toned"
        else:
            color_term = "mixed-color"
        
        return f"A {brightness_term} {complexity_term} {orientation} {color_term} image"

    def _calculate_optimal_quality(self, brightness: float, complexity: float, size: tuple) -> float:
        """Calculate optimal compression quality based on image characteristics"""
        base_quality = 0.85
        
        # Adjust for complexity
        if complexity > 0.4:
            base_quality += 0.1  # Higher quality for complex images
        
        # Adjust for brightness
        if brightness < 0.3:
            base_quality += 0.05  # Higher quality for dark images
        
        # Adjust for size
        pixel_count = size[0] * size[1]
        if pixel_count > 4000000:  # > 4MP
            base_quality -= 0.05  # Slightly lower quality for very high-res
        
        return min(0.95, max(0.7, base_quality))

    def optimize_compression(self, image: Image.Image, semantics: SemanticAnalysis) -> CompressionSettings:
        """Determine optimal compression settings based on semantic analysis"""
        quality = int(semantics.estimated_quality * 100)
        
        # Format selection based on content
        if semantics.complexity > 0.4:
            format_type = "JPEG"  # Better for complex, natural images
        elif len(semantics.dominant_colors) <= 3:
            format_type = "WEBP"  # Better for simple graphics
        else:
            format_type = "JPEG"
        
        # Bit allocation strategy (SELIC-inspired)
        bit_allocation = {
            "high_frequency": 1.0 + semantics.complexity,
            "mid_frequency": 1.0,
            "low_frequency": 1.0 - semantics.complexity * 0.3,
            "semantic_regions": 1.4  # Extra bits for important regions
        }
        
        # Priority regions (mock - would use attention mechanisms in production)
        priority_regions = []
        if "portrait" in semantics.description:
            priority_regions.append({
                "region": "center",
                "weight": 1.5,
                "reason": "likely subject/face"
            })
        
        optimization_level = "high" if semantics.complexity > 0.3 else "standard"
        
        return CompressionSettings(
            quality=quality,
            format=format_type,
            optimization_level=optimization_level,
            bit_allocation=bit_allocation,
            priority_regions=priority_regions
        )

    def apply_optimized_compression(self, image: Image.Image, 
                                  settings: CompressionSettings) -> bytes:
        """Apply optimized compression with SELIC-inspired settings"""
        try:
            # Pre-processing based on semantic analysis
            processed_image = self._preprocess_image(image, settings)
            
            # Determine output format
            output_format = "WEBP" if settings.format == "WEBP" else "JPEG"
            
            # Compression with optimized settings
            output_buffer = io.BytesIO()
            
            if output_format == "WEBP":
                processed_image.save(
                    output_buffer,
                    format="WEBP",
                    quality=settings.quality,
                    method=6,  # Maximum compression effort
                    optimize=True
                )
            else:
                processed_image.save(
                    output_buffer,
                    format="JPEG",
                    quality=settings.quality,
                    optimize=True,
                    progressive=True
                )
            
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Compression failed: {e}")
            raise HTTPException(status_code=500, detail=f"Compression failed: {str(e)}")

    def _preprocess_image(self, image: Image.Image, settings: CompressionSettings) -> Image.Image:
        """Apply semantic-guided preprocessing"""
        processed = image.copy()
        
        # Semantic-aware enhancements
        if settings.optimization_level == "high":
            # Subtle sharpening for complex images
            enhancer = ImageEnhance.Sharpness(processed)
            processed = enhancer.enhance(1.1)
            
            # Contrast adjustment based on content
            contrast_enhancer = ImageEnhance.Contrast(processed)
            processed = contrast_enhancer.enhance(1.05)
        
        return processed

# Global processor instance
selic_processor = SELICProcessor()

@app.get("/")
def root():
    return {"message": "SELIC Image Processing Service", "status": "ready"}

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "processor_ready": selic_processor.initialized
    }

@app.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    """Analyze image semantics using SELIC-inspired approach"""
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        original_size = len(image_data)
        
        # Perform semantic analysis
        semantics = selic_processor.analyze_semantics(image)
        
        # Get optimization settings
        compression_settings = selic_processor.optimize_compression(image, semantics)
        
        return {
            "semantics": {
                "description": semantics.description,
                "confidence": semantics.confidence,
                "complexity": semantics.complexity,
                "brightness": semantics.brightness,
                "dominant_colors": semantics.dominant_colors,
                "estimated_quality": semantics.estimated_quality
            },
            "compression_settings": {
                "quality": compression_settings.quality,
                "format": compression_settings.format,
                "optimization_level": compression_settings.optimization_level,
                "bit_allocation": compression_settings.bit_allocation,
                "priority_regions_count": len(compression_settings.priority_regions)
            },
            "image_info": {
                "original_size": original_size,
                "dimensions": image.size,
                "mode": image.mode,
                "format": image.format
            }
        }
        
    except Exception as e:
        logger.error(f"Image analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/compress-image")
async def compress_image(file: UploadFile = File(...)):
    """Compress image using SELIC-inspired optimization"""
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        original_size = len(image_data)
        
        # Perform semantic analysis
        semantics = selic_processor.analyze_semantics(image)
        
        # Get optimization settings
        compression_settings = selic_processor.optimize_compression(image, semantics)
        
        # Apply optimized compression
        compressed_data = selic_processor.apply_optimized_compression(image, compression_settings)
        compressed_size = len(compressed_data)
        
        # Calculate compression ratio
        compression_ratio = original_size / compressed_size
        size_savings = ((original_size - compressed_size) / original_size) * 100
        
        # Encode compressed image as base64 for response
        compressed_b64 = base64.b64encode(compressed_data).decode('utf-8')
        
        return {
            "compressed_image": compressed_b64,
            "semantics": {
                "description": semantics.description,
                "confidence": semantics.confidence,
                "complexity": semantics.complexity,
                "brightness": semantics.brightness
            },
            "compression_stats": {
                "original_size": original_size,
                "compressed_size": compressed_size,
                "compression_ratio": round(compression_ratio, 2),
                "size_savings_percent": round(size_savings, 1),
                "quality_used": compression_settings.quality,
                "format_used": compression_settings.format
            },
            "enhanced_metadata": {
                "semantic_description": semantics.description,
                "semantic_confidence": semantics.confidence,
                "estimated_complexity": semantics.complexity,
                "dominant_colors": semantics.dominant_colors,
                "brightness_level": semantics.brightness,
                "compression_algorithm": "selic-inspired",
                "optimized_quality": compression_settings.quality,
                "optimization_level": compression_settings.optimization_level
            }
        }
        
    except Exception as e:
        logger.error(f"Image compression failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process-image")
async def process_image_full(file: UploadFile = File(...)):
    """Full SELIC-inspired processing pipeline"""
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        original_size = len(image_data)
        
        # Full processing pipeline
        semantics = selic_processor.analyze_semantics(image)
        compression_settings = selic_processor.optimize_compression(image, semantics)
        compressed_data = selic_processor.apply_optimized_compression(image, compression_settings)
        
        # Statistics
        compressed_size = len(compressed_data)
        compression_ratio = original_size / compressed_size
        size_savings = ((original_size - compressed_size) / original_size) * 100
        
        # Generate suggested caption
        suggested_caption = f"✨ {semantics.description}"
        
        # Generate hashtags based on analysis
        hashtags = []
        if semantics.brightness > 0.7:
            hashtags.append("#bright")
        elif semantics.brightness < 0.3:
            hashtags.append("#moody")
        
        if semantics.complexity > 0.4:
            hashtags.append("#detailed")
        
        if "portrait" in semantics.description:
            hashtags.append("#portrait")
        elif "landscape" in semantics.description:
            hashtags.append("#landscape")
        
        if hashtags:
            suggested_caption += " " + " ".join(hashtags[:2])
        
        # Encode compressed image
        compressed_b64 = base64.b64encode(compressed_data).decode('utf-8')
        
        return {
            "success": True,
            "processed_image": compressed_b64,
            "semantics": {
                "description": semantics.description,
                "confidence": semantics.confidence,
                "complexity": semantics.complexity,
                "brightness": semantics.brightness,
                "dominant_colors": semantics.dominant_colors
            },
            "compression": {
                "original_size": original_size,
                "optimized_size": compressed_size,
                "compression_ratio": round(compression_ratio, 2),
                "size_savings_percent": round(size_savings, 1),
                "quality": compression_settings.quality,
                "format": compression_settings.format,
                "algorithm": "selic-inspired"
            },
            "suggestions": {
                "caption": suggested_caption,
                "hashtags": hashtags,
                "optimal_quality": compression_settings.quality
            },
            "enhanced_metadata": {
                "semantic_description": semantics.description,
                "semantic_confidence": semantics.confidence,
                "estimated_complexity": semantics.complexity,
                "brightness_level": semantics.brightness,
                "dominant_colors": semantics.dominant_colors,
                "compression_algorithm": "selic-inspired",
                "optimized_quality": compression_settings.quality,
                "compression_ratio": compression_ratio,
                "size_savings_percent": size_savings,
                "processed_at": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Full image processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
