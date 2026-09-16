/**
 * Web shim for react-native-image-picker
 * Uses a hidden <input type="file"> to let users pick images/videos from disk.
 */

export const launchImageLibrary = (options, callback) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = options?.mediaType === 'video' ? 'video/*' : 'image/*,video/*';
  if (options?.selectionLimit !== 1) input.multiple = true;

  input.onchange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) {
      callback({ didCancel: true });
      return;
    }

    const assets = files.map((file) => ({
      uri: URL.createObjectURL(file),
      type: file.type,
      fileName: file.name,
      fileSize: file.size,
    }));

    callback({ assets, didCancel: false });
  };

  input.click();
};

export const launchCamera = (options, callback) => {
  // Browser camera access requires getUserMedia; fall back to file picker
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';

  input.onchange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) {
      callback({ didCancel: true });
      return;
    }

    callback({
      assets: [
        {
          uri: URL.createObjectURL(files[0]),
          type: files[0].type,
          fileName: files[0].name,
          fileSize: files[0].size,
        },
      ],
      didCancel: false,
    });
  };

  input.click();
};

export const ImageLibraryOptions = {};
export const CameraOptions = {};

export default { launchImageLibrary, launchCamera };
