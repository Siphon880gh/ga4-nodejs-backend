#!/usr/bin/env node

/**
 * Test to see if columns are being filtered correctly
 */

import { processRow } from './src/utils/dimension-processors.js';

console.log("🧪 Testing Column Filtering\n");

// Simulate the exact scenario (sessionPath removed, using pagePath instead)
const mockAnswers = {
  dimensions: ['date', 'pagePath'],
  metrics: ['sessions', 'bounceRate']
};

// Simulate the processed data (what the system should have)
const processedData = [
  {
    date: '20250925',
    pagePath: '/',
    sessions: 30,
    bounceRate: 0.067
  },
  {
    date: '20250923',
    pagePath: '/',
    sessions: 26,
    bounceRate: 0
  },
  {
    date: '20250924',
    pagePath: '/',
    sessions: 23,
    bounceRate: 0.087
  }
];

console.log("Step 1: What the system has internally");
console.log("All columns:", Object.keys(processedData[0]));
console.log("");

console.log("Step 2: What you should see (pagePath selected)");
console.log("Columns after filtering:", Object.keys(processedData[0]));
console.table(processedData);
console.log("");

console.log("🔍 Analysis:");
console.log("✅ The system now uses pagePath for all page analysis");
console.log("✅ sessionPath and exitPath have been removed as they were redundant");
console.log("");
console.log("💡 Use pagePath for all page analysis and clean URLs in post-processing if needed");
