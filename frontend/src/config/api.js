// API Configuration that supports both offline (local) and online modes

function resolveBaseURL() {
  // Highest priority: explicit Vite env override
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  // For local development, always use the backend server
  if (typeof window !== 'undefined' && window.location?.origin) {
    // Check if we're in development mode (localhost:8080 or network IP:8080)
    if (
      window.location.origin.includes('localhost:8080') ||
      window.location.origin.includes('192.168.56.1:8080') ||
      window.location.origin.includes('192.168.18.5:8080') ||
      window.location.origin.includes('192.168.254.116:8080') ||
      window.location.origin.includes('192.168.68.111:8080')
    ) {
      // Use network IP for backend API so it's accessible from phones
      // Use the Wi-Fi network IP (192.168.18.5) as it has proper gateway
      return 'http://192.168.18.5:5000/api';
    }
    // For production domain, use the production backend
    if (window.location.origin.includes('countryside-steakhouse.site')) {
      return 'https://www.countryside-steakhouse.site/api';
    }
    // For Railway production deployment, use the current origin
    if (window.location.origin.includes('railway.app')) {
      return `${window.location.origin}/api`;
    }
    // For production environment, use the production backend
    if (window.location.origin.includes('countrysides.up.railway.app')) {
      return 'https://www.countryside-steakhouse.site/api';
    }
    // For other environments, use window origin
    return `${window.location.origin.replace(/\/$/, '')}/api`;
  }

  // Fallback for local development/offline
  return 'http://localhost:5000/api';
}

const baseURL = resolveBaseURL();

console.log('Resolved API baseURL:', baseURL);

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

// Helper function to format image URLs correctly
export const formatImageUrl = (imageUrl) => {
  if (!imageUrl) return imageUrl;

  console.log('formatImageUrl input:', imageUrl);

  // If it's already a full URL, handle HTTP to HTTPS conversion for production
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    console.log('Already full URL:', imageUrl);

    // In production environment, replace local IP URLs with production domain
    if (typeof window !== 'undefined' && window.location?.origin) {
      if (window.location.origin.includes('countryside-steakhouse.site')) {
        // Replace local IP URLs with production domain
        if (
          imageUrl.includes('192.168.18.5:5000') ||
          imageUrl.includes('localhost:5000')
        ) {
          const pathMatch = imageUrl.match(/\/uploads\/.*$/);
          if (pathMatch) {
            const productionUrl = `https://www.countryside-steakhouse.site${pathMatch[0]}`;
            console.log(
              'Replaced local IP with production domain:',
              productionUrl
            );
            return productionUrl;
          }
        }
        // Convert HTTP URLs to HTTPS
        else if (imageUrl.startsWith('http://')) {
          const httpsUrl = imageUrl.replace('http://', 'https://');
          console.log('Converted HTTP to HTTPS:', httpsUrl);
          return httpsUrl;
        }
      }
    }

    return imageUrl;
  }

  // If it's a relative path starting with /uploads/, convert to backend URL
  if (imageUrl.startsWith('/uploads/')) {
    // Get the backend URL by removing /api from the API base URL
    let backendUrl = apiConfig.baseURL.replace('/api', '');

    // Special handling for production environments
    if (typeof window !== 'undefined' && window.location?.origin) {
      // For countryside-steakhouse.site domain
      if (window.location.origin.includes('countryside-steakhouse.site')) {
        backendUrl = 'https://www.countryside-steakhouse.site';
      }
      // For Railway production deployment, use the production domain
      else if (window.location.origin.includes('countrysides.up.railway.app')) {
        backendUrl = 'https://www.countryside-steakhouse.site';
      }
      // For other Railway deployments, use the current origin
      else if (window.location.origin.includes('railway.app')) {
        backendUrl = window.location.origin;
      }
    }

    const fullUrl = `${backendUrl}${imageUrl}`;
    console.log('Backend URL:', backendUrl);
    console.log('Formatted URL:', fullUrl);
    return fullUrl;
  }

  // For other relative paths, assume they need the frontend base URL
  const fullUrl = `${window.location.origin}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
  console.log('Formatted URL (other):', fullUrl);
  return fullUrl;
};
