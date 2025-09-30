#!/usr/bin/env node

/**
 * Simple standalone test for session tracking
 * Run with: node test-session-simple.js
 */

// Helper function to clean pagePath (replaces removed processors)
function cleanPagePath(pagePath) {
  if (!pagePath) return '';
  
  // Remove query parameters and hash fragments
  let cleanPath = pagePath.split('?')[0].split('#')[0];
  
  // Ensure it starts with /
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }
  
  return cleanPath;
}

console.log("🧪 Session Tracking Test\n");

// Test data - simulating GA4 API response
const testSessions = [
  // Session 1: E-commerce journey
  { sessionId: "sess_001", pagePath: "/home", timestamp: "10:00:01" },
  { sessionId: "sess_001", pagePath: "/products?category=laptops", timestamp: "10:00:15" },
  { sessionId: "sess_001", pagePath: "/product/macbook-pro?color=space-gray", timestamp: "10:00:30" },
  { sessionId: "sess_001", pagePath: "/checkout/cart#payment", timestamp: "10:01:00" },
  
  // Session 2: Blog reading
  { sessionId: "sess_002", pagePath: "/blog", timestamp: "11:00:01" },
  { sessionId: "sess_002", pagePath: "/blog/analytics-guide?utm_source=google", timestamp: "11:00:10" },
  { sessionId: "sess_002", pagePath: "/contact?source=blog", timestamp: "11:02:00" },
  
  // Session 3: Single page (bounce)
  { sessionId: "sess_003", pagePath: "/about", timestamp: "12:00:01" }
];

console.log("📊 Raw GA4 Data (what you get from API):");
testSessions.forEach((row, index) => {
  console.log(`  ${index + 1}. [${row.timestamp}] Session: ${row.sessionId}, Path: ${row.pagePath}`);
});
console.log("");

// Test 1: Process individual pages
console.log("🔧 Test 1: Individual Page Processing");
testSessions.forEach((row, index) => {
  const cleanedPath = cleanPagePath(row.pagePath);
  
  console.log(`  ${index + 1}. Session ${row.sessionId}:`);
  console.log(`     Raw:      ${row.pagePath}`);
  console.log(`     Cleaned:  ${cleanedPath}`);
  console.log("");
});

// Test 2: Group by session to show journeys
console.log("🔧 Test 2: Session Journeys");
const sessionGroups = {};
testSessions.forEach(row => {
  if (!sessionGroups[row.sessionId]) {
    sessionGroups[row.sessionId] = [];
  }
  sessionGroups[row.sessionId].push(row);
});

Object.keys(sessionGroups).forEach(sessionId => {
  const pages = sessionGroups[sessionId];
  console.log(`  Session ${sessionId}:`);
  console.log(`    Raw journey:    ${pages.map(p => p.pagePath).join(' → ')}`);
  console.log(`    Clean journey:  ${pages.map(p => cleanPagePath(p.pagePath)).join(' → ')}`);
  console.log(`    Pages: ${pages.length}`);
  console.log("");
});

// Test 3: Find exit pages (last page in each session)
console.log("🔧 Test 3: Exit Pages");
Object.keys(sessionGroups).forEach(sessionId => {
  const pages = sessionGroups[sessionId];
  const lastPage = pages[pages.length - 1];
  const exitPage = cleanPagePath(lastPage.pagePath);
  
  console.log(`  Session ${sessionId}:`);
  console.log(`    Exit page: ${exitPage}`);
  console.log(`    Raw: ${lastPage.pagePath}`);
  console.log("");
});

// Test 4: Query examples
console.log("🔧 Test 4: Query Examples");
console.log("  To get session tracking, include these dimensions:");
console.log("    - sessionId (to group pages by session)");
console.log("    - pagePath (individual page paths)");
console.log("    - date (for time-based analysis)");
console.log("");
console.log("  Example query:");
console.log("    {");
console.log("      dimensions: ['sessionId', 'pagePath', 'date'],");
console.log("      metrics: ['sessions'],");
console.log("      dateRange: { start: '2024-01-15', end: '2024-01-15' }");
console.log("    }");
console.log("");

console.log("✅ Test Complete!");
console.log("\n💡 Key Takeaways:");
console.log("  1. GA4 gives you individual page views, not session flows");
console.log("  2. Use sessionId to group pages into sessions");
console.log("  3. Use pagePath for all page analysis (clean URLs in post-processing if needed)");
console.log("  4. To see full journeys, group by sessionId and sort by time");
console.log("\n🚀 You can now track user journeys in your analytics!");
