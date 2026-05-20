import React from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MediaCard from '../components/MediaCard';

// Test component to debug video issues
const VideoTestScreen = ({ navigation }) => {
  // Test with different video URLs
  const testMediaItems = [
    {
      uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      type: 'video'
    },
    {
      uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      type: 'video'
    },
    {
      uri: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1080&q=80',
      type: 'image'
    },
    {
      uri: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      type: 'video'
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🎥 Video Test Screen</Text>
      </View>

      <Text style={styles.description}>
        Testing different video sources to debug video playback issues.
      </Text>

      <View style={styles.testContainer}>
        <Text style={styles.testTitle}>Mixed Media Test</Text>
        <MediaCard
          mediaItems={testMediaItems}
          fallbackImage="https://via.placeholder.com/400x200/5da9f6/FFFFFF?text=Property+Image"
          showControls={true}
          autoPlay={false}
          onMediaPress={(media, index) => {
            console.log('Test media pressed:', media, index);
          }}
        />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>🔍 Debug Information</Text>
        <Text style={styles.infoText}>
          • Total test media: {testMediaItems.length}{'\n'}
          • Videos: {testMediaItems.filter(item => item.type === 'video').length}{'\n'}
          • Images: {testMediaItems.filter(item => item.type === 'image').length}{'\n'}
          • Check console logs for detailed debugging info{'\n'}
        </Text>
        
        <Text style={styles.infoTitle}>📋 Test URLs:</Text>
        {testMediaItems.map((item, index) => (
          <Text key={index} style={styles.urlText}>
            {index + 1}. {item.type.toUpperCase()}: {item.uri.substring(0, 60)}...
          </Text>
        ))}
      </View>

      <View style={styles.troubleshootContainer}>
        <Text style={styles.troubleshootTitle}>🛠️ Troubleshooting Steps</Text>
        <Text style={styles.troubleshootText}>
          1. Check network connection{'\n'}
          2. Verify video URL is accessible{'\n'}
          3. Check react-native-video installation{'\n'}
          4. Ensure Android permissions{'\n'}
          5. Test with different video formats{'\n'}
          6. Check console logs for errors
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#1E90FF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  description: {
    padding: 20,
    fontSize: 14,
    color: '#666',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  testContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoContainer: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 10,
    borderRadius: 12,
    padding: 15,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E90FF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
    marginBottom: 15,
  },
  urlText: {
    fontSize: 10,
    color: '#888',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  troubleshootContainer: {
    backgroundColor: '#fff3cd',
    margin: 20,
    marginTop: 10,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  troubleshootTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  troubleshootText: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
});

export default VideoTestScreen;