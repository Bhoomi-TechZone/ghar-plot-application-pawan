import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';

const UserLeadAssignmentsScreen = ({ navigation }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState('All Employees');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedPriority, setSelectedPriority] = useState('All Priorities');

  const SAMPLE_ASSIGNMENTS = [
    {
      id: '1',
      userName: 'Unknown User',
      phone: 'N/A',
      location: 'N/A',
      assignedTo: 'SURYA',
      email: 'surya@gmail.com',
      priority: 'High',
      status: 'Active',
      date: '26/11/2023 12:46',
    },
    {
      id: '2',
      userName: 'John Doe',
      phone: '+91 9876543210',
      location: 'Delhi',
      assignedTo: 'RAHUL',
      email: 'rahul@gmail.com',
      priority: 'Medium',
      status: 'Pending',
      date: '25/11/2023 14:30',
    },
  ];

  const EMPLOYEES = ['All Employees', 'SURYA', 'RAHUL'];
  const STATUSES = ['All Status', 'Active', 'Pending'];
  const PRIORITIES = ['All Priorities', 'High', 'Medium', 'Low'];

  useEffect(() => {
    setTimeout(() => {
      setAssignments(SAMPLE_ASSIGNMENTS);
      setLoading(false);
    }, 800);
  }, []);

  const getFilteredData = () =>
    assignments.filter(item =>
      (selectedEmployee === 'All Employees' || item.assignedTo === selectedEmployee) &&
      (selectedStatus === 'All Status' || item.status === selectedStatus) &&
      (selectedPriority === 'All Priorities' || item.priority === selectedPriority)
    );

  const badgeColor = value => {
    if (value === 'High') return '#EF4444';
    if (value === 'Medium') return '#F59E0B';
    if (value === 'Low') return '#10B981';
    if (value === 'Active') return '#22C55E';
    if (value === 'Pending') return '#F97316';
    return '#6B7280';
  };

  const renderCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="account" size={22} color="#2563EB" />
        <Text style={styles.userName}>{String(item.userName || 'Unknown')}</Text>
      </View>

      <Text style={styles.info}>📍 {String(item.location || 'N/A')}</Text>
      <Text style={styles.info}>📞 {String(item.phone || 'N/A')}</Text>

      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: badgeColor(item.priority) }]}>
          <Text style={styles.badgeText}>{String(item.priority || 'N/A')}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badgeColor(item.status) }]}>
          <Text style={styles.badgeText}>{String(item.status || 'N/A')}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.assignText}>Assigned To</Text>
      <Text style={styles.assignName}>✓ {String(item.assignedTo || 'Unassigned')}</Text>
      <Text style={styles.assignEmail}>{String(item.email || 'N/A')}</Text>

      <Text style={styles.date}>{String(item.date || 'N/A')}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lead Assignments</Text>
        <View />
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
        <Picker selectedValue={selectedEmployee} onValueChange={setSelectedEmployee} style={styles.picker}>
          {EMPLOYEES.map(v => <Picker.Item key={v} label={v} value={v} />)}
        </Picker>
        <Picker selectedValue={selectedStatus} onValueChange={setSelectedStatus} style={styles.picker}>
          {STATUSES.map(v => <Picker.Item key={v} label={v} value={v} />)}
        </Picker>
        <Picker selectedValue={selectedPriority} onValueChange={setSelectedPriority} style={styles.picker}>
          {PRIORITIES.map(v => <Picker.Item key={v} label={v} value={v} />)}
        </Picker>
      </ScrollView>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={getFilteredData()}
          renderItem={renderCard}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  header: {
    backgroundColor: '#2563EB',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  filterBar: { backgroundColor: '#fff', paddingVertical: 8 },
  picker: { width: 160 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  userName: { fontSize: 16, fontWeight: '700', marginLeft: 8 },

  info: { fontSize: 13, color: '#475569', marginTop: 2 },

  row: { flexDirection: 'row', marginTop: 10 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 8,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 },

  assignText: { fontSize: 12, color: '#6B7280' },
  assignName: { fontSize: 14, fontWeight: '600', color: '#16A34A' },
  assignEmail: { fontSize: 12, color: '#6B7280' },

  date: { fontSize: 11, color: '#94A3B8', marginTop: 8, textAlign: 'right' },
});

export default UserLeadAssignmentsScreen;
