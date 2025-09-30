#!/usr/bin/env node

/**
 * Full analytics flow test to debug the sessionPath issue
 */

import { processRow } from './src/utils/dimension-processors.js';
import config from './config.js';

console.log("🔍 Full Analytics Flow Debug\n");

// Simulate the exact scenario
const mockQuery = {
  dimensions: ['date', 'sessionPath'],
  metrics: ['sessions', 'bounceRate']
};

console.log("Query:", mockQuery);
console.log("");

// Simulate the dimension mapping logic from analytics.js
function getSourceDimensionForAPI(dimension, analyticsConfig) {
  const dimensionMap = analyticsConfig.dimensions;
  
  // If it's a derived dimension, get the source dimension
  if (dimensionMap[dimension]) {
    return dimensionMap[dimension];
  }
  
  // If it's already a source dimension, return as-is
  return dimension;
}

console.log("Step 1: Dimension mapping");
const analyticsConfig = config.sources.analytics;
const dimensionMapping = new Map();
const apiDimensions = [];

mockQuery.dimensions.forEach(dim => {
  const sourceDim = getSourceDimensionForAPI(dim, analyticsConfig);
  console.log(`  ${dim} -> ${sourceDim}`);
  
  if (!dimensionMapping.has(sourceDim)) {
    dimensionMapping.set(sourceDim, []);
    apiDimensions.push({ name: sourceDim });
  }
  dimensionMapping.get(sourceDim).push(dim);
});

console.log("API dimensions:", apiDimensions);
console.log("Dimension mapping:", Object.fromEntries(dimensionMapping));
console.log("");

// Simulate GA4 API response
const mockGA4Response = {
  rows: [
    {
      dimensionValues: [
        { value: '20250925' },  // date
        { value: '/' }          // pagePath (source for sessionPath)
      ],
      metricValues: [
        { value: '30' },        // sessions
        { value: '0.067' }      // bounceRate
      ]
    }
  ]
};

console.log("Step 2: Response processing");
const processedRows = mockGA4Response.rows.map(row => {
  const result = {};
  
  // Add dimensions - simulate the analytics.js logic
  if (row.dimensionValues) {
    let dimensionIndex = 0;
    apiDimensions.forEach(apiDim => {
      const userDimensions = dimensionMapping.get(apiDim.name);
      const value = row.dimensionValues[dimensionIndex]?.value || '';
      
      console.log(`  Processing API dimension: ${apiDim.name} = ${value}`);
      console.log(`  User dimensions: ${userDimensions.join(', ')}`);
      
      userDimensions.forEach(dimension => {
        const sourceDim = getSourceDimensionForAPI(dimension, analyticsConfig);
        console.log(`    Processing ${dimension} (source: ${sourceDim})`);
        
        // For derived dimensions, set both source and derived names
        // For regular dimensions, set both source and derived names
        if (sourceDim !== dimension) {
          // This is a derived dimension - set both source and derived names
          // The source dimension is needed for the processor to work
          console.log(`      Setting ${sourceDim} = ${value} (source for derived)`);
          console.log(`      Setting ${dimension} = ${value} (derived)`);
          result[sourceDim] = value;
          result[dimension] = value;
        } else {
          // This is a regular dimension - set both names
          console.log(`      Setting ${sourceDim} = ${value} (regular)`);
          result[sourceDim] = value;
          result[dimension] = value;
        }
      });
      
      dimensionIndex++;
    });
  }
  
  // Add metrics
  if (row.metricValues) {
    mockQuery.metrics.forEach((metric, index) => {
      const value = row.metricValues[index]?.value;
      result[metric] = value ? parseFloat(value) : 0;
    });
  }
  
  return result;
});

console.log("\nStep 3: Raw processed rows");
processedRows.forEach((row, index) => {
  console.log(`Row ${index + 1}:`);
  Object.keys(row).forEach(key => {
    console.log(`  ${key}: ${row[key]}`);
  });
  console.log("");
});

// Step 4: Apply dimension processors
console.log("Step 4: Apply dimension processors");
const finalRows = processedRows.map(row => processRow(row, mockQuery.dimensions));

console.log("Final processed rows:");
finalRows.forEach((row, index) => {
  console.log(`Row ${index + 1}:`);
  Object.keys(row).forEach(key => {
    console.log(`  ${key}: ${row[key]}`);
  });
  console.log("");
});

// Step 5: Check what the table would show
console.log("Step 5: Table analysis");
if (finalRows.length > 0) {
  const headers = Object.keys(finalRows[0]);
  console.log("Final headers:", headers);
  console.log("");
  
  if (headers.includes('sessionPath')) {
    console.log("✅ sessionPath column exists!");
    console.log(`   Value: ${finalRows[0].sessionPath}`);
  } else {
    console.log("❌ sessionPath column missing!");
  }
  
  if (headers.includes('pagePath')) {
    console.log("❌ pagePath column exists (this is the problem!)");
    console.log(`   Value: ${finalRows[0].pagePath}`);
  } else {
    console.log("✅ pagePath column not present");
  }
}

console.log("\n🔧 Debug complete!");
