/**
 * Web shim for react-native-maps
 * Renders a simple placeholder since MapView cannot run in a browser without
 * an additional mapping library (e.g. react-leaflet).
 * TODO: Replace the placeholder with a real Leaflet / Google Maps embedding.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MapView = ({ style, children }) => (
  <View style={[styles.container, style]}>
    <Text style={styles.label}>🗺  Map view not available on web</Text>
    {children}
  </View>
);

MapView.Marker = ({ children }) => children || null;
MapView.Polyline = () => null;
MapView.Polygon = () => null;
MapView.Circle = () => null;
MapView.Callout = ({ children }) => children || null;

export const Marker = MapView.Marker;
export const Polyline = MapView.Polyline;
export const Polygon = MapView.Polygon;
export const Circle = MapView.Circle;
export const Callout = MapView.Callout;

export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = null;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8e8e8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
});

export default MapView;
