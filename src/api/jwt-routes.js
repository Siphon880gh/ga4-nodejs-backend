#!/usr/bin/env node
import express from "express";
import { loadConfig } from "../utils/config.js";
import { getOAuth2Client, getAvailableProperties } from "../datasources/analytics.js";
import { runQuery } from "../core/query-runner.js";
import { 
  saveSelectedSite, 
  getSelectedSite, 
  hasValidSiteSelection, 
  clearSelectedSite, 
  getVerifiedSites, 
  signOut 
} from "../utils/site-manager.js";
import { ensureAuthentication } from "../utils/auth-helper.js";
import { applySorting } from "../cli/renderers.js";
import { stringify } from "csv-stringify/sync";
import { 
  generateToken, 
  authenticateToken, 
  storeUserSession, 
  validateUserSession, 
  revokeUserSession,
  cleanupExpiredSessions 
} from "./auth-middleware.js";
import { getDatabase, storeTokensForUser, getTokensForUser } from "../utils/database.js";

const router = express.Router();

// Helper function to get user ID from authenticated request
function getUserId(req) {
  return req.userId;
}

// Helper function to set user ID in config
function setUserId(userId) {
  process.env.USER_ID = userId;
}

// Helper function to get user-specific OAuth client
async function getUserOAuthClient(userId, cfg) {
  const { OAuth2Client } = await import('google-auth-library');
  const { readFileSync } = await import('fs');
  
  const credentialsPath = cfg.sources.analytics.credentialsFile || process.env.GA_CREDENTIALS_FILE;
  const credentialsContent = readFileSync(credentialsPath, 'utf8');
  const credentials = JSON.parse(credentialsContent);
  
  const oauth2Client = new OAuth2Client(
    credentials.web.client_id,
    credentials.web.client_secret,
    credentials.web.redirect_uris[0]
  );
  
  // Get stored tokens for this user
  const tokens = getTokensForUser(userId);
  if (tokens) {
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date
    });
    
    // Test if tokens are still valid
    try {
      await oauth2Client.getAccessToken();
      return oauth2Client;
    } catch (error) {
      console.log("Stored tokens expired, need to re-authenticate");
      throw new Error("OAuth tokens expired. Please re-authenticate.");
    }
  } else {
    throw new Error("No OAuth tokens found for user. Please authenticate first.");
  }
}

// Helper function to handle errors
function handleError(res, error, statusCode = 500) {
  console.error("API Error:", error);
  res.status(statusCode).json({
    success: false,
    error: error.message || "Internal server error"
  });
}

// User management endpoints
router.post("/api/auth/signup", async (req, res) => {
  try {
    const { userId, email, name } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        error: "userId and email are required"
      });
    }
    
    const db = getDatabase();
    
    // Create users table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
      )
    `);
    
    // Check if user already exists
    const existingUser = db.prepare(`
      SELECT user_id FROM users WHERE user_id = ? OR email = ?
    `).get(userId, email);
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "User already exists with this userId or email"
      });
    }
    
    // Create new user
    const stmt = db.prepare(`
      INSERT INTO users (user_id, email, name, is_active)
      VALUES (?, ?, ?, 1)
    `);
    
    const result = stmt.run(userId, email, name || null);
    
    res.status(201).json({
      success: true,
      message: "User created successfully",
      userId: userId,
      email: email
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

router.post("/api/auth/login", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required in request body"
      });
    }
    
    // Check if user exists
    const db = getDatabase();
    const user = db.prepare(`
      SELECT user_id FROM users WHERE user_id = ? AND is_active = 1
    `).get(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found or inactive"
      });
    }
    
    setUserId(userId);
    const cfg = loadConfig();
    
    // Check if user already has OAuth tokens
    const existingTokens = getTokensForUser(userId);
    if (!existingTokens) {
      return res.status(401).json({
        success: false,
        error: "No OAuth tokens found. Please authenticate with Google first by visiting the OAuth endpoint."
      });
    }
    
    // Generate JWT token
    const token = generateToken(userId);
    
    // Store session in database
    storeUserSession(userId, token);
    
    res.json({
      success: true,
      message: "Authentication successful",
      token: token,
      userId: userId,
      expiresIn: "24h"
    });
  } catch (error) {
    handleError(res, error, 401);
  }
});

router.post("/api/auth/oauth", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required in request body"
      });
    }
    
    // Check if user exists
    const db = getDatabase();
    const user = db.prepare(`
      SELECT user_id FROM users WHERE user_id = ? AND is_active = 1
    `).get(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found or inactive"
      });
    }
    
    setUserId(userId);
    const cfg = loadConfig();
    
    // Set a dummy property ID for authentication
    const originalPropertyId = process.env.GA_PROPERTY_ID;
    process.env.GA_PROPERTY_ID = "123456789";
    
    const auth = await getOAuth2Client(cfg.sources.analytics);
    
    // Store OAuth tokens for this user
    if (auth.credentials) {
      storeTokensForUser(userId, auth.credentials);
    }
    
    // Restore original property ID
    if (originalPropertyId) {
      process.env.GA_PROPERTY_ID = originalPropertyId;
    } else {
      delete process.env.GA_PROPERTY_ID;
    }
    
    res.json({
      success: true,
      message: "OAuth authentication successful",
      userId: userId
    });
  } catch (error) {
    handleError(res, error, 401);
  }
});

router.post("/api/auth/logout", authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization'].split(' ')[1];
    const userId = getUserId(req);
    
    // Revoke session
    revokeUserSession(token);
    
    // Clear user data
    setUserId(userId);
    const cleared = await signOut();
    
    res.json({
      success: true,
      message: "Logout successful",
      cleared: cleared
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

router.delete("/api/auth/user", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const db = getDatabase();
    
    // Delete user from database
    const stmt = db.prepare(`
      DELETE FROM users WHERE user_id = ?
    `);
    
    const result = stmt.run(userId);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }
    
    // Delete all sessions for this user
    const deleteSessionsStmt = db.prepare(`
      DELETE FROM user_sessions WHERE user_id = ?
    `);
    deleteSessionsStmt.run(userId);
    
    // Clear user data
    setUserId(userId);
    await signOut();
    
    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// User status endpoint
router.get("/api/status", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const cfg = loadConfig();
    const currentProperty = getSelectedSite();
    const hasValidProperty = hasValidSiteSelection();
    
    let authStatus = false;
    try {
      await getUserOAuthClient(userId, cfg);
      authStatus = true;
    } catch (error) {
      authStatus = false;
    }
    
    res.json({
      success: true,
      userId: userId,
      authenticated: authStatus,
      currentProperty: currentProperty,
      hasValidProperty: hasValidProperty,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// Property management endpoints
router.get("/api/properties", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const cfg = loadConfig();
    const auth = await getUserOAuthClient(userId, cfg);
    const properties = await getAvailableProperties(cfg);
    
    const currentProperty = getSelectedSite();
    
    res.json({
      success: true,
      properties: properties,
      currentProperty: currentProperty,
      total: properties.length
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

router.get("/api/properties/verified", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const cfg = loadConfig();
    const auth = await getUserOAuthClient(userId, cfg);
    const verifiedProperties = await getAvailableProperties(cfg);
    
    res.json({
      success: true,
      properties: verifiedProperties,
      total: verifiedProperties.length
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

router.post("/api/properties/select", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const { propertyId } = req.body;
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: "propertyId is required in request body"
      });
    }
    
    const cfg = loadConfig();
    await ensureAuthentication(cfg);
    
    // Verify the property exists and user has access
    const verifiedProperties = await getAvailableProperties(cfg);
    const propertyExists = verifiedProperties.some(prop => prop.propertyId === propertyId);
    
    if (!propertyExists) {
      return res.status(400).json({
        success: false,
        error: "Property not found or you don't have access to it"
      });
    }
    
    const success = saveSelectedSite(propertyId);
    if (success) {
      res.json({
        success: true,
        message: `Selected property: ${propertyId}`,
        selectedProperty: propertyId
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to save property selection"
      });
    }
  } catch (error) {
    handleError(res, error, 500);
  }
});

router.get("/api/properties/current", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const currentProperty = getSelectedSite();
    const hasValidProperty = hasValidSiteSelection();
    
    res.json({
      success: true,
      currentProperty: currentProperty,
      hasValidProperty: hasValidProperty
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

router.delete("/api/properties/current", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const success = await clearSelectedSite();
    if (success) {
      res.json({
        success: true,
        message: "Selected property cleared"
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to clear property selection"
      });
    }
  } catch (error) {
    handleError(res, error, 500);
  }
});

// Query endpoints
router.post("/api/query/adhoc", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const {
      metrics = ["sessions", "users", "pageviews", "bounceRate"],
      dimensions = ["pageTitle"],
      dateRangeType = "last7",
      customStartDate,
      customEndDate,
      limit = 1000,
      outputFormat = "json",
      sorting
    } = req.body;
    
    // Validate required fields
    if (!metrics || metrics.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one metric is required"
      });
    }
    
    if (!dimensions || dimensions.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one dimension is required"
      });
    }
    
    const cfg = loadConfig();
    
    // Check if we have a valid property selection
    if (!hasValidSiteSelection()) {
      return res.status(400).json({
        success: false,
        error: "No Google Analytics property selected. Please select a property first."
      });
    }
    
    // Set the selected property as environment variable
    const selectedProperty = getSelectedSite();
    process.env.GA_PROPERTY_ID = selectedProperty;
    
    // Ensure authentication
    const auth = await ensureAuthentication(cfg);
    
    // Build query parameters
    const answers = {
      action: "adhoc",
      source: "analytics",
      metrics,
      dimensions,
      dateRangeType,
      customStartDate,
      customEndDate,
      limit
    };
    
    // Run the query
    const rows = await runQuery(answers, cfg, auth);
    
    // Apply sorting if provided
    let sortedRows = rows;
    if (sorting && sorting.columns && !sorting.columns.includes('none')) {
      sortedRows = applySorting(rows, sorting);
    }
    
    // Format response based on output format
    let responseData;
    if (outputFormat === "csv") {
      responseData = stringify(sortedRows, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ga4-data.csv"');
      return res.send(responseData);
    } else {
      responseData = {
        success: true,
        data: sortedRows,
        total: sortedRows.length,
        property: selectedProperty,
        query: {
          metrics,
          dimensions,
          dateRange: {
            start: answers.customStartDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: answers.customEndDate || new Date().toISOString().split('T')[0]
          },
          limit
        }
      };
      
      if (outputFormat === "json") {
        res.json(responseData);
      } else {
        // For table format, return JSON with table structure
        res.json(responseData);
      }
    }
  } catch (error) {
    handleError(res, error, 500);
  }
});

router.post("/api/query/preset", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const {
      preset,
      dateRangeType = "last7",
      customStartDate,
      customEndDate,
      limit = 1000,
      outputFormat = "json"
    } = req.body;
    
    if (!preset) {
      return res.status(400).json({
        success: false,
        error: "Preset ID is required"
      });
    }
    
    const cfg = loadConfig();
    
    // Check if we have a valid property selection
    if (!hasValidSiteSelection()) {
      return res.status(400).json({
        success: false,
        error: "No Google Analytics property selected. Please select a property first."
      });
    }
    
    // Set the selected property as environment variable
    const selectedProperty = getSelectedSite();
    process.env.GA_PROPERTY_ID = selectedProperty;
    
    // Ensure authentication
    const auth = await ensureAuthentication(cfg);
    
    // Build query parameters
    const answers = {
      action: "preset",
      source: "analytics",
      preset,
      dateRangeType,
      customStartDate,
      customEndDate,
      limit
    };
    
    // Run the query
    const rows = await runQuery(answers, cfg, auth);
    
    // Format response based on output format
    let responseData;
    if (outputFormat === "csv") {
      responseData = stringify(rows, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ga4-preset-data.csv"');
      return res.send(responseData);
    } else {
      responseData = {
        success: true,
        data: rows,
        total: rows.length,
        property: selectedProperty,
        preset: preset,
        query: {
          dateRange: {
            start: answers.customStartDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: answers.customEndDate || new Date().toISOString().split('T')[0]
          },
          limit
        }
      };
      
      if (outputFormat === "json") {
        res.json(responseData);
      } else {
        // For table format, return JSON with table structure
        res.json(responseData);
      }
    }
  } catch (error) {
    handleError(res, error, 500);
  }
});

// Configuration endpoints
router.get("/api/presets", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const cfg = loadConfig();
    const presets = cfg.presets.filter(p => p.source === "analytics" || p.source === "any");
    
    res.json({
      success: true,
      presets: presets.map(p => ({
        id: p.id,
        label: p.label,
        description: p.description,
        metrics: p.metrics,
        dimensions: p.dimensions
      }))
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

router.get("/api/schema", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const cfg = loadConfig();
    const sourceConfig = cfg.sources.analytics;
    
    res.json({
      success: true,
      metrics: sourceConfig.metrics || {},
      dimensions: sourceConfig.dimensions || {}
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// Advanced Filtering endpoints
router.post("/api/query/filter", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const {
      data,
      filters
    } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: "data array is required"
      });
    }
    
    if (!filters || !Array.isArray(filters)) {
      return res.status(400).json({
        success: false,
        error: "filters array is required"
      });
    }
    
    // Import filtering functions
    const { applyAllFilters } = await import('../cli/renderers.js');
    
    // Apply filters to data
    const filteredData = applyAllFilters(data, filters);
    
    res.json({
      success: true,
      originalCount: data.length,
      filteredCount: filteredData.length,
      data: filteredData,
      filters: filters
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// File Export endpoints
router.post("/api/export/file", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const {
      data,
      format = "csv",
      filename,
      includeTimestamp = true
    } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: "data array is required"
      });
    }
    
    // Import file saving functions
    const { save } = await import('../cli/renderers.js');
    
    // Generate filename if not provided
    let finalFilename = filename;
    if (!finalFilename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      finalFilename = `ga4-export-${timestamp}.${format}`;
    }
    
    // Save file
    const filePath = await save(JSON.stringify(data, null, 2), format, { output: { outDir: "./.out" } });
    
    res.json({
      success: true,
      message: "File exported successfully",
      filePath: filePath,
      filename: finalFilename,
      format: format,
      recordCount: data.length
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// Pagination endpoints
router.post("/api/query/paginate", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const {
      data,
      page = 1,
      pageSize = 50,
      sorting
    } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: "data array is required"
      });
    }
    
    // Import sorting functions
    const { applySorting } = await import('../cli/renderers.js');
    
    // Apply sorting if provided
    let sortedData = data;
    if (sorting && sorting.columns && !sorting.columns.includes('none')) {
      sortedData = applySorting(data, sorting);
    }
    
    // Calculate pagination
    const totalRecords = sortedData.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = sortedData.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        currentPage: page,
        pageSize: pageSize,
        totalRecords: totalRecords,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        startIndex: startIndex,
        endIndex: Math.min(endIndex, totalRecords)
      }
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

// Session Flow Analysis endpoints
router.post("/api/session-flow/explore", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const {
      analysisType,
      dateRangeType = "last7",
      customStartDate,
      customEndDate,
      limit = 1000
    } = req.body;
    
    if (!analysisType) {
      return res.status(400).json({
        success: false,
        error: "analysisType is required"
      });
    }
    
    const cfg = loadConfig();
    
    // Check if we have a valid property selection
    if (!hasValidSiteSelection()) {
      return res.status(400).json({
        success: false,
        error: "No Google Analytics property selected. Please select a property first."
      });
    }
    
    // Set the selected property as environment variable
    const selectedProperty = getSelectedSite();
    process.env.GA_PROPERTY_ID = selectedProperty;
    
    // Ensure authentication
    const auth = await ensureAuthentication(cfg);
    
    // Import session flow analysis functions
    const { handleSessionFlowAnalysis } = await import('../cli/session-flow-cli.js');
    
    // Build analysis parameters
    const answers = {
      analysisType,
      dateRangeType,
      customStartDate,
      customEndDate
    };
    
    // Run the session flow analysis
    const result = await handleSessionFlowAnalysis(answers, cfg);
    
    res.json({
      success: true,
      analysisType,
      property: selectedProperty,
      dateRange: {
        start: customStartDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: customEndDate || new Date().toISOString().split('T')[0]
      },
      result
    });
  } catch (error) {
    handleError(res, error, 500);
  }
});

router.post("/api/session-flow/analyze", authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    setUserId(userId);
    
    const {
      analysisType,
      dateRangeType = "last7",
      customStartDate,
      customEndDate,
      limit = 1000,
      outputFormat = "json"
    } = req.body;
    
    if (!analysisType) {
      return res.status(400).json({
        success: false,
        error: "analysisType is required"
      });
    }
    
    const cfg = loadConfig();
    
    // Check if we have a valid property selection
    if (!hasValidSiteSelection()) {
      return res.status(400).json({
        success: false,
        error: "No Google Analytics property selected. Please select a property first."
      });
    }
    
    // Set the selected property as environment variable
    const selectedProperty = getSelectedSite();
    process.env.GA_PROPERTY_ID = selectedProperty;
    
    // Ensure authentication
    const auth = await ensureAuthentication(cfg);
    
    // Import session flow analysis functions
    const { handleSessionFlowAnalysis } = await import('../cli/session-flow-cli.js');
    
    // Build analysis parameters
    const answers = {
      analysisType,
      dateRangeType,
      customStartDate,
      customEndDate
    };
    
    // Run the session flow analysis
    const result = await handleSessionFlowAnalysis(answers, cfg);
    
    // Format response based on output format
    let responseData;
    if (outputFormat === "csv") {
      responseData = stringify(result, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ga4-session-flow.csv"');
      return res.send(responseData);
    } else {
      responseData = {
        success: true,
        analysisType,
        property: selectedProperty,
        dateRange: {
          start: customStartDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: customEndDate || new Date().toISOString().split('T')[0]
        },
        result
      };
      
      res.json(responseData);
    }
  } catch (error) {
    handleError(res, error, 500);
  }
});

// Cleanup expired sessions on startup
cleanupExpiredSessions();

export default router;
