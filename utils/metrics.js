import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// We use a standard screen size as a baseline (iPhone 14/15 size is roughly 390x844)
const guidelineBaseWidth = 390;

const scale = (size) => (width / guidelineBaseWidth) * size;

/**
 * Normalizes font and element sizes based on screen density and scale.
 */
export const moderateScale = (size, factor = 0.5) => {
  const newSize = size + (scale(size) - size) * factor;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;
export const IS_IOS = Platform.OS === 'ios';