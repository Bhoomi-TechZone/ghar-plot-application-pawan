import { Platform, StatusBar } from 'react-native';

/**
 * getHeaderTopPadding
 * Computes safe header top padding that guarantees the header content (menu button,
 * back button, titles, logout) never overlaps with Android status bar icons (battery,
 * wifi, clock) or iOS notch/Dynamic Island.
 *
 * @param {Object} insets - Result of useSafeAreaInsets()
 * @param {number} extra - Additional spacing below status bar (default: 12)
 * @returns {number} Top padding in dp
 */
export const getHeaderTopPadding = (insets, extra = 12) => {
  const safeTop = insets?.top || 0;
  const androidBar = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0;
  const minBar = Platform.OS === 'android' ? Math.max(androidBar, 28) : 44;
  const effectiveTop = Math.max(safeTop, minBar);
  return effectiveTop + extra;
};

export default {
  getHeaderTopPadding,
};

