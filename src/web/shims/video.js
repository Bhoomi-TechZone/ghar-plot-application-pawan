/**
 * Web shim for react-native-video
 * Renders a standard HTML5 <video> element with the same props interface.
 */

import React, { useRef, useImperativeHandle, forwardRef } from 'react';

const Video = forwardRef((props, ref) => {
  const {
    source,
    style,
    paused = false,
    muted = false,
    repeat = false,
    resizeMode = 'contain',
    onLoad,
    onProgress,
    onEnd,
    onError,
    controls = false,
    volume = 1.0,
    rate = 1.0,
  } = props;

  const videoRef = useRef(null);

  useImperativeHandle(ref, () => ({
    seek: (time) => {
      if (videoRef.current) videoRef.current.currentTime = time;
    },
    presentFullscreenPlayer: () => {
      if (videoRef.current && videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    },
    dismissFullscreenPlayer: () => {
      if (document.exitFullscreen) document.exitFullscreen();
    },
    save: async () => {},
    restoreUserInterfaceForPictureInPictureStopWithCompletionHandler: () => {},
  }));

  const objectFitMap = {
    contain: 'contain',
    cover: 'cover',
    stretch: 'fill',
    none: 'none',
  };

  const uri = typeof source === 'object' ? source?.uri : source;

  return (
    <video
      ref={videoRef}
      src={uri}
      style={{
        ...(style || {}),
        objectFit: objectFitMap[resizeMode] || 'contain',
      }}
      autoPlay={!paused}
      muted={muted}
      loop={repeat}
      controls={controls}
      volume={volume}
      playbackRate={rate}
      onLoadedMetadata={(e) => {
        onLoad &&
          onLoad({
            duration: e.target.duration,
            naturalSize: {
              width: e.target.videoWidth,
              height: e.target.videoHeight,
            },
          });
      }}
      onTimeUpdate={(e) => {
        onProgress &&
          onProgress({
            currentTime: e.target.currentTime,
            playableDuration: e.target.buffered.length
              ? e.target.buffered.end(e.target.buffered.length - 1)
              : 0,
            seekableDuration: e.target.duration,
          });
      }}
      onEnded={() => onEnd && onEnd()}
      onError={(e) => onError && onError({ error: { code: -1, localizedDescription: 'Video error' } })}
    />
  );
});

Video.displayName = 'Video';

export default Video;
