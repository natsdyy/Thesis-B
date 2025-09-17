// API Configuration that supports both offline (local) and online modes

function resolveBaseURL() {
  // Highest priority: explicit Vite env override
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  // If running behind the same origin (e.g., nginx proxy), use window origin
  if (typeof window !== 'undefined' && window.location?.origin) {
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
