/**
 * Web shim for react-native-image-colors
 * Returns placeholder colors — actual image color extraction is complex on web
 * and rarely critical for layout. Replace with a canvas-based implementation
 * if colour extraction is required.
 */

const ImageColors = {
  getColors: async (source, config) => {
    const fallback = config?.fallback || '#1E90FF';
    return {
      platform: 'web',
      quality: config?.quality || 'low',
      dominant: fallback,
      average: fallback,
      vibrant: fallback,
      darkVibrant: '#0000AA',
      lightVibrant: '#87CEEB',
      darkMuted: '#555555',
      lightMuted: '#AAAAAA',
      muted: '#888888',
      background: fallback,
      detail: fallback,
      primary: fallback,
      secondary: fallback,
    };
  },
};

export default ImageColors;
