#!/usr/bin/env node

/**
 * Test the ASCII graphics for session flow analysis
 */

import chalk from "chalk";

console.log("🧪 Testing ASCII Graphics for Session Flow Analysis\n");

// Simulate the ASCII graphics that would be shown
console.log(chalk.blue("🛤️  User Path Flow:"));
console.log("");

console.log(chalk.green("📈 Traffic Sources:"));
console.log(chalk.cyan("1. google / organic"));
console.log(chalk.gray("   Sessions: 89"));
console.log("");

console.log(chalk.cyan("2. (direct) / (none)"));
console.log(chalk.gray("   Sessions: 63"));
console.log("");

console.log(chalk.cyan("3. m.yelp.com / referral"));
console.log(chalk.gray("   Sessions: 7"));
console.log("");

console.log(chalk.blue("🔄 Path Flow Diagram:"));
console.log("");

// Show the selected page as the center
console.log(chalk.yellow("┌─────────────────────────────────────┐"));
console.log(chalk.yellow("│") + chalk.bold.green("  🎯 SELECTED PAGE") + chalk.yellow("                    │"));
console.log(chalk.yellow("│") + chalk.cyan("  /locations/pasadena/") + chalk.yellow("                │"));
console.log(chalk.yellow("│") + chalk.gray("  84 sessions") + chalk.yellow("                    │"));
console.log(chalk.yellow("└─────────────────────────────────────┘"));
console.log("");

console.log(chalk.green("🔗 Connected Pages:"));
console.log("");

// Create a grid-like ASCII representation
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
console.log("");

console.log(chalk.gray("• Selected page represents 18.4% of all sessions"));
console.log(chalk.green("• Low bounce rate (25.3%) - users are engaging well"));
console.log(chalk.green("• Good session duration (127s) - users are spending time on the page"));
console.log("");

console.log("✅ ASCII Graphics Features:");
console.log("• Visual path flow diagrams");
console.log("• Traffic intensity indicators");
console.log("• Interactive page selection");
console.log("• Detailed performance metrics");
console.log("• Color-coded traffic levels");
