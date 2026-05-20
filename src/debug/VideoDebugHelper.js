// Debug helper for video issues
import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import Video from 'react-native-video';

export const testVideoUrls = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://sample-videos.com/zip/10/mp4/mp4/SampleVideo_1280x720_1mb.mp4',
  'https://vjs.zencdn.net/v/oceans.mp4',
];

export const VideoDebugComponent = ({ uri, onResult }) => {
  const handleLoad = (data) => {
    console.log('✅ Video loaded successfully:', { uri, data });
    onResult?.(true, `Video loaded: ${data.duration}s`);
  };

  const handleError = (error) => {
    console.log('❌ Video error:', { uri, error });
    onResult?.(false, `Video error: ${JSON.stringify(error)}`);
  };

  return (
    <View style={{ margin: 10 }}>
      <Text>Testing: {uri}</Text>
      <Video
        source={{ uri }}
        style={{ width: 200, height: 100, backgroundColor: 'black' }}
        resizeMode="contain"
        paused={true}
        onLoad={handleLoad}
        onError={handleError}
        controls={false}
      />
    </View>
  );
};

export const logMediaItems = (mediaItems) => {
  console.log('🔍 Media Items Debug:');
  console.log('Total items:', mediaItems?.length || 0);
  
  mediaItems?.forEach((item, index) => {
    console.log(`Item ${index}:`, {
      uri: item?.uri || item?.url,
      type: item?.type,
      isVideo: item?.type?.includes('video') || item?.uri?.includes('.mp4'),
    });
  });
};

export const validateVideoUrl = async (url) => {
  try {
    console.log('🌐 Testing URL accessibility:', url);
    const response = await fetch(url, { method: 'HEAD' });
    console.log('Response status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    return response.ok;
  } catch (error) {
    console.log('❌ URL test failed:', error.message);
    return false;
  }
};