# Dimension Processors

Dimension processors are functions that transform raw API data into derived dimensions and formatted values. This system allows you to create custom data transformations without modifying the core analytics code.

## Overview

The dimension processor system consists of:

1. **Processor Functions** - Individual functions that transform data
2. **Registry** - Maps dimension names to their processors
3. **Source Mapping** - Maps derived dimensions to their source data
4. **Integration** - Automatic processing in analytics queries

## File Structure

```
src/utils/
├── dimension-processors.js    # Main processor functions
└── README-dimension-processors.md  # This documentation
```

## Adding a New Dimension Processor

### Step 1: Create the Processor Function

Add your processor function to `dimension-processors.js`:

```javascript
/**
 * Process custom dimension
 * @param {Object} row - The data row
 * @param {string} sourceValue - The source dimension value
 * @returns {string|number} - The processed value
 */
export function processCustomDimension(row, sourceValue) {
  if (!sourceValue) return '';
  
  // Your processing logic here
  return sourceValue.toUpperCase();
}
```

### Step 2: Add to Registry

Add your processor to the `DIMENSION_PROCESSORS` object:

```javascript
export const DIMENSION_PROCESSORS = {
  exitPath: processExitPath,
  domain: processDomain,
  pageTitle: processPageTitle,
  userType: processUserType,
  deviceCategory: processDeviceCategory,
  customDimension: processCustomDimension, // ← Add your processor
};
```

### Step 3: Add Source Mapping

Update the `getSourceValue` function to map your derived dimension to its source:

```javascript
function getSourceValue(dimension, row) {
  const sourceMap = {
    exitPath: 'pagePath',
    domain: 'pagePath',
    pageTitle: 'pageTitle',
    userType: 'userType',
    deviceCategory: 'deviceCategory',
    customDimension: 'sourceField', // ← Add your mapping
  };
  
  const sourceDimension = sourceMap[dimension];
  return sourceDimension ? row[sourceDimension] : '';
}
```

### Step 4: Update Configuration

Add your dimension to `config.js`:

```javascript
dimensions: {
  // ... existing dimensions
  customDimension: "sourceField", // Derived dimension - processed from sourceField
},
```

## Processor Function Patterns

### Text Processing

```javascript
export function processPageTitle(row, pageTitle) {
  if (!pageTitle) return '';
  
  return pageTitle
    .replace(/\s*-\s*.*$/, '') // Remove everything after the last dash
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}
```

### URL Processing

```javascript
export function processDomain(row, pagePath) {
  if (!pagePath) return '';
  
  try {
    const url = new URL(pagePath, 'https://example.com');
    return url.hostname;
  } catch {
    return '';
  }
}
```

### Mapping/Lookup Processing

```javascript
export function processUserType(row, userType) {
  if (!userType) return '';
  
  const typeMap = {
    'new': 'New User',
    'returning': 'Returning User'
  };
  
  return typeMap[userType.toLowerCase()] || userType;
}
```

### Mathematical Processing

```javascript
export function processConversionRate(row, conversions) {
  const sessions = row.sessions || 0;
  const conversions = parseFloat(conversions) || 0;
  
  if (sessions === 0) return 0;
  return (conversions / sessions * 100).toFixed(2) + '%';
}
```

### Date Processing

```javascript
export function processDateFormatted(row, date) {
  if (!date) return '';
  
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
```

## Advanced Patterns

### Multi-Source Processing

```javascript
export function processFullUrl(row, pagePath) {
  const domain = row.domain || 'example.com';
  const path = pagePath || '/';
  
  return `https://${domain}${path}`;
}
```

### Conditional Processing

```javascript
export function processTrafficSource(row, source) {
  const medium = row.medium || '';
  
  if (medium === 'organic') {
    return `Organic Search (${source})`;
  } else if (medium === 'cpc') {
    return `Paid Search (${source})`;
  } else {
    return source;
  }
}
```

### Array Processing

```javascript
export function processKeywords(row, query) {
  if (!query) return '';
  
  return query
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
```

## Testing Your Processors

Create test cases for your processors:

```javascript
// Test your processor function
const testRow = { pagePath: '/products/item?ref=home#section1' };
const result = processExitPath(testRow, testRow.pagePath);
console.log(result); // Should output: '/products/item'
```

## Best Practices

1. **Handle null/undefined values** - Always check for empty values
2. **Use descriptive names** - Function names should clearly indicate what they do
3. **Keep functions pure** - Don't modify the input row object
4. **Add JSDoc comments** - Document parameters and return values
5. **Test edge cases** - Handle unexpected input gracefully
6. **Use consistent return types** - Strings for text, numbers for calculations

## Common Use Cases

- **URL cleaning** - Remove query parameters, normalize paths
- **Text formatting** - Title case, trim whitespace, remove suffixes
- **Data mapping** - Convert codes to readable labels
- **Calculations** - Compute rates, percentages, ratios
- **Date formatting** - Convert to readable date formats
- **Categorization** - Group data into meaningful categories

## Integration

The processors are automatically applied when:
1. A query includes a dimension that has a processor
2. The processor is registered in `DIMENSION_PROCESSORS`
3. The source mapping is defined in `getSourceValue`

No additional configuration is needed - the system automatically detects and applies processors based on the dimensions in your query.
