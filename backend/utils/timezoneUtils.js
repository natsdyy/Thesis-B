/**
 * Timezone utility functions for Philippine Time (Asia/Manila)
 * Ensures consistent timezone handling across the application
 */

const PHILIPPINE_TIMEZONE = "Asia/Manila";

/**
 * Get current date and time in Philippine timezone
 * @returns {Date} Current date/time in Philippine timezone
 */
function getCurrentPhilippineTime() {
  const now = new Date();
  // Get the timezone offset for Philippine timezone (UTC+8)
  const philippineOffset = 8 * 60; // 8 hours in minutes
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const philippineTime = new Date(utcTime + philippineOffset * 60000);
  return philippineTime;
}

/**
 * Format date to Philippine timezone string
 * @param {Date} date - Date to format
 * @param {string} format - Format type ('date', 'datetime', 'time')
 * @returns {string} Formatted date string in Philippine timezone
 */
function formatPhilippineTime(date = new Date(), format = "datetime") {
  const options = {
    timeZone: PHILIPPINE_TIMEZONE,
  };

  switch (format) {
    case "date":
      options.year = "numeric";
      options.month = "2-digit";
      options.day = "2-digit";
      break;
    case "time":
      options.hour = "2-digit";
      options.minute = "2-digit";
      options.second = "2-digit";
      options.hour12 = false;
      break;
    case "datetime":
    default:
      options.year = "numeric";
      options.month = "2-digit";
      options.day = "2-digit";
      options.hour = "2-digit";
      options.minute = "2-digit";
      options.second = "2-digit";
      options.hour12 = false;
      break;
  }

  return new Intl.DateTimeFormat("en-CA", options).format(date);
}

/**
 * Get current date in YYYY-MM-DD format in Philippine timezone
 * @returns {string} Current date in YYYY-MM-DD format
 */
function getCurrentPhilippineDate() {
  return formatPhilippineTime(new Date(), "date").replace(/\//g, "-");
}

/**
 * Get current time in HH:MM:SS format in Philippine timezone
 * @returns {string} Current time in HH:MM:SS format
 */
function getCurrentPhilippineTimeString() {
  return formatPhilippineTime(new Date(), "time");
}

/**
 * Convert UTC date to Philippine timezone
 * @param {Date|string} utcDate - UTC date to convert
 * @returns {Date} Date converted to Philippine timezone
 */
function convertUTCToPhilippine(utcDate) {
  const date = new Date(utcDate);
  return new Date(
    date.toLocaleString("en-US", { timeZone: PHILIPPINE_TIMEZONE })
  );
}

/**
 * Create a date in Philippine timezone from components
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {number} day - Day (1-31)
 * @param {number} hour - Hour (0-23)
 * @param {number} minute - Minute (0-59)
 * @param {number} second - Second (0-59)
 * @returns {Date} Date in Philippine timezone
 */
function createPhilippineDate(
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0
) {
  const dateString = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:${second.toString().padStart(2, "0")}`;
  return new Date(dateString + "+08:00"); // Philippine time is UTC+8
}

/**
 * Get timezone offset for Philippine timezone
 * @returns {number} Timezone offset in minutes
 */
function getPhilippineTimezoneOffset() {
  return 8 * 60; // Philippine time is UTC+8 (480 minutes)
}

/**
 * Check if a date is in Philippine timezone
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is in Philippine timezone
 */
function isInPhilippineTimezone(date) {
  const offset = date.getTimezoneOffset();
  return offset === -480; // Philippine time is UTC+8
}

/**
 * Format date for database storage (ensures Philippine timezone)
 * @param {Date} date - Date to format
 * @returns {string} ISO string in Philippine timezone
 */
function formatForDatabase(date = new Date()) {
  // Convert to Philippine timezone and return as ISO string with timezone info
  const philippineDate = new Date(
    date.toLocaleString("en-US", { timeZone: PHILIPPINE_TIMEZONE })
  );
  // Use formatForDatabaseWithTimezone for consistency
  return formatForDatabaseWithTimezone(philippineDate);
}

/**
 * Format date for database storage with Philippine timezone offset
 * @param {Date} date - Date to format
 * @returns {string} ISO string with Philippine timezone offset (+08:00)
 */
function formatForDatabaseWithTimezone(date = new Date()) {
  // Create a new Date object representing the same moment in Philippine timezone
  const philippineDate = new Date(
    date.toLocaleString("en-US", { timeZone: PHILIPPINE_TIMEZONE })
  );

  // Format the date components
  const year = philippineDate.getFullYear();
  const month = String(philippineDate.getMonth() + 1).padStart(2, "0");
  const day = String(philippineDate.getDate()).padStart(2, "0");
  const hours = String(philippineDate.getHours()).padStart(2, "0");
  const minutes = String(philippineDate.getMinutes()).padStart(2, "0");
  const seconds = String(philippineDate.getSeconds()).padStart(2, "0");
  const milliseconds = String(philippineDate.getMilliseconds()).padStart(
    3,
    "0"
  );

  // Return ISO string with explicit Philippine timezone offset
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}+08:00`;
}

/**
 * Parse date from database (assumes Philippine timezone)
 * @param {string|Date} dateString - Date string or Date object from database
 * @returns {Date} Date parsed as Philippine timezone
 */
function parseFromDatabase(dateString) {
  if (!dateString) return new Date();

  // If it's already a Date object, return it
  if (dateString instanceof Date) {
    return new Date(
      dateString.toLocaleString("en-US", { timeZone: PHILIPPINE_TIMEZONE })
    );
  }

  // Convert to string if it's not already
  const dateStr = String(dateString);

  // If the date string already has timezone info (+08:00), parse it directly
  if (dateStr.includes("+08:00") || dateStr.includes("+0800")) {
    return new Date(dateStr);
  }

  // For UTC dates (ending with Z), convert to Philippine timezone
  if (dateStr.endsWith("Z")) {
    const utcDate = new Date(dateStr);
    return new Date(
      utcDate.toLocaleString("en-US", { timeZone: PHILIPPINE_TIMEZONE })
    );
  }

  // Default parsing
  const date = new Date(dateStr);
  return new Date(
    date.toLocaleString("en-US", { timeZone: PHILIPPINE_TIMEZONE })
  );
}

module.exports = {
  PHILIPPINE_TIMEZONE,
  getCurrentPhilippineTime,
  formatPhilippineTime,
  getCurrentPhilippineDate,
  getCurrentPhilippineTimeString,
  convertUTCToPhilippine,
  createPhilippineDate,
  getPhilippineTimezoneOffset,
  isInPhilippineTimezone,
  formatForDatabase,
  formatForDatabaseWithTimezone,
  parseFromDatabase,
};
