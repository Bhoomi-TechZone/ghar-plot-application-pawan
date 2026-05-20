import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MediaCard from './MediaCard';

export default function PropertyCard({ 
  title, 
  price, 
  location, 
  image, 
  photosAndVideo = [], 
  onPress,
  onMediaPress 
}) {
  // Prepare media items for MediaCard
  const mediaItems = photosAndVideo && photosAndVideo.length > 0 
    ? photosAndVideo.map(item => ({
        uri: item.uri || item,
        type: item.type || (item.uri?.includes('.mp4') || item.uri?.includes('.mov') ? 'video' : 'image')
      }))
    : image ? [{ uri: image, type: 'image' }] : [];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <MediaCard
        mediaItems={mediaItems}
        fallbackImage="https://via.placeholder.com/400x200/5da9f6/FFFFFF?text=Property+Image"
        imageStyle={styles.image}
        showControls={true}
        onMediaPress={onMediaPress}
      />
      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.price}>₹ {price}</Text>
        <Text style={styles.location}>{location}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 10,
    marginHorizontal: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3
  },
  image: {
    width: '100%',
    height: 160
  },
  info: {
    padding: 10
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  price: {
    fontSize: 16,
    color: '#4da6ff',
    marginTop: 4
  },
  location: {
    fontSize: 14,
    color: '#555',
    marginTop: 2
  }
});
