import fs from "node:fs";
import path from "node:path";
import { stringify } from "csv-stringify/sync";
import chalk from "chalk";
import inquirer from "inquirer";

// Global filter state management
let currentFilters = {
  queryFilters: [], // Array of {field, operator, value}
  compareFilters: [] // Array of {field, operator, value}
};

// Filter application functions
function applyQueryFilter(rows, field, operator, value) {
  return rows.filter(row => {
    const fieldValue = String(row[field] || '').toLowerCase();
    const filterValue = value.toLowerCase();
    
    switch (operator) {
      case '=':
        return fieldValue === filterValue;
      case '*':
        return fieldValue.includes(filterValue);
      case '<>':
        return fieldValue !== filterValue;
      case '<*>':
        return !fieldValue.includes(filterValue);
      default:
        return true;
    }
  });
}

function applyCompareFilter(rows, field, operator, value) {
  return rows.filter(row => {
    const fieldValue = Number(row[field]);
    const filterValue = Number(value);
    
    if (isNaN(fieldValue) || isNaN(filterValue)) {
      return false;
    }
    
    switch (operator) {
      case '>=':
        return fieldValue >= filterValue;
      case '<=':
        return fieldValue <= filterValue;
      case '>':
        return fieldValue > filterValue;
      case '<':
        return fieldValue < filterValue;
      case '=':
        return fieldValue === filterValue;
      default:
        return true;
    }
  });
}

function applyAllFilters(rows) {
  let filteredRows = rows;
  
  // Apply query filters
  for (const filter of currentFilters.queryFilters) {
    filteredRows = applyQueryFilter(filteredRows, filter.field, filter.operator, filter.value);
  }
  
  // Apply compare filters
  for (const filter of currentFilters.compareFilters) {
    filteredRows = applyCompareFilter(filteredRows, filter.field, filter.operator, filter.value);
  }
  
  return filteredRows;
}

// Filter utility functions
function getFiltersSummary() {
  const summaries = [];
  
  currentFilters.queryFilters.forEach(filter => {
    summaries.push(`${filter.field}${filter.operator}${filter.value}`);
  });
  
  currentFilters.compareFilters.forEach(filter => {
    summaries.push(`${filter.field}${filter.operator}${filter.value}`);
  });
  
  return summaries.length > 0 ? `Filters: ${summaries.join('; ')}` : '';
}

function clearAllFilters() {
  currentFilters.queryFilters = [];
  currentFilters.compareFilters = [];
}

// Export function to clear filters from outside
export function clearFilters() {
  clearAllFilters();
}

function getAvailableFields(rows) {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]);
}

// Filter handler functions
async function handleQueryFilter(originalRows) {
  const availableFields = getAvailableFields(originalRows);
  
  if (availableFields.length === 0) {
    console.log(chalk.red('No fields available for filtering.'));
    return;
  }
  
  // Field selection
  const fieldAnswer = await inquirer.prompt([{
    type: 'list',
    name: 'field',
    message: 'Which field?',
    choices: availableFields
  }]);
  
  // Operator selection
  const operatorAnswer = await inquirer.prompt([{
    type: 'list',
    name: 'operator',
    message: 'Choose operator:',
    choices: [
      { name: '= (exact match)', value: '=' },
      { name: '* (contains)', value: '*' },
      { name: '<> (not equal)', value: '<>' },
      { name: '<*> (not contains)', value: '<*>' }
    ]
  }]);
  
  // Value input with cancel option
  console.log(`\nEnter value:
Enter 'q' to cancel:`);
  
  const valueAnswer = await inquirer.prompt([{
    type: 'input',
    name: 'value',
    message: '',
    validate: (input) => {
      if (input.toLowerCase().trim() === 'q') {
        return true; // Allow 'q' to cancel
      }
      if (!input.trim()) {
        return 'Value cannot be empty';
      }
      return true;
    }
  }]);
  
  // Check if user wants to cancel
  if (valueAnswer.value.toLowerCase().trim() === 'q') {
    console.log(chalk.blue('Filter cancelled.'));
    return;
  }
  
  // Apply and test filter
  const filteredRows = applyQueryFilter(originalRows, fieldAnswer.field, operatorAnswer.operator, valueAnswer.value);
  
  if (filteredRows.length === 0) {
    console.log(chalk.yellow('Warning: Filter resulted in zero results, but filter will be kept.'));
  } else {
    console.log(chalk.green(`Filter applied: ${filteredRows.length} rows match.`));
  }
  
  // Add to current filters
  currentFilters.queryFilters.push({
    field: fieldAnswer.field,
    operator: operatorAnswer.operator,
    value: valueAnswer.value
  });
}

async function handleCompareFilter(originalRows) {
  const availableFields = getAvailableFields(originalRows);
  
  if (availableFields.length === 0) {
    console.log(chalk.red('No fields available for filtering.'));
    return;
  }
  
  // Field selection
  const fieldAnswer = await inquirer.prompt([{
    type: 'list',
    name: 'field',
    message: 'Which field?',
    choices: availableFields
  }]);
  
  // Operator selection
  const operatorAnswer = await inquirer.prompt([{
    type: 'list',
    name: 'operator',
    message: 'Choose operator:',
    choices: [
      { name: '>= (greater than or equal)', value: '>=' },
      { name: '<= (less than or equal)', value: '<=' },
      { name: '> (greater than)', value: '>' },
      { name: '< (less than)', value: '<' },
      { name: '= (equal to)', value: '=' }
    ]
  }]);
  
  // Value input with cancel option
  console.log(`\nEnter value:
Enter 'q' to cancel:`);
  
  const valueAnswer = await inquirer.prompt([{
    type: 'input',
    name: 'value',
    message: '',
    validate: (input) => {
      if (input.toLowerCase().trim() === 'q') {
        return true; // Allow 'q' to cancel
      }
      if (!input.trim()) {
        return 'Value cannot be empty';
      }
      if (isNaN(Number(input))) {
        return 'Value must be a number';
      }
      return true;
    }
  }]);
  
  // Check if user wants to cancel
  if (valueAnswer.value.toLowerCase().trim() === 'q') {
    console.log(chalk.blue('Filter cancelled.'));
    return;
  }
  
  // Apply and test filter
  const filteredRows = applyCompareFilter(originalRows, fieldAnswer.field, operatorAnswer.operator, valueAnswer.value);
  
  if (filteredRows.length === 0) {
    console.log(chalk.yellow('Warning: Filter resulted in zero results, but filter will be kept.'));
  } else {
    console.log(chalk.green(`Filter applied: ${filteredRows.length} rows match.`));
  }
  
  // Add to current filters
  currentFilters.compareFilters.push({
    field: fieldAnswer.field,
    operator: operatorAnswer.operator,
    value: valueAnswer.value
  });
}

export async function renderOutput(rows, answers, cfg) {
  const fmt = answers.outputFormat || cfg.output.defaultFormat;
  const shouldSave = answers.saveToFile ?? cfg.output.saveToFileByDefault;
  
  // Apply filters first
  let filteredRows = applyAllFilters(rows);
  
  // Apply sorting if enabled
  let sortedRows = filteredRows;
  if (answers.sorting?.columns && !answers.sorting.columns.includes('none')) {
    sortedRows = applySorting(filteredRows, answers.sorting);
  }

  if (fmt === "json") {
    const json = JSON.stringify(sortedRows, null, 2);
    if (shouldSave) {
      return save(json, "json", cfg);
    } else {
      console.log(json);
    }
    return true; // Continue to next prompt
  } else if (fmt === "csv") {
    const csv = stringify(sortedRows, { header: true });
    if (shouldSave) {
      return save(csv, "csv", cfg);
    } else {
      process.stdout.write(csv);
    }
    return true; // Continue to next prompt
  } else {
    // default: table with pagination
    return await displayTableWithPagination(rows, sortedRows);
  }
}

export function applySorting(rows, sortingConfig) {
  // Handle new format with columns array
  if (sortingConfig?.columns) {
    if (sortingConfig.columns.includes('none') || sortingConfig.columns.length === 0) {
      return rows;
    }
    
    // Filter out separators and 'none' values, keeping only actual sort items
    const sortItems = sortingConfig.columns.filter(item => 
      item !== 'none' && 
      item !== 'separator1' && 
      item !== 'separator2' &&
      typeof item === 'object' && 
      item.column && 
      item.direction
    );
    
    if (sortItems.length === 0) {
      return rows;
    }
    
    return rows.sort((a, b) => {
      // Apply sorting for each column in order of selection (priority)
      for (const sortItem of sortItems) {
        const column = sortItem.column;
        const direction = sortItem.direction;
        
        const valueA = a[column];
        const valueB = b[column];
        
        let result = 0;
        if (valueA < valueB) {
          result = -1;
        } else if (valueA > valueB) {
          result = 1;
        }
        
        // Apply direction
        if (direction === 'desc') {
          result *= -1;
        }
        
        // If values are not equal, return the result
        // If they are equal, continue to next sorting column
        if (result !== 0) {
          return result;
        }
      }
      
      return 0; // All values are equal
    });
  }
  
  // Handle legacy format (for backward compatibility)
  if (!sortingConfig?.enabled || !sortingConfig?.primaryColumn) {
    return rows;
  }

  return rows.sort((a, b) => {
    // Primary sorting
    const primaryA = a[sortingConfig.primaryColumn];
    const primaryB = b[sortingConfig.primaryColumn];
    
    let primaryResult = 0;
    if (primaryA < primaryB) {
      primaryResult = -1;
    } else if (primaryA > primaryB) {
      primaryResult = 1;
    }
    
    // Apply primary direction
    if (sortingConfig.primaryDirection === 'desc') {
      primaryResult *= -1;
    }
    
    // If primary values are equal and secondary sorting is enabled
    if (primaryResult === 0 && sortingConfig?.hasSecondary && sortingConfig?.secondaryColumn) {
      const secondaryA = a[sortingConfig.secondaryColumn];
      const secondaryB = b[sortingConfig.secondaryColumn];
      
      let secondaryResult = 0;
      if (secondaryA < secondaryB) {
        secondaryResult = -1;
      } else if (secondaryA > secondaryB) {
        secondaryResult = 1;
      }
      
      // Apply secondary direction
      if (sortingConfig.secondaryDirection === 'desc') {
        secondaryResult *= -1;
      }
      
      return secondaryResult;
    }
    
    return primaryResult;
  });
}

async function displayTableWithPagination(originalRows, filteredRows) {
  const rowsPerPage = 50;
  let currentPage = 0;
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  
  // Show filter summary
  const filterSummary = getFiltersSummary();
  if (filterSummary) {
    console.log(chalk.cyan(`\n${filterSummary}\n`));
  }
  
  console.log(chalk.blue(`\nTotal rows: ${filteredRows.length} (${totalPages} pages)\n`));
  
  while (currentPage < totalPages) {
    const startIndex = currentPage * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, filteredRows.length);
    const pageRows = filteredRows.slice(startIndex, endIndex);
    
    console.log(chalk.gray(`Page ${currentPage + 1} of ${totalPages} (rows ${startIndex + 1}-${endIndex}):\n`));
    
    // Format numbers to 3 decimal places for better readability
    const formattedRows = pageRows.map(row => {
      const formattedRow = {};
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'number' && !Number.isInteger(value)) {
          // Round to 3 decimal places
          formattedRow[key] = Math.round(value * 1000) / 1000;
        } else {
          formattedRow[key] = value;
        }
      }
      return formattedRow;
    });
    
    console.table(formattedRows);
    
    currentPage++;
    
    if (currentPage < totalPages) {
      console.log(chalk.yellow(`\nPress Enter to continue to page ${currentPage + 1} of ${totalPages}, 'q' to return to menu, 'fq' for filter by query, 'fc' for filter by compare, 'fx' to clear filters...`));
      const result = await waitForEnterOrQuit(originalRows);
      if (result === 'quit') {
        console.log(chalk.blue('\nReturning to main menu...'));
        return false; // Return to menu
      } else if (result === 'filter') {
        // Re-apply filters and restart pagination
        const newFilteredRows = applyAllFilters(originalRows);
        return await displayTableWithPagination(originalRows, newFilteredRows);
      }
      console.clear(); // Clear screen for next page
    }
  }
  
  console.log(chalk.green(`\n✅ Displayed all ${filteredRows.length} rows across ${totalPages} pages`));
  return true; // Completed successfully
}

async function waitForEnterOrQuit(originalRows) {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('', async (answer) => {
      rl.close();
      const input = answer.toLowerCase().trim();
      
      if (input === 'q') {
        resolve('quit');
      } else if (input === 'fq') {
        await handleQueryFilter(originalRows);
        resolve('filter');
      } else if (input === 'fc') {
        await handleCompareFilter(originalRows);
        resolve('filter');
      } else if (input === 'fx') {
        clearAllFilters();
        console.log(chalk.green('All filters cleared.'));
        resolve('filter');
      } else {
        resolve('continue');
      }
    });
  });
}

function save(content, ext, cfg) {
  fs.mkdirSync(cfg.output.outDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(cfg.output.outDir, `${timestamp}.${ext}`);
  fs.writeFileSync(file, content);
  console.log(chalk.green(`\nSaved to ${file}`));
}
