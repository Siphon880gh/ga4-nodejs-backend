# GA4 API Endpoints - Technical Details

## Overview

Complete REST API implementation providing all CLI functionality as HTTP endpoints with multi-user support and JWT authentication for Google Analytics 4. Supports both user-based routing and secure token-based authentication for production deployment.

## API Architecture

The application provides a single API implementation with JWT authentication:

1. **Main API** (`src/api/server.js` - 66 lines) - Express server with JWT authentication
2. **JWT Routes** (`src/api/jwt-routes.js` - 710 lines) - JWT authentication routes and middleware

### Server Implementation

```javascript
// Main API server (src/api/server.js)
const express = require('express');
const jwtRoutes = require('./jwt-routes.js');
const app = express();

// Use JWT routes for all endpoints
app.use('/', jwtRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ success: true, message: "GA4 API Server is running" });
});
```

## JWT Authentication System

### JWT Routes (`src/api/jwt-routes.js` - 710 lines)

Comprehensive JWT authentication system with secure token management:

```javascript
// JWT authentication flow
app.post('/api/auth/login', async (req, res) => {
  const { userId } = req.body;
  
  // Authenticate with Google OAuth2
  const auth = await getOAuth2Client(cfg);
  await auth.getAccessToken();
  
  // Generate JWT token
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
  
  // Store session in database
  await storeUserSession(userId, token);
  
  res.json({
    success: true,
    token,
    userId,
    expiresIn: '24h'
  });
});
```

### Authentication Middleware (`src/api/auth-middleware.js` - 162 lines)

Secure JWT token validation and user authentication:

```javascript
// JWT authentication middleware
export function authenticateJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
}
```

## API Endpoints

### Authentication Endpoints

#### Standard API
```http
POST /api/{userId}/auth
```
Initiates OAuth2 authentication flow for the user.

#### JWT API
```http
POST /api/auth/login
Content-Type: application/json

{
  "userId": "your-user-id"
}
```
Returns JWT token for subsequent requests.

### User Status

#### Standard API
```http
GET /api/{userId}/status
```

#### JWT API
```http
GET /api/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "userId": "user123",
  "authenticated": true,
  "currentProperty": "123456789",
  "hasValidProperty": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Property Management

#### List All Properties
```http
GET /api/{userId}/properties     # Standard API
GET /api/properties              # JWT API
Authorization: Bearer <token>     # JWT API only
```

#### Select Property
```http
POST /api/{userId}/properties/select  # Standard API
POST /api/properties/select            # JWT API
Authorization: Bearer <token>         # JWT API only
Content-Type: application/json

{
  "propertyId": "123456789"
}
```

### Query Endpoints

#### Ad-hoc Query
```http
POST /api/{userId}/query/adhoc   # Standard API
POST /api/query/adhoc            # JWT API
Authorization: Bearer <token>    # JWT API only
Content-Type: application/json

{
  "metrics": ["sessions", "users", "pageviews", "bounceRate"],
  "dimensions": ["pageTitle", "pagePath"],
  "dateRangeType": "last7",
  "limit": 1000,
  "outputFormat": "json",
  "sorting": {
    "columns": [
      {"column": "sessions", "direction": "desc"}
    ]
  }
}
```

#### Preset Query
```http
POST /api/{userId}/query/preset  # Standard API
POST /api/query/preset           # JWT API
Authorization: Bearer <token>    # JWT API only
Content-Type: application/json

{
  "preset": "top-pages",
  "dateRangeType": "last28",
  "limit": 500,
  "outputFormat": "json"
}
```

#### Advanced Filtering
```http
POST /api/query/filter
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": [
    {"pageTitle": "Home", "sessions": 100, "users": 80},
    {"pageTitle": "About", "sessions": 50, "users": 40}
  ],
  "filters": [
    {
      "field": "sessions",
      "operator": ">",
      "value": 30
    }
  ]
}
```

**Filter Operators:**
- `=` - Exact match
- `*` - Contains
- `<>` - Not equal
- `<*>` - Not contains
- `>` - Greater than
- `<` - Less than
- `>=` - Greater than or equal
- `<=` - Less than or equal

#### Pagination
```http
POST /api/query/paginate
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": [...],
  "page": 1,
  "pageSize": 50,
  "sorting": {
    "columns": [
      {"column": "sessions", "direction": "desc"}
    ]
  }
}
```

#### File Export
```http
POST /api/export/file
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": [...],
  "format": "csv",
  "filename": "my-export.csv",
  "includeTimestamp": true
}
```

**Supported Formats:**
- `json` - JSON format
- `csv` - CSV format
- `table` - Table format

#### Session Flow Analysis
```http
POST /api/session-flow/explore
Authorization: Bearer <token>
Content-Type: application/json

{
  "analysisType": "path_exploration",
  "dateRangeType": "last7",
  "customStartDate": "2024-01-01",
  "customEndDate": "2024-01-07",
  "limit": 1000
}
```

**Available Analysis Types:**
- `path_exploration` - Analyze user navigation paths
- `user_journey` - User journey analysis
- `funnel_analysis` - Funnel conversion analysis
- `exit_analysis` - Exit page analysis
- `landing_analysis` - Landing page analysis
- `session_exploration` - Individual session exploration

#### Session Flow Analysis with Export
```http
POST /api/session-flow/analyze
Authorization: Bearer <token>
Content-Type: application/json

{
  "analysisType": "landing_analysis",
  "dateRangeType": "last28",
  "limit": 500,
  "outputFormat": "csv"
}
```

## Database Schema

### JWT Sessions Table

```sql
CREATE TABLE user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### OAuth2 Tokens Table

```sql
CREATE TABLE oauth_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  scope TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expiry_date INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Selected Properties Table

```sql
CREATE TABLE selected_sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  site_url TEXT NOT NULL,
  selected_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Security Features

### JWT Token Security
- **Token Signing**: Tokens signed with secret key
- **Token Expiry**: Configurable expiration (default: 24h)
- **Session Management**: Automatic cleanup of expired sessions
- **Token Hashing**: Tokens hashed before database storage

### User Isolation
- **Separate Authentication**: Each user has independent OAuth2 tokens
- **Separate Property Data**: Each user has independent property selections
- **Database Isolation**: User data completely isolated by user_id
- **Session Tracking**: Sessions tracked and can be revoked

### Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

**HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (missing parameters, invalid data)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (invalid or expired token)
- `404`: Not Found (endpoint or resource not found)
- `500`: Internal Server Error

## Usage Examples

### Standard API Workflow

```bash
# 1. Check user status
curl http://localhost:3000/api/user123/status

# 2. Authenticate user
curl -X POST http://localhost:3000/api/user123/auth

# 3. List available properties
curl http://localhost:3000/api/user123/properties

# 4. Select a property
curl -X POST http://localhost:3000/api/user123/properties/select \
  -H "Content-Type: application/json" \
  -d '{"propertyId": "123456789"}'

# 5. Run a query
curl -X POST http://localhost:3000/api/user123/query/adhoc \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": ["sessions", "users"],
    "dimensions": ["pageTitle"],
    "dateRangeType": "last7",
    "limit": 100
  }'
```

### JWT API Workflow

```bash
# 1. Login and get token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}' | jq -r '.token')

# 2. Use token for subsequent requests
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/status

# 3. List properties
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/properties

# 4. Run query
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": ["sessions", "users"],
    "dimensions": ["pageTitle"],
    "dateRangeType": "last7",
    "limit": 100
  }' http://localhost:3000/api/query/adhoc

# 5. Run session flow analysis
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "analysisType": "path_exploration",
    "dateRangeType": "last7",
    "limit": 100
  }' http://localhost:3000/api/session-flow/explore

# 6. Logout
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/auth/logout
```

## Server Configuration

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DB_PATH=./gsc_auth.db
```

### Starting the Servers

```bash
# Standard API server
npm run api

# JWT API server
npm run api:jwt

# Development mode (with auto-restart)
npm run api:dev
npm run api:jwt:dev
```

## Testing

### API Testing

```bash
# Test standard API
node test-api.js

# Test JWT API
node test-api-jwt.js
```

### Test Coverage

The test suite covers:
- Authentication flows
- Property management
- Query execution
- Error handling
- Security features
- Multi-user isolation

## Production Considerations

### Security Best Practices
- **JWT Secret**: Use strong, unique JWT secret in production
- **HTTPS Only**: Use HTTPS in production environments
- **Token Expiry**: Set appropriate token expiration times
- **Session Cleanup**: Implement automatic cleanup of expired sessions
- **Rate Limiting**: Consider implementing rate limiting for API endpoints

### Scalability
- **Database Optimization**: Index user_id columns for better performance
- **Connection Pooling**: Use connection pooling for database connections
- **Caching**: Consider implementing caching for frequently accessed data
- **Load Balancing**: Use load balancers for multiple server instances

### Monitoring
- **Logging**: Implement comprehensive logging for API requests
- **Metrics**: Monitor API performance and error rates
- **Health Checks**: Implement health check endpoints
- **Alerting**: Set up alerts for critical errors and performance issues

The API system provides a robust, secure, and scalable foundation for integrating Google Analytics 4 data into other applications while maintaining the full functionality of the CLI interface.
