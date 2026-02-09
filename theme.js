import Constants from 'expo-constants';

export const COLORS = {
  primary: '#6200EE',
  background: '#FFFFFF',
  // ... your other colors
};

export const APP_CONFIG = {
  // This pulls the version defined in your app.json!
  version: Constants.expoConfig?.version || '1.0.0',
  api_timeout: 5000,
};