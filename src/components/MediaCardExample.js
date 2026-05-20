import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import MediaCard from '../components/MediaCard';

// Example usage of MediaCard with videos and images
const MediaCardExample = () => {
  // Sample property data with mixed media
  const sampleProperty = {
    photosAndVideo: [
      {
        uri: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        type: 'video/mp4'
      },
      {
        uri: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1080&q=80',
        type: 'image/jpeg'
      },
      {
        uri: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1080&q=80',
        type: 'image/jpeg'
      },
      {
        uri: 'https://sample-videos.com/zip/10/mp4/SampleVideo_640x360_1mb.mp4',
        type: 'video/mp4'
      }
    ]
  };

  // Prepare media items for MediaCard
  const mediaItems = sampleProperty.photosAndVideo.map(media => ({
    uri: media.uri,
    type: media.type.includes('video') ? 'video' : 'image'
  }));

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🎥 Video Support Example</Text>
      
      <Text style={styles.sectionTitle}>Property with Mixed Media</Text>
      <Text style={styles.description}>
        This property has 2 videos and 2 images. Use navigation arrows to switch between media.
      </Text>
      
      <View style={styles.cardContainer}>
        <MediaCard
          mediaItems={mediaItems}
          fallbackImage="https://via.placeholder.com/400x200/5da9f6/FFFFFF?text=Property+Image"
          showControls={true}
          autoPlay={false}
          loop={false}
          onMediaPress={(media, index) => {
            console.log('Media pressed:', media, 'Index:', index);
            // Handle media press - could open fullscreen view
          }}
        />
      </View>

      <Text style={styles.infoText}>
        ✅ Videos show with play button and "VIDEO" badge{'\n'}
        ✅ Images display normally{'\n'}
        ✅ Navigation arrows for multiple media{'\n'}
        ✅ Media counter shows current position{'\n'}
        ✅ Tap video to play/pause{'\n'}
        ✅ Error handling with fallback images
      </Text>

      <View style={styles.featureList}>
        <Text style={styles.featureTitle}>🚀 Features:</Text>
        <Text style={styles.feature}>• Auto-detect video files (.mp4, .mov, .avi)</Text>
        <Text style={styles.feature}>• Play/pause controls with video overlay</Text>
        <Text style={styles.feature}>• Multiple media navigation</Text>
        <Text style={styles.feature}>• Loading states and error handling</Text>
        <Text style={styles.feature}>• Responsive design for all screen sizes</Text>
        <Text style={styles.feature}>• Muted autoplay option</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E90FF',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#28a745',
    backgroundColor: '#f8fff9',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
    marginBottom: 20,
    lineHeight: 20,
  },
  featureList: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  feature: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
    lineHeight: 20,
  },
});

export default MediaCardExample;