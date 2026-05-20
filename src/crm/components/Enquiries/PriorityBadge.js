/**
 * Priority Badge Component
 * Shows priority level with appropriate colors
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PriorityBadge = ({ priority }) => {
  if (!priority) {
    return null;
  }

  const getBadgeConfig = () => {
    switch (priority.toLowerCase()) {
      case 'high':
        return {
          backgroundColor: '#ef4444', // Red
          textColor: '#ffffff',
        };
      case 'medium':
        return {
          backgroundColor: '#f59e0b', // Orange
          textColor: '#ffffff',
        };
      case 'low':
        return {
          backgroundColor: '#10b981', // Green
          textColor: '#ffffff',
        };
      default:
        return {
          backgroundColor: '#6b7280', // Gray
          textColor: '#ffffff',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: config.textColor }]}>
        {priority.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default PriorityBadge;