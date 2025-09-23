const axios = require("axios");

/**
 * Simple geocoding service using OpenStreetMap Nominatim
 * Note: Respect the usage policy. For production, consider adding an email & proper user-agent.
 */
async function geocodeAddress(address) {
  if (!address || typeof address !== "string") {
    return null;
  }

  try {
    const url = "https://nominatim.openstreetmap.org/search";
    const params = {
      format: "json",
      q: address,
      addressdetails: 1,
      limit: 1,
    };

    const { data } = await axios.get(url, {
      params,
      headers: {
        "User-Agent": "Thesis-B/1.0 (geocoding@local)",
      },
      timeout: 10000,
    });

    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      const latitude = parseFloat(item.lat);
      const longitude = parseFloat(item.lon);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    }

    return null;
  } catch (error) {
    console.warn("Geocoding failed:", error.message);
    return null;
  }
}

module.exports = {
  geocodeAddress,
};
