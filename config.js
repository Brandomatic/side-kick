// config.js
export const Config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL,
  appName: process.env.EXPO_PUBLIC_APP_NAME || 'Side-Kick', // Fallback value
  version: process.env.EXPO_PUBLIC_VERSION || '1.0.0',
  isDebug: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true', // Convert string to boolean
};

// Optional: Add a check to warn you if a critical variable is missing
if (!Config.apiUrl) {
  console.warn("⚠️ Warning: EXPO_PUBLIC_API_URL is not defined in your .env file!");
}