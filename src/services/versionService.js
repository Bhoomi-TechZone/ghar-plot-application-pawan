import DeviceInfo from 'react-native-device-info';
import { Linking, Platform } from 'react-native';

const CONFIG_API_URL = 'https://gharplotbackend.gntechnology.de/api/config';

// Compare semantic versions (e.g., 1.0.2 < 1.0.10)
export const compareVersions = (v1, v2) => {
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const part1 = v1Parts[i] || 0;
    const part2 = v2Parts[i] || 0;
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  return 0; // Versions are equal
};

export const checkAppVersion = async () => {
  try {
    const currentVersion = DeviceInfo.getVersion();
    const platform = Platform.OS; // 'ios' or 'android'

    const response = await fetch(`${CONFIG_API_URL}?platform=${platform}`);
    const result = await response.json();

    if (!result.success || !result.data) {
      console.warn('Config API returned unsuccessful response');
      return null;
    }

    const data = result.data;

    // Check if new version is greater than current version
    const isUpdateAvailable = compareVersions(currentVersion, data.latestVersion) < 0;

    return {
      isUpdateAvailable,
      currentVersion,
      latestVersion: data.latestVersion,
      forceUpdate: data.forceUpdate || false,
      storeUrl: data.storeUrl
    };
  } catch (error) {
    console.error('Error checking version:', error);
    return null; // Silent fail
  }
};

export const openStore = (storeUrl) => {
  if (storeUrl) {
    Linking.openURL(storeUrl).catch(err => {
      console.error('Failed to open store URL:', err);
    });
    return;
  }

  // Fallback: open Play Store / App Store using package name
  const packageName = DeviceInfo.getBundleId();

  if (Platform.OS === 'ios') {
    Linking.openURL(`https://apps.apple.com/app/${packageName}`).catch(e =>
      console.error('Failed to open App Store:', e)
    );
  } else {
    const playStoreUrl = `market://details?id=${packageName}`;
    const browserUrl = `https://play.google.com/store/apps/details?id=${packageName}`;

    Linking.canOpenURL(playStoreUrl).then(supported => {
      if (supported) {
        Linking.openURL(playStoreUrl);
      } else {
        Linking.openURL(browserUrl);
      }
    }).catch(err => {
      console.error("An error occurred opening store", err);
      Linking.openURL(browserUrl).catch(e => console.error("Browser fallback failed: ", e));
    });
  }
};
