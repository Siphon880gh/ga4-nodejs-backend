#!/usr/bin/env node
import "dotenv/config";
import express from "express";
import cors from "cors";
import jwtRoutes from "./jwt-routes.js";
import { getDatabase } from "../utils/database.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Use JWT routes
app.use("/", jwtRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "GA4 API Server is running",
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    availableEndpoints: [
      "GET /health",
      "POST /api/auth/signup",
      "POST /api/auth/login",
      "POST /api/auth/oauth",
      "POST /api/auth/logout",
      "DELETE /api/auth/user",
      "GET /api/status",
      "GET /api/properties",
      "GET /api/properties/verified",
      "POST /api/properties/select",
      "GET /api/properties/current",
      "DELETE /api/properties/current",
      "POST /api/query/adhoc",
      "POST /api/query/preset",
      "POST /api/query/filter",
      "POST /api/query/paginate",
      "GET /api/presets",
      "GET /api/schema",
      "POST /api/export/file",
      "POST /api/session-flow/explore",
      "POST /api/session-flow/analyze"
    ]
  });
});

// Initialize database on startup
console.log("🔧 Initializing database...");
getDatabase();
console.log("✅ Database initialized successfully");

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GA4 API Server (JWT) running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Authentication: POST /api/auth/login`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/status`);
});

export default app;
