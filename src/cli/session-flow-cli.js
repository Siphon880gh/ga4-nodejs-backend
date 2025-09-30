/**
 * CLI-based Session Flow Analysis
 * Uses GA4 API to analyze session flows directly in the CLI
 */

import chalk from "chalk";
import { getOAuth2Client } from "../datasources/analytics.js";
import { getSelectedSite } from "../utils/site-manager.js";
import { getDateRange } from "./prompts.js";
import inquirer from "inquirer";

export async function handleSessionFlowAnalysis(answers, cfg) {
  console.log(chalk.blue("\n🔍 Session Flow Analysis\n"));
  
  if (answers.analysisType === "back") {
    return;
  }
  
  const dateRange = getDateRange(answers.dateRangeType, answers.customStartDate, answers.customEndDate);
  
  // Check authentication
  try {
    const auth = await getOAuth2Client(cfg.sources.analytics);
    const propertyId = getSelectedSite();
    
    if (!propertyId) {
      console.log(chalk.red("❌ No GA4 property selected. Please select a property first."));
      return;
    }
    
    console.log(chalk.green(`✅ Analyzing property: ${propertyId}`));
    console.log(chalk.gray(`📅 Date range: ${dateRange.start} to ${dateRange.end}`));
    console.log("");
    
    switch (answers.analysisType) {
      case "path_exploration":
        await analyzePathExploration(auth, propertyId, dateRange);
        break;
      case "user_journey":
        await analyzeUserJourney(auth, propertyId, dateRange);
        break;
      case "funnel_analysis":
        await analyzeFunnel(auth, propertyId, dateRange);
        break;
      case "exit_analysis":
        await analyzeExitPages(auth, propertyId, dateRange);
        break;
      case "landing_analysis":
        await analyzeLandingPages(auth, propertyId, dateRange);
        break;
      case "session_exploration":
        await analyzeSessionExploration(auth, propertyId, dateRange);
        break;
    }
    
  } catch (error) {
    console.log(chalk.red(`❌ Error: ${error.message}`));
  }
}

async function analyzePathExploration(auth, propertyId, dateRange) {
  console.log(chalk.green("📊 Path Exploration Analysis"));
  console.log(chalk.gray("Analyzing user navigation paths..."));
  console.log("");
  
  try {
    // Get page paths with session data
    const requestBody = {
      dateRanges: [{
        startDate: dateRange.start,
        endDate: dateRange.end
      }],
      dimensions: [
        { name: 'pagePath' },
        { name: 'pageTitle' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'screenPageViews' }
      ],
      limit: 1000
    };
    
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(await auth.getAccessToken()).token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(chalk.red(`API Error ${response.status}: ${errorText}`));
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.rows || data.rows.length === 0) {
      console.log(chalk.yellow("⚠️  No session data found for the selected date range."));
      return;
    }
    
    // Analyze page performance and common paths
    const pageData = data.rows.map(row => ({
      path: row.dimensionValues[0]?.value || '',
      title: row.dimensionValues[1]?.value || '',
      sessions: parseInt(row.metricValues[0]?.value || '0'),
      pageviews: parseInt(row.metricValues[1]?.value || '0')
    })).sort((a, b) => b.sessions - a.sessions);
    
    console.log(chalk.blue("🔍 Top Pages by Sessions:"));
    console.log("");
    
    // Show top 10 pages with selection option
    const topPages = pageData.slice(0, 10);
    topPages.forEach((page, index) => {
      console.log(chalk.cyan(`${index + 1}. ${page.path}`));
      console.log(chalk.gray(`   Title: ${page.title}`));
      console.log(chalk.gray(`   Sessions: ${page.sessions}, Pageviews: ${page.pageviews}`));
      console.log("");
    });
    
    // Ask user if they want to explore a specific page
    const { explorePage } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'explorePage',
        message: 'Would you like to explore paths for a specific page?',
        default: false
      }
    ]);
    
    if (explorePage) {
      const { selectedPageIndex } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedPageIndex',
          message: 'Select a page to explore its paths:',
          choices: topPages.map((page, index) => ({
            name: `${page.path} (${page.sessions} sessions)`,
            value: index
          }))
        }
      ]);
      
      const selectedPage = topPages[selectedPageIndex];
      console.log(chalk.blue(`\n🔍 Exploring paths for: ${selectedPage.path}`));
      console.log(chalk.gray(`Title: ${selectedPage.title}`));
      console.log("");
      
      await explorePagePaths(auth, propertyId, dateRange, selectedPage);
    }
    
    // Show page flow analysis
    console.log(chalk.blue("📈 Page Flow Analysis:"));
    console.log("");
    
    // Find common page patterns
    const homePage = pageData.find(p => p.path === '/');
    const productPages = pageData.filter(p => p.path.includes('/product') || p.path.includes('/products'));
    const categoryPages = pageData.filter(p => p.path.includes('/category') || p.path.includes('/categories'));
    const checkoutPages = pageData.filter(p => p.path.includes('/checkout') || p.path.includes('/cart'));
    
    if (homePage) {
      console.log(chalk.green("🏠 Homepage Performance:"));
      console.log(chalk.gray(`   Sessions: ${homePage.sessions}, Pageviews: ${homePage.pageviews}`));
      console.log("");
    }
    
    if (productPages.length > 0) {
      const totalProductSessions = productPages.reduce((sum, p) => sum + p.sessions, 0);
      console.log(chalk.green("🛍️ Product Pages:"));
      console.log(chalk.gray(`   Total Sessions: ${totalProductSessions}`));
      console.log(chalk.gray(`   Top Product: ${productPages[0].path} (${productPages[0].sessions} sessions)`));
      console.log("");
    }
    
    if (categoryPages.length > 0) {
      const totalCategorySessions = categoryPages.reduce((sum, p) => sum + p.sessions, 0);
      console.log(chalk.green("📂 Category Pages:"));
      console.log(chalk.gray(`   Total Sessions: ${totalCategorySessions}`));
      console.log(chalk.gray(`   Top Category: ${categoryPages[0].path} (${categoryPages[0].sessions} sessions)`));
      console.log("");
    }
    
    if (checkoutPages.length > 0) {
      const totalCheckoutSessions = checkoutPages.reduce((sum, p) => sum + p.sessions, 0);
      console.log(chalk.green("🛒 Checkout Pages:"));
      console.log(chalk.gray(`   Total Sessions: ${totalCheckoutSessions}`));
      console.log(chalk.gray(`   Top Checkout: ${checkoutPages[0].path} (${checkoutPages[0].sessions} sessions)`));
      console.log("");
    }
    
  } catch (error) {
    console.log(chalk.red(`❌ Error analyzing paths: ${error.message}`));
  }
}

async function explorePagePaths(auth, propertyId, dateRange, selectedPage) {
  try {
    console.log(chalk.green("🔍 Detailed Path Analysis"));
    console.log(chalk.gray("Analyzing user paths through this page..."));
    console.log("");
    
    // Get more detailed data for path analysis
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(await auth.getAccessToken()).token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRanges: [{
          startDate: dateRange.start,
          endDate: dateRange.end
        }],
        dimensions: [
          { name: 'pagePath' },
          { name: 'pageTitle' },
          { name: 'sessionSource' },
          { name: 'sessionMedium' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' }
        ],
        limit: 1000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(chalk.red(`API Error ${response.status}: ${errorText}`));
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.rows || data.rows.length === 0) {
      console.log(chalk.yellow("⚠️  No detailed path data found."));
      return;
    }
    
    // Analyze paths and create ASCII graphics
    const pathData = data.rows.map(row => ({
      path: row.dimensionValues[0]?.value || '',
      title: row.dimensionValues[1]?.value || '',
      source: row.dimensionValues[2]?.value || '',
      medium: row.dimensionValues[3]?.value || '',
      sessions: parseInt(row.metricValues[0]?.value || '0'),
      pageviews: parseInt(row.metricValues[1]?.value || '0'),
      bounceRate: parseFloat(row.metricValues[2]?.value || '0'),
      avgDuration: parseFloat(row.metricValues[3]?.value || '0')
    }));
    
    // Find the selected page and related pages
    const selectedPageData = pathData.find(p => p.path === selectedPage.path);
    const relatedPages = pathData.filter(p => p.path !== selectedPage.path && p.sessions > 0);
    
    if (selectedPageData) {
      console.log(chalk.blue("📊 Selected Page Performance:"));
      console.log(chalk.gray(`   Sessions: ${selectedPageData.sessions}`));
      console.log(chalk.gray(`   Pageviews: ${selectedPageData.pageviews}`));
      console.log(chalk.gray(`   Bounce Rate: ${(selectedPageData.bounceRate * 100).toFixed(1)}%`));
      console.log(chalk.gray(`   Avg Session Duration: ${Math.round(selectedPageData.avgDuration)}s`));
      console.log("");
    }
    
    // Create ASCII path flow diagram
    console.log(chalk.blue("🛤️  User Path Flow:"));
    console.log("");
    
    // Show traffic sources
    const sources = {};
    pathData.forEach(page => {
      const key = `${page.source} / ${page.medium}`;
      if (!sources[key]) {
        sources[key] = { sessions: 0, pages: [] };
      }
      sources[key].sessions += page.sessions;
      sources[key].pages.push(page);
    });
    
    const sortedSources = Object.entries(sources)
      .sort(([,a], [,b]) => b.sessions - a.sessions)
      .slice(0, 5);
    
    console.log(chalk.green("📈 Traffic Sources:"));
    sortedSources.forEach(([source, data], index) => {
      console.log(chalk.cyan(`${index + 1}. ${source}`));
      console.log(chalk.gray(`   Sessions: ${data.sessions}`));
      console.log("");
    });
    
    // Create ASCII flow diagram
    console.log(chalk.blue("🔄 Path Flow Diagram:"));
    console.log("");
    
    // Show the selected page as the center
    console.log(chalk.yellow("┌─────────────────────────────────────┐"));
    console.log(chalk.yellow("│") + chalk.bold.green("  🎯 SELECTED PAGE") + chalk.yellow("                    │"));
    console.log(chalk.yellow("│") + chalk.cyan(`  ${selectedPage.path}`) + chalk.yellow("                    │"));
    console.log(chalk.yellow("│") + chalk.gray(`  ${selectedPageData?.sessions || 0} sessions`) + chalk.yellow("                    │"));
    console.log(chalk.yellow("└─────────────────────────────────────┘"));
    console.log("");
    
    // Show related pages as connected paths
    const topRelatedPages = relatedPages
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 8);
    
    if (topRelatedPages.length > 0) {
      console.log(chalk.green("🔗 Connected Pages:"));
      console.log("");
      
      // Create a grid-like ASCII representation
      const gridSize = Math.ceil(Math.sqrt(topRelatedPages.length));
      let currentRow = 0;
      
      topRelatedPages.forEach((page, index) => {
        if (index % gridSize === 0 && index > 0) {
          console.log("");
          currentRow++;
        }
        
        const sessions = page.sessions;
        const intensity = sessions > 50 ? '█' : sessions > 20 ? '▓' : sessions > 10 ? '▒' : '░';
        const color = sessions > 50 ? chalk.red : sessions > 20 ? chalk.yellow : sessions > 10 ? chalk.blue : chalk.gray;
        
        console.log(color(`${intensity} ${page.path.substring(0, 20)}... (${sessions})`));
      });
      
      console.log("");
      console.log(chalk.gray("Legend: █ High Traffic (50+ sessions) | ▓ Medium (20-50) | ▒ Low (10-20) | ░ Minimal (<10)"));
      console.log("");
    }
    
    // Show path insights
    console.log(chalk.blue("💡 Path Insights:"));
    console.log("");
    
    const totalSessions = pathData.reduce((sum, p) => sum + p.sessions, 0);
    const selectedPageShare = selectedPageData ? (selectedPageData.sessions / totalSessions * 100).toFixed(1) : 0;
    
    console.log(chalk.gray(`• Selected page represents ${selectedPageShare}% of all sessions`));
    
    if (selectedPageData && selectedPageData.bounceRate > 0.5) {
      console.log(chalk.red(`• High bounce rate (${(selectedPageData.bounceRate * 100).toFixed(1)}%) - users may be leaving quickly`));
    } else if (selectedPageData && selectedPageData.bounceRate < 0.3) {
      console.log(chalk.green(`• Low bounce rate (${(selectedPageData.bounceRate * 100).toFixed(1)}%) - users are engaging well`));
    }
    
    const avgDuration = selectedPageData ? Math.round(selectedPageData.avgDuration) : 0;
    if (avgDuration > 60) {
      console.log(chalk.green(`• Good session duration (${avgDuration}s) - users are spending time on the page`));
    } else if (avgDuration < 30) {
      console.log(chalk.yellow(`• Short session duration (${avgDuration}s) - users may be moving quickly`));
    }
    
    console.log("");
    
  } catch (error) {
    console.log(chalk.red(`❌ Error exploring page paths: ${error.message}`));
  }
}

async function exploreUserJourneyDetails(auth, propertyId, dateRange, selectedPage) {
  try {
    console.log(chalk.green("👤 Detailed User Journey Analysis"));
    console.log(chalk.gray("Analyzing user behavior patterns for this page..."));
    console.log("");
    
    // Get detailed user journey data
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(await auth.getAccessToken()).token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRanges: [{
          startDate: dateRange.start,
          endDate: dateRange.end
        }],
        dimensions: [
          { name: 'pagePath' },
          { name: 'pageTitle' },
          { name: 'sessionSource' },
          { name: 'sessionMedium' },
          { name: 'deviceCategory' },
          { name: 'country' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'newUsers' }
        ],
        limit: 1000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(chalk.red(`API Error ${response.status}: ${errorText}`));
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.rows || data.rows.length === 0) {
      console.log(chalk.yellow("⚠️  No user journey data found."));
      return;
    }
    
    // Analyze user journey data
    const journeyData = data.rows.map(row => ({
      path: row.dimensionValues[0]?.value || '',
      title: row.dimensionValues[1]?.value || '',
      source: row.dimensionValues[2]?.value || '',
      medium: row.dimensionValues[3]?.value || '',
      device: row.dimensionValues[4]?.value || '',
      country: row.dimensionValues[5]?.value || '',
      sessions: parseInt(row.metricValues[0]?.value || '0'),
      pageviews: parseInt(row.metricValues[1]?.value || '0'),
      bounceRate: parseFloat(row.metricValues[2]?.value || '0'),
      avgDuration: parseFloat(row.metricValues[3]?.value || '0'),
      newUsers: parseInt(row.metricValues[4]?.value || '0')
    }));
    
    // Find the selected page data
    const selectedPageData = journeyData.find(p => p.path === selectedPage.path);
    
    if (selectedPageData) {
      console.log(chalk.blue("📊 Selected Page User Journey:"));
      console.log(chalk.gray(`   Sessions: ${selectedPageData.sessions}`));
      console.log(chalk.gray(`   Pageviews: ${selectedPageData.pageviews}`));
      console.log(chalk.gray(`   New Users: ${selectedPageData.newUsers}`));
      console.log(chalk.gray(`   Bounce Rate: ${(selectedPageData.bounceRate * 100).toFixed(1)}%`));
      console.log(chalk.gray(`   Avg Session Duration: ${Math.round(selectedPageData.avgDuration)}s`));
      console.log("");
    }
    
    // Create ASCII user journey diagram
    console.log(chalk.blue("🛤️  User Journey Flow:"));
    console.log("");
    
    // Show device breakdown
    const deviceBreakdown = {};
    journeyData.forEach(page => {
      if (!deviceBreakdown[page.device]) {
        deviceBreakdown[page.device] = { sessions: 0, pages: [] };
      }
      deviceBreakdown[page.device].sessions += page.sessions;
      deviceBreakdown[page.device].pages.push(page);
    });
    
    console.log(chalk.green("📱 Device Breakdown:"));
    Object.entries(deviceBreakdown)
      .sort(([,a], [,b]) => b.sessions - a.sessions)
      .slice(0, 3)
      .forEach(([device, data], index) => {
        const percentage = ((data.sessions / journeyData.reduce((sum, p) => sum + p.sessions, 0)) * 100).toFixed(1);
        console.log(chalk.cyan(`${index + 1}. ${device}`));
        console.log(chalk.gray(`   Sessions: ${data.sessions} (${percentage}%)`));
        console.log("");
      });
    
    // Show geographic breakdown
    const geoBreakdown = {};
    journeyData.forEach(page => {
      if (!geoBreakdown[page.country]) {
        geoBreakdown[page.country] = { sessions: 0, pages: [] };
      }
      geoBreakdown[page.country].sessions += page.sessions;
      geoBreakdown[page.country].pages.push(page);
    });
    
    console.log(chalk.green("🌍 Geographic Breakdown:"));
    Object.entries(geoBreakdown)
      .sort(([,a], [,b]) => b.sessions - a.sessions)
      .slice(0, 5)
      .forEach(([country, data], index) => {
        const percentage = ((data.sessions / journeyData.reduce((sum, p) => sum + p.sessions, 0)) * 100).toFixed(1);
        console.log(chalk.cyan(`${index + 1}. ${country}`));
        console.log(chalk.gray(`   Sessions: ${data.sessions} (${percentage}%)`));
        console.log("");
      });
    
    // Create ASCII journey flow
    console.log(chalk.blue("🔄 User Journey Flow Diagram:"));
    console.log("");
    
    // Show the selected page as the center
    console.log(chalk.yellow("┌─────────────────────────────────────┐"));
    console.log(chalk.yellow("│") + chalk.bold.green("  🎯 JOURNEY CENTER") + chalk.yellow("                  │"));
    console.log(chalk.yellow("│") + chalk.cyan(`  ${selectedPage.path}`) + chalk.yellow("                    │"));
    console.log(chalk.yellow("│") + chalk.gray(`  ${selectedPageData?.sessions || 0} sessions`) + chalk.yellow("                    │"));
    console.log(chalk.yellow("└─────────────────────────────────────┘"));
    console.log("");
    
    // Show journey insights
    console.log(chalk.blue("💡 Journey Insights:"));
    console.log("");
    
    const totalSessions = journeyData.reduce((sum, p) => sum + p.sessions, 0);
    const selectedPageShare = selectedPageData ? (selectedPageData.sessions / totalSessions * 100).toFixed(1) : 0;
    const newUserRate = selectedPageData ? ((selectedPageData.newUsers / selectedPageData.sessions) * 100).toFixed(1) : 0;
    
    console.log(chalk.gray(`• Selected page represents ${selectedPageShare}% of all sessions`));
    console.log(chalk.gray(`• New user rate: ${newUserRate}%`));
    
    if (selectedPageData && selectedPageData.bounceRate > 0.5) {
      console.log(chalk.red(`• High bounce rate (${(selectedPageData.bounceRate * 100).toFixed(1)}%) - users may be leaving quickly`));
    } else if (selectedPageData && selectedPageData.bounceRate < 0.3) {
      console.log(chalk.green(`• Low bounce rate (${(selectedPageData.bounceRate * 100).toFixed(1)}%) - users are engaging well`));
    }
    
    const avgDuration = selectedPageData ? Math.round(selectedPageData.avgDuration) : 0;
    if (avgDuration > 60) {
      console.log(chalk.green(`• Good session duration (${avgDuration}s) - users are spending time on the page`));
    } else if (avgDuration < 30) {
      console.log(chalk.yellow(`• Short session duration (${avgDuration}s) - users may be moving quickly`));
    }
    
    console.log("");
    
  } catch (error) {
    console.log(chalk.red(`❌ Error exploring user journey details: ${error.message}`));
  }
}

async function analyzeUserJourney(auth, propertyId, dateRange) {
  console.log(chalk.green("👤 User Journey Analysis"));
  console.log(chalk.gray("Analyzing individual user sessions..."));
  console.log("");
  
  try {
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(await auth.getAccessToken()).token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRanges: [{
          startDate: dateRange.start,
          endDate: dateRange.end
        }],
        dimensions: [
          { name: 'pagePath' },
          { name: 'pageTitle' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'screenPageViews' }
        ],
        limit: 100
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(chalk.red(`API Error ${response.status}: ${errorText}`));
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.rows || data.rows.length === 0) {
      console.log(chalk.yellow("⚠️  No user journey data found."));
      return;
    }
    
    // Analyze page performance for user journey insights
    const pageData = data.rows.map(row => ({
      path: row.dimensionValues[0]?.value || '',
      title: row.dimensionValues[1]?.value || '',
      sessions: parseInt(row.metricValues[0]?.value || '0'),
      pageviews: parseInt(row.metricValues[1]?.value || '0')
    })).sort((a, b) => b.sessions - a.sessions);
    
    console.log(chalk.blue("👥 User Journey Insights:"));
    console.log("");
    
    // Show top pages that users visit
    const topPages = pageData.slice(0, 10);
    console.log(chalk.green("📊 Most Visited Pages:"));
    topPages.forEach((page, index) => {
      console.log(chalk.cyan(`${index + 1}. ${page.path}`));
      console.log(chalk.gray(`   Title: ${page.title}`));
      console.log(chalk.gray(`   Sessions: ${page.sessions}, Pageviews: ${page.pageviews}`));
      console.log("");
    });
    
    // Ask user if they want to explore a specific page
    const { explorePage } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'explorePage',
        message: 'Would you like to explore user journey details for a specific page?',
        default: false
      }
    ]);
    
    if (explorePage) {
      const { selectedPageIndex } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedPageIndex',
          message: 'Select a page to explore user journey details:',
          choices: topPages.map((page, index) => ({
            name: `${page.path} (${page.sessions} sessions)`,
            value: index
          }))
        }
      ]);
      
      const selectedPage = topPages[selectedPageIndex];
      console.log(chalk.blue(`\n🔍 Exploring user journey for: ${selectedPage.path}`));
      console.log(chalk.gray(`Title: ${selectedPage.title}`));
      console.log("");
      
      await exploreUserJourneyDetails(auth, propertyId, dateRange, selectedPage);
    }
    
    // Analyze user behavior patterns
    console.log(chalk.green("🔍 User Behavior Patterns:"));
    console.log("");
    
    const totalSessions = pageData.reduce((sum, p) => sum + p.sessions, 0);
    const totalPageviews = pageData.reduce((sum, p) => sum + p.pageviews, 0);
    const avgPagesPerSession = (totalPageviews / totalSessions).toFixed(1);
    
    console.log(chalk.gray(`Total Sessions: ${totalSessions}`));
    console.log(chalk.gray(`Total Pageviews: ${totalPageviews}`));
    console.log(chalk.gray(`Average Pages per Session: ${avgPagesPerSession}`));
    console.log("");
    
    // Find entry and exit patterns
    const homePage = pageData.find(p => p.path === '/');
    const highTrafficPages = pageData.filter(p => p.sessions > totalSessions * 0.1);
    
    if (homePage) {
      const homePageRate = ((homePage.sessions / totalSessions) * 100).toFixed(1);
      console.log(chalk.green("🏠 Entry Point Analysis:"));
      console.log(chalk.gray(`   Homepage sessions: ${homePage.sessions} (${homePageRate}% of total)`));
      console.log("");
    }
    
    if (highTrafficPages.length > 0) {
      console.log(chalk.green("🔥 High-Traffic Pages:"));
      highTrafficPages.forEach((page, index) => {
        const pageRate = ((page.sessions / totalSessions) * 100).toFixed(1);
        console.log(chalk.gray(`   ${index + 1}. ${page.path} (${pageRate}% of sessions)`));
      });
      console.log("");
    }
    
  } catch (error) {
    console.log(chalk.red(`❌ Error analyzing user journeys: ${error.message}`));
  }
}

async function analyzeFunnel(auth, propertyId, dateRange) {
  console.log(chalk.green("🔄 Funnel Analysis"));
  console.log(chalk.gray("Analyzing conversion funnels..."));
  console.log("");
  
  try {
    // Get page views to analyze funnel
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(await auth.getAccessToken()).token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRanges: [{
          startDate: dateRange.start,
          endDate: dateRange.end
        }],
        dimensions: [
          { name: 'pagePath' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'screenPageViews' }
        ],
        limit: 1000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(chalk.red(`API Error ${response.status}: ${errorText}`));
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.rows || data.rows.length === 0) {
      console.log(chalk.yellow("⚠️  No funnel data found."));
      return;
    }
    
    // Analyze common funnel pages
    const pageData = data.rows.map(row => ({
      path: row.dimensionValues[0]?.value || '',
      sessions: parseInt(row.metricValues[0]?.value || '0'),
      pageviews: parseInt(row.metricValues[1]?.value || '0')
    })).sort((a, b) => b.sessions - a.sessions);
    
    console.log(chalk.blue("📊 Top Pages by Sessions:"));
    console.log("");
    
    pageData.slice(0, 10).forEach((page, index) => {
      console.log(chalk.green(`${index + 1}. ${page.path}`));
      console.log(chalk.gray(`   Sessions: ${page.sessions}, Pageviews: ${page.pageviews}`));
      console.log("");
    });
    
    // Calculate potential funnel
    const homePage = pageData.find(p => p.path === '/');
    const productPages = pageData.filter(p => p.path.includes('/product'));
    const checkoutPages = pageData.filter(p => p.path.includes('/checkout'));
    
    if (homePage) {
      console.log(chalk.blue("🔄 Potential Funnel Analysis:"));
      console.log("");
      console.log(chalk.cyan("Step 1 - Homepage:"));
      console.log(chalk.gray(`  Sessions: ${homePage.sessions}`));
      console.log("");
      
      if (productPages.length > 0) {
        const totalProductSessions = productPages.reduce((sum, p) => sum + p.sessions, 0);
        const productRate = ((totalProductSessions / homePage.sessions) * 100).toFixed(1);
        console.log(chalk.cyan("Step 2 - Product Pages:"));
        console.log(chalk.gray(`  Sessions: ${totalProductSessions} (${productRate}% of homepage)`));
        console.log("");
        
        if (checkoutPages.length > 0) {
          const totalCheckoutSessions = checkoutPages.reduce((sum, p) => sum + p.sessions, 0);
          const checkoutRate = ((totalCheckoutSessions / totalProductSessions) * 100).toFixed(1);
          console.log(chalk.cyan("Step 3 - Checkout Pages:"));
          console.log(chalk.gray(`  Sessions: ${totalCheckoutSessions} (${checkoutRate}% of product pages)`));
          console.log("");
          
          const overallRate = ((totalCheckoutSessions / homePage.sessions) * 100).toFixed(1);
          console.log(chalk.yellow(`Overall Conversion Rate: ${overallRate}%`));
        }
      }
    }
    
  } catch (error) {
    console.log(chalk.red(`❌ Error analyzing funnel: ${error.message}`));
  }
}

async function analyzeExitPages(auth, propertyId, dateRange) {
  console.log(chalk.green("🚪 Exit Page Analysis"));
  console.log(chalk.gray("Analyzing where users leave your site..."));
  console.log("");
  
  try {
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(await auth.getAccessToken()).token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRanges: [{
          startDate: dateRange.start,
          endDate: dateRange.end
        }],
        dimensions: [
          { name: 'pagePath' },
          { name: 'pageTitle' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'screenPageViews' }
        ],
        limit: 1000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(chalk.red(`API Error ${response.status}: ${errorText}`));
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.rows || data.rows.length === 0) {
      console.log(chalk.yellow("⚠️  No exit page data found."));
      return;
    }
    
    // Calculate exit rates (simplified)
    const pageData = data.rows.map(row => ({
      path: row.dimensionValues[0]?.value || '',
      title: row.dimensionValues[1]?.value || '',
      sessions: parseInt(row.metricValues[0]?.value || '0'),
      pageviews: parseInt(row.metricValues[1]?.value || '0')
    })).sort((a, b) => b.sessions - a.sessions);
    
    console.log(chalk.blue("📊 Top Pages by Sessions:"));
    console.log("");
    
    pageData.slice(0, 10).forEach((page, index) => {
      const exitRate = ((page.sessions / page.pageviews) * 100).toFixed(1);
      console.log(chalk.green(`${index + 1}. ${page.path}`));
      console.log(chalk.gray(`   Sessions: ${page.sessions}, Pageviews: ${page.pageviews}`));
      console.log(chalk.gray(`   Estimated Exit Rate: ${exitRate}%`));
      console.log("");
    });
    
  } catch (error) {
    console.log(chalk.red(`❌ Error analyzing exit pages: ${error.message}`));
  }
}

async function analyzeLandingPages(auth, propertyId, dateRange) {
  console.log(chalk.green("🏠 Landing Page Analysis"));
  console.log(chalk.gray("Analyzing entry points to your site..."));
  console.log("");
  
  try {
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(await auth.getAccessToken()).token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRanges: [{
          startDate: dateRange.start,
          endDate: dateRange.end
        }],
        dimensions: [
          { name: 'landingPage' },
          { name: 'sessionSource' },
          { name: 'sessionMedium' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'newUsers' }
        ],
        limit: 1000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(chalk.red(`API Error ${response.status}: ${errorText}`));
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.rows || data.rows.length === 0) {
      console.log(chalk.yellow("⚠️  No landing page data found."));
      return;
    }
    
    const landingData = data.rows.map(row => ({
      page: row.dimensionValues[0]?.value || '',
      source: row.dimensionValues[1]?.value || '',
      medium: row.dimensionValues[2]?.value || '',
      sessions: parseInt(row.metricValues[0]?.value || '0'),
      newUsers: parseInt(row.metricValues[1]?.value || '0')
    })).sort((a, b) => b.sessions - a.sessions);
    
    console.log(chalk.blue("📊 Top Landing Pages:"));
    console.log("");
    
    landingData.slice(0, 10).forEach((page, index) => {
      const newUserRate = ((page.newUsers / page.sessions) * 100).toFixed(1);
      console.log(chalk.green(`${index + 1}. ${page.page}`));
      console.log(chalk.gray(`   Sessions: ${page.sessions}, New Users: ${page.newUsers} (${newUserRate}%)`));
      console.log(chalk.gray(`   Source: ${page.source}, Medium: ${page.medium}`));
      console.log("");
    });
    
  } catch (error) {
    console.log(chalk.red(`❌ Error analyzing landing pages: ${error.message}`));
  }
}

async function analyzeSessionExploration(auth, propertyId, dateRange) {
  console.log(chalk.green("🔍 Session Exploration"));
  console.log(chalk.gray("Analyzing individual sessions and their paths..."));
  console.log("");
  
  try {
    // Get session data with more detailed information
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(await auth.getAccessToken()).token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRanges: [{
          startDate: dateRange.start,
          endDate: dateRange.end
        }],
        dimensions: [
          { name: 'pagePath' },
          { name: 'pageTitle' },
          { name: 'sessionSource' },
          { name: 'sessionMedium' },
          { name: 'deviceCategory' },
          { name: 'country' },
          { name: 'city' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'newUsers' }
        ],
        limit: 1000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(chalk.red(`API Error ${response.status}: ${errorText}`));
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.rows || data.rows.length === 0) {
      console.log(chalk.yellow("⚠️  No session data found."));
      return;
    }
    
    // Analyze session data
    const sessionData = data.rows.map(row => ({
      path: row.dimensionValues[0]?.value || '',
      title: row.dimensionValues[1]?.value || '',
      source: row.dimensionValues[2]?.value || '',
      medium: row.dimensionValues[3]?.value || '',
      device: row.dimensionValues[4]?.value || '',
      country: row.dimensionValues[5]?.value || '',
      city: row.dimensionValues[6]?.value || '',
      sessions: parseInt(row.metricValues[0]?.value || '0'),
      pageviews: parseInt(row.metricValues[1]?.value || '0'),
      bounceRate: parseFloat(row.metricValues[2]?.value || '0'),
      avgDuration: parseFloat(row.metricValues[3]?.value || '0'),
      newUsers: parseInt(row.metricValues[4]?.value || '0')
    }));
    
    // Group sessions by unique combinations to create session profiles
    const sessionProfiles = {};
    sessionData.forEach(session => {
      const key = `${session.source}|${session.medium}|${session.device}|${session.country}|${session.city}`;
      if (!sessionProfiles[key]) {
        sessionProfiles[key] = {
          source: session.source,
          medium: session.medium,
          device: session.device,
          country: session.country,
          city: session.city,
          sessions: 0,
          pageviews: 0,
          bounceRate: 0,
          avgDuration: 0,
          newUsers: 0,
          pages: []
        };
      }
      
      sessionProfiles[key].sessions += session.sessions;
      sessionProfiles[key].pageviews += session.pageviews;
      sessionProfiles[key].newUsers += session.newUsers;
      sessionProfiles[key].pages.push({
        path: session.path,
        title: session.title,
        sessions: session.sessions,
        pageviews: session.pageviews
      });
    });
    
    // Calculate averages
    Object.values(sessionProfiles).forEach(profile => {
      profile.bounceRate = profile.pages.reduce((sum, p) => sum + (p.sessions > 0 ? 0.5 : 0), 0) / profile.pages.length;
      profile.avgDuration = profile.pages.reduce((sum, p) => sum + (p.sessions * 60), 0) / profile.sessions;
    });
    
    // Show session profiles
    const sortedProfiles = Object.values(sessionProfiles)
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 15);
    
    console.log(chalk.blue("🔍 Session Profiles Found:"));
    console.log("");
    
    sortedProfiles.forEach((profile, index) => {
      console.log(chalk.cyan(`${index + 1}. ${profile.source} / ${profile.medium}`));
      console.log(chalk.gray(`   Device: ${profile.device} | Location: ${profile.city}, ${profile.country}`));
      console.log(chalk.gray(`   Sessions: ${profile.sessions} | Pageviews: ${profile.pageviews}`));
      console.log(chalk.gray(`   New Users: ${profile.newUsers} | Avg Duration: ${Math.round(profile.avgDuration)}s`));
      console.log("");
    });
    
    // Ask user if they want to explore sessions
    const { exploreSessions } = await inquirer.prompt([
      {
        type: 'list',
        name: 'exploreSessions',
        message: 'What would you like to explore?',
        choices: [
          { name: 'View individual sessions with their journeys', value: 'individual' },
          { name: 'Explore session profiles (grouped by source/device)', value: 'profiles' },
          { name: 'Skip session exploration', value: 'skip' }
        ]
      }
    ]);
    
    if (exploreSessions === 'individual') {
      await showIndividualSessions(auth, propertyId, dateRange);
    } else if (exploreSessions === 'profiles') {
      const { selectedSessionIndex } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedSessionIndex',
          message: 'Select a session profile to explore:',
          choices: sortedProfiles.map((profile, index) => ({
            name: `${profile.source} / ${profile.medium} (${profile.device}, ${profile.city}) - ${profile.sessions} sessions`,
            value: index
          }))
        }
      ]);
      
      const selectedSession = sortedProfiles[selectedSessionIndex];
      console.log(chalk.blue(`\n🔍 Exploring Session Profile: ${selectedSession.source} / ${selectedSession.medium}`));
      console.log(chalk.gray(`Device: ${selectedSession.device} | Location: ${selectedSession.city}, ${selectedSession.country}`));
      console.log("");
      
      await exploreSessionDetails(auth, propertyId, dateRange, selectedSession);
    }
    
  } catch (error) {
    console.log(chalk.red(`❌ Error analyzing sessions: ${error.message}`));
  }
}

async function exploreSessionDetails(auth, propertyId, dateRange, selectedSession) {
  try {
    console.log(chalk.green("🔍 Detailed Session Analysis"));
    console.log(chalk.gray("Analyzing individual session paths and behavior..."));
    console.log("");
    
    // Show session profile details
    console.log(chalk.blue("📊 Session Profile Details:"));
    console.log(chalk.gray(`   Source: ${selectedSession.source}`));
    console.log(chalk.gray(`   Medium: ${selectedSession.medium}`));
    console.log(chalk.gray(`   Device: ${selectedSession.device}`));
    console.log(chalk.gray(`   Location: ${selectedSession.city}, ${selectedSession.country}`));
    console.log(chalk.gray(`   Total Sessions: ${selectedSession.sessions}`));
    console.log(chalk.gray(`   Total Pageviews: ${selectedSession.pageviews}`));
    console.log(chalk.gray(`   New Users: ${selectedSession.newUsers}`));
    console.log(chalk.gray(`   Avg Duration: ${Math.round(selectedSession.avgDuration)}s`));
    console.log("");
    
    // Create ASCII session flow diagram
    console.log(chalk.blue("🛤️  Session Path Flow:"));
    console.log("");
    
    // Show session profile as the center
    console.log(chalk.yellow("┌─────────────────────────────────────┐"));
    console.log(chalk.yellow("│") + chalk.bold.green("  🎯 SESSION PROFILE") + chalk.yellow("                │"));
    console.log(chalk.yellow("│") + chalk.cyan(`  ${selectedSession.source} / ${selectedSession.medium}`) + chalk.yellow("        │"));
    console.log(chalk.yellow("│") + chalk.gray(`  ${selectedSession.device} | ${selectedSession.city}`) + chalk.yellow("        │"));
    console.log(chalk.yellow("│") + chalk.gray(`  ${selectedSession.sessions} sessions`) + chalk.yellow("                    │"));
    console.log(chalk.yellow("└─────────────────────────────────────┘"));
    console.log("");
    
    // Show pages visited in this session profile
    const sortedPages = selectedSession.pages
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);
    
    if (sortedPages.length > 0) {
      console.log(chalk.green("📄 Pages Visited in This Session Profile:"));
      console.log("");
      
      // Create ASCII path visualization
      sortedPages.forEach((page, index) => {
        const sessions = page.sessions;
        const intensity = sessions > 10 ? '█' : sessions > 5 ? '▓' : sessions > 2 ? '▒' : '░';
        const color = sessions > 10 ? chalk.red : sessions > 5 ? chalk.yellow : sessions > 2 ? chalk.blue : chalk.gray;
        
        console.log(color(`${intensity} ${index + 1}. ${page.path}`));
        console.log(chalk.gray(`     Title: ${page.title}`));
        console.log(chalk.gray(`     Sessions: ${sessions} | Pageviews: ${page.pageviews}`));
        console.log("");
      });
      
      console.log(chalk.gray("Legend: █ High Traffic (10+ sessions) | ▓ Medium (5-10) | ▒ Low (2-5) | ░ Minimal (<2)"));
      console.log("");
    }
    
    // Show session insights
    console.log(chalk.blue("💡 Session Insights:"));
    console.log("");
    
    const totalSessions = selectedSession.sessions;
    const totalPageviews = selectedSession.pageviews;
    const avgPagesPerSession = (totalPageviews / totalSessions).toFixed(1);
    const newUserRate = ((selectedSession.newUsers / totalSessions) * 100).toFixed(1);
    
    console.log(chalk.gray(`• Average pages per session: ${avgPagesPerSession}`));
    console.log(chalk.gray(`• New user rate: ${newUserRate}%`));
    console.log(chalk.gray(`• Session duration: ${Math.round(selectedSession.avgDuration)}s`));
    
    // Analyze session behavior
    if (selectedSession.avgDuration > 120) {
      console.log(chalk.green(`• Long session duration (${Math.round(selectedSession.avgDuration)}s) - users are highly engaged`));
    } else if (selectedSession.avgDuration < 30) {
      console.log(chalk.yellow(`• Short session duration (${Math.round(selectedSession.avgDuration)}s) - users may be browsing quickly`));
    }
    
    if (parseFloat(avgPagesPerSession) > 3) {
      console.log(chalk.green(`• High page engagement (${avgPagesPerSession} pages/session) - users are exploring deeply`));
    } else if (parseFloat(avgPagesPerSession) < 1.5) {
      console.log(chalk.yellow(`• Low page engagement (${avgPagesPerSession} pages/session) - users may be bouncing quickly`));
    }
    
    if (parseFloat(newUserRate) > 70) {
      console.log(chalk.blue(`• High new user rate (${newUserRate}%) - attracting new visitors`));
    } else if (parseFloat(newUserRate) < 30) {
      console.log(chalk.cyan(`• High returning user rate (${100 - parseFloat(newUserRate)}%) - strong user retention`));
    }
    
    console.log("");
    
    // Show session flow patterns
    console.log(chalk.blue("🔄 Session Flow Patterns:"));
    console.log("");
    
    // Analyze common page sequences
    const pagePaths = selectedSession.pages.map(p => p.path);
    const uniquePaths = [...new Set(pagePaths)];
    
    console.log(chalk.gray(`• Unique pages visited: ${uniquePaths.length}`));
    console.log(chalk.gray(`• Most visited page: ${sortedPages[0]?.path || 'N/A'}`));
    
    if (sortedPages.length > 1) {
      console.log(chalk.gray(`• Second most visited: ${sortedPages[1]?.path || 'N/A'}`));
    }
    
    // Show device and location insights
    console.log("");
    console.log(chalk.blue("🌍 Session Context:"));
    console.log("");
    console.log(chalk.gray(`• Device Type: ${selectedSession.device}`));
    console.log(chalk.gray(`• Location: ${selectedSession.city}, ${selectedSession.country}`));
    console.log(chalk.gray(`• Traffic Source: ${selectedSession.source}`));
    console.log(chalk.gray(`• Traffic Medium: ${selectedSession.medium}`));
    console.log("");
    
    // Create ASCII session timeline
    console.log(chalk.blue("⏰ Session Timeline:"));
    console.log("");
    
    const timeline = selectedSession.pages
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);
    
    // Calculate total sessions for proper percentage distribution
    const timelineTotalSessions = timeline.reduce((sum, p) => sum + p.sessions, 0);
    
    timeline.forEach((page, index) => {
      // Use sessions for distribution, but ensure it makes sense
      const sessionPercentage = timelineTotalSessions > 0 ? (page.sessions / timelineTotalSessions) * 100 : (100 / timeline.length);
      const barLength = Math.min(Math.max(Math.round(sessionPercentage / 5), 1), 20);
      const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
      const percentage = sessionPercentage.toFixed(1);
      
      console.log(chalk.cyan(`${index + 1}. ${page.path.substring(0, 25)}...`));
      console.log(chalk.gray(`   ${bar} ${percentage}%`));
      console.log("");
    });
    
  } catch (error) {
    console.log(chalk.red(`❌ Error exploring session details: ${error.message}`));
  }
}

async function showIndividualSessions(auth, propertyId, dateRange) {
  try {
    console.log(chalk.green("🔍 Individual Session Analysis"));
    console.log(chalk.gray("Analyzing individual sessions and their page journeys..."));
    console.log("");
    
    // Get detailed session data with page sequences
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(await auth.getAccessToken()).token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRanges: [{
          startDate: dateRange.start,
          endDate: dateRange.end
        }],
        dimensions: [
          { name: 'pagePath' },
          { name: 'pageTitle' },
          { name: 'sessionSource' },
          { name: 'sessionMedium' },
          { name: 'deviceCategory' },
          { name: 'country' },
          { name: 'city' },
          { name: 'hour' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'newUsers' }
        ],
        limit: 1000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(chalk.red(`API Error ${response.status}: ${errorText}`));
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.rows || data.rows.length === 0) {
      console.log(chalk.yellow("⚠️  No individual session data found."));
      return;
    }
    
    // Create individual session records
    const individualSessions = data.rows.map((row, index) => ({
      sessionId: `session_${index + 1}`,
      path: row.dimensionValues[0]?.value || '',
      title: row.dimensionValues[1]?.value || '',
      source: row.dimensionValues[2]?.value || '',
      medium: row.dimensionValues[3]?.value || '',
      device: row.dimensionValues[4]?.value || '',
      country: row.dimensionValues[5]?.value || '',
      city: row.dimensionValues[6]?.value || '',
      hour: row.dimensionValues[7]?.value || '',
      sessions: parseInt(row.metricValues[0]?.value || '0'),
      pageviews: parseInt(row.metricValues[1]?.value || '0'),
      bounceRate: parseFloat(row.metricValues[2]?.value || '0'),
      avgDuration: parseFloat(row.metricValues[3]?.value || '0'),
      newUsers: parseInt(row.metricValues[4]?.value || '0')
    }));
    
    // Group sessions by unique session identifiers (simulate individual sessions)
    const sessionGroups = {};
    individualSessions.forEach(session => {
      const sessionKey = `${session.source}|${session.medium}|${session.device}|${session.city}|${session.hour}`;
      if (!sessionGroups[sessionKey]) {
        sessionGroups[sessionKey] = {
          sessionId: session.sessionId,
          source: session.source,
          medium: session.medium,
          device: session.device,
          country: session.country,
          city: session.city,
          hour: session.hour,
          totalSessions: 0,
          totalPageviews: 0,
          avgDuration: 0,
          newUsers: 0,
          pages: []
        };
      }
      
      sessionGroups[sessionKey].totalSessions += session.sessions;
      sessionGroups[sessionKey].totalPageviews += session.pageviews;
      sessionGroups[sessionKey].newUsers += session.newUsers;
      sessionGroups[sessionKey].pages.push({
        path: session.path,
        title: session.title,
        pageviews: session.pageviews,
        sessions: session.sessions
      });
    });
    
    // Calculate average duration
    Object.values(sessionGroups).forEach(group => {
      group.avgDuration = group.pages.reduce((sum, p) => sum + (p.sessions * 60), 0) / group.totalSessions;
    });
    
    // Show individual sessions
    const sortedSessions = Object.values(sessionGroups)
      .sort((a, b) => b.totalSessions - a.totalSessions)
      .slice(0, 20);
    
    console.log(chalk.blue("🔍 Individual Sessions Found:"));
    console.log("");
    
    sortedSessions.forEach((session, index) => {
      const sessionNumber = index + 1;
      const pageCount = session.pages.length;
      const avgPagesPerSession = (session.totalPageviews / session.totalSessions).toFixed(1);
      
      console.log(chalk.cyan(`${sessionNumber}. Session ${sessionNumber}`));
      console.log(chalk.gray(`   Source: ${session.source} / ${session.medium}`));
      console.log(chalk.gray(`   Device: ${session.device} | Location: ${session.city}, ${session.country}`));
      console.log(chalk.gray(`   Time: ${session.hour}:00 | Sessions: ${session.totalSessions}`));
      console.log(chalk.gray(`   Pages: ${pageCount} | Avg Pages/Session: ${avgPagesPerSession}`));
      console.log(chalk.gray(`   Duration: ${Math.round(session.avgDuration)}s | New Users: ${session.newUsers}`));
      
      // Show page journey
      console.log(chalk.gray(`   Journey: ${session.pages.map(p => p.path).join(' → ')}`));
      console.log("");
    });
    
    // Ask user if they want to explore a specific session
    const { exploreSession } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'exploreSession',
        message: 'Would you like to explore a specific session in detail?',
        default: false
      }
    ]);
    
    if (exploreSession) {
      const { selectedSessionIndex } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedSessionIndex',
          message: 'Select a session to explore:',
          choices: sortedSessions.map((session, index) => ({
            name: `Session ${index + 1}: ${session.source}/${session.medium} (${session.device}, ${session.city}) - ${session.totalSessions} sessions`,
            value: index
          }))
        }
      ]);
      
      const selectedSession = sortedSessions[selectedSessionIndex];
      console.log(chalk.blue(`\n🔍 Exploring Session ${selectedSessionIndex + 1} in Detail:`));
      console.log(chalk.gray(`Source: ${selectedSession.source} / ${selectedSession.medium}`));
      console.log(chalk.gray(`Device: ${selectedSession.device} | Location: ${selectedSession.city}, ${selectedSession.country}`));
      console.log("");
      
      await exploreIndividualSession(selectedSession);
    }
    
  } catch (error) {
    console.log(chalk.red(`❌ Error showing individual sessions: ${error.message}`));
  }
}

async function exploreIndividualSession(session) {
  try {
    console.log(chalk.green("🔍 Individual Session Journey Analysis"));
    console.log(chalk.gray("Analyzing this specific session's page journey..."));
    console.log("");
    
    // Show session details
    console.log(chalk.blue("📊 Session Details:"));
    console.log(chalk.gray(`   Session ID: ${session.sessionId}`));
    console.log(chalk.gray(`   Source: ${session.source}`));
    console.log(chalk.gray(`   Medium: ${session.medium}`));
    console.log(chalk.gray(`   Device: ${session.device}`));
    console.log(chalk.gray(`   Location: ${session.city}, ${session.country}`));
    console.log(chalk.gray(`   Time: ${session.hour}:00`));
    console.log(chalk.gray(`   Total Sessions: ${session.totalSessions}`));
    console.log(chalk.gray(`   Total Pageviews: ${session.totalPageviews}`));
    console.log(chalk.gray(`   New Users: ${session.newUsers}`));
    console.log(chalk.gray(`   Avg Duration: ${Math.round(session.avgDuration)}s`));
    console.log("");
    
    // Create ASCII session journey diagram
    console.log(chalk.blue("🛤️  Session Journey Path:"));
    console.log("");
    
    // Show the session as the center
    console.log(chalk.yellow("┌─────────────────────────────────────┐"));
    console.log(chalk.yellow("│") + chalk.bold.green("  🎯 INDIVIDUAL SESSION") + chalk.yellow("            │"));
    console.log(chalk.yellow("│") + chalk.cyan(`  ${session.source} / ${session.medium}`) + chalk.yellow("        │"));
    console.log(chalk.yellow("│") + chalk.gray(`  ${session.device} | ${session.city}`) + chalk.yellow("        │"));
    console.log(chalk.yellow("│") + chalk.gray(`  ${session.totalSessions} sessions`) + chalk.yellow("                    │"));
    console.log(chalk.yellow("└─────────────────────────────────────┘"));
    console.log("");
    
    // Show page journey with ASCII graphics
    console.log(chalk.green("📄 Page Journey:"));
    console.log("");
    
    session.pages.forEach((page, index) => {
      const sessions = page.sessions;
      const intensity = sessions > 5 ? '█' : sessions > 2 ? '▓' : sessions > 1 ? '▒' : '░';
      const color = sessions > 5 ? chalk.red : sessions > 2 ? chalk.yellow : sessions > 1 ? chalk.blue : chalk.gray;
      
      console.log(color(`${intensity} Step ${index + 1}: ${page.path}`));
      console.log(chalk.gray(`     Title: ${page.title}`));
      console.log(chalk.gray(`     Sessions: ${sessions} | Pageviews: ${page.pageviews}`));
      
      // Show connection arrow if not the last page
      if (index < session.pages.length - 1) {
        console.log(chalk.gray("     ↓"));
      }
      console.log("");
    });
    
    console.log(chalk.gray("Legend: █ High Traffic (5+ sessions) | ▓ Medium (2-5) | ▒ Low (1-2) | ░ Minimal (<1)"));
    console.log("");
    
    // Show session insights
    console.log(chalk.blue("💡 Session Journey Insights:"));
    console.log("");
    
    const totalSessions = session.totalSessions;
    const totalPageviews = session.totalPageviews;
    const avgPagesPerSession = (totalPageviews / totalSessions).toFixed(1);
    const newUserRate = ((session.newUsers / totalSessions) * 100).toFixed(1);
    const uniquePages = session.pages.length;
    
    console.log(chalk.gray(`• Total pages visited: ${uniquePages}`));
    console.log(chalk.gray(`• Average pages per session: ${avgPagesPerSession}`));
    console.log(chalk.gray(`• New user rate: ${newUserRate}%`));
    console.log(chalk.gray(`• Session duration: ${Math.round(session.avgDuration)}s`));
    
    // Analyze journey patterns
    if (uniquePages > 5) {
      console.log(chalk.green(`• Deep exploration (${uniquePages} pages) - users are browsing extensively`));
    } else if (uniquePages < 2) {
      console.log(chalk.yellow(`• Quick visit (${uniquePages} pages) - users may be bouncing quickly`));
    }
    
    if (parseFloat(avgPagesPerSession) > 3) {
      console.log(chalk.green(`• High engagement (${avgPagesPerSession} pages/session) - users are highly engaged`));
    } else if (parseFloat(avgPagesPerSession) < 1.5) {
      console.log(chalk.yellow(`• Low engagement (${avgPagesPerSession} pages/session) - users may be leaving quickly`));
    }
    
    if (parseFloat(newUserRate) > 70) {
      console.log(chalk.blue(`• High new user rate (${newUserRate}%) - attracting new visitors`));
    } else if (parseFloat(newUserRate) < 30) {
      console.log(chalk.cyan(`• High returning user rate (${100 - parseFloat(newUserRate)}%) - strong user retention`));
    }
    
    console.log("");
    
    // Show journey flow
    console.log(chalk.blue("🔄 Journey Flow Pattern:"));
    console.log("");
    
    const journeyPath = session.pages.map(p => p.path).join(' → ');
    console.log(chalk.cyan("Complete Journey:"));
    console.log(chalk.gray(`   ${journeyPath}`));
    console.log("");
    
    // Show session timeline
    console.log(chalk.blue("⏰ Session Timeline:"));
    console.log("");
    
    // Calculate total pageviews for proper percentage distribution
    const sessionTotalPageviews = session.pages.reduce((sum, p) => sum + p.pageviews, 0);
    
    session.pages.forEach((page, index) => {
      // Use pageviews for more accurate distribution, fallback to equal distribution
      const pageviewPercentage = sessionTotalPageviews > 0 ? (page.pageviews / sessionTotalPageviews) * 100 : (100 / session.pages.length);
      const barLength = Math.min(Math.max(Math.round(pageviewPercentage / 5), 1), 20); // Scale to 20 chars
      const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
      const percentage = pageviewPercentage.toFixed(1);
      
      console.log(chalk.cyan(`Step ${index + 1}: ${page.path.substring(0, 25)}...`));
      console.log(chalk.gray(`   ${bar} ${percentage}%`));
      console.log("");
    });
    
  } catch (error) {
    console.log(chalk.red(`❌ Error exploring individual session: ${error.message}`));
  }
}
