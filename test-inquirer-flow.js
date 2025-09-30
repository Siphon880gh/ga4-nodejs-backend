#!/usr/bin/env node

/**
 * Test that simulates the exact inquirer flow you described
 * Screen 1: sessions and bounceRate
 * Screen 2: date and sessionPath
 */

import { processRow } from './src/utils/dimension-processors.js';
import config from './config.js';

console.log("🧪 Testing Exact Inquirer Flow\n");

// Simulate the exact answers from your inquirer flow
const mockAnswers = {
  // Screen 1: Metrics selection
  metrics: ['sessions', 'bounceRate'],
  
  // Screen 2: Dimensions selection  
  dimensions: ['date', 'sessionPath'],
  
  // Other required fields
  dateRangeType: 'last7',
  limit: 1000,
  outputFormat: 'table'
};

console.log("Mock Inquirer Answers:");
console.log("  Metrics:", mockAnswers.metrics);
console.log("  Dimensions:", mockAnswers.dimensions);
console.log("");

// Simulate the analytics.js processing
function getSourceDimensionForAPI(dimension, analyticsConfig) {
  const dimensionMap = analyticsConfig.dimensions;
  
  if (dimensionMap[dimension]) {
    return dimensionMap[dimension];
  }
  
  return dimension;
}

// Simulate GA4 API response (what you're actually getting)
const mockGA4Response = {
  rows: [
    {
      dimensionValues: [
        { value: '20250925' },  // date
        { value: '/' }         // pagePath (source for sessionPath)
      ],
      metricValues: [
        { value: '30' },        // sessions
        { value: '0.067' }      // bounceRate
      ]
    },
    {
      dimensionValues: [
        { value: '20250923' },  // date
        { value: '/' }          // pagePath
      ],
      metricValues: [
        { value: '26' },        // sessions
        { value: '0' }          // bounceRate
      ]
    },
    {
      dimensionValues: [
        { value: '20250924' },  // date
        { value: '/' }          // pagePath
      ],
      metricValues: [
        { value: '23' },        // sessions
        { value: '0.087' }      // bounceRate
      ]
    }
  ]
};

console.log("Step 1: Dimension mapping");
const analyticsConfig = config.sources.analytics;
const dimensionMapping = new Map();
const apiDimensions = [];

mockAnswers.dimensions.forEach(dim => {
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

console.log("Step 2: Process GA4 response");
const processedRows = mockGA4Response.rows.map(row => {
  const result = {};
  
  // Add dimensions - simulate the analytics.js logic
  if (row.dimensionValues) {
    let dimensionIndex = 0;
    apiDimensions.forEach(apiDim => {
      const userDimensions = dimensionMapping.get(apiDim.name);
      const value = row.dimensionValues[dimensionIndex]?.value || '';
      
      userDimensions.forEach(dimension => {
        const sourceDim = getSourceDimensionForAPI(dimension, analyticsConfig);
        
        // For derived dimensions, set both source and derived names
        // For regular dimensions, set both source and derived names
        if (sourceDim !== dimension) {
          // This is a derived dimension - set both source and derived names
          result[sourceDim] = value;
          result[dimension] = value;
        } else {
          // This is a regular dimension - set both names
          result[sourceDim] = value;
          result[dimension] = value;
        }
      });
      
      dimensionIndex++;
    });
  }
  
  // Add metrics
  if (row.metricValues) {
    mockAnswers.metrics.forEach((metric, index) => {
      const value = row.metricValues[index]?.value;
      result[metric] = value ? parseFloat(value) : 0;
    });
  }
  
  return result;
});

console.log("Raw processed rows:");
processedRows.forEach((row, index) => {
  console.log(`Row ${index + 1}:`);
  Object.keys(row).forEach(key => {
    console.log(`  ${key}: ${row[key]}`);
  });
  console.log("");
});

console.log("Step 3: Apply dimension processors");
const finalRows = processedRows.map(row => processRow(row, mockAnswers.dimensions));

console.log("Final processed rows:");
finalRows.forEach((row, index) => {
  console.log(`Row ${index + 1}:`);
  Object.keys(row).forEach(key => {
    console.log(`  ${key}: ${row[key]}`);
  });
  console.log("");
});

console.log("Step 4: Table output (what you see)");
console.log("Headers:", Object.keys(finalRows[0]));
console.log("");

// Format the table like the actual output
const formattedRows = finalRows.map((row, index) => {
  const formattedRow = { '(index)': index };
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'number' && !Number.isInteger(value)) {
      formattedRow[key] = Math.round(value * 1000) / 1000;
    } else {
      formattedRow[key] = value;
    }
  }
  return formattedRow;
});

console.table(formattedRows);

console.log("\n🔍 Analysis:");
console.log("✅ Expected: sessionPath column should be present");
console.log("❌ Actual: You're seeing pagePath instead of sessionPath");
console.log("");
console.log("🔧 The issue is that the dimension processors are not working correctly.");
console.log("   The sessionPath column should show processed values,");
console.log("   but you're getting the raw pagePath values instead.");
