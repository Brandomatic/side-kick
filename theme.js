import Constants from 'expo-constants';

export const COLORS = {
  primary: '#6200EE', // Your existing brand purple
  background: '#FFFFFF',
  
  // STATUS COLORS (Semantic)
  repair: '#EF4444',    // Red
  attention: '#EAB308', // Yellow/Gold
  monitor: '#3B82F6',   // Blue
  success: '#10B981',   // Green
  textMuted: '#6B7280', // Gray
  
  // UI NEUTRALS
  card: '#FFFFFF',
  textMain: '#1A1A1A',
  textMuted: '#999999',
  border: '#EEEEEE',
  overlay: 'rgba(0,0,0,0.6)',
};

export const APP_CONFIG = {
  // This pulls the version defined in your app.json!
  version: Constants.expoConfig?.version || '1.0.0',
  api_timeout: 5000,
};