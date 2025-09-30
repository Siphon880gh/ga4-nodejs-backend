#!/usr/bin/env node

/**
 * Test to see what the actual table output would look like
 */

import { processRow } from './src/utils/dimension-processors.js';

console.log("🧪 Testing Table Output\n");

// Simulate the exact data you're getting
const mockData = [
  {
    date: '20250925',
    pagePath: '/',
    sessionPath: '/',
    sessions: 30,
    bounceRate: 0.067
  },
  {
    date: '20250923', 
    pagePath: '/',
    sessionPath: '/',
    sessions: 26,
    bounceRate: 0
  },
  {
    date: '20250924',
    pagePath: '/',
    sessionPath: '/',
    sessions: 23,
    bounceRate: 0.087
  }
];

console.log("Raw data (what you're currently getting):");
console.table(mockData);
console.log("");

// Test with only sessionPath (what you want)
const sessionPathOnly = mockData.map(row => {
  const { pagePath, ...rest } = row;
  return rest;
});

console.log("With only sessionPath (what you want):");
console.table(sessionPathOnly);
console.log("");

// Test with only pagePath (what you're seeing)
const pagePathOnly = mockData.map(row => {
  const { sessionPath, ...rest } = row;
  return rest;
});

console.log("With only pagePath (what you're seeing):");
console.table(pagePathOnly);
console.log("");

console.log("🔧 The issue is that you're seeing both pagePath and sessionPath columns,");
console.log("   but you only want to see sessionPath.");
console.log("");
console.log("💡 The fix should make sessionPath show as a separate column");
console.log("   with the same values as pagePath (since they're both clean paths).");
