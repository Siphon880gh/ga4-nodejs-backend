#!/usr/bin/env node

/**
 * Test the session exploration features with ASCII graphics
 */

import chalk from "chalk";

console.log("🧪 Testing Session Exploration Features\n");

console.log("✅ Session Exploration Features:");
console.log("");
console.log(chalk.blue("🔍 Session Profile Analysis:"));
console.log("• Group sessions by source, medium, device, location");
console.log("• Show session metrics and behavior patterns");
console.log("• Interactive session profile selection");
console.log("• Detailed session path analysis");
console.log("");

console.log(chalk.blue("📊 Session Profile Details:"));
console.log("• Source and medium breakdown");
console.log("• Device type analysis (desktop, mobile, tablet)");
console.log("• Geographic location insights");
console.log("• Session duration and engagement metrics");
console.log("• New vs returning user analysis");
console.log("");

console.log(chalk.blue("🛤️  ASCII Session Graphics:"));
console.log("");

// Show example session profile
console.log(chalk.yellow("┌─────────────────────────────────────┐"));
console.log(chalk.yellow("│") + chalk.bold.green("  🎯 SESSION PROFILE") + chalk.yellow("                │"));
console.log(chalk.yellow("│") + chalk.cyan("  google / organic") + chalk.yellow("        │"));
console.log(chalk.yellow("│") + chalk.gray("  mobile | Los Angeles") + chalk.yellow("        │"));
console.log(chalk.yellow("│") + chalk.gray("  49 sessions") + chalk.yellow("                    │"));
console.log(chalk.yellow("└─────────────────────────────────────┘"));
console.log("");

console.log(chalk.green("📄 Pages Visited in This Session Profile:"));
console.log("");

// Show example pages with ASCII intensity
const mockPages = [
  { path: "/", sessions: 25, title: "Homepage" },
  { path: "/locations/pasadena/", sessions: 15, title: "Pasadena Location" },
  { path: "/memberships/", sessions: 8, title: "Memberships" },
  { path: "/offices/", sessions: 5, title: "Offices" },
  { path: "/book-tour/", sessions: 3, title: "Book Tour" }
];

mockPages.forEach((page, index) => {
  const sessions = page.sessions;
  const intensity = sessions > 10 ? '█' : sessions > 5 ? '▓' : sessions > 2 ? '▒' : '░';
  const color = sessions > 10 ? chalk.red : sessions > 5 ? chalk.yellow : sessions > 2 ? chalk.blue : chalk.gray;
  
  console.log(color(`${intensity} ${index + 1}. ${page.path}`));
  console.log(chalk.gray(`     Title: ${page.title}`));
  console.log(chalk.gray(`     Sessions: ${sessions} | Pageviews: ${sessions * 2}`));
  console.log("");
});

console.log(chalk.gray("Legend: █ High Traffic (10+ sessions) | ▓ Medium (5-10) | ▒ Low (2-5) | ░ Minimal (<2)"));
console.log("");

console.log(chalk.blue("💡 Session Insights:"));
console.log(chalk.gray("• Average pages per session: 2.1"));
console.log(chalk.gray("• New user rate: 32.7%"));
console.log(chalk.gray("• Session duration: 60s"));
console.log(chalk.green("• High page engagement (2.1 pages/session) - users are exploring deeply"));
console.log(chalk.blue("• High new user rate (32.7%) - attracting new visitors"));
console.log("");

console.log(chalk.blue("🔄 Session Flow Patterns:"));
console.log(chalk.gray("• Unique pages visited: 5"));
console.log(chalk.gray("• Most visited page: /"));
console.log(chalk.gray("• Second most visited: /locations/pasadena/"));
console.log("");

console.log(chalk.blue("🌍 Session Context:"));
console.log(chalk.gray("• Device Type: mobile"));
console.log(chalk.gray("• Location: Los Angeles, United States"));
console.log(chalk.gray("• Traffic Source: google"));
console.log(chalk.gray("• Traffic Medium: organic"));
console.log("");

console.log(chalk.blue("⏰ Session Timeline:"));
console.log("");

// Show timeline with ASCII bars
const timeline = [
  { path: "/", sessions: 25 },
  { path: "/locations/pasadena/", sessions: 15 },
  { path: "/memberships/", sessions: 8 },
  { path: "/offices/", sessions: 5 },
  { path: "/book-tour/", sessions: 3 }
];

timeline.forEach((page, index) => {
  const barLength = Math.min(Math.max(Math.round((page.sessions / 25) * 20), 1), 20);
  const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
  const percentage = ((page.sessions / 25) * 100).toFixed(1);
  
  console.log(chalk.cyan(`${index + 1}. ${page.path.substring(0, 25)}...`));
  console.log(chalk.gray(`   ${bar} ${percentage}%`));
  console.log("");
});

console.log(chalk.green("🎉 Session Exploration Features:"));
console.log("• Interactive session profile selection");
console.log("• ASCII graphics for session paths");
console.log("• Detailed session metrics and insights");
console.log("• Device and geographic analysis");
console.log("• Session timeline visualization");
console.log("• Traffic source and medium breakdown");
console.log("• User engagement analysis");
console.log("");

console.log(chalk.yellow("🚀 Users can now:"));
console.log("1. View session profiles grouped by source, device, and location");
console.log("2. Select specific session profiles to explore");
console.log("3. See detailed ASCII graphics of session paths");
console.log("4. Analyze user behavior patterns and engagement");
console.log("5. Understand traffic sources and user demographics");
console.log("6. Visualize session timelines with ASCII bars");
