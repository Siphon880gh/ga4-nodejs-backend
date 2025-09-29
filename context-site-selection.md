# Property Selection - Technical Details

## Overview

Interactive property selection system that allows users to choose Google Analytics 4 properties and remembers their choice across CLI sessions. Eliminates the need for manual environment variable configuration.

## Property Manager (`src/utils/property-manager.js` - 83 lines)

### Core Functions

```javascript
// Get currently selected property
export function getSelectedProperty() {
  if (!existsSync(PROPERTY_CONFIG_PATH)) return null;
  const config = JSON.parse(readFileSync(PROPERTY_CONFIG_PATH, 'utf8'));
  return config.propertyId;
}

// Save selected property
export function saveSelectedProperty(propertyId) {
  const config = { propertyId, selectedAt: new Date().toISOString() };
  writeFileSync(PROPERTY_CONFIG_PATH, JSON.stringify(config, null, 2));
  return true;
}

// Get accessible properties only
export async function getAccessibleProperties(cfg) {
  const properties = await getAvailableProperties(cfg);
  return properties.filter(property => 
    property.accessLevel === 'owner' || property.accessLevel === 'editor'
  );
}
```

### Property Storage

**File**: `.selected_property.json`
```json
{
  "propertyId": "123456789",
  "selectedAt": "2025-01-27T10:30:00.000Z"
}
```

## CLI Integration

### Property Selection Handler (`src/cli/index.js:81-103`)

```javascript
async function handlePropertySelection(cfg) {
  const spinner = ora("Fetching available properties...").start();
  try {
    // Fetch properties first
    const accessibleProperties = await getAccessibleProperties(cfg);
    spinner.succeed(`Found ${accessibleProperties.length} accessible properties`);
    
    // Build prompts with the fetched properties
    const answers = await inquirer.prompt(buildPropertySelectionPrompts(accessibleProperties));
    
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
export function buildPropertySelectionPrompts(accessibleProperties) {
  if (accessibleProperties.length === 0) {
    throw new Error("No accessible Google Analytics properties found.");
  }

  const currentProperty = getSelectedProperty();
  
  return [
    {
      type: "list",
      name: "selectedProperty",
      message: "Select a Google Analytics property",
      choices: accessibleProperties.map(property => ({
        name: `${property.displayName} (${property.propertyId})`,
        value: property.propertyId,
        short: property.displayName
      })),
      default: currentProperty ? accessibleProperties.findIndex(property => property.propertyId === currentProperty) : 0,
    }
  ];
}
```

## Query Integration

### Automatic Property Usage (`src/cli/index.js:152-160`)

```javascript
// Check if we need to select a property for GA4 queries
if (initialAnswers.source === "analytics") {
  if (!hasValidPropertySelection()) {
    console.log(chalk.yellow("No Google Analytics property selected."));
    console.log(chalk.blue("Please select a property first."));
    await handlePropertySelection(cfg);
    await waitForEnter();
    continue;
  }
  
  // Set the selected property as environment variable for the query
  const selectedProperty = getSelectedProperty();
  process.env.GA_PROPERTY_ID = selectedProperty;
  console.log(chalk.blue(`Using property: ${selectedProperty}`));
}
```

## User Experience Flow

1. **First Time**: User runs GA4 query → CLI prompts to select property
2. **Property Selection**: Interactive list shows accessible properties with account info
3. **Memory**: Selection saved to `.selected_property.json`
4. **Automatic Usage**: Selected property used for all future queries
5. **Easy Changes**: "Select/Change property" menu option to switch properties

## Features

- **Accessible Properties Only**: Filters to show only properties with proper access
- **Persistent Memory**: Remembers selection across CLI sessions
- **Interactive Selection**: Arrow key navigation with inquirer
- **Account Display**: Shows account name and property details
- **Default Selection**: Highlights currently selected property
- **Error Handling**: Graceful handling of API failures

## Configuration

### Environment Variables (Now Optional)
```bash
GA_PROPERTY_ID=123456789  # Optional - CLI will prompt if not set
GA_CREDENTIALS_FILE=./env/client_secret_*.json
```

### Git Ignore
```gitignore
.selected_property.json  # User's property selection
```

## Error Handling

- **No Properties Found**: Clear error message with guidance
- **API Failures**: Graceful fallback with retry options
- **Invalid Selection**: Validation and re-prompting
- **File System Errors**: Proper error messages for storage issues

## Benefits

- **No Manual Configuration**: Eliminates need to edit `.env` files
- **User-Friendly**: Interactive selection with clear options
- **Persistent**: Remembers choice across sessions
- **Flexible**: Easy to change properties anytime
- **Accessible Only**: Only shows properties with proper access
