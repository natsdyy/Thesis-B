// API Configuration that supports both offline (local) and online modes

function resolveBaseURL() {
  // Highest priority: explicit Vite env override
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  // For local development, always use localhost to avoid CORS issues
  if (typeof window !== 'undefined' && window.location?.origin) {
    // In dev, always use localhost:8080 to ensure proxy works
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('192.168')) {
      return 'http://localhost:8080/api';
    }
    // For production domain, use the production backend
    if (window.location.origin.includes('countryside-steakhouse.site')) {
      return 'https://thesis-b-productioncountryside.up.railway.app/api';
    }
    // For Railway production deployment, use the current origin
    if (window.location.origin.includes('railway.app')) {
      return `${window.location.origin}/api`;
    }
    // For production environment, use the production backend
    if (window.location.origin.includes('countrysides.up.railway.app')) {
      return 'https://thesis-b-productioncountryside.up.railway.app/api';
    }
    // For other environments, use window origin
    return `${window.location.origin.replace(/\/$/, '')}/api`;
  }

  // Fallback for local development/offline
  return 'http://localhost:8080/api';
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

  // If it's a relative path starting with /uploads/ or /utility-receipts/, convert to backend URL
  if (
    imageUrl.startsWith('/uploads/') ||
    imageUrl.startsWith('/utility-receipts/')
  ) {
    // Get the backend URL by removing /api from the API base URL
    let backendUrl = apiConfig.baseURL.replace('/api', '');

    // Special handling for environments
    if (typeof window !== 'undefined' && window.location?.origin) {
      // Local dev: serve uploads from backend port directly (Vite proxy usually not set for /uploads)
      if (window.location.origin.includes(':8080')) {
        backendUrl = 'http://localhost:5000';
      }
      // For countryside-steakhouse.site domain
      else if (window.location.origin.includes('countryside-steakhouse.site')) {
        backendUrl = 'https://thesis-b-productioncountryside.up.railway.app';
      }
      // For Railway production deployment, use the production backend
      else if (window.location.origin.includes('countrysides.up.railway.app')) {
        backendUrl = 'https://thesis-b-productioncountryside.up.railway.app';
      }
      // For other Railway deployments, use the current origin
      else if (window.location.origin.includes('railway.app')) {
        backendUrl = window.location.origin;
      }
    }

    // Use URL API to safely join paths and avoid duplicate segments
    let fullUrl = new URL(imageUrl, backendUrl).toString();
    // Normalize any accidental repeated /uploads segments
    fullUrl = fullUrl.replace('/uploads/uploads/', '/uploads/');

    console.log('Backend URL:', backendUrl);
    console.log('Formatted URL:', fullUrl);
    return fullUrl;
  }

  // For other relative paths, assume they need the frontend base URL
  const fullUrl = `${window.location.origin}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
  console.log('Formatted URL (other):', fullUrl);
  return fullUrl;
};
