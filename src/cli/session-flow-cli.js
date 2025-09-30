/**
 * CLI-based Session Flow Analysis
 * Uses GA4 API to analyze session flows directly in the CLI
 */

import chalk from "chalk";
import { getOAuth2Client } from "../datasources/analytics.js";
import { getSelectedSite } from "../utils/site-manager.js";
import { getDateRange } from "./prompts.js";

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
          { name: 'sessionId' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'screenPageViews' }
        ],
        limit: 1000
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.rows || data.rows.length === 0) {
      console.log(chalk.yellow("⚠️  No session data found for the selected date range."));
      return;
    }
    
    // Group by session to show paths
    const sessionPaths = {};
    data.rows.forEach(row => {
      const sessionId = row.dimensionValues[2]?.value || 'unknown';
      const pagePath = row.dimensionValues[0]?.value || '';
      const pageTitle = row.dimensionValues[1]?.value || '';
      const sessions = parseInt(row.metricValues[0]?.value || '0');
      
      if (!sessionPaths[sessionId]) {
        sessionPaths[sessionId] = {
          pages: [],
          totalSessions: sessions
        };
      }
      
      sessionPaths[sessionId].pages.push({
        path: pagePath,
        title: pageTitle
      });
    });
    
    console.log(chalk.blue("🔍 Session Paths Found:"));
    console.log("");
    
    // Show top 10 session paths
    const sortedSessions = Object.entries(sessionPaths)
      .sort(([,a], [,b]) => b.totalSessions - a.totalSessions)
      .slice(0, 10);
    
    sortedSessions.forEach(([sessionId, data], index) => {
      console.log(chalk.cyan(`Session ${index + 1} (${data.totalSessions} sessions):`));
      const pathString = data.pages.map(p => p.path).join(' → ');
      console.log(chalk.gray(`  Path: ${pathString}`));
      console.log("");
    });
    
    // Show most common page sequences
    console.log(chalk.blue("📈 Most Common Page Sequences:"));
    const pageSequences = {};
    
    Object.values(sessionPaths).forEach(session => {
      if (session.pages.length > 1) {
        const sequence = session.pages.map(p => p.path).join(' → ');
        pageSequences[sequence] = (pageSequences[sequence] || 0) + session.totalSessions;
      }
    });
    
    const sortedSequences = Object.entries(pageSequences)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    sortedSequences.forEach(([sequence, count], index) => {
      console.log(chalk.green(`${index + 1}. ${sequence} (${count} sessions)`));
    });
    
  } catch (error) {
    console.log(chalk.red(`❌ Error analyzing paths: ${error.message}`));
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
          { name: 'pageTitle' },
          { name: 'sessionId' },
          { name: 'clientId' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'screenPageViews' }
        ],
        limit: 100
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.rows || data.rows.length === 0) {
      console.log(chalk.yellow("⚠️  No user journey data found."));
      return;
    }
    
    // Group by clientId to show user journeys
    const userJourneys = {};
    data.rows.forEach(row => {
      const clientId = row.dimensionValues[3]?.value || 'unknown';
      const sessionId = row.dimensionValues[2]?.value || 'unknown';
      const pagePath = row.dimensionValues[0]?.value || '';
      const pageTitle = row.dimensionValues[1]?.value || '';
      
      if (!userJourneys[clientId]) {
        userJourneys[clientId] = {};
      }
      
      if (!userJourneys[clientId][sessionId]) {
        userJourneys[clientId][sessionId] = [];
      }
      
      userJourneys[clientId][sessionId].push({
        path: pagePath,
        title: pageTitle
      });
    });
    
    console.log(chalk.blue("👥 User Journeys:"));
    console.log("");
    
    // Show first 5 user journeys
    const userEntries = Object.entries(userJourneys).slice(0, 5);
    
    userEntries.forEach(([clientId, sessions], userIndex) => {
      console.log(chalk.cyan(`User ${userIndex + 1} (Client: ${clientId.substring(0, 8)}...):`));
      
      Object.entries(sessions).forEach(([sessionId, pages], sessionIndex) => {
        console.log(chalk.gray(`  Session ${sessionIndex + 1}:`));
        const pathString = pages.map(p => p.path).join(' → ');
        console.log(chalk.gray(`    ${pathString}`));
      });
      console.log("");
    });
    
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
      throw new Error(`API Error: ${response.status}`);
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
      throw new Error(`API Error: ${response.status}`);
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
      throw new Error(`API Error: ${response.status}`);
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
