# SELIC Demo - Standalone Version

This directory contains a standalone demonstration of SELIC (Semantic-Enhanced Learned Image Compression) integration, kept separate from the main Moment project.

## 🧠 What is SELIC?

SELIC is an AI-powered image compression system that:
- Analyzes semantic content of images using computer vision
- Applies intelligent compression based on content importance
- Provides user-configurable quality controls (70%, 80%, 90%)
- Maintains visual quality while reducing file sizes

## 📁 Directory Structure

```
selic-demo/
├── README.md                 # This file
├── start_selic.sh           # Backend startup script
├── backend/
│   └── selic_service.py     # FastAPI backend service
└── frontend/
    ├── SELICDemo.jsx        # React demo component
    ├── selic-backend.js     # Backend integration
    ├── selic-inspired-fixed.js  # Local processing engine
    ├── selic-inspired.js    # Original (deprecated)
    └── test-import.js       # Import testing script
```

## 🚀 Running the Demo

### Backend Service

1. **Start the SELIC backend:**
   ```bash
   cd /Volumes/additional/Moment/selic-demo
   ./start_selic.sh
   ```

2. **Verify backend is running:**
   ```bash
   curl http://localhost:8001/health
   ```

### Frontend Integration

The frontend files can be integrated into any React project:

1. **Copy the components:**
   - `SELICDemo.jsx` - Main demo component
   - `selic-backend.js` - Backend integration
   - `selic-inspired-fixed.js` - Local processing engine

2. **Add to your React router:**
   ```jsx
   import SELICDemo from './components/SELICDemo';
   
   // Add route: /selic-demo -> <SELICDemo />
   ```

## 🔧 Features

### Quality Controls
- **70% Quality**: Smaller files, good for web/mobile
- **80% Quality**: Balanced size and quality (default)
- **90% Quality**: High quality, larger files

### Processing Modes
- **Backend AI**: Uses Python backend for advanced semantic analysis
- **Local Processing**: JavaScript fallback when backend unavailable

### Analysis Features
- Semantic description generation
- Dominant color extraction
- Complexity and brightness analysis
- Compression ratio optimization
- File size comparison

## 🧪 Testing

Run the import test to verify everything works:
```bash
cd /Volumes/additional/Moment/selic-demo/frontend
node test-import.js
```

## 📊 Integration Notes

### Current Status
- ✅ **Separate from main project** - No integration with Moment app
- ✅ **Standalone demo** - Self-contained functionality
- ✅ **Quality controls working** - 70%, 80%, 90% options functional
- ✅ **Backend/frontend split** - Modular architecture

### Future Integration
When ready to integrate with main Moment project:
1. Copy relevant files to main project structure
2. Add SELIC route to main app router
3. Install additional dependencies if needed
4. Update backend service ports if conflicts arise

## 🔗 Dependencies

### Backend
- FastAPI
- uvicorn
- PIL (Pillow)
- numpy
- opencv-python

### Frontend
- React
- Standard web APIs (Canvas, FileReader, etc.)

## 📝 Development Notes

- Created: September 15, 2025
- Purpose: SELIC research and development
- Status: Experimental/Demo
- Integration: Separated from main Moment project

## 🎯 Next Steps

1. **Research Phase**: Continue SELIC algorithm development
2. **Performance Testing**: Benchmark compression ratios and quality
3. **UI/UX Refinement**: Improve demo interface
4. **Integration Planning**: Design integration strategy for main app
