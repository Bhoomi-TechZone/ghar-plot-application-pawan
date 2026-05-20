/**
 * Source Badge Component
 * Shows whether enquiry is from client or manual entry
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SourceBadge = ({ source, enquiryType }) => {
  const getBadgeConfig = () => {
    if (source === 'client' || enquiryType === 'Inquiry') {
      return {
        label: 'Client Enquiry',
        backgroundColor: '#3b82f6', // Blue
        textColor: '#ffffff',
      };
    } else {
      return {
        label: 'Manual Entry',
        backgroundColor: '#f59e0b', // Orange
        textColor: '#ffffff',
      };
    }
  };

  const config = getBadgeConfig();

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: config.textColor }]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default SourceBadge;