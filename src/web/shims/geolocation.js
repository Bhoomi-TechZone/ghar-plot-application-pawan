/**
 * Web shim for react-native-geolocation-service
 * Delegates to the browser Geolocation API.
 */

const Geolocation = {
  getCurrentPosition: (success, error, options) => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          success({
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              altitude: pos.coords.altitude,
              accuracy: pos.coords.accuracy,
              altitudeAccuracy: pos.coords.altitudeAccuracy,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
            },
            timestamp: pos.timestamp,
            mocked: false,
          }),
        (err) => error && error({ code: err.code, message: err.message }),
        options,
      );
    } else {
      error && error({ code: 2, message: 'Geolocation not supported' });
    }
  },

  watchPosition: (success, error, options) => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      return navigator.geolocation.watchPosition(
        (pos) =>
          success({
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              altitude: pos.coords.altitude,
              accuracy: pos.coords.accuracy,
              altitudeAccuracy: pos.coords.altitudeAccuracy,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
            },
            timestamp: pos.timestamp,
            mocked: false,
          }),
        (err) => error && error({ code: err.code, message: err.message }),
        options,
      );
    }
    return -1;
  },

  clearWatch: (watchId) => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  },

  stopObserving: () => {},

  requestAuthorization: async () => 'granted',
};

export default Geolocation;
