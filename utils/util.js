const fs = require('fs');

/**
 * Deletes the specified directory and all its contents.
 * @param {string} dirPath - The path to the directory to delete.
 */
function clearUserDataDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`Deleted user data directory: ${dirPath}`);
    } catch (error) {
      console.error(`Failed to delete user data directory: ${dirPath}`, error);
    }
  } else {
    console.log(`User data directory does not exist: ${dirPath}`);
  }
}

/**
 * Creates a new user data directory for parallel execution.
 * @param {string} dirPath - The path to the directory to create.
 */
function createNewUserDataDirForParallelExecution(dirPath) {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created user data directory: ${dirPath}`);
    } catch (error) {
      console.error(`Failed to create user data directory: ${dirPath}`, error);
    }
  } else {
    console.log(`User data directory already exists: ${dirPath}`);
  }
}

/**
 * Normalizes and sort text obtained from html elements
 * @param {string} text - the text to be normalized
 */
function normalizeAndSortText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\\?"/g, '')                    // Remove quotes
    .replace(/[\r\n]+/g, ' ')                // Normalize newlines
    .replace(/\s*×\s*/g, '|')                // Replace × and spaces with a delimiter
    .replace(/\s+/g, ' ')                    // Collapse extra spaces
    .trim()
    .split('|')                              // Split by delimiter
    .map(part => part.trim())                // Clean up each part
    .filter(Boolean)                         // Remove empty parts
    .sort()                                  // Sort alphabetically (so order doesn't matter)
    .join('');                               // Join back together with no space
}

/**
 * Recursively updates placeholder values in a nested selectors object with provided replacements.
 *
 * This function traverses an object where the values may be strings or nested objects.
 * If a value is a string, it looks for placeholders in the format `{placeholder}` and replaces
 * them with corresponding values from the `replacements` object.
 * If a value is an object, it recursively applies the same logic.
 *
 * @param {Object} selectorsObj - An object containing selectors with optional placeholders.
 *                                The object can be nested.
 * @param {Object} replacements - An object where keys correspond to placeholder names (without curly braces),
 *                                and values are the strings to replace the placeholders with.
 * @returns {Object} A new object with the same structure as `selectorsObj` but with all placeholders replaced.
 */
function updateSelectorsWithIndex(selectorsObj, replacements) {
  const updated = {};

  for (const [key, value] of Object.entries(selectorsObj)) {
    if (typeof value === 'string') {
      let newValue = value;
      for (const [placeholder, replacement] of Object.entries(replacements)) {
        const pattern = new RegExp(`{${placeholder}}`, 'g');
        newValue = newValue.replace(pattern, replacement);
      }
      updated[key] = newValue;
    } else if (typeof value === 'object') {
      updated[key] = updateSelectorsWithIndex(value, replacements);
    }
  }
  return updated;
}

/**
 * Normalize a raw token string so that:
 *  - “1” or “1.000” → “1.0”
 *  - “1.2” or “1.14” → stays as-is
 *  - anything with >2 decimals → rounded to 1 decimal place
 *
 * @param {string} tokenStr   e.g. output of ethers.utils.formatEther(...)
 * @param {string} [label]    optional name for the console log
 * @returns {string}          the formatted string
 */
function formatBalanceString(tokenStr, label = '') {
  const [intPart, fracPart = ''] = tokenStr.split('.');
  let readable;

  if (fracPart.length === 0 || /^0+$/.test(fracPart)) {
    readable = `${intPart}.0`;
    console.debug(`🔢 ${label} no decimals → ${readable}`);
  } else if (fracPart.length <= 2) {
    readable = tokenStr;
    console.debug(`🔢 ${label} preserve up to two decimals → ${readable}`);
  } else {
    const num     = parseFloat(tokenStr);
    const rounded = Math.round(num * 100) / 100;
    readable = rounded.toString();
    console.debug(`🔢 ${label} rounded to 2dp → ${readable}`);
  }

  return readable;
}


module.exports = {
  clearUserDataDir,
  formatBalanceString,
  createNewUserDataDirForParallelExecution,
  updateSelectorsWithIndex,
  normalizeAndSortText
};