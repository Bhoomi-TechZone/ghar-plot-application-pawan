/**
 * Employee Reminder Accept Screen
 * Allows employees to accept and manage assigned reminders
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../constants/theme';
import CrossPlatformAlert from '../../utils/crossPlatformAlert';

const EmployeeReminderAcceptScreen = ({ navigation }) => {
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);

  const [filter, setFilter] = useState('pending');
  const currentEmployeeId = 'employee_123'; // In real app, get from auth context

  useEffect(() => {
    fetchReminders('employee', currentEmployeeId);
  }, []);

  // Filter reminders for current employee
  const filteredReminders = reminders.filter(reminder => {
    if (filter === 'pending') {
      return reminder.assignedTo === currentEmployeeId && reminder.status === 'pending';
    }
    if (filter === 'accepted') {
      return reminder.assignedTo === currentEmployeeId && reminder.status === 'accepted';
    }
    if (filter === 'completed') {
      return reminder.assignedTo === currentEmployeeId && reminder.status === 'completed';
    }
    return reminder.assignedTo === currentEmployeeId;
  });

  const handleAcceptReminder = async (reminderId) => {
    try {
      await acceptReminder(reminderId, currentEmployeeId);
    } catch (error) {
      CrossPlatformAlert.alert('Error', 'Failed to accept reminder');
    }
  };

  const handleCompleteReminder = async (reminderId) => {
    CrossPlatformAlert.alert(
      'Complete Reminder',
      'Mark this reminder as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await completeReminder(reminderId, currentEmployeeId);
            } catch (error) {
              CrossPlatformAlert.alert('Error', 'Failed to complete reminder');
            }
          },
        },
      ]
    );
  };

  const handleReminderPress = (reminder) => {
    navigation.navigate('ReminderDetail', { reminderId: reminder.id });
  };

  const filterTabs = [
    { key: 'pending', label: 'Pending', icon: 'clock', color: '#FA8C16' },
    { key: 'accepted', label: 'Accepted', icon: 'check-circle', color: '#1890FF' },
    { key: 'completed', label: 'Completed', icon: 'check-all', color: '#52C41A' },
    { key: 'all', label: 'All', icon: 'format-list-bulleted', color: theme.colors.text.secondary },
  ];

  const renderFilterTab = (tab) => {
    const isActive = filter === tab.key;
    const count = reminders.filter(r => {
      if (tab.key === 'all') return r.assignedTo === currentEmployeeId;
      return r.assignedTo === currentEmployeeId && r.status === tab.key;
    }).length;

    return (
      <TouchableOpacity
        key={tab.key}
        style={[styles.filterTab, isActive && { backgroundColor: tab.color }]}
        onPress={() => setFilter(tab.key)}
      >
        <MaterialCommunityIcons
          name={tab.icon}
          size={16}
          color={isActive ? '#fff' : tab.color}
        />
        <Text style={[styles.filterTabText, isActive && styles.activeFilterTabText]}>
          {tab.label}
        </Text>
        {count > 0 && (
          <View style={[styles.countBadge, isActive && styles.activeCountBadge]}>
            <Text style={[styles.countText, isActive && styles.activeCountText]}>
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderReminderItem = ({ item }) => (
    <View style={styles.reminderContainer}>
      <ReminderCard
        reminder={item}
        onPress={handleReminderPress}
        onAccept={handleAcceptReminder}
        currentEmployeeId={currentEmployeeId}
        showActions={item.status === 'pending'}
      />
      
      {item.status === 'accepted' && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => handleCompleteReminder(item.id)}
          >
            <MaterialCommunityIcons name="check-all" size={16} color="#fff" />
            <Text style={styles.completeButtonText}>Mark Complete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => {
    const getEmptyStateContent = () => {
      switch (filter) {
        case 'pending':
          return {
            icon: 'clock-outline',
            title: 'No Pending Reminders',
            subtitle: 'All reminders have been accepted or completed',
          };
        case 'accepted':
          return {
            icon: 'check-circle-outline',
            title: 'No Accepted Reminders',
            subtitle: 'Accept reminders to start working on them',
          };
        case 'completed':
          return {
            icon: 'check-all',
            title: 'No Completed Reminders',
            subtitle: 'Completed reminders will appear here',
          };
        default:
          return {
            icon: 'bell-outline',
            title: 'No Reminders',
            subtitle: 'No reminders assigned to you yet',
          };
      }
    };

    const content = getEmptyStateContent();
    
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name={content.icon} size={64} color={theme.colors.text.secondary} />
        <Text style={styles.emptyText}>{content.title}</Text>
        <Text style={styles.emptySubtext}>{content.subtitle}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        <Text style={styles.sectionTitle}>My Reminders</Text>
        <View style={styles.filterTabs}>
          {filterTabs.map(renderFilterTab)}
        </View>
      </View>

      {/* Reminders List */}
      <FlatList
        data={filteredReminders}
        renderItem={renderReminderItem}
        keyExtractor={(item) => item.id?.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={remindersLoading}
            onRefresh={() => fetchReminders('employee', currentEmployeeId)}
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  filterSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    position: 'relative',
  },
  filterTabText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginLeft: 4,
    fontWeight: '600',
  },
  activeFilterTabText: {
    color: '#fff',
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF4D4F',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCountBadge: {
    backgroundColor: '#fff',
  },
  countText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  activeCountText: {
    color: '#FF4D4F',
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  reminderContainer: {
    marginBottom: 8,
  },
  actionBar: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  completeButton: {
    backgroundColor: '#52C41A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default EmployeeReminderAcceptScreen;