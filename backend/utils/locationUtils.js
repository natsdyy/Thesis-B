/**
 * Location utility functions for GPS coordinate calculations
 */

/**
 * Calculate the distance between two GPS coordinates using the Haversine formula
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in meters
  
  return distance;
}

/**
 * Convert degrees to radians
 * @param {number} degrees - Degrees to convert
 * @returns {number} Radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a user is within the allowed radius of a location
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @param {number} locationLat - Location's latitude
 * @param {number} locationLon - Location's longitude
 * @param {number} allowedRadiusMeters - Allowed radius in meters (default: 2)
 * @returns {boolean} True if user is within radius
 */
function isWithinRadius(userLat, userLon, locationLat, locationLon, allowedRadiusMeters = 2) {
  if (!userLat || !userLon || !locationLat || !locationLon) {
    return false; // Cannot validate if coordinates are missing
  }
  
  const distance = calculateDistance(userLat, userLon, locationLat, locationLon);
  return distance <= allowedRadiusMeters;
}

/**
 * Validate GPS coordinates
 * @param {number} latitude - Latitude to validate
 * @param {number} longitude - Longitude to validate
 * @returns {boolean} True if coordinates are valid
 */
function isValidCoordinates(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }
  
  // Check if coordinates are within valid ranges
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/**
 * Get distance with human-readable format
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {object} Distance in meters and human-readable format
 */
function getDistanceInfo(lat1, lon1, lat2, lon2) {
  const distanceMeters = calculateDistance(lat1, lon1, lat2, lon2);
  
  let humanReadable;
  if (distanceMeters < 1000) {
    humanReadable = `${Math.round(distanceMeters)}m`;
  } else {
    const km = distanceMeters / 1000;
    humanReadable = `${km.toFixed(2)}km`;
  }
  
  return {
    meters: Math.round(distanceMeters),
    humanReadable: humanReadable
  };
}

module.exports = {
  calculateDistance,
  toRadians,
  isWithinRadius,
  isValidCoordinates,
  getDistanceInfo
};
