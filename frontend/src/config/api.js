// API Configuration for different environments
const config = {
  development: {
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
    timeout: 10000,
  },
  production: {
    baseURL:
      import.meta.env.VITE_API_BASE_URL ||
      'https://your-backend-domain.railway.app/api',
    timeout: 15000,
  },
};

// Get current environment
const env = import.meta.env.MODE || 'development';

// Export configuration for current environment
export const apiConfig = config[env] || config.development;

// Helper function to get full API URL
export const getApiUrl = (endpoint) => {
  const baseURL = apiConfig.baseURL.replace(/\/$/, ''); // Remove trailing slash
  const cleanEndpoint = endpoint.replace(/^\//, ''); // Remove leading slash
  return `${baseURL}/${cleanEndpoint}`;
};

// Default axios configuration
export const axiosConfig = {
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
};
