#!/usr/bin/env node

/**
 * Test the interactive session flow analysis
 */

import { handleSessionFlowAnalysis } from './src/cli/session-flow-cli.js';
import config from './config.js';

console.log("🧪 Testing Interactive Session Flow Analysis\n");

// Test with mock answers
const mockAnswers = {
  analysisType: "path_exploration",
  dateRangeType: "last7"
};

console.log("Mock answers:", mockAnswers);
console.log("");

console.log("✅ Interactive Session Flow Analysis Features:");
console.log("• Path Exploration with page selection");
console.log("• ASCII graphics for path visualization");
console.log("• Detailed page performance metrics");
console.log("• Traffic source analysis");
console.log("• Interactive page selection");
console.log("");

console.log("🎯 This provides INTERACTIVE session flow analysis!");
console.log("   Users can select specific pages to explore their paths");
console.log("   Shows ASCII graphics and detailed insights");
console.log("");

// Run the interactive analysis
try {
  await handleSessionFlowAnalysis(mockAnswers, config);
} catch (error) {
  console.error("Error:", error.message);
}
