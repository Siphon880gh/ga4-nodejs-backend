# GA4 Migration Lessons Learned

## Critical Issues Resolved

### 1. Google Analytics Admin API Client Library OAuth2 Issues

**Problem**: Client libraries have OAuth2 compatibility issues:
- `@google-analytics/admin` package hangs on API calls with OAuth2
- `googleapis` package with `analyticsadmin` service has authentication errors
- Client libraries designed for service accounts, not OAuth2 user credentials

**Solution**: Use REST API directly with OAuth2 Bearer tokens:
```javascript
// Direct REST API call (works reliably with OAuth2)
const response = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### 2. Authentication Scope Requirements

**Required OAuth2 Scopes for GA4**:
```javascript
const scopes = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/bigquery.readonly'
];
```

**Important**: `analytics.edit` scope is NOT required for listing properties - `analytics.readonly` is sufficient.

### 3. API Endpoint Selection

**For listing GA4 properties**:
- Use `accountSummaries.list` endpoint (easiest way to get all accounts and their property summaries)
- Requires `analytics.readonly` scope
- Returns both account info and property summaries in one call

**For GA4 data queries**:
- Use Analytics Data API (`analyticsdata.googleapis.com`)
- Endpoint: `properties/{propertyId}:runReport`
- Requires `analytics.readonly` scope

## Key Learnings

1. **Don't assume authentication issues** - Hanging was client library problem, not auth
2. **REST API is more reliable** - Raw HTTP calls work better than client libraries for OAuth2
3. **Service accounts vs OAuth2** - Admin API designed for service accounts, but REST API works with OAuth2
4. **Avoid client library complexity** - Direct API calls are simpler and more reliable
5. **Use correct API versions** - `v1beta` for Analytics Admin API, `v1beta` for Analytics Data API

## Implementation Pattern

```javascript
// 1. Get OAuth2 token
const accessToken = await auth.getAccessToken();
const token = accessToken.token;

// 2. Make direct REST API call
const response = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// 3. Handle response
if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`HTTP ${response.status}: ${errorText}`);
}

const data = await response.json();
```

## Common Pitfalls to Avoid

1. **Don't use client libraries for OAuth2** - They're designed for service accounts
2. **Don't assume `analytics.edit` is needed** - `analytics.readonly` is sufficient for listing
3. **Don't use `v1` API version** - Use `v1beta` for Analytics Admin API
4. **Don't ignore HTTP status codes** - Check `response.ok` before parsing JSON
5. **Don't assume hanging is auth issue** - It's usually a client library problem

## Migration Checklist

- [ ] Update OAuth2 scopes to include `analytics.readonly`
- [ ] Replace client library calls with direct REST API calls
- [ ] Update API endpoints to use `v1beta` versions
- [ ] Test property listing with `accountSummaries.list`
- [ ] Test data queries with Analytics Data API
- [ ] Update error handling for HTTP responses
- [ ] Update documentation to reflect GA4 migration

## Best Practices

1. **Always use direct REST API calls** for OAuth2 authentication
2. **Check HTTP status codes** before parsing responses
3. **Use appropriate API versions** (`v1beta` for Analytics APIs)
4. **Test with minimal scopes first** (`analytics.readonly` before `analytics.edit`)
5. **Handle errors gracefully** with proper error messages
6. **Document API changes** for future reference
