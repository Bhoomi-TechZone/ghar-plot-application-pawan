import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const MediaCard = ({
  mediaItems = [], // Array of {uri, type} objects
  fallbackImage,
  style,
  imageStyle,
  showControls = true,
  autoPlay = false,
  loop = false,
  onMediaPress,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [retryCount, setRetryCount] = useState(0);
  const videoRef = useRef(null);

  // Enhanced video validation with retry mechanism
  useEffect(() => {
    if (isVideo && currentMedia?.uri) {
      console.log('MediaCard - Checking video URL:', currentMedia.uri);
      
      // Basic URL validation
      if (!currentMedia.uri.startsWith('http') && !currentMedia.uri.startsWith('file')) {
        console.log('MediaCard - Invalid video URL format');
        setError('Invalid video URL format');
        return;
      }

      // Reset error when changing videos
      setError(null);
      setRetryCount(0);
    }
  }, [currentMedia?.uri, isVideo]);

  // If no media items, show fallback
  if (!mediaItems || mediaItems.length === 0) {
    return (
      <Image
        source={{ uri: fallbackImage }}
        style={[styles.defaultImage, imageStyle]}
        resizeMode="cover"
      />
    );
  }

  const currentMedia = mediaItems[currentIndex];
  
  // Enhanced debug logging
  console.log('🎬 MediaCard render:', {
    mediaCount: mediaItems?.length || 0,
    currentIndex,
    currentMediaUri: currentMedia?.uri,
    currentMediaType: currentMedia?.type,
  });
  
  // Improved video detection
  const isVideo = currentMedia && (
    currentMedia.type?.toLowerCase().includes('video') || 
    currentMedia.uri?.toLowerCase().includes('.mp4') || 
    currentMedia.uri?.toLowerCase().includes('.mov') ||
    currentMedia.uri?.toLowerCase().includes('.avi') ||
    currentMedia.uri?.toLowerCase().includes('.mkv') ||
    currentMedia.uri?.toLowerCase().includes('.webm') ||
    currentMedia.uri?.toLowerCase().includes('.3gp')
  );

  console.log('🎥 Video detection result:', isVideo);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsPlaying(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < mediaItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsPlaying(false);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVideoError = (error) => {
    console.warn('Video error:', error);
    console.warn('Current media URI:', currentMedia?.uri);
    console.warn('Retry count:', retryCount);
    
    // Implement retry mechanism
    if (retryCount < 2) {
      setRetryCount(prev => prev + 1);
      setTimeout(() => {
        console.log('Retrying video load...');
        setError(null);
        setIsLoading(false);
      }, 1000);
    } else {
      setError('Video failed to load after retries');
      setIsLoading(false);
      
      // Auto-fallback to image mode after delay
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };

  const handleVideoLoad = (data) => {
    console.log('✅ Video loaded successfully:', data);
    console.log('📹 Video duration:', data.duration);
    console.log('📹 Video dimensions:', data.naturalSize);
    setIsLoading(false);
    setError(null);
  };

  const handleVideoLoadStart = () => {
    console.log('📹 Video load started for:', currentMedia?.uri);
    console.log('📹 Video type detected:', currentMedia?.type);
    console.log('📹 Is video?', isVideo);
    setIsLoading(true);
    setError(null);
  };

  const handleImageError = () => {
    setError('Image failed to load');
  };

  const handleMediaPress = () => {
    if (onMediaPress) {
      onMediaPress(currentMedia, currentIndex);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={styles.mediaContainer} 
        onPress={handleMediaPress}
        activeOpacity={0.9}
      >
        {isVideo && !error ? (
          <View style={styles.videoWrapper}>
            <Video
              ref={videoRef}
              source={{ uri: currentMedia.uri }}
              style={[styles.video, imageStyle]}
              resizeMode="cover"
              paused={!isPlaying}
              repeat={loop}
              onLoadStart={handleVideoLoadStart}
              onLoad={handleVideoLoad}
              onError={handleVideoError}
              muted={true}
              controls={false}
              playInBackground={false}
              playWhenInactive={false}
              ignoreSilentSwitch={'ignore'}
              poster={fallbackImage} // Add poster for loading state
              posterResizeMode="cover"
            />
            
            {/* Video Overlay Controls */}
            {showControls && (
              <View style={styles.videoOverlay}>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={togglePlayPause}
                >
                  <Icon
                    name={isPlaying ? "pause" : "play"}
                    size={24}
                    color="#fff"
                  />
                </TouchableOpacity>
                
                {/* Video indicator */}
                <View style={styles.videoIndicator}>
                  <Icon name="videocam" size={16} color="#fff" />
                  <Text style={styles.videoText}>VIDEO</Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          // Fallback to image for videos that fail to load or regular images
          <Image
            source={{ uri: currentMedia?.uri || fallbackImage }}
            style={[styles.image, imageStyle]}
            resizeMode="cover"
            onError={handleImageError}
          />
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {/* Error State */}
        {error && (
          <View style={styles.errorOverlay}>
            <Icon name="alert-circle" size={24} color="#fff" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Media Navigation */}
        {mediaItems.length > 1 && showControls && (
          <View style={styles.navigationContainer}>
            {/* Previous Button */}
            {currentIndex > 0 && (
              <TouchableOpacity style={styles.navButton} onPress={handlePrevious}>
                <Icon name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>
            )}

            {/* Next Button */}
            {currentIndex < mediaItems.length - 1 && (
              <TouchableOpacity 
                style={[styles.navButton, styles.nextButton]} 
                onPress={handleNext}
              >
                <Icon name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            )}

            {/* Media Counter */}
            <View style={styles.mediaCounter}>
              <Text style={styles.counterText}>
                {currentIndex + 1}/{mediaItems.length}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaContainer: {
    position: 'relative',
  },
  defaultImage: {
    width: '100%',
    height: 200,
  },
  image: {
    width: '100%',
    height: 200,
  },
  videoWrapper: {
    position: 'relative',
  },
  video: {
    width: '100%',
    height: 200,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  videoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  navigationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
  },
  nextButton: {
    alignSelf: 'center',
  },
  mediaCounter: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default MediaCard;
