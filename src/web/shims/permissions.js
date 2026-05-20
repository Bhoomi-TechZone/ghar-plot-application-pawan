/**
 * Web shim for react-native-permissions
 * Returns 'granted' for all permissions on web since the browser handles
 * permissions natively when the feature is first used.
 */

export const PERMISSIONS = {
  ANDROID: {
    CAMERA: 'android.permission.CAMERA',
    READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
    WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
    ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
    READ_MEDIA_IMAGES: 'android.permission.READ_MEDIA_IMAGES',
    READ_MEDIA_VIDEO: 'android.permission.READ_MEDIA_VIDEO',
    POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
  },
  IOS: {
    CAMERA: 'ios.permission.CAMERA',
    PHOTO_LIBRARY: 'ios.permission.PHOTO_LIBRARY',
    LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
    NOTIFICATIONS: 'ios.permission.NOTIFICATIONS',
  },
};

export const RESULTS = {
  UNAVAILABLE: 'unavailable',
  DENIED: 'denied',
  LIMITED: 'limited',
  GRANTED: 'granted',
  BLOCKED: 'blocked',
};

export const check = async () => RESULTS.GRANTED;
export const request = async () => RESULTS.GRANTED;
export const checkMultiple = async (permissions) => {
  const result = {};
  permissions.forEach((p) => { result[p] = RESULTS.GRANTED; });
  return result;
};
export const requestMultiple = async (permissions) => {
  const result = {};
  permissions.forEach((p) => { result[p] = RESULTS.GRANTED; });
  return result;
};
export const openSettings = async () => {};
export const checkNotifications = async () => ({
  status: RESULTS.GRANTED,
  settings: {},
});
export const requestNotifications = async () => ({
  status: RESULTS.GRANTED,
  settings: {},
});

export default {
  PERMISSIONS,
  RESULTS,
  check,
  request,
  checkMultiple,
  requestMultiple,
  openSettings,
  checkNotifications,
  requestNotifications,
};
