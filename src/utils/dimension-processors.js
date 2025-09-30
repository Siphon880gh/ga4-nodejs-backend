/**
 * Dimension processors for derived dimensions and post-processing
 * These functions transform raw API data into derived dimensions
 */


/**
 * Extract domain from pagePath
 * @param {Object} row - The data row
 * @param {string} pagePath - The pagePath value
 * @returns {string} - The domain
 */
export function processDomain(row, pagePath) {
  if (!pagePath) return '';
  
  try {
    const url = new URL(pagePath, 'https://example.com');
    return url.hostname;
  } catch {
    return '';
  }
}

/**
 * Extract page title from pageTitle, cleaning it up
 * @param {Object} row - The data row
 * @param {string} pageTitle - The pageTitle value
 * @returns {string} - The cleaned page title
 */
export function processPageTitle(row, pageTitle) {
  if (!pageTitle) return '';
  
  // Remove common suffixes and clean up
  return pageTitle
    .replace(/\s*-\s*.*$/, '') // Remove everything after the last dash
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Process user type for better readability
 * @param {Object} row - The data row
 * @param {string} userType - The userType value
 * @returns {string} - The processed user type
 */
export function processUserType(row, userType) {
  if (!userType) return '';
  
  const typeMap = {
    'new': 'New User',
    'returning': 'Returning User'
  };
  
  return typeMap[userType.toLowerCase()] || userType;
}

/**
 * Process device category for better readability
 * @param {Object} row - The data row
 * @param {string} deviceCategory - The deviceCategory value
 * @returns {string} - The processed device category
 */
export function processDeviceCategory(row, deviceCategory) {
  if (!deviceCategory) return '';
  
  const categoryMap = {
    'desktop': 'Desktop',
    'mobile': 'Mobile',
    'tablet': 'Tablet'
  };
  
  return categoryMap[deviceCategory.toLowerCase()] || deviceCategory;
}


/**
 * Registry of dimension processors
 * Maps dimension names to their processing functions
 */
export const DIMENSION_PROCESSORS = {
  domain: processDomain,
  pageTitle: processPageTitle,
  userType: processUserType,
  deviceCategory: processDeviceCategory,
};

/**
 * Process a row of data using dimension processors
 * @param {Object} row - The data row
 * @param {string[]} dimensions - Array of dimension names
 * @returns {Object} - The processed row
 */
export function processRow(row, dimensions) {
  const processedRow = { ...row };
  
  dimensions.forEach(dimension => {
    const processor = DIMENSION_PROCESSORS[dimension];
    if (processor) {
      // Get the source dimension value (e.g., pagePath for exitPath)
      const sourceValue = getSourceValue(dimension, row);
      processedRow[dimension] = processor(row, sourceValue);
    }
  });
  
  return processedRow;
}

/**
 * Get the source dimension value for a derived dimension
 * @param {string} dimension - The derived dimension name
 * @param {Object} row - The data row
 * @returns {string} - The source value
 */
function getSourceValue(dimension, row) {
  const sourceMap = {
    domain: 'pagePath',
    pageTitle: 'pageTitle',
    userType: 'userType',
    deviceCategory: 'deviceCategory',
  };
  
  const sourceDimension = sourceMap[dimension];
  return sourceDimension ? row[sourceDimension] : '';
}
