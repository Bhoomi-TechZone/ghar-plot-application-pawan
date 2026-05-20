import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const EmployeeAlertsScreen = ({ navigation }) => {
  const [alerts, setAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      // TODO: Implement API call to fetch employee alerts
      setAlerts([
        {
          id: '1',
          title: 'New Lead Assigned',
          message: 'You have been assigned a new lead from Property XYZ',
          type: 'info',
          timestamp: '2 hours ago',
          read: false,
        },
        {
          id: '2',
          title: 'Follow-up Reminder',
          message: 'Follow up with client John Doe today',
          type: 'warning',
          timestamp: '4 hours ago',
          read: true,
        },
      ]);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  };

  const markAsRead = (alertId) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    );
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'info':
        return 'information-circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'alert-circle';
      default:
        return 'notifications';
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'info':
        return '#2196F3';
      case 'warning':
        return '#FF9800';
      case 'error':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const renderAlert = ({ item }) => (
    <TouchableOpacity
      style={[styles.alertCard, !item.read && styles.unreadAlert]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={styles.alertHeader}>
        <Icon
          name={getAlertIcon(item.type)}
          size={24}
          color={getAlertColor(item.type)}
        />
        <Text style={styles.alertTitle}>{item.title}</Text>
        {!item.read && <View style={styles.unreadBadge} />}
      </View>
      <Text style={styles.alertMessage}>{item.message}</Text>
      <Text style={styles.alertTimestamp}>{item.timestamp}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 16,
  },
  alertCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  unreadAlert: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  alertTimestamp: {
    fontSize: 12,
    color: '#999',
  },
});

export default EmployeeAlertsScreen;