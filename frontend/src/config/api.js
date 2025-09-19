// API Configuration that supports both offline (local) and online modes

function resolveBaseURL() {
  // Highest priority: explicit Vite env override
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  // If running behind the same origin (e.g., nginx proxy), use window origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    // Check if we're in development mode (localhost:8080 or network IP:8080)
    if (
      window.location.origin.includes('localhost:8080') ||
      window.location.origin.includes('192.168.254.110:8080')
    ) {
      // Use network IP for backend API so it's accessible from phones
      return 'http://192.168.254.110:5000/api';
    }
    // For production or other environments, use window origin
    return `${window.location.origin.replace(/\/$/, '')}/api`;
  }

  // Fallback for local development/offline
  return 'http://localhost:5000/api';
}

const baseURL = resolveBaseURL();

export const apiConfig = {
  baseURL,
  timeout: import.meta.env.MODE === 'production' ? 15000 : 10000,
};

export const getApiUrl = (endpoint) => {
  const cleanBase = apiConfig.baseURL.replace(/\/$/, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');
  return `${cleanBase}/${cleanEndpoint}`;
};

export const axiosConfig = {
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: { 'Content-Type': 'application/json' },
};

export const formatImageUrl = (imagePath) => {
  if (!imagePath) return '';
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it's a relative path, prepend the base URL
  const cleanBase = apiConfig.baseURL.replace(/\/$/, '');
  const cleanPath = imagePath.replace(/^\//, '');
  return `${cleanBase}/${cleanPath}`;
};
