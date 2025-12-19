// Base API URL for the backend - reads from .env file
// Try to use react-native-dotenv first, then fallback to process.env
let apiBaseUrl: string | undefined;

try {
  // Try to import from @env (react-native-dotenv)
  const envModule = require('@env');
  apiBaseUrl = envModule.API_BASE_URL;
} catch (e) {
  // If @env is not available, try process.env
  try {
    // @ts-expect-error process may be undefined on RN
    if (typeof process !== 'undefined' && process.env && process.env.API_BASE_URL) {
      // @ts-expect-error RN env
      apiBaseUrl = process.env.API_BASE_URL;
    }
  } catch (e2) {
    // Ignore
  }
}

// API URL must be set - no fallback
if (!apiBaseUrl) {
  console.error('❌ ERROR: API_BASE_URL is not set in .env file!');
  throw new Error('API_BASE_URL environment variable is required. Please set it in .env file.');
}

export const API_BASE_URL = apiBaseUrl;

// Log the API URL being used (for debugging)
console.log('🔗 API Base URL:', API_BASE_URL);

