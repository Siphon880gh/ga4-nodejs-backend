# CLI Interface - Technical Details

## Overview

Interactive command-line interface built with Inquirer.js providing menu-driven access to Google Analytics 4 data with OAuth2 authentication.

## Menu System

### Main Menu (`src/cli/prompts.js:16-31`)

```javascript
const base = [
  {
    type: "list",
    name: "action",
    message: "What would you like to do?",
    choices: [
      { name: "Analytics Query: Ad-hoc", value: "adhoc" },
      { name: "Analytics Query: Report", value: "preset" },
      { name: "Analytics List properties", value: "sites" },
      { name: "Analytics Select property", value: "select_site" },
      { name: "Sign in with Google Account that has access to Analytics", value: "auth" },
      { name: "Sign out", value: "signout" },
      { name: "Exit", value: "exit" },
    ],
  }
];
```

### Direct Query Access

Query options are now direct root menu items - no conditional prompts needed:

- **Ad-hoc query** (`value: "adhoc"`) - Takes you directly to custom query builder
- **Report query** (`value: "preset"`) - Takes you directly to preset selection

## Query Modes

### 1. Preset Queries (`src/cli/prompts.js:36-102`)

Built-in GA4 analytics queries with predefined parameters:

```javascript
export async function buildPresetPrompts(cfg, source) {
  const presets = cfg.presets.filter(p => p.source === source);
  
  return [
    {
      type: "list",
      name: "preset",
      message: "Select a preset",
      choices: presets.map(p => ({ name: p.label, value: p.id })),
    },
    {
      type: "list",
      name: "dateRangeType",
      message: "Date range",
      choices: [
        { name: "Last 7 days", value: "last7" },
        { name: "Last 28 days", value: "last28" },
        { name: "Last 90 days", value: "last90" },
        { name: "Custom range", value: "custom" },
      ],
    }
  ];
}
```

### 2. Ad-hoc Queries (`src/cli/prompts.js:104-205`)

Custom query builder with dynamic field selection:

```javascript
export async function buildAdhocPrompts(cfg, source) {
  const metrics = Object.entries(sourceConfig.metrics || {})
    .map(([key, value]) => ({ name: `${key} (${value})`, value: value }));
  
  return [
    {
      type: "checkbox",
      name: "metrics",
      message: "Select metrics",
      choices: metrics,
      validate: (input) => input.length > 0 ? true : "Please select at least one metric",
    }
  ];
}
```

## Property Selection

### Property Selection Handler (`src/cli/index.js:81-103`)

```javascript
async function handlePropertySelection(cfg) {
  const spinner = ora("Fetching available properties...").start();
  try {
    // Fetch properties first
    const verifiedProperties = await getVerifiedProperties(cfg);
    spinner.succeed(`Found ${verifiedProperties.length} verified properties`);
    
    // Build prompts with the fetched properties
    const answers = await inquirer.prompt(buildPropertySelectionPrompts(verifiedProperties));
    
    const success = saveSelectedProperty(answers.selectedProperty);
    if (success) {
      console.log(chalk.green(`Selected property: ${answers.selectedProperty}`));
      console.log(chalk.blue("This property will be used for all queries until you change it."));
    }
  } catch (error) {
    spinner.fail("Property selection failed");
    console.error(chalk.red(error.message));
  }
}
```

### Property Selection Prompts (`src/cli/prompts.js:50-72`)

```javascript
export function buildPropertySelectionPrompts(verifiedProperties) {
  return [
    {
      type: "list",
      name: "selectedProperty",
      message: "Select a Google Analytics property",
      choices: verifiedProperties.map(property => ({
        name: `${property.displayName} (${property.propertyId})`,
        value: property.propertyId,
        short: property.displayName
      })),
      default: currentProperty ? verifiedProperties.findIndex(property => property.propertyId === currentProperty) : 0,
    }
  ];
}
```

## Action Handlers

### Authentication Handler (`src/cli/index.js:40-64`)

```javascript
async function handleAuthentication(cfg) {
  const spinner = ora("Authenticating with Google...").start();
  try {
    // Set dummy site URL for authentication
    process.env.GSC_SITE_URL = "https://example.com/";
    
    const auth = await getOAuth2Client(cfg.sources.searchconsole);
    spinner.succeed("Authentication successful!");
  } catch (error) {
    spinner.fail("Authentication failed");
  }
}
```

### Property Listing Handler (`src/cli/index.js:47-62`)

```javascript
async function handleListProperties(cfg) {
  const spinner = ora("Fetching available properties...").start();
  try {
    const properties = await getAvailableProperties(cfg);
    spinner.succeed(`Found ${properties.length} properties`);
    
    properties.forEach((property, index) => {
      console.log(`${index + 1}. ${chalk.cyan(property.displayName)}`);
      console.log(`   Property ID: ${chalk.gray(property.propertyId)}`);
      console.log(`   Account: ${chalk.gray(property.accountName)}`);
    });
  } catch (error) {
    spinner.fail("Failed to fetch properties");
  }
}
```

## Input Validation

### Date Validation (`src/cli/prompts.js:66-84`)

```javascript
{
  type: "input",
  name: "customStartDate",
  message: "Start date (YYYY-MM-DD)",
  when: (answers) => answers.dateRangeType === "custom",
  validate: (input) => {
    if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return "Please enter a valid date in YYYY-MM-DD format";
    }
    return true;
  },
}
```

### Metric/Dimension Validation

```javascript
validate: (input) => {
  if (input.length === 0) {
    return "Please select at least one metric";
  }
  return true;
}
```

## Date Range Processing

### Date Calculation (`src/cli/prompts.js:207-233`)

```javascript
export function getDateRange(type, customStart, customEnd) {
  const today = new Date();
  const formatDate = (date) => date.toISOString().split('T')[0];

  switch (type) {
    case "last7":
      const last7 = new Date(today);
      last7.setDate(today.getDate() - 7);
      return { start: formatDate(last7), end: formatDate(today) };
    
    case "last28":
      const last28 = new Date(today);
      last28.setDate(today.getDate() - 28);
      return { start: formatDate(last28), end: formatDate(today) };
    
    case "custom":
      return { start: customStart, end: customEnd };
  }
}
```

## Output Configuration

### Format Selection

```javascript
{
  type: "list",
  name: "outputFormat",
  message: "Output format",
  choices: [
    { name: "Table (console)", value: "table" },
    { name: "JSON", value: "json" },
    { name: "CSV", value: "csv" },
  ],
}
```

### File Export Options

```javascript
{
  type: "confirm",
  name: "saveToFile",
  message: "Save to file?",
  default: false,
}
```

## User Experience

### Loading States

```javascript
const spinner = ora("Running query...").start();
try {
  const rows = await runQuery(answers, cfg);
  spinner.succeed(`Fetched ${rows.length} rows`);
} catch (e) {
  spinner.fail("Query failed");
}
```

### Error Handling

```javascript
try {
  // Query execution
} catch (e) {
  console.error(chalk.red(e.message));
  process.exitCode = 1;
}
```

### Color Coding

- **Success**: Green (`chalk.green`)
- **Error**: Red (`chalk.red`)
- **Info**: Blue (`chalk.blue`)
- **Warning**: Yellow (`chalk.yellow`)
- **Highlight**: Cyan (`chalk.cyan`)

## Configuration Integration

### Source Validation (`src/cli/validators.js:1-34`)

```javascript
export function validateConfig(cfg) {
  const errors = [];

  if (cfg.sources.analytics?.enabled) {
    if (!cfg.sources.analytics.propertyId && !process.env.GA_PROPERTY_ID) {
      errors.push("GA4 property ID is required");
    }
    if (!cfg.sources.analytics.credentialsFile && !process.env.GA_CREDENTIALS_FILE) {
      errors.push("GA4 credentials are required");
    }
  }

  return errors;
}
```

### Dynamic Source Loading

```javascript
const enabledSources = Object.entries(cfg.sources)
  .filter(([, v]) => v.enabled)
  .map(([k, v]) => ({ 
    name: k === 'bigquery' ? `${k.toUpperCase()} (Optional)` : k.toUpperCase(), 
    value: k 
  }));
```

## CLI Entry Point

### Main Function (`src/cli/index.js:105-194`)

```javascript
async function main() {
  try {
    const cfg = loadConfig();
    
    // Main CLI loop
    while (true) {
      try {
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
        
        // Query execution flow for both adhoc and preset
        // ... rest of query logic
        await waitForEnter();
      } catch (e) {
        console.error(chalk.red(`Error: ${e.message}`));
        await waitForEnter();
      }
    }
  } catch (e) {
    console.error(chalk.red(`Configuration error: ${e.message}`));
  }
}
```

### Wait for Enter Helper (`src/cli/index.js:22-30`)

```javascript
async function waitForEnter() {
  await inquirer.prompt([{
    type: 'input',
    name: 'continue',
    message: 'Press Enter to continue...',
    validate: () => true
  }]);
}
```
