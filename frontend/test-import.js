// Test script to verify SELIC imports work
console.log('Testing SELIC import...');

import('./src/lib/selic-inspired-fixed.js')
  .then(module => {
    console.log('✅ Module imported successfully');
    console.log('Available exports:', Object.keys(module));
    console.log('SELICIntegration:', typeof module.SELICIntegration);
    console.log('default:', typeof module.default);
    
    if (module.SELICIntegration) {
      const instance = new module.SELICIntegration();
      console.log('✅ SELICIntegration instance created successfully');
      console.log('Instance type:', typeof instance);
    } else {
      console.error('❌ SELICIntegration not found');
    }
  })
  .catch(error => {
    console.error('❌ Import failed:', error);
  });
