// API Configuration that supports both offline (local) and online modes

function resolveBaseURL() {
  // Highest priority: explicit Vite env override (useful for production and specific builds)
  let url = import.meta.env.VITE_API_BASE_URL;
  
  if (url && typeof url === 'string' && url.trim().length > 0) {
    url = url.trim();
  } else {
    // Fallback logic for automatic resolution based on window.location
    if (typeof window !== 'undefined' && window.location?.origin) {
      const origin = window.location.origin;
      
      // Local development — use Vite proxy at same origin
      if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168')) {
        url = 'http://localhost:8080/api';
      }
      // Production domain — use same-origin /api (nginx proxies to backend)
      else if (origin.includes('countryside-steakhouse.site')) {
        url = `${origin.replace(/\/$/, '')}/api`;
      }
      // Railway deployments — use same-origin /api
      else if (origin.includes('railway.app')) {
        url = `${origin.replace(/\/$/, '')}/api`;
      }
      else {
        // Generic fallback: use current origin
        url = `${origin.replace(/\/$/, '')}/api`;
      }
    } else {
      // Absolute fallback
      url = 'http://localhost:8080/api';
    }
  }

  // CRITICAL: Ensure the URL always ends with /api (but not //api)
  if (url && !url.endsWith('/api') && !url.endsWith('/api/')) {
    url = `${url.replace(/\/$/, '')}/api`;
  }
  
  return url;
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

// Helper function to format image URLs correctly
export const formatImageUrl = (imageUrl) => {
  if (!imageUrl) return imageUrl;

  // If it's already a full URL, handle HTTP to HTTPS conversion for production
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
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
            // Use same-origin path — nginx will proxy to backend
            return `${window.location.origin}${pathMatch[0]}`;
          }
        }
        // Convert HTTP URLs to HTTPS
        else if (imageUrl.startsWith('http://')) {
          return imageUrl.replace('http://', 'https://');
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
    let backendUrl;

    if (typeof window !== 'undefined' && window.location?.origin) {
      // Local dev: serve uploads from backend port directly
      if (window.location.origin.includes(':8080')) {
        backendUrl = 'http://localhost:5000';
      }
      // Production: use same-origin (nginx proxies /uploads to backend)
      else {
        backendUrl = window.location.origin;
      }
    } else {
      backendUrl = apiConfig.baseURL.replace('/api', '');
    }

    // Use URL API to safely join paths and avoid duplicate segments
    let fullUrl = new URL(imageUrl, backendUrl).toString();
    // Normalize any accidental repeated /uploads segments
    fullUrl = fullUrl.replace('/uploads/uploads/', '/uploads/');

    return fullUrl;
  }

  // For other relative paths, assume they need the frontend base URL
  return `${window.location.origin}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
};
