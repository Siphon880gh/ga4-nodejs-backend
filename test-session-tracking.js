/**
 * Test file for session tracking functionality
 * This demonstrates how to use sessionId and pagePath to track user journeys
 */

import { processExitPath, processSessionPath } from './src/utils/dimension-processors.js';

// Mock data simulating GA4 API response with session tracking
const mockGA4Data = [
  // Session 1: User journey from home to checkout
  {
    sessionId: "session_12345",
    clientId: "client_abc123",
    pagePath: "/home",
    pageTitle: "Homepage",
    date: "2024-01-15",
    sessions: 1,
    pageviews: 1
  },
  {
    sessionId: "session_12345", 
    clientId: "client_abc123",
    pagePath: "/products?category=electronics",
    pageTitle: "Products",
    date: "2024-01-15",
    sessions: 1,
    pageviews: 1
  },
  {
    sessionId: "session_12345",
    clientId: "client_abc123", 
    pagePath: "/checkout/cart#payment",
    pageTitle: "Checkout",
    date: "2024-01-15",
    sessions: 1,
    pageviews: 1
  },
  
  // Session 2: Different user journey
  {
    sessionId: "session_67890",
    clientId: "client_def456",
    pagePath: "/about",
    pageTitle: "About Us",
    date: "2024-01-15", 
    sessions: 1,
    pageviews: 1
  },
  {
    sessionId: "session_67890",
    clientId: "client_def456",
    pagePath: "/contact?source=about",
    pageTitle: "Contact",
    date: "2024-01-15",
    sessions: 1,
    pageviews: 1
  },
  
  // Session 3: Single page session (bounce)
  {
    sessionId: "session_99999",
    clientId: "client_ghi789",
    pagePath: "/blog/post-title?utm_source=google",
    pageTitle: "Blog Post",
    date: "2024-01-15",
    sessions: 1,
    pageviews: 1
  }
];

// Test the dimension processors
console.log("=== Testing Dimension Processors ===\n");

mockGA4Data.forEach((row, index) => {
  console.log(`Row ${index + 1}:`);
  console.log(`  Session ID: ${row.sessionId}`);
  console.log(`  Client ID: ${row.clientId}`);
  console.log(`  Raw pagePath: ${row.pagePath}`);
  
  // Test exitPath processor
  const exitPath = processExitPath(row, row.pagePath);
  console.log(`  Cleaned exitPath: ${exitPath}`);
  
  // Test sessionPath processor
  const sessionPath = processSessionPath(row, row.pagePath);
  console.log(`  Session path: ${sessionPath}`);
  console.log("");
});

// Test session aggregation
console.log("=== Session Aggregation Test ===\n");

// Group by sessionId to show how you'd build session paths
const sessions = {};
mockGA4Data.forEach(row => {
  if (!sessions[row.sessionId]) {
    sessions[row.sessionId] = [];
  }
  sessions[row.sessionId].push(row);
});

// Display session journeys
Object.keys(sessions).forEach(sessionId => {
  const sessionPages = sessions[sessionId];
  console.log(`Session ${sessionId}:`);
  console.log(`  Client: ${sessionPages[0].clientId}`);
  console.log(`  Journey: ${sessionPages.map(p => processExitPath(p, p.pagePath)).join(' → ')}`);
  console.log(`  Pages: ${sessionPages.length}`);
  console.log("");
});

// Test query examples
console.log("=== Query Examples ===\n");

console.log("1. Get all pages with session tracking:");
console.log("Query: { dimensions: ['sessionId', 'pagePath', 'date'], metrics: ['sessions'] }");
console.log("Result: Each row shows one page with its session ID\n");

console.log("2. Get session paths:");
console.log("Query: { dimensions: ['sessionId', 'pagePath'], metrics: ['sessions'] }");
console.log("Then group by sessionId to build paths\n");

console.log("3. Get exit pages only:");
console.log("Query: { dimensions: ['sessionId', 'pagePath'], metrics: ['sessions'] }");
console.log("Then find the last page in each session\n");

console.log("4. Get landing pages only:");
console.log("Query: { dimensions: ['sessionId', 'landingPage'], metrics: ['sessions'] }");
console.log("Result: First page of each session\n");

// Test error handling
console.log("=== Error Handling Tests ===\n");

const testCases = [
  { pagePath: null, description: "Null pagePath" },
  { pagePath: undefined, description: "Undefined pagePath" },
  { pagePath: "", description: "Empty pagePath" },
  { pagePath: "/", description: "Root path" },
  { pagePath: "invalid-path", description: "Path without leading slash" }
];

testCases.forEach(test => {
  const result = processExitPath({}, test.pagePath);
  console.log(`${test.description}: "${test.pagePath}" → "${result}"`);
});

console.log("\n=== Test Complete ===");
console.log("To run this test: node test-session-tracking.js");
