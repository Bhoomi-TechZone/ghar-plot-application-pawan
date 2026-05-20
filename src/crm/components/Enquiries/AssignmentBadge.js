/**
 * Assignment Badge Component
 * Shows assignment status and employee name
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AssignmentBadge = ({ assignment }) => {
  if (!assignment) {
    return null;
  }

  const getEmployeeName = () => {
    if (assignment.employeeId && typeof assignment.employeeId === 'object') {
      return assignment.employeeId.fullName || assignment.employeeId.name || 'Unknown Employee';
    }
    return assignment.employeeName || 'Assigned Employee';
  };

  return (
    <View style={styles.badge}>
      <Icon name="person" size={12} color="#ffffff" />
      <Text style={styles.badgeText}>
        {getEmployeeName()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981', // Green
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
});

export default AssignmentBadge;