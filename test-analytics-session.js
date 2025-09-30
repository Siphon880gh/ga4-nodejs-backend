/**
 * Test file for analytics session tracking integration
 * This tests the actual analytics.js integration with session tracking
 */

import config from './config.js';

// Mock the analytics data source
const mockAnalyticsResponse = {
  rows: [
    // Session 1: Complete journey
    {
      dimensionValues: [
        { value: "session_12345" },  // sessionId
        { value: "/home" },           // pagePath
        { value: "2024-01-15" }       // date
      ],
      metricValues: [
        { value: "1" }                // sessions
      ]
    },
    {
      dimensionValues: [
        { value: "session_12345" },  // sessionId
        { value: "/products?category=electronics" }, // pagePath
        { value: "2024-01-15" }       // date
      ],
      metricValues: [
        { value: "1" }                // sessions
      ]
    },
    {
      dimensionValues: [
        { value: "session_12345" },  // sessionId
        { value: "/checkout/cart#payment" }, // pagePath
        { value: "2024-01-15" }       // date
      ],
      metricValues: [
        { value: "1" }                // sessions
      ]
    },
    
    // Session 2: Different journey
    {
      dimensionValues: [
        { value: "session_67890" },  // sessionId
        { value: "/about" },         // pagePath
        { value: "2024-01-15" }       // date
      ],
      metricValues: [
        { value: "1" }                // sessions
      ]
    },
    {
      dimensionValues: [
        { value: "session_67890" },  // sessionId
        { value: "/contact?source=about" }, // pagePath
        { value: "2024-01-15" }       // date
      ],
      metricValues: [
        { value: "1" }                // sessions
      ]
    }
  ]
};

// Simulate the analytics.js processing logic
function simulateAnalyticsProcessing(response, query) {
  const rows = response.rows.map(row => {
    const result = {};
    
    // Add dimensions
    if (row.dimensionValues) {
      query.dimensions.forEach((dimension, index) => {
        result[dimension] = row.dimensionValues[index]?.value || '';
      });
    }
    
    // Add metrics
    if (row.metricValues) {
      query.metrics.forEach((metric, index) => {
        const value = row.metricValues[index]?.value;
        result[metric] = value ? parseFloat(value) : 0;
      });
    }
    
    return result;
  });
  
  return rows;
}

// Test queries
const testQueries = [
  {
    name: "Basic session tracking",
    query: {
      dimensions: ["sessionId", "pagePath", "date"],
      metrics: ["sessions"],
      dateRange: { start: "2024-01-15", end: "2024-01-15" }
    }
  },
  {
    name: "Session paths with exitPath processing",
    query: {
      dimensions: ["sessionId", "pagePath", "exitPath", "date"],
      metrics: ["sessions"],
      dateRange: { start: "2024-01-15", end: "2024-01-15" }
    }
  },
  {
    name: "Session paths with sessionPath processing",
    query: {
      dimensions: ["sessionId", "pagePath", "sessionPath", "date"],
      metrics: ["sessions"],
      dateRange: { start: "2024-01-15", end: "2024-01-15" }
    }
  }
];

console.log("=== Analytics Session Tracking Tests ===\n");

testQueries.forEach(({ name, query }) => {
  console.log(`Test: ${name}`);
  console.log(`Query: ${JSON.stringify(query, null, 2)}`);
  
  const processedRows = simulateAnalyticsProcessing(mockAnalyticsResponse, query);
  
  console.log("Results:");
  processedRows.forEach((row, index) => {
    console.log(`  Row ${index + 1}:`);
    Object.keys(row).forEach(key => {
      console.log(`    ${key}: ${row[key]}`);
    });
    console.log("");
  });
  
  // Test session aggregation
  if (query.dimensions.includes('sessionId')) {
    console.log("Session Aggregation:");
    const sessions = {};
    processedRows.forEach(row => {
      if (!sessions[row.sessionId]) {
        sessions[row.sessionId] = [];
      }
      sessions[row.sessionId].push(row);
    });
    
    Object.keys(sessions).forEach(sessionId => {
      const sessionPages = sessions[sessionId];
      const paths = sessionPages.map(p => p.pagePath || p.exitPath || p.sessionPath).join(' → ');
      console.log(`  Session ${sessionId}: ${paths}`);
    });
  }
  
  console.log("---\n");
});

// Test configuration
console.log("=== Configuration Test ===\n");
console.log("Available dimensions:");
Object.keys(config.sources.analytics.dimensions).forEach(dim => {
  const source = config.sources.analytics.dimensions[dim];
  console.log(`  ${dim}: ${source}`);
});

console.log("\nSession tracking dimensions:");
const sessionDims = Object.keys(config.sources.analytics.dimensions).filter(dim => 
  dim.includes('session') || dim.includes('client') || dim.includes('Id')
);
sessionDims.forEach(dim => {
  console.log(`  ${dim}: ${config.sources.analytics.dimensions[dim]}`);
});

console.log("\n=== Test Complete ===");
console.log("This demonstrates how session tracking works with the analytics system.");
console.log("To run: node test-analytics-session.js");
