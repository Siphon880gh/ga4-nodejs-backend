// config.js
export default {
  // User configuration for database storage
  userId: 1,
  
  // Which data sources are enabled
  sources: {
    analytics: {
      enabled: true,
      // OAuth2 credentials file path
      credentialsFile: process.env.GA_CREDENTIALS_FILE || "./env/client_secret_13637964853-idpadi9v97al25mv4jnva14n0m99sath.apps.googleusercontent.com.json",
      propertyId: process.env.GA_PROPERTY_ID || "",
      // Default date range if user skips input
      defaultDateRange: { start: "2025-01-01", end: "2025-12-31" },
      // Google Analytics 4 metrics
      metrics: {
        sessions: "sessions",
        users: "totalUsers",
        pageviews: "screenPageViews",
        bounceRate: "bounceRate",
        sessionDuration: "averageSessionDuration",
        conversionRate: "conversions",
        revenue: "totalRevenue",
        transactions: "ecommercePurchases",
        newUsers: "newUsers",
        returnUsers: "activeUsers",
      },
      // Google Analytics 4 dimensions
      dimensions: {
        date: "date",
        country: "country",
        city: "city",
        deviceCategory: "deviceCategory",
        operatingSystem: "operatingSystem",
        browser: "browser",
        source: "sessionSource",
        medium: "sessionMedium",
        campaign: "sessionCampaignName",
        pagePath: "pagePath",
        pageTitle: "pageTitle",
        landingPage: "landingPage",
        exitPage: "pagePath",
        userType: "newVsReturning",
        trafficSource: "sessionDefaultChannelGrouping",
        hour: "hour",
        dayOfWeek: "dayOfWeek",
        month: "month",
        year: "year",
      },
      // Analytics API page size default
      pageSize: 1000,
    },
    searchconsole: {
      enabled: false, // Disabled in favor of Analytics
      // OAuth2 credentials file path
      credentialsFile: process.env.GSC_CREDENTIALS_FILE || "./env/client_secret_13637964853-bqgo2khek52dtvgb6gg01kg3ste21qto.apps.googleusercontent.com.json",
      siteUrl: process.env.GSC_SITE_URL || "",
      // Default date range if user skips input
      defaultDateRange: { start: "2025-01-01", end: "2025-12-31" },
      // GSC metrics (always available)
      metrics: {
        clicks: "clicks",
        impressions: "impressions",
        ctr: "ctr",
        position: "position",
      },
      // GSC dimensions
      dimensions: {
        query: "query",
        page: "page",
        country: "country",
        device: "device",
        searchAppearance: "searchAppearance",
        date: "date",
      },
      // GSC API page size default
      pageSize: 1000,
    },
    bigquery: {
      enabled: false, // Optional - set to true if you want to use BigQuery with GSC data
      // Service account via env GOOGLE_APPLICATION_CREDENTIALS or inline
      projectId: process.env.BQ_PROJECT_ID || "",
      dataset: process.env.BQ_DATASET || "",
      // Optional table mapping helpers
      tables: {
        gscData: "gsc_data_*", // wildcards allowed
        pages: "pages",        // example custom table
      },
      location: process.env.BQ_LOCATION || "US",
      defaultDateRange: { start: "2025-01-01", end: "2025-12-31" },
    },
  },

  // Query presets for Google Analytics 4
  presets: [
    {
      id: "overview-dashboard",
      label: "Analytics Overview Dashboard",
      source: "analytics",
      metrics: ["sessions", "users", "pageviews", "bounceRate"],
      dimensions: ["date"],
      orderBys: [{ dimension: "date", desc: false }],
      limit: 30,
      filters: [],
    },
    {
      id: "top-pages",
      label: "Top Pages by Pageviews",
      source: "analytics",
      metrics: ["pageviews", "sessions", "bounceRate"],
      dimensions: ["pagePath", "pageTitle"],
      orderBys: [{ metric: "pageviews", desc: true }],
      limit: 50,
      filters: [],
    },
    {
      id: "traffic-sources",
      label: "Traffic Sources Overview",
      source: "analytics",
      metrics: ["sessions", "users", "bounceRate", "sessionDuration"],
      dimensions: ["source", "medium"],
      orderBys: [{ metric: "sessions", desc: true }],
      limit: 50,
      filters: [],
    },
    {
      id: "device-breakdown",
      label: "Performance by Device",
      source: "analytics",
      metrics: ["sessions", "users", "bounceRate", "sessionDuration"],
      dimensions: ["deviceCategory"],
      orderBys: [{ metric: "sessions", desc: true }],
      limit: 10,
      filters: [],
    },
    {
      id: "geographic-analysis",
      label: "Geographic Analysis",
      source: "analytics",
      metrics: ["sessions", "users", "bounceRate"],
      dimensions: ["country", "city"],
      orderBys: [{ metric: "sessions", desc: true }],
      limit: 100,
      filters: [],
    },
    {
      id: "user-behavior",
      label: "User Behavior Analysis",
      source: "analytics",
      metrics: ["sessions", "users", "newUsers", "returnUsers"],
      dimensions: ["userType"],
      orderBys: [{ metric: "sessions", desc: true }],
      limit: 10,
      filters: [],
    },
    {
      id: "conversion-funnel",
      label: "Conversion & Revenue",
      source: "analytics",
      metrics: ["sessions", "conversionRate", "revenue", "transactions"],
      dimensions: ["source", "medium"],
      orderBys: [{ metric: "revenue", desc: true }],
      limit: 50,
      filters: [],
    },
    {
      id: "hourly-activity",
      label: "Hourly Activity Pattern",
      source: "analytics",
      metrics: ["sessions", "users"],
      dimensions: ["hour"],
      orderBys: [{ dimension: "hour", desc: false }],
      limit: 24,
      filters: [],
    },
    {
      id: "landing-pages",
      label: "Top Landing Pages",
      source: "analytics",
      metrics: ["sessions", "bounceRate", "sessionDuration"],
      dimensions: ["landingPage"],
      orderBys: [{ metric: "sessions", desc: true }],
      limit: 50,
      filters: [],
    },
    {
      id: "campaign-performance",
      label: "Campaign Performance",
      source: "analytics",
      metrics: ["sessions", "users", "conversionRate", "revenue"],
      dimensions: ["campaign", "source", "medium"],
      orderBys: [{ metric: "sessions", desc: true }],
      limit: 100,
      filters: [],
    },
  ],

  // Output settings
  output: {
    defaultFormat: "table", // "table" | "json" | "csv"
    saveToFileByDefault: false,
    outDir: "./.out",
  },

  // Safety limits
  limits: {
    maxRows: 100000,
    maxRuntimeMs: 120000,
  },
};
