/**
 * Timezone utility functions for Philippine Time (Asia/Manila)
 * Ensures consistent timezone handling across the frontend application
 */

const PHILIPPINE_TIMEZONE = 'Asia/Manila';

/**
 * Get current date and time in Philippine timezone
 * @returns {Date} Current date/time in Philippine timezone
 */
export function getCurrentPhilippineTime() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: PHILIPPINE_TIMEZONE })
  );
}

/**
 * Format date to Philippine timezone string
 * @param {Date} date - Date to format
 * @param {string} format - Format type ('date', 'datetime', 'time')
 * @returns {string} Formatted date string in Philippine timezone
 */
export function formatPhilippineTime(date = new Date(), format = 'datetime') {
  const options = {
    timeZone: PHILIPPINE_TIMEZONE,
  };

  switch (format) {
    case 'date':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      break;
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      options.hour12 = false;
      break;
    case 'datetime':
    default:
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      options.hour12 = false;
      break;
  }

  return new Intl.DateTimeFormat('en-CA', options).format(date);
}

/**
 * Get current date in YYYY-MM-DD format in Philippine timezone
 * @returns {string} Current date in YYYY-MM-DD format
 */
export function getCurrentPhilippineDate() {
  return formatPhilippineTime(new Date(), 'date').replace(/\//g, '-');
}

/**
 * Get current time in HH:MM:SS format in Philippine timezone
 * @returns {string} Current time in HH:MM:SS format
 */
export function getCurrentPhilippineTimeString() {
  return formatPhilippineTime(new Date(), 'time');
}

/**
 * Convert UTC date to Philippine timezone
 * @param {Date|string} utcDate - UTC date to convert
 * @returns {Date} Date converted to Philippine timezone
 */
export function convertUTCToPhilippine(utcDate) {
  const date = new Date(utcDate);
  return new Date(
    date.toLocaleString('en-US', { timeZone: PHILIPPINE_TIMEZONE })
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
export function createPhilippineDate(
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0
) {
  const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
  return new Date(dateString + '+08:00'); // Philippine time is UTC+8
}

/**
 * Get timezone offset for Philippine timezone
 * @returns {number} Timezone offset in minutes
 */
export function getPhilippineTimezoneOffset() {
  return 8 * 60; // Philippine time is UTC+8 (480 minutes)
}

/**
 * Check if a date is in Philippine timezone
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is in Philippine timezone
 */
export function isInPhilippineTimezone(date) {
  const offset = date.getTimezoneOffset();
  return offset === -480; // Philippine time is UTC+8
}

/**
 * Format date for API requests (ensures Philippine timezone)
 * @param {Date} date - Date to format
 * @returns {string} ISO string in Philippine timezone
 */
export function formatForAPI(date = new Date()) {
  const philippineDate = new Date(
    date.toLocaleString('en-US', { timeZone: PHILIPPINE_TIMEZONE })
  );
  return philippineDate.toISOString();
}

/**
 * Parse date from API response (assumes Philippine timezone)
 * @param {string} dateString - Date string from API
 * @returns {Date} Date parsed as Philippine timezone
 */
export function parseFromAPI(dateString) {
  const date = new Date(dateString);
  return new Date(
    date.toLocaleString('en-US', { timeZone: PHILIPPINE_TIMEZONE })
  );
}

/**
 * Format date for display in Philippine timezone
 * @param {Date|string} date - Date to format
 * @param {string} locale - Locale for formatting (default: 'en-PH')
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatForDisplay(date, locale = 'en-PH', options = {}) {
  const defaultOptions = {
    timeZone: PHILIPPINE_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  const dateObj = new Date(date);
  return dateObj.toLocaleDateString(locale, defaultOptions);
}

/**
 * Format time for display in Philippine timezone
 * @param {Date|string} date - Date to format
 * @param {string} locale - Locale for formatting (default: 'en-PH')
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted time string
 */
export function formatTimeForDisplay(date, locale = 'en-PH', options = {}) {
  const defaultOptions = {
    timeZone: PHILIPPINE_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };

  const dateObj = new Date(date);
  return dateObj.toLocaleTimeString(locale, defaultOptions);
}

export default {
  PHILIPPINE_TIMEZONE,
  getCurrentPhilippineTime,
  formatPhilippineTime,
  getCurrentPhilippineDate,
  getCurrentPhilippineTimeString,
  convertUTCToPhilippine,
  createPhilippineDate,
  getPhilippineTimezoneOffset,
  isInPhilippineTimezone,
  formatForAPI,
  parseFromAPI,
  formatForDisplay,
  formatTimeForDisplay,
};
