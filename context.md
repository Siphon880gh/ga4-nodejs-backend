# Google Analytics 4 CLI - Technical Context

## Overview

A Node.js application for querying Google Analytics 4 data with OAuth2 authentication and optional BigQuery integration. Provides both interactive CLI and REST API interfaces with multi-user support and JWT authentication.

**Migration Note**: This application has been migrated from Google Search Console (GSC) to Google Analytics 4 (GA4) for comprehensive web analytics.

## Tech Stack

- **Runtime**: Node.js 18+ with ES modules
- **Authentication**: OAuth2 with direct REST API calls + JWT for API
- **Database**: SQLite with better-sqlite3 for user data storage
- **CLI Interface**: Inquirer.js for interactive prompts
- **API Server**: Express.js with JWT authentication middleware
- **Data Sources**: Google Analytics 4 API, BigQuery API
- **Output**: Table (console), JSON, CSV formats with smart sorting
- **Security**: JWT tokens with configurable expiration and session management

## Architecture

```
src/
├── api/           # REST API server and JWT authentication
├── cli/           # CLI interface and prompts
├── core/          # Query execution and presets
├── datasources/   # API integrations (GA4, BigQuery)
└── utils/         # Configuration and utilities
```

### Dual Interface Support

- **CLI Interface**: Interactive command-line tool for direct usage
- **REST API**: HTTP endpoints for integration with other applications
- **JWT Authentication**: Secure token-based authentication for production use
- **Multi-User Support**: User isolation with separate authentication and data storage

## Key Files

### Core Components
- **`src/cli/index.js`** (267 lines) - Main CLI entry point with continuous loop
- **`src/cli/session-flow-cli.js`** (1496 lines) - Interactive session flow analysis with ASCII graphics
- **`src/datasources/analytics.js`** (467 lines) - GA4 API with direct REST API calls
- **`src/api/jwt-routes.js`** (709 lines) - JWT authentication routes and middleware
- **`src/utils/database.js`** (113 lines) - SQLite database operations
- **`config.js`** (211 lines) - Configuration with GA4 presets

**Detailed Implementation**: See feature-specific context files for complete technical details.

## GA4 Migration Lessons Learned

### Critical Authentication Issues Resolved

**Problem**: Google Analytics client libraries have OAuth2 compatibility issues:
- `@google-analytics/admin` package hangs on API calls with OAuth2
- `googleapis` package with `analyticsdata` service has "Login Required" errors
- Client libraries designed for service accounts, not OAuth2 user credentials

**Solution**: Use REST API directly with OAuth2 Bearer tokens for ALL operations:
```javascript
// Property listing (working pattern)
const response = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Query execution (working pattern) 
const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestBody)
});
```

**Key Learnings**:
1. **Consistent API approach** - Use direct REST API calls for both property listing AND data queries
2. **REST API is more reliable** - Raw HTTP calls work better than client libraries for OAuth2
3. **Service accounts vs OAuth2** - Client libraries designed for service accounts, but REST API works with OAuth2
4. **Avoid client library complexity** - Direct API calls are simpler and more reliable

### Required OAuth2 Scopes for GA4

```javascript
const scopes = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/bigquery.readonly'
];
```

**Note**: `analytics.edit` scope is NOT required for listing properties - `analytics.readonly` is sufficient.

## OAuth2 Authentication Flow

**Key Implementation**: Direct REST API calls with OAuth2 Bearer tokens bypass client library issues:

```javascript
// Direct REST API calls (works reliably with OAuth2)
const response = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestBody)
});
```

**Detailed Implementation**: See [context-auth.md](./context-auth.md) for complete authentication system details.

## CLI Interface

Interactive menu system with continuous loop:

1. **Analytics Query: Ad-hoc** - Execute custom GA4 queries with metric/dimension selection
2. **Analytics Query: Report** - Execute predefined preset queries
3. **Session Flow Analysis** - Interactive session flow analysis with ASCII graphics
4. **Analytics List properties** - Show GA4 properties
5. **Analytics Select property** - Interactive property selection with memory
6. **Sign in with Google** - OAuth2 flow setup
7. **Sign out** - Clear authentication data
8. **Exit** - Properly terminate the CLI

**Detailed Implementation**: See [context-cli.md](./context-cli.md) for complete CLI system details.

## Data Sources

- **Google Analytics 4**: OAuth2 with direct REST API calls, SQLite token storage
- **BigQuery (Optional)**: Service account or OAuth2, configurable via environment variables
- **Google Search Console (Legacy)**: OAuth2 with browser consent, SQLite token storage

## Query System

- **Preset Queries**: Built-in GA4 analytics queries with client-side sorting
- **Ad-hoc Queries**: Custom GA4 query builder with interactive sorting
- **Client-Side Sorting**: Reliable sorting applied after API response
- **Multiple Output Formats**: Table, JSON, CSV with smart formatting

**Detailed Implementation**: See [context-sorting.md](./context-sorting.md) for complete sorting system details.

## Property Selection

- **Interactive Selection**: Choose from GA4 properties using arrow keys
- **Persistent Memory**: Your selection is saved in SQLite database
- **Automatic Usage**: Selected property is automatically used for all queries

**Detailed Implementation**: See [context-site-selection.md](./context-site-selection.md) for complete technical details.

## Session Flow Analysis

Interactive session flow analysis with multi-level exploration and ASCII graphics:

### Analysis Types
- **Path Exploration** - Page-level analysis with interactive selection and ASCII path diagrams
- **User Journey Analysis** - User behavior patterns with device/geographic breakdown
- **Funnel Analysis** - Conversion funnel visualization with step-by-step analysis
- **Exit Page Analysis** - Exit rate calculations and page performance metrics
- **Landing Page Analysis** - Entry point analysis with source/medium breakdown
- **Session Exploration** - Individual session analysis with detailed journey paths

### Interactive Features
- **Multi-Level Exploration** - Drill down from broad analytics to individual sessions
- **ASCII Graphics** - Visual path flow diagrams with traffic intensity indicators
- **Session Selection** - Choose specific pages or sessions for detailed analysis
- **Real-time Insights** - Behavioral analysis with engagement metrics
- **Timeline Visualization** - Session timelines with percentage-based ASCII bars

### Key Implementation
```javascript
// Session flow analysis entry point
export async function handleSessionFlowAnalysis(answers, cfg) {
  // Multi-level analysis with interactive selection
  switch (answers.analysisType) {
    case "path_exploration": await analyzePathExploration(auth, propertyId, dateRange); break;
    case "session_exploration": await analyzeSessionExploration(auth, propertyId, dateRange); break;
    // ... other analysis types
  }
}

// Individual session exploration with ASCII graphics
async function showIndividualSessions(auth, propertyId, dateRange) {
  // Lists individual sessions with complete page journeys
  // Interactive selection for detailed session analysis
}
```

**File**: `src/cli/session-flow-cli.js` (1496 lines) - Complete session flow analysis system

## Authentication Helper

Reusable authentication utilities ensure consistent authentication across all CLI functions.

**Detailed Implementation**: See [context-auth.md](./context-auth.md) for complete authentication system details.

## Feature-Specific Documentation

- **API Endpoints**: See [context-api.md](./context-api.md) for complete API documentation and JWT authentication details
- **Property Selection**: See [context-site-selection.md](./context-site-selection.md) for complete property selection system details
- **Sorting System**: See [context-sorting.md](./context-sorting.md) for complete sorting system details

## Configuration

Environment variables in `.env` (optional with property selection):
```bash
GA_PROPERTY_ID=123456789  # Optional - CLI will prompt if not set
GA_CREDENTIALS_FILE=./env/client_secret_*.json
```

## Output Formats

- **Table**: Console-formatted tables with pagination and 3-decimal formatting
- **JSON**: Structured data export with sorting applied
- **CSV**: Spreadsheet-compatible format with sorting applied
- **File Export**: Optional file saving with timestamps

## API Endpoints

- **REST API Server**: Complete REST API with all CLI functionality as HTTP endpoints
- **JWT Authentication**: Secure token-based authentication system for production use
- **Multi-User Support**: User isolation with separate authentication and data storage

**Detailed Implementation**: See [context-api.md](./context-api.md) for complete API documentation and JWT authentication details.

## Recent Updates

### Session Flow Analysis Enhancement (v3.2)
- ✅ **Page Exploration** - Added specific page path exploration with detailed session analysis
- ✅ **Broad Path Statistics** - Comprehensive path exploration stats with traffic flow analysis
- ✅ **Session-Level Analysis** - Individual session exploration with complete page journeys
- ✅ **ASCII Graphics** - Enhanced visual path flow diagrams with traffic intensity indicators
- ✅ **Multi-Level Exploration** - Drill down from broad analytics to individual sessions

### Authentication Fix (v3.1)
- ✅ **Consistent REST API** - Fixed authentication issues by using direct REST API calls for all operations
- ✅ **Query Execution Fixed** - Ad hoc and reports now work with same OAuth2 authentication as property listing
- ✅ **Client Library Issues Resolved** - Bypassed Google Analytics client library OAuth2 compatibility problems
- ✅ **Reliable Authentication** - All features now use consistent direct REST API approach

### API Endpoints (v3.0)
- ✅ **REST API Server** - Complete REST API with all CLI functionality
- ✅ **JWT Authentication** - Secure token-based authentication system
- ✅ **Multi-User Support** - User isolation with separate authentication and data
- ✅ **API Documentation** - Comprehensive documentation for both API versions
- ✅ **Production Ready** - JWT-based authentication for production deployment

### Enhanced UX and Pagination (v2.4)
- ✅ **Smart Pagination** - Table output now supports pagination with 50 rows per page
- ✅ **Interactive Navigation** - Press Enter to continue or 'q' to return to menu
- ✅ **Screen Clearing** - Clean page transitions for better readability
- ✅ **Progress Tracking** - Shows current page and total pages with row counts
- ✅ **Flexible Exit** - Users can quit pagination at any time to return to main menu

### Advanced Sorting System (v2.3)
- ✅ **Multi-Level Sorting** - Primary and secondary sorting with selection order tracking
- ✅ **No Default Selection** - Sorting prompts start with nothing selected for cleaner UX
- ✅ **Column Selection** - Ad-hoc queries now support interactive column selection
- ✅ **Real-Time Feedback** - Visual indicators show current sorting configuration
- ✅ **Smart Validation** - Prevents duplicate column selections and invalid combinations

### Query System Redesign (v2.2)
- ✅ **Separate Query Options** - Ad-hoc and Report queries are now distinct root menu items
- ✅ **Report Query Optimization** - No sorting prompts for preset queries (use built-in sorting)
- ✅ **Impressions-Based Presets** - Added "Top Queries by Impressions" and "Top Pages by Impressions"
- ✅ **Client-Side Sorting** - Reliable sorting implementation for preset queries
- ✅ **Streamlined UX** - Direct access to query types without intermediate menu steps

### Database Migration (v2.0)
- ✅ **SQLite Database** - Migrated from JSON files to SQLite for scalable user data storage
- ✅ **User Isolation** - Each user's authentication and site data stored separately by userId
- ✅ **Database Operations** - OAuth2 tokens and site selections stored in `gsc_auth.db`
- ✅ **Scalable Architecture** - Ready for multi-user applications

### Enhanced Sorting System (v2.1)
- ✅ **Smart Sorting UX** - Single-screen multiselect with organized ASC/DSC options
- ✅ **Selection Order Tracking** - First selected = primary, second = secondary, etc.
- ✅ **Real-Time Feedback** - Shows current sorting with visual indicators (↑↓)
- ✅ **Duplicate Prevention** - Cannot select both ASC and DSC versions of same column
- ✅ **Number Formatting** - Table values formatted to 3 decimal places for readability

### Core Features
- ✅ **OAuth2 Authentication** - Browser-based consent flow with SQLite token storage
- ✅ **Interactive Menu** - Enhanced CLI with separate query options
- ✅ **Smart Property Selection** - Interactive property selection with SQLite memory
- ✅ **Continuous CLI Loop** - Returns to main menu after each action
- ✅ **Direct REST API Calls** - Bypassed Google Analytics client library OAuth2 issues
- ✅ **Flexible Output** - Table, JSON, CSV with smart sorting and formatting

## Development

```bash
npm run dev          # Watch mode
npm test            # Run tests
npm run lint        # ESLint
npm run format      # Prettier
```

## Dependencies

- `@googleapis/analyticsdata` - Google Analytics Data API
- `@googleapis/analyticsadmin` - Google Analytics Admin API
- `@googleapis/searchconsole` - Google Search Console API (legacy)
- `google-auth-library` - OAuth2 authentication
- `better-sqlite3` - SQLite database for user data storage
- `inquirer` - CLI prompts and interactive interfaces
- `chalk` - Console styling and colors
- `ora` - Loading spinners
- `open` - Browser opening
- `csv-stringify` - CSV output formatting
