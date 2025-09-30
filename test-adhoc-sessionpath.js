#!/usr/bin/env node

/**
 * Test to simulate the exact ad-hoc query scenario
 * This tests what happens when you select sessionPath in ad-hoc
 */

// Note: sessionPath processor has been removed as it was redundant with pagePath

console.log("🧪 Testing Ad-hoc SessionPath Query\n");

// Simulate the exact data you're getting
const mockAnalyticsData = [
  {
    pagePath: '/',
    sessions: 30,
    bounceRate: 0.067
  },
  {
    pagePath: '/locations/pasadena/',
    sessions: 19,
    bounceRate: 0
  }
];

// Test 1: Without sessionPath processing
console.log("Test 1: Raw data (what you're currently getting)");
mockAnalyticsData.forEach((row, index) => {
  console.log(`Row ${index + 1}:`);
  console.log(`  pagePath: ${row.pagePath}`);
  console.log(`  sessions: ${row.sessions}`);
  console.log(`  bounceRate: ${row.bounceRate}`);
  console.log("");
});

// Test 2: With pagePath cleaning (inline processing)
console.log("Test 2: With pagePath cleaning");
mockAnalyticsData.forEach((row, index) => {
  // Clean pagePath by removing query parameters and hash fragments
  const cleanPath = row.pagePath.split('?')[0].split('#')[0];
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
  
  console.log(`Row ${index + 1}:`);
  console.log(`  pagePath: ${row.pagePath}`);
  console.log(`  sessions: ${row.sessions}`);
  console.log(`  bounceRate: ${row.bounceRate}`);
  console.log(`  cleaned: ${normalizedPath}`);
  console.log("");
});

// Test 3: Show the difference
console.log("Test 3: Comparison");
console.log("Raw pagePath vs Cleaned pagePath:");
mockAnalyticsData.forEach((row, index) => {
  const cleanPath = row.pagePath.split('?')[0].split('#')[0];
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
  
  console.log(`Row ${index + 1}:`);
  console.log(`  Raw pagePath:    ${row.pagePath}`);
  console.log(`  Cleaned pagePath: ${normalizedPath}`);
  console.log(`  Difference: ${row.pagePath === normalizedPath ? 'None (same)' : 'Cleaned'}`);
  console.log("");
});

console.log("✅ Test Complete!");
console.log("\n💡 Note: sessionPath and exitPath have been removed as they were redundant with pagePath.");
console.log("   Use pagePath for all page analysis and clean URLs in post-processing if needed.");
console.log("\n🔧 Example of URL cleaning:");
console.log("   Raw: /locations/pasadena/?utm_source=google");
console.log("   Clean: /locations/pasadena/");

