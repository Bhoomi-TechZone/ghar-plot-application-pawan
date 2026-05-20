import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import CrossPlatformAlert from '../../utils/crossPlatformAlert';

const AlertsScreen = ({ navigation }) => {
  const [alerts, setAlerts] = useState([
    {
      id: '1',
      title: 'High Priority Lead',
      message: 'New lead from premium property inquiry',
      type: 'Lead',
      priority: 'High',
      timestamp: '2024-12-09 10:30 AM',
      read: false,
      actionRequired: true,
    },
    {
      id: '2',
      title: 'Follow-up Reminder',
      message: 'Follow up with client for property viewing',
      type: 'Reminder',
      priority: 'Medium',
      timestamp: '2024-12-09 09:15 AM',
      read: false,
      actionRequired: true,
    },
    {
      id: '3',
      title: 'Payment Received',
      message: 'Token amount received for property booking',
      type: 'Payment',
      priority: 'Low',
      timestamp: '2024-12-08 04:20 PM',
      read: true,
      actionRequired: false,
    },
    {
      id: '4',
      title: 'Document Verification',
      message: 'Customer documents pending verification',
      type: 'Document',
      priority: 'High',
      timestamp: '2024-12-08 02:15 PM',
      read: false,
      actionRequired: true,
    },
  ]);

  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');

  const alertTypes = ['All', 'Lead', 'Reminder', 'Payment', 'Document'];
  const priorities = ['All', 'High', 'Medium', 'Low'];

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchText.toLowerCase()) ||
                         alert.message.toLowerCase().includes(searchText.toLowerCase());
    const matchesType = filterType === 'All' || alert.type === filterType;
    const matchesPriority = filterPriority === 'All' || alert.priority === filterPriority;
    return matchesSearch && matchesType && matchesPriority;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Lead': return 'person-add';
      case 'Reminder': return 'alarm';
      case 'Payment': return 'cash';
      case 'Document': return 'document-text';
      default: return 'notifications';
    }
  };

  const handleAlertPress = (alert) => {
    // Mark as read
    setAlerts(alerts.map(a => 
      a.id === alert.id ? { ...a, read: true } : a
    ));

    CrossPlatformAlert.alert(
      alert.title,
      alert.message,
      alert.actionRequired ? [
        { text: 'Dismiss' },
        { text: 'Take Action', onPress: () => handleAction(alert) },
      ] : [
        { text: 'OK' }
      ]
    );
  };

  const handleAction = (alert) => {
    switch (alert.type) {
      case 'Lead':
        CrossPlatformAlert.alert('Action', 'Navigate to lead management');
        break;
      case 'Reminder':
        CrossPlatformAlert.alert('Action', 'Mark reminder as completed');
        break;
      case 'Payment':
        CrossPlatformAlert.alert('Action', 'View payment details');
        break;
      case 'Document':
        CrossPlatformAlert.alert('Action', 'Open document verification');
        break;
    }
  };

  const markAllAsRead = () => {
    setAlerts(alerts.map(alert => ({ ...alert, read: true })));
  };

  const renderAlertItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.alertCard, !item.read && styles.unreadAlert]}
      onPress={() => handleAlertPress(item)}
    >
      <View style={styles.alertHeader}>
        <View style={styles.alertIcon}>
          <Icon
            name={getTypeIcon(item.type)}
            size={20}
            color={getPriorityColor(item.priority)}
          />
        </View>
        <View style={styles.alertInfo}>
          <Text style={[styles.alertTitle, !item.read && styles.unreadTitle]}>
            {item.title}
          </Text>
          <Text style={styles.alertMessage}>{item.message}</Text>
        </View>
        <View style={styles.alertMeta}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={styles.priorityText}>{item.priority}</Text>
          </View>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
      </View>
      
      <View style={styles.alertFooter}>
        <View style={styles.timestampContainer}>
          <Icon name="time" size={14} color="#6b7280" />
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
        <View style={styles.typeContainer}>
          <Text style={styles.typeText}>{item.type}</Text>
          {item.actionRequired && (
            <View style={styles.actionBadge}>
              <Text style={styles.actionText}>Action Required</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alerts</Text>
        <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
          <Icon name="checkmark-done" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search alerts..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Type:</Text>
            {alertTypes.slice(0, 3).map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterButton,
                  filterType === type && styles.activeFilterButton
                ]}
                onPress={() => setFilterType(type)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterType === type && styles.activeFilterButtonText
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Priority:</Text>
            {priorities.map(priority => (
              <TouchableOpacity
                key={priority}
                style={[
                  styles.filterButton,
                  filterPriority === priority && styles.activeFilterButton
                ]}
                onPress={() => setFilterPriority(priority)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterPriority === priority && styles.activeFilterButtonText
                ]}>
                  {priority}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{alerts.length}</Text>
            <Text style={styles.statLabel}>Total Alerts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#ef4444' }]}>
              {alerts.filter(a => !a.read).length}
            </Text>
            <Text style={styles.statLabel}>Unread</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
              {alerts.filter(a => a.actionRequired).length}
            </Text>
            <Text style={styles.statLabel}>Action Required</Text>
          </View>
        </View>

        <FlatList
          data={filteredAlerts}
          renderItem={renderAlertItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  markAllButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    width: 60,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#374151',
  },
  activeFilterButtonText: {
    color: '#ffffff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  listContainer: {
    paddingBottom: 20,
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadAlert: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  alertMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  alertMeta: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 8,
  },
  actionBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400e',
  },
});

export default AlertsScreen;
