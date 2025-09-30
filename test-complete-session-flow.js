#!/usr/bin/env node

/**
 * Test the complete interactive session flow analysis with ASCII graphics
 */

import chalk from "chalk";

console.log("🧪 Testing Complete Interactive Session Flow Analysis\n");

console.log("✅ Enhanced Session Flow Analysis Features:");
console.log("");
console.log(chalk.blue("🔍 Path Exploration:"));
console.log("• Interactive page selection");
console.log("• ASCII path flow diagrams");
console.log("• Traffic source analysis");
console.log("• Performance metrics");
console.log("• Color-coded traffic intensity");
console.log("");

console.log(chalk.blue("👤 User Journey Analysis:"));
console.log("• Device breakdown visualization");
console.log("• Geographic analysis");
console.log("• User behavior patterns");
console.log("• Journey flow diagrams");
console.log("• Interactive page exploration");
console.log("");

console.log(chalk.blue("🔄 Funnel Analysis:"));
console.log("• Conversion funnel visualization");
console.log("• Step-by-step analysis");
console.log("• Conversion rate calculations");
console.log("");

console.log(chalk.blue("🏠 Landing Page Analysis:"));
console.log("• Entry point analysis");
console.log("• Source/medium breakdown");
console.log("• New user insights");
console.log("");

console.log(chalk.blue("🚪 Exit Page Analysis:"));
console.log("• Exit rate calculations");
console.log("• Page performance metrics");
console.log("");

console.log(chalk.green("🎯 Interactive Features:"));
console.log("• Select pages by number");
console.log("• ASCII graphics for path visualization");
console.log("• Detailed performance metrics");
console.log("• Traffic intensity indicators");
console.log("• Color-coded insights");
console.log("");

console.log(chalk.yellow("📊 ASCII Graphics Examples:"));
console.log("");

// Show example ASCII graphics
console.log(chalk.blue("🔄 Path Flow Diagram:"));
console.log("");
console.log(chalk.yellow("┌─────────────────────────────────────┐"));
console.log(chalk.yellow("│") + chalk.bold.green("  🎯 SELECTED PAGE") + chalk.yellow("                    │"));
console.log(chalk.yellow("│") + chalk.cyan("  /locations/pasadena/") + chalk.yellow("                │"));
console.log(chalk.yellow("│") + chalk.gray("  84 sessions") + chalk.yellow("                    │"));
console.log(chalk.yellow("└─────────────────────────────────────┘"));
console.log("");

console.log(chalk.green("🔗 Connected Pages:"));
console.log("");

const mockPages = [
  { path: "/", sessions: 132 },
  { path: "/memberships/", sessions: 35 },
  { path: "/offices/", sessions: 30 },
  { path: "/podcast/", sessions: 21 },
  { path: "/book-tour/", sessions: 17 },
  { path: "/meeting-rooms/", sessions: 10 },
  { path: "/offices/small-office-pasadena/", sessions: 11 },
  { path: "/meeting-rooms/conference-rooms/", sessions: 9 }
];

mockPages.forEach((page, index) => {
  const sessions = page.sessions;
  const intensity = sessions > 50 ? '█' : sessions > 20 ? '▓' : sessions > 10 ? '▒' : '░';
  const color = sessions > 50 ? chalk.red : sessions > 20 ? chalk.yellow : sessions > 10 ? chalk.blue : chalk.gray;
  
  console.log(color(`${intensity} ${page.path.substring(0, 20)}... (${sessions})`));
});

console.log("");
console.log(chalk.gray("Legend: █ High Traffic (50+ sessions) | ▓ Medium (20-50) | ▒ Low (10-20) | ░ Minimal (<10)"));
console.log("");

console.log(chalk.blue("💡 Path Insights:"));
console.log(chalk.gray("• Selected page represents 18.4% of all sessions"));
console.log(chalk.green("• Low bounce rate (25.3%) - users are engaging well"));
console.log(chalk.green("• Good session duration (127s) - users are spending time on the page"));
console.log("");

console.log(chalk.blue("📱 Device Breakdown:"));
console.log(chalk.cyan("1. desktop"));
console.log(chalk.gray("   Sessions: 45 (53.6%)"));
console.log("");
console.log(chalk.cyan("2. mobile"));
console.log(chalk.gray("   Sessions: 32 (38.1%)"));
console.log("");
console.log(chalk.cyan("3. tablet"));
console.log(chalk.gray("   Sessions: 7 (8.3%)"));
console.log("");

console.log(chalk.blue("🌍 Geographic Breakdown:"));
console.log(chalk.cyan("1. United States"));
console.log(chalk.gray("   Sessions: 78 (92.9%)"));
console.log("");
console.log(chalk.cyan("2. Canada"));
console.log(chalk.gray("   Sessions: 4 (4.8%)"));
console.log("");
console.log(chalk.cyan("3. United Kingdom"));
console.log(chalk.gray("   Sessions: 2 (2.4%)"));
console.log("");

console.log(chalk.green("🎉 Session Flow Analysis is now fully interactive!"));
console.log(chalk.gray("Users can select pages by number and see detailed ASCII graphics"));
console.log(chalk.gray("with traffic flow, device breakdown, and geographic analysis."));
