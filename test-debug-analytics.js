#!/usr/bin/env node

/**
 * Debug test to see what's happening in the analytics flow
 */

import { processRow } from './src/utils/dimension-processors.js';
import config from './config.js';

console.log("🔍 Debug Analytics Flow\n");

// Simulate the exact scenario from your ad-hoc query
const mockQuery = {
  dimensions: ['date', 'sessionPath'],
  metrics: ['sessions', 'bounceRate']
};

console.log("Query:", mockQuery);
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

console.log("Mock GA4 Response:");
console.log(JSON.stringify(mockGA4Response, null, 2));
console.log("");

// Simulate the analytics.js processing
console.log("Step 1: Raw data processing");
const rawRows = mockGA4Response.rows.map(row => {
  const result = {};
  
  // Add dimensions
  if (row.dimensionValues) {
    mockQuery.dimensions.forEach((dimension, index) => {
      result[dimension] = row.dimensionValues[index]?.value || '';
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

console.log("Raw rows after dimension mapping:");
rawRows.forEach((row, index) => {
  console.log(`Row ${index + 1}:`);
  Object.keys(row).forEach(key => {
    console.log(`  ${key}: ${row[key]}`);
  });
  console.log("");
});

// Step 2: Apply dimension processors
console.log("Step 2: Apply dimension processors");
const processedRows = rawRows.map(row => processRow(row, mockQuery.dimensions));

console.log("Processed rows after dimension processors:");
processedRows.forEach((row, index) => {
  console.log(`Row ${index + 1}:`);
  Object.keys(row).forEach(key => {
    console.log(`  ${key}: ${row[key]}`);
  });
  console.log("");
});

// Step 3: Check what the table would show
console.log("Step 3: Table headers (what you see in the table)");
if (processedRows.length > 0) {
  const headers = Object.keys(processedRows[0]);
  console.log("Headers:", headers);
  console.log("");
  
  console.log("Expected: sessionPath should be a separate column");
  console.log("Actual: You're seeing pagePath instead of sessionPath");
  console.log("");
  
  if (headers.includes('sessionPath')) {
    console.log("✅ sessionPath column exists!");
  } else {
    console.log("❌ sessionPath column missing!");
  }
  
  if (headers.includes('pagePath')) {
    console.log("❌ pagePath column exists (this is the problem!)");
  } else {
    console.log("✅ pagePath column not present");
  }
}

console.log("\n🔧 The issue is that sessionPath is not being processed correctly.");
console.log("The dimension processors should convert pagePath to sessionPath,");
console.log("but you're still seeing pagePath in the results.");
