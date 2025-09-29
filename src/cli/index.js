#!/usr/bin/env node
// Suppress punycode deprecation warnings
const originalEmit = process.emit;
process.emit = function (name, data, ...args) {
  if (name === 'warning' && data && data.name === 'DeprecationWarning' && data.message.includes('punycode')) {
    return false;
  }
  return originalEmit.apply(process, arguments);
};

import "dotenv/config";
import inquirer from "inquirer";
import ora from "ora";
import chalk from "chalk";
import { loadConfig } from "../utils/config.js";
import { buildPrompts, buildPresetPrompts, buildAdhocPrompts, buildSiteSelectionPrompts, buildSortingPrompts, displaySortingFeedback } from "./prompts.js";
import { runQuery } from "../core/query-runner.js";
import { renderOutput } from "./renderers.js";
import { getOAuth2Client, getAvailableProperties } from "../datasources/analytics.js";
import { saveSelectedSite, getSelectedSite, hasValidSiteSelection, clearSelectedSite, getVerifiedSites, signOut } from "../utils/site-manager.js";
import { ensureAuthentication } from "../utils/auth-helper.js";
import { getDatabase } from "../utils/database.js";

// Helper function to wait for user to continue
async function waitForEnter() {
  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message: 'Press Enter to continue...',
    validate: () => true
  }]);
}

async function handleAuthentication(cfg) {
  const spinner = ora("Authenticating with Google...").start();
  try {
    // Set a dummy property ID for authentication
    const originalPropertyId = process.env.GA_PROPERTY_ID;
    process.env.GA_PROPERTY_ID = "123456789";
    
    const auth = await getOAuth2Client(cfg.sources.analytics);
    
    // Restore original property ID
    if (originalPropertyId) {
      process.env.GA_PROPERTY_ID = originalPropertyId;
    } else {
      delete process.env.GA_PROPERTY_ID;
    }
    
    spinner.succeed("Authentication successful!");
    console.log(chalk.green("You are now authenticated with Google Analytics."));
    console.log(chalk.blue("You can now run queries without re-authenticating."));
  } catch (error) {
    spinner.fail("Authentication failed");
    console.error(chalk.red(error.message));
    process.exitCode = 1;
  }
}

async function handleListSites(cfg) {
  const spinner = ora("Fetching available properties...").start();
  try {
    // Ensure authentication first
    await ensureAuthentication(cfg);
    
    // Stop spinner to allow debugging output
    spinner.stop();
    console.log(chalk.blue("Starting properties fetch..."));
    
    const properties = await getAvailableProperties(cfg);
    
    // Restart spinner for success message
    spinner.succeed(`Found ${properties.length} properties`);
    
    if (properties.length === 0) {
      console.log(chalk.yellow("No Google Analytics properties found."));
      console.log(chalk.blue("Make sure you have access to Google Analytics properties."));
    } else {
      console.log(chalk.blue("\nAvailable Google Analytics properties:"));
      console.log("==========================================");
      
      properties.forEach((property, index) => {
        console.log(`${index + 1}. ${chalk.cyan(property.displayName)}`);
        console.log(`   Property ID: ${chalk.gray(property.propertyId)}`);
        console.log(`   Account: ${chalk.gray(property.accountName)}`);
        console.log("");
      });
      
      const currentSite = getSelectedSite();
      if (currentSite) {
        console.log(chalk.green(`Currently selected: ${currentSite}`));
      } else {
        console.log(chalk.blue("No property selected. Use 'Select/Change property' to choose a property."));
      }
    }
  } catch (error) {
    spinner.fail("Failed to fetch properties");
    console.error(chalk.red(error.message));
    process.exitCode = 1;
  }
}

async function handleSiteSelection(cfg) {
  const spinner = ora("Fetching available properties...").start();
  try {
    // Ensure authentication first
    await ensureAuthentication(cfg);
    // Fetch properties first
    const verifiedProperties = await getAvailableProperties(cfg);
    spinner.succeed(`Found ${verifiedProperties.length} verified properties`);
    
    // Build prompts with the fetched properties
    const answers = await inquirer.prompt(buildSiteSelectionPrompts(verifiedProperties));
    
    const success = saveSelectedSite(answers.selectedSite);
    if (success) {
      console.log(chalk.green(`Selected property: ${answers.selectedSite}`));
      console.log(chalk.blue("This property will be used for all queries until you change it."));
    } else {
      console.log(chalk.red("Failed to save property selection"));
    }
  } catch (error) {
    spinner.fail("Property selection failed");
    console.error(chalk.red(error.message));
    process.exitCode = 1;
  }
}

async function handleSignOut() {
  console.log(chalk.blue("Signing out..."));
  
  const cleared = await signOut();
  
  if (cleared.length > 0) {
    console.log(chalk.green(`Successfully cleared: ${cleared.join(', ')}`));
    console.log(chalk.blue("You will need to authenticate again to use the CLI."));
  } else {
    console.log(chalk.yellow("No stored data found to clear."));
  }
}

async function main() {
  try {
    // Initialize database on startup
    console.log("🔧 Initializing database...");
    getDatabase();
    console.log("✅ Database initialized successfully");
    
    // Load and validate configuration first
    const cfg = loadConfig();
    
    // Main CLI loop
    while (true) {
      try {
        // Build initial prompts
        const initialAnswers = await inquirer.prompt(await buildPrompts(cfg));
        
        // Handle different actions
        if (initialAnswers.action === "auth") {
          await handleAuthentication(cfg);
          await waitForEnter();
          continue;
        } else if (initialAnswers.action === "sites") {
          await handleListSites(cfg);
          await waitForEnter();
          continue;
        } else if (initialAnswers.action === "select_site") {
          await handleSiteSelection(cfg);
          await waitForEnter();
          continue;
        } else if (initialAnswers.action === "signout") {
          await handleSignOut();
          await waitForEnter();
          continue;
        } else if (initialAnswers.action === "exit") {
          console.log(chalk.blue("Goodbye! 👋"));
          break;
        }
        
        // Skip query processing for non-query actions
        if (!["adhoc", "preset"].includes(initialAnswers.action)) {
          continue;
        }
        
        // Hardcode source to analytics since we only support Analytics
        const source = "analytics";
        
        // Check if we need to select a property for Analytics queries
        if (!hasValidSiteSelection()) {
          console.log(chalk.yellow("No Google Analytics property selected."));
          console.log(chalk.blue("Please select a property first."));
          await handleSiteSelection(cfg);
          await waitForEnter();
          continue;
        }
        
        // Set the selected property as environment variable for the query
        const selectedProperty = getSelectedSite();
        process.env.GA_PROPERTY_ID = selectedProperty;
        console.log(chalk.blue(`Using property: ${selectedProperty}`));
        
        // Ensure authentication is available before running queries
        let auth;
        try {
          auth = await ensureAuthentication(cfg);
        } catch (error) {
          console.log(chalk.yellow("Authentication required. Please authenticate first."));
          await handleAuthentication(cfg);
          await waitForEnter();
          continue;
        }
        
        // Build additional prompts based on action
        let additionalAnswers = {};
        if (initialAnswers.action === "preset") {
          additionalAnswers = await inquirer.prompt(await buildPresetPrompts(cfg, source));
        } else if (initialAnswers.action === "adhoc") {
          additionalAnswers = await inquirer.prompt(await buildAdhocPrompts(cfg, source));
        }
        
        // Merge all answers and add source
        const answers = { ...initialAnswers, ...additionalAnswers, source };
        
        const spinner = ora("Running query...").start();
        try {
          const rows = await runQuery(answers, cfg, auth);
          spinner.succeed(`Fetched ${rows.length} rows`);
          
          let finalAnswers = { ...answers };
          
          // Only ask for sorting preferences for ad-hoc queries
          if (initialAnswers.action === "adhoc") {
            const sortingAnswers = await inquirer.prompt(await buildSortingPrompts(rows));
            finalAnswers = { ...answers, ...sortingAnswers };
            
            // Show sorting feedback to user
            displaySortingFeedback(sortingAnswers.sorting);
          }
          // For preset queries, don't override sorting - let them use their natural order
          
          const shouldContinue = await renderOutput(rows, finalAnswers, cfg);
          if (shouldContinue) {
            await waitForEnter();
          }
        } catch (e) {
          spinner.fail("Query failed");
          console.error(chalk.red(e.message));
          await waitForEnter();
        }
      } catch (e) {
        console.error(chalk.red(`Error: ${e.message}`));
        await waitForEnter();
      }
    }
  } catch (e) {
    console.error(chalk.red(`Configuration error: ${e.message}`));
    process.exitCode = 1;
  }
}

main();
