// Base API URL for the backend.
// MUST be set in .env file - no fallback/default
// Uses react-native-dotenv (configured in babel.config.js) to read from .env file
// Only import VITE_API_BASE_URL since that's what's in the .env file
import { VITE_API_BASE_URL } from '@env';

let apiUrl: string | null = null;

// Use VITE_API_BASE_URL from .env file
if (VITE_API_BASE_URL) {
  apiUrl = VITE_API_BASE_URL;
  console.log(`[API Config] Loaded VITE_API_BASE_URL from .env: ${apiUrl}`);
} else {
  console.error('ERROR: VITE_API_BASE_URL not found in .env file!');
  console.error('Please add to your .env file in the front/ directory:');
  console.error('  VITE_API_BASE_URL=https://vila-app-back.vercel.app');
  console.error('  (For Android emulator use: http://10.0.2.2:4000)');
  console.error('  (For local development use: http://127.0.0.1:4000)');
  throw new Error('VITE_API_BASE_URL is required in .env file');
}

if (!apiUrl) {
  throw new Error('VITE_API_BASE_URL must be set in .env file');
}

// Remove all trailing slashes - endpoints already start with /
apiUrl = String(apiUrl).trim().replace(/\/+$/, '');
console.log(`[API Config] Using backend URL: ${apiUrl}`);
console.log(`[API Config] Environment variable VITE_API_BASE_URL: ${VITE_API_BASE_URL}`);

export const API_BASE_URL = apiUrl;

