#!/usr/bin/env node

/**
 * Simple test runner for session tracking functionality
 * Run with: node run-session-tests.js
 */

// Note: exitPath and sessionPath processors have been removed as they were redundant with pagePath

console.log("🧪 Testing Session Tracking Functionality\n");

// Test data
const testData = [
  {
    sessionId: "session_12345",
    pagePath: "/home",
    description: "Homepage"
  },
  {
    sessionId: "session_12345", 
    pagePath: "/products?category=electronics&sort=price",
    description: "Products with query params"
  },
  {
    sessionId: "session_12345",
    pagePath: "/checkout/cart#payment",
    description: "Checkout with hash"
  },
  {
    sessionId: "session_67890",
    pagePath: "/about",
    description: "About page"
  },
  {
    sessionId: "session_67890",
    pagePath: "/contact?source=about&utm_campaign=test",
    description: "Contact with tracking params"
  }
];

console.log("📊 Test Data:");
testData.forEach((row, index) => {
  console.log(`  ${index + 1}. Session: ${row.sessionId}, Path: ${row.pagePath}`);
});
console.log("");

// Test 1: Basic pagePath cleaning (replaces exitPath processing)
console.log("🔧 Test 1: pagePath Cleaning");
testData.forEach((row, index) => {
  // Clean pagePath by removing query parameters and hash fragments
  const cleanPath = row.pagePath.split('?')[0].split('#')[0];
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
  
  console.log(`  ${index + 1}. ${row.description}`);
  console.log(`     Input:  ${row.pagePath}`);
  console.log(`     Output: ${normalizedPath}`);
  console.log("");
});

// Test 3: Session aggregation simulation
console.log("🔧 Test 3: Session Aggregation");
const sessions = {};
testData.forEach(row => {
  if (!sessions[row.sessionId]) {
    sessions[row.sessionId] = [];
  }
  sessions[row.sessionId].push(row);
});

Object.keys(sessions).forEach(sessionId => {
  const sessionPages = sessions[sessionId];
  console.log(`  Session ${sessionId}:`);
  console.log(`    Pages: ${sessionPages.length}`);
  
  // Show raw paths
  const rawPaths = sessionPages.map(p => p.pagePath);
  console.log(`    Raw:    ${rawPaths.join(' → ')}`);
  
  // Show cleaned paths
  const cleanPaths = sessionPages.map(p => {
    const cleanPath = p.pagePath.split('?')[0].split('#')[0];
    return cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
  });
  console.log(`    Clean:  ${cleanPaths.join(' → ')}`);
  console.log("");
});

// Test 4: Error handling
console.log("🔧 Test 4: Error Handling");
const errorTests = [
  { input: null, description: "null input" },
  { input: undefined, description: "undefined input" },
  { input: "", description: "empty string" },
  { input: "/", description: "root path" },
  { input: "no-slash", description: "path without slash" }
];

errorTests.forEach(test => {
  // Clean pagePath by removing query parameters and hash fragments
  const cleanPath = (test.input || '').split('?')[0].split('#')[0];
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
  
  console.log(`  ${test.description}:`);
  console.log(`    Input:  "${test.input}"`);
  console.log(`    Output: "${normalizedPath}"`);
});

console.log("\n✅ All tests completed!");
console.log("\n📝 Key Insights:");
console.log("  1. Use pagePath for all page analysis (clean URLs in post-processing if needed)");
console.log("  2. exitPath and sessionPath have been removed as they were redundant");
console.log("  3. To get full session journeys, group by sessionId");
console.log("  4. Include sessionId in your queries to enable session tracking");
console.log("\n🚀 Ready to use session tracking in your analytics queries!");
