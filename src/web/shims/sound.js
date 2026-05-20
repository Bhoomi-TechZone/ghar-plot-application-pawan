/**
 * Web shim for react-native-sound
 * Uses the HTML5 Audio API.
 */

class Sound {
  constructor(filename, basePath, onLoad) {
    this._audio = null;
    this._loaded = false;

    // Resolve the audio URL
    let url = filename;
    if (basePath && !filename.startsWith('http')) {
      url = basePath + '/' + filename;
    }

    try {
      this._audio = new Audio(url);
      this._audio.addEventListener('canplaythrough', () => {
        this._loaded = true;
        onLoad && onLoad(null, this);
      });
      this._audio.addEventListener('error', (e) => {
        onLoad && onLoad(e, null);
      });
    } catch (e) {
      onLoad && onLoad(e, null);
    }
  }

  play(callback) {
    if (this._audio) {
      this._audio
        .play()
        .then(() => callback && callback(true))
        .catch(() => callback && callback(false));
    }
    return this;
  }

  pause() {
    if (this._audio) this._audio.pause();
    return this;
  }

  stop(callback) {
    if (this._audio) {
      this._audio.pause();
      this._audio.currentTime = 0;
    }
    callback && callback();
    return this;
  }

  release() {
    if (this._audio) {
      this._audio.pause();
      this._audio = null;
    }
  }

  setVolume(value) {
    if (this._audio) this._audio.volume = Math.min(1, Math.max(0, value));
    return this;
  }

  setNumberOfLoops(loops) {
    if (this._audio) this._audio.loop = loops !== 0;
    return this;
  }

  getCurrentTime(callback) {
    callback && callback(this._audio ? this._audio.currentTime : 0, this._loaded);
  }

  getDuration() {
    return this._audio ? this._audio.duration || -1 : -1;
  }

  isLoaded() {
    return this._loaded;
  }
}

Sound.MAIN_BUNDLE = '';
Sound.DOCUMENT = '';
Sound.LIBRARY = '';
Sound.CACHES = '';
Sound.setCategory = () => {};

export default Sound;
