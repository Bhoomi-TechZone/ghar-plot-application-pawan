/**
 * UserAssignmentsScreen - Assign customers (users) to employees
 * API: /admin/user-leads/*
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Modal, ActivityIndicator, Alert, TextInput, StyleSheet,
  ScrollView, RefreshControl, StatusBar, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const BASE_URL = 'https://gharplotbackend.gntechnology.de';

const getToken = async () => {
  const keys = ['crm_auth_token', 'adminToken', 'admin_token', 'crm_admin_token', 'employee_auth_token', 'authToken'];
  for (const key of keys) {
    const token = await AsyncStorage.getItem(key);
    if (token) return token;
  }
  return null;
};

const getHeaders = async () => {
  const token = await getToken();
  return { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' };
};

const UserAssignmentsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const statusBarTop = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0);

  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSearch, setUsersSearch] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const headers = await getHeaders();
      const res = await fetch(`${BASE_URL}/admin/user-leads/available-users`, { headers });
      const json = await res.json();
      if (json.success) setUsers(json.data || []);
      else CrossPlatformAlert.alert('Error', json.message || 'Failed to load users');
    } catch (e) {
      CrossPlatformAlert.alert('Error', 'Network error fetching users');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      setAssignmentsLoading(true);
      const headers = await getHeaders();
      const res = await fetch(`${BASE_URL}/admin/user-leads/all`, { headers });
      const json = await res.json();
      if (json.success) setAssignments(json.data?.assignments || json.data || []);
      else CrossPlatformAlert.alert('Error', json.message || 'Failed to load assignments');
    } catch (e) {
      CrossPlatformAlert.alert('Error', 'Network error fetching assignments');
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      setEmployeesLoading(true);
      const headers = await getHeaders();
      const res = await fetch(`${BASE_URL}/admin/user-leads/available-employees`, { headers });
      const json = await res.json();
      if (json.success) setEmployees(json.data || []);
    } catch (e) {
      console.error('Employees fetch error:', e);
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchAssignments();
    fetchEmployees();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    await fetchAssignments();
    setRefreshing(false);
  };

  const openAssignModal = (user) => {
    setSelectedUser(user);
    setSelectedEmployee(null);
    setAssignModal(true);
  };

  const handleAssign = async () => {
    if (!selectedEmployee) {
      CrossPlatformAlert.alert('Select Employee', 'Please select an employee first.');
      return;
    }
    try {
      setAssigning(true);
      const headers = await getHeaders();
      const res = await fetch(`${BASE_URL}/admin/user-leads/assign`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ employeeId: selectedEmployee._id, userIds: [selectedUser._id] }),
      });
      const json = await res.json();
      if (json.success) {
        CrossPlatformAlert.alert('Success', `${selectedUser.fullName || selectedUser.email} assigned to ${selectedEmployee.name}`);
        setAssignModal(false);
        fetchUsers();
        fetchAssignments();
      } else {
        CrossPlatformAlert.alert('Error', json.message || 'Assignment failed');
      }
    } catch (e) {
      CrossPlatformAlert.alert('Error', 'Network error during assignment');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = (assignment) => {
    CrossPlatformAlert.alert(
      'Unassign User',
      `Remove ${assignment.userId?.fullName || 'this user'} from ${assignment.employeeId?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unassign',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getHeaders();
              const res = await fetch(`${BASE_URL}/admin/user-leads/unassign`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ assignmentIds: [assignment._id] }),
              });
              const json = await res.json();
              if (json.success) {
                CrossPlatformAlert.alert('Success', 'User unassigned');
                fetchAssignments();
                fetchUsers();
              } else {
                CrossPlatformAlert.alert('Error', json.message || 'Unassign failed');
              }
            } catch (e) {
              CrossPlatformAlert.alert('Error', 'Network error');
            }
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter((u) => {
    const q = usersSearch.toLowerCase();
    return (
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.mobileNumber || '').toLowerCase().includes(q)
    );
  });

  const renderUserItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        <Text style={styles.avatarText}>{(item.fullName || item.email || '?')[0].toUpperCase()}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.fullName || 'Unknown User'}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        {item.mobileNumber ? <Text style={styles.userPhone}>{item.mobileNumber}</Text> : null}
      </View>
      <TouchableOpacity style={styles.assignBtn} onPress={() => openAssignModal(item)}>
        <MaterialIcons name="person-add" size={16} color="#fff" />
        <Text style={styles.assignBtnText}>Assign</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAssignmentItem = ({ item }) => {
    const user = item.userId;
    const employee = item.employeeId;
    return (
      <View style={styles.assignmentCard}>
        <View style={styles.assignmentRow}>
          <View style={[styles.userAvatar, { backgroundColor: '#10b981' }]}>
            <Text style={styles.avatarText}>{(user?.fullName || user?.email || '?')[0]?.toUpperCase()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.fullName || user?.email || 'Unknown User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.assignedToRow}>
              <MaterialIcons name="badge" size={14} color="#3b82f6" />
              <Text style={styles.assignedToText}> {employee?.name || 'Unknown Employee'}</Text>
            </View>
          </View>
          <View style={styles.rightSection}>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#dcfce7' : '#fef3c7' }]}>
              <Text style={[styles.statusText, { color: item.status === 'active' ? '#16a34a' : '#d97706' }]}>
                {item.status || 'active'}
              </Text>
            </View>
            <TouchableOpacity style={styles.unassignBtnSm} onPress={() => handleUnassign(item)}>
              <MaterialIcons name="person-remove" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: statusBarTop }]}>
      <StatusBar barStyle="light-content" backgroundColor="#3b82f6" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Assignments</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.headerBtn}>
          <MaterialIcons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <MaterialIcons name="people" size={18} color={activeTab === 'users' ? '#3b82f6' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
            All Users ({users.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'assignments' && styles.activeTab]}
          onPress={() => setActiveTab('assignments')}
        >
          <MaterialIcons name="assignment-ind" size={18} color={activeTab === 'assignments' ? '#3b82f6' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'assignments' && styles.activeTabText]}>
            Assignments ({assignments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'users' && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email, phone..."
              placeholderTextColor="#999"
              value={usersSearch}
              onChangeText={setUsersSearch}
            />
            {usersSearch.length > 0 && (
              <TouchableOpacity onPress={() => setUsersSearch('')}>
                <MaterialIcons name="clear" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          {usersLoading ? (
            <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item._id}
              renderItem={renderUserItem}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <MaterialIcons name="people-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No users found</Text>
                </View>
              }
              contentContainerStyle={{ padding: 12 }}
            />
          )}
        </View>
      )}

      {activeTab === 'assignments' && (
        <View style={{ flex: 1 }}>
          {assignmentsLoading ? (
            <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={assignments}
              keyExtractor={(item) => item._id}
              renderItem={renderAssignmentItem}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <MaterialIcons name="assignment-late" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No assignments yet</Text>
                  <Text style={styles.emptySubText}>Go to "All Users" to assign users to employees</Text>
                </View>
              }
              contentContainerStyle={{ padding: 12 }}
            />
          )}
        </View>
      )}

      <Modal visible={assignModal} transparent animationType="slide" onRequestClose={() => setAssignModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign User</Text>
              <TouchableOpacity onPress={() => setAssignModal(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {selectedUser && (
              <View style={styles.selectedUserInfo}>
                <MaterialIcons name="person" size={20} color="#3b82f6" />
                <Text style={styles.selectedUserName}>{selectedUser.fullName || selectedUser.email}</Text>
              </View>
            )}
            <Text style={styles.modalSubTitle}>Select Employee:</Text>
            {employeesLoading ? (
              <ActivityIndicator size="large" color="#3b82f6" style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {employees.length === 0 ? (
                  <Text style={styles.noEmployees}>No employees available</Text>
                ) : (
                  employees.map((emp) => (
                    <TouchableOpacity
                      key={emp._id}
                      style={[styles.employeeItem, selectedEmployee?._id === emp._id && styles.employeeItemSelected]}
                      onPress={() => setSelectedEmployee(emp)}
                    >
                      <View style={styles.empAvatar}>
                        <Text style={styles.avatarText}>{emp.name[0].toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.empName}>{emp.name}</Text>
                        <Text style={styles.empRole}>{emp.role?.name || emp.email}</Text>
                      </View>
                      {selectedEmployee?._id === emp._id && (
                        <MaterialIcons name="check-circle" size={22} color="#3b82f6" />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
            <TouchableOpacity
              style={[styles.confirmBtn, !selectedEmployee && styles.confirmBtnDisabled]}
              onPress={handleAssign}
              disabled={!selectedEmployee || assigning}
            >
              {assigning ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="assignment-turned-in" size={18} color="#fff" />
                  <Text style={styles.confirmBtnText}>Confirm Assignment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 14,
  },
  headerBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 6,
  },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#3b82f6' },
  tabText: { fontSize: 13, color: '#666', fontWeight: '500' },
  activeTabText: { color: '#3b82f6', fontWeight: '700' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    margin: 12, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb',
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#333' },
  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 12, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#3b82f6',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600', color: '#111' },
  userEmail: { fontSize: 12, color: '#666', marginTop: 2 },
  userPhone: { fontSize: 12, color: '#999', marginTop: 1 },
  assignBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4,
  },
  assignBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  assignmentCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  assignmentRow: { flexDirection: 'row', alignItems: 'center' },
  assignedToRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  assignedToText: { fontSize: 12, color: '#3b82f6', fontWeight: '500' },
  rightSection: { alignItems: 'flex-end', gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  unassignBtnSm: { padding: 4 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12, fontWeight: '500' },
  emptySubText: { fontSize: 13, color: '#bbb', marginTop: 6, textAlign: 'center', paddingHorizontal: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  selectedUserInfo: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff',
    padding: 10, borderRadius: 8, marginBottom: 16, gap: 8,
  },
  selectedUserName: { fontSize: 14, fontWeight: '600', color: '#3b82f6' },
  modalSubTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  noEmployees: { textAlign: 'center', color: '#999', padding: 20 },
  employeeItem: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: 10, marginBottom: 6, backgroundColor: '#f9fafb',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  employeeItemSelected: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  empAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#3b82f6',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  empName: { fontSize: 14, fontWeight: '600', color: '#111' },
  empRole: { fontSize: 12, color: '#666', marginTop: 2 },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#3b82f6', padding: 14, borderRadius: 12, marginTop: 16, gap: 8,
  },
  confirmBtnDisabled: { backgroundColor: '#93c5fd' },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default UserAssignmentsScreen;