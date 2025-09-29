import { analyticsdata } from "@googleapis/analyticsdata";
import chalk from "chalk";
import { OAuth2Client } from "google-auth-library";
import { readFileSync } from "fs";
import { join } from "path";
import open from "open";
import { getTokensForUser, storeTokensForUser } from '../utils/database.js';
import config from '../../config.js';

export default async function runAnalytics(query, cfg, auth = null) {
  const analyticsConfig = cfg.sources.analytics;
  const propertyId = process.env.GA_PROPERTY_ID || analyticsConfig.propertyId;
  
  if (!propertyId) {
    throw new Error("Analytics property ID is required. Set GA_PROPERTY_ID environment variable or configure in config.js");
  }

  // Use provided auth or initialize OAuth2 client
  if (!auth) {
    auth = await getOAuth2Client(analyticsConfig);
  }

  try {
    // Build the Analytics Data API request
    const requestBody = {
      dateRanges: [{
        startDate: query.dateRange.start,
        endDate: query.dateRange.end
      }],
      dimensions: query.dimensions.map(dim => ({ name: dim })),
      metrics: query.metrics.map(metric => ({ name: metric })),
      limit: query.limit || analyticsConfig.pageSize || 1000,
      offset: query.startRow || 0,
      orderBys: query.orderBys ? query.orderBys.map(orderBy => {
        const fieldName = orderBy.metric || orderBy.dimension;
        return {
          metric: orderBy.metric ? { metricName: orderBy.metric } : undefined,
          dimension: orderBy.dimension ? { dimensionName: orderBy.dimension } : undefined,
          desc: orderBy.desc || false
        };
      }) : undefined
    };

    console.log(chalk.blue(`Querying Analytics property ${propertyId}...`));
    console.log(chalk.gray(`Request body:`, JSON.stringify(requestBody, null, 2)));
    
    // Use REST API directly with OAuth2 instead of client libraries
    console.log("Using REST API directly with OAuth2...");
    
    // Get fresh access token
    const accessToken = await auth.getAccessToken();
    const token = accessToken.token;
    
    console.log("Making direct REST API call to runReport...");
    
    // Make direct REST API call
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const responseData = await response.json();
    
    // Transform response to array of objects
    let rows = (responseData.rows || []).map(row => {
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

    console.log(chalk.gray(`Analytics API returned ${rows.length} rows (requested limit: ${requestBody.limit})`));

    // Apply client-side sorting if orderBys are specified
    if (query.orderBys && query.orderBys.length > 0) {
      rows = rows.sort((a, b) => {
        for (const orderBy of query.orderBys) {
          const fieldName = orderBy.metric || orderBy.dimension;
          const aVal = a[fieldName] || 0;
          const bVal = b[fieldName] || 0;
          
          if (aVal !== bVal) {
            return orderBy.desc ? bVal - aVal : aVal - bVal;
          }
        }
        return 0;
      });
    }

    return rows;
    
  } catch (error) {
    if (error.code === 403) {
      throw new Error(`Analytics access denied. Check that your account has access to property ${propertyId} and has the "Viewer" or "Analyst" role.`);
    } else if (error.code === 404) {
      throw new Error(`Analytics property ${propertyId} not found. Check your property ID.`);
    } else if (error.code === 400) {
      throw new Error(`Invalid Analytics query: ${error.message}`);
    } else {
      throw new Error(`Analytics API error: ${error.message}`);
    }
  }
}

// OAuth2 client setup and token management
export async function getOAuth2Client(analyticsConfig) {
  const credentialsPath = analyticsConfig.credentialsFile || process.env.GA_CREDENTIALS_FILE;
  
  if (!credentialsPath) {
    throw new Error("OAuth2 credentials file is required. Set GA_CREDENTIALS_FILE environment variable or configure in config.js");
  }

  let credentials;
  try {
    const credentialsContent = readFileSync(credentialsPath, 'utf8');
    credentials = JSON.parse(credentialsContent);
  } catch (error) {
    throw new Error(`Failed to read OAuth2 credentials from ${credentialsPath}: ${error.message}`);
  }

  const oauth2Client = new OAuth2Client(
    credentials.web.client_id,
    credentials.web.client_secret,
    credentials.web.redirect_uris[0]
  );

  // Check if we have stored tokens in database
  const userId = config.userId;
  let tokens;
  
  try {
    tokens = getTokensForUser(userId);
    console.log("Retrieved tokens from database:", !!tokens);
    if (tokens) {
      console.log("Token details:", {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        scope: tokens.scope,
        tokenType: tokens.token_type,
        expiryDate: tokens.expiry_date
      });
      
      oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
        token_type: tokens.token_type,
        expiry_date: tokens.expiry_date
      });
      
      console.log("OAuth2 client credentials set");
      
      // Test if tokens are still valid
      try {
        const freshToken = await oauth2Client.getAccessToken();
        console.log("Token validation successful:", !!freshToken.token);
        return oauth2Client;
      } catch (error) {
        console.log(chalk.yellow("Stored tokens expired, refreshing..."));
        console.log("Token refresh error:", error.message);
      }
    }
  } catch (error) {
    console.log(chalk.blue("No stored tokens found, starting OAuth2 flow..."));
    console.log("Database error:", error.message);
  }

  // Start OAuth2 flow
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/bigquery.readonly'
    ],
    prompt: 'consent'
  });

  console.log(chalk.blue("Opening browser for OAuth2 authentication..."));
  console.log(chalk.gray(`If browser doesn't open automatically, visit: ${authUrl}`));
  
  // Open browser
  await open(authUrl);
  
  // Wait for callback
  console.log(chalk.blue("Waiting for OAuth2 callback..."));
  const code = await waitForCallback();
  console.log(chalk.green("OAuth2 callback received!"));
  console.log("Authorization code:", code ? "Present" : "Missing");
  
  // Exchange code for tokens
  console.log("Exchanging authorization code for tokens...");
  const { tokens: newTokens } = await oauth2Client.getToken(code);
  console.log("Tokens received:", !!newTokens);
  console.log("Access token present:", !!newTokens.access_token);
  console.log("Refresh token present:", !!newTokens.refresh_token);
  console.log("Scope:", newTokens.scope);
  
  oauth2Client.setCredentials(newTokens);
  
  // Store tokens in database for future use
  storeTokensForUser(userId, newTokens);
  console.log(chalk.green("Authentication successful! Tokens saved to database."));
  
  return oauth2Client;
}

// Wait for OAuth2 callback using HTTP server
async function waitForCallback() {
  const { createServer } = await import('http');
  const { URL } = await import('url');
  const { readFileSync } = await import('fs');
  
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      console.log("Callback server received request:", req.url);
      const url = new URL(req.url, 'http://localhost:8888');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      
      console.log("URL parameters:", { code: !!code, error });
      
      if (error) {
        console.log("OAuth2 error received:", error);
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body>
              <h1>Authentication Error</h1>
              <p>Error: ${error}</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        reject(new Error(`OAuth2 error: ${error}`));
        return;
      }
      
      if (code) {
        console.log("Authorization code received:", code.substring(0, 20) + "...");
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body>
              <h1>Authentication Successful!</h1>
              <p>You can close this window and return to your terminal.</p>
              <script>setTimeout(() => window.close(), 2000);</script>
            </body>
          </html>
        `);
        resolve(code);
        server.close();
        return;
      }
      
      // Serve the callback.html file
      const callbackPath = join(process.cwd(), 'callback.html');
      try {
        const html = readFileSync(callbackPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      } catch (error) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>Callback page not found</h1>');
      }
    });
    
    server.listen(8888, 'localhost', () => {
      console.log(chalk.blue("Callback server started on http://localhost:8888"));
    });
    
    // Timeout after 5 minutes
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("OAuth2 callback timeout. Please try again."));
    }, 300000);
    
    server.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

// Helper function to get available Analytics properties
export async function getAvailableProperties(cfg) {
  const analyticsConfig = cfg.sources.analytics;
  
  const auth = await getOAuth2Client(analyticsConfig);
  
  // Ensure the auth client is properly authenticated
  await auth.getAccessToken();
  
  // Use REST API directly with OAuth2 instead of client libraries
  console.log("Using REST API directly with OAuth2...");

  try {
    console.log("Making API call to list properties...");
    console.log("OAuth2 client credentials:", !!auth.credentials);
    console.log("Access token present:", !!auth.credentials?.access_token);
    console.log("Token type:", auth.credentials?.token_type);
    console.log("Scope:", auth.credentials?.scope);
    
    // Get fresh access token
    const accessToken = await auth.getAccessToken();
    console.log("Fresh access token obtained:", !!accessToken.token);
    
    // Use REST API directly
    const token = accessToken.token;
    
    console.log("Making direct REST API call to accountSummaries.list...");
    
    const response = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log("REST API response received:", !!data);
    
    const accountSummaries = data.accountSummaries || [];
    console.log("Found account summaries:", accountSummaries.length);
    
    if (accountSummaries.length === 0) {
      throw new Error("No Analytics accounts found. Make sure you have access to Google Analytics properties.");
    }
    
    // Extract properties from account summaries
    const allProperties = [];
    for (const accountSummary of accountSummaries) {
      const properties = accountSummary.propertySummaries || [];
      console.log(`Account ${accountSummary.displayName} has ${properties.length} properties`);
      
      allProperties.push(...properties.map(property => ({
        propertyId: property.property.split('/').pop(),
        displayName: property.displayName,
        accountName: accountSummary.displayName,
        accountId: accountSummary.account.split('/').pop()
      })));
    }
    
    console.log("API call successful! Total properties found:", allProperties.length);
    return allProperties;
    
    console.log("API call successful! Total properties found:", allProperties.length);
    return allProperties;
  } catch (error) {
    console.error("API call failed:", error.message);
    console.error("Error code:", error.code);
    console.error("Error status:", error.status);
    
    if (error.code === 401) {
      throw new Error(`Authentication failed. Please re-authenticate by running the app and selecting "Authenticate with Google". Make sure you grant all requested permissions during the OAuth2 flow.`);
    } else if (error.code === 403) {
      throw new Error(`Access denied. Make sure your Google account has access to Google Analytics properties.`);
    } else {
      throw new Error(`Failed to fetch Analytics properties: ${error.message}`);
    }
  }
}
