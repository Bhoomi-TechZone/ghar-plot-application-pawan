/**
 * LeadAssignmentsScreen - View & manage enquiry lead assignments
 * API: /admin/leads/*
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, SafeAreaView,
  Modal, ActivityIndicator, Alert, StyleSheet,
  ScrollView, RefreshControl, StatusBar, TextInput, Platform,
} from 'react-native';
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

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const STATUS_COLORS = {
  active: { bg: '#dcfce7', text: '#16a34a' },
  pending: { bg: '#fef3c7', text: '#d97706' },
  completed: { bg: '#dbeafe', text: '#2563eb' },
  'in-progress': { bg: '#ede9fe', text: '#7c3aed' },
};

const LeadAssignmentsScreen = ({ navigation }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [detailModal, setDetailModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getHeaders();
      const res = await fetch(`${BASE_URL}/admin/leads/all`, { headers });
      const json = await res.json();
      if (json.success) {
        setAssignments(json.data?.assignments || []);
      } else {
        CrossPlatformAlert.alert('Error', json.message || 'Failed to load lead assignments');
      }
    } catch (e) {
      CrossPlatformAlert.alert('Error', 'Network error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${BASE_URL}/admin/leads/available-employees`, { headers });
      const json = await res.json();
      if (json.success) setEmployees(json.data || []);
    } catch (e) {
      console.error('fetch employees error:', e);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
    fetchEmployees();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAssignments();
    setRefreshing(false);
  };

  const handleUnassign = (assignment) => {
    const enquiryName =
      assignment.enquiry?.buyerId?.fullName ||
      assignment.enquiry?.contactName ||
      'this enquiry';
    CrossPlatformAlert.alert(
      'Unassign Lead',
      `Remove assignment for "${enquiryName}" from ${assignment.employeeId?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unassign',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getHeaders();
              const res = await fetch(`${BASE_URL}/admin/leads/unassign`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  enquiryId: assignment.enquiryId,
                  enquiryType: assignment.enquiryType,
                }),
              });
              const json = await res.json();
              if (json.success) {
                CrossPlatformAlert.alert('Success', 'Lead unassigned successfully');
                fetchAssignments();
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

  const getFiltered = () => {
    return assignments.filter((a) => {
      const empName = a.employeeId?.name || '';
      const empMatch = selectedEmployeeFilter === 'All' || empName === selectedEmployeeFilter;
      const statusMatch = statusFilter === 'All' || a.status === statusFilter;
      const buyerName = a.enquiry?.buyerId?.fullName || a.enquiry?.contactName || '';
      const phone = a.enquiry?.buyerId?.phone || a.enquiry?.contactPhone || '';
      const searchMatch =
        search === '' ||
        buyerName.toLowerCase().includes(search.toLowerCase()) ||
        empName.toLowerCase().includes(search.toLowerCase()) ||
        phone.toLowerCase().includes(search.toLowerCase());
      return empMatch && statusMatch && searchMatch;
    });
  };

  const getEnquiryDisplay = (assignment) => {
    const enquiry = assignment.enquiry;
    if (!enquiry) return { name: 'Unknown', sub: assignment.enquiryType || 'Enquiry', phone: '-' };
    if (assignment.enquiryType === 'Inquiry') {
      return {
        name: enquiry.buyerId?.fullName || 'Unknown Buyer',
        sub: enquiry.propertyId?.propertyLocation || enquiry.propertyId?.propertyType || 'Property Inquiry',
        phone: enquiry.buyerId?.phone || '-',
      };
    }
    return {
      name: enquiry.contactName || enquiry.name || 'Manual Enquiry',
      sub: enquiry.propertyType || 'Manual Inquiry',
      phone: enquiry.contactPhone || enquiry.phone || '-',
    };
  };

  const renderItem = ({ item }) => {
    const display = getEnquiryDisplay(item);
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS['pending'];
    const priorityColor = PRIORITY_COLORS[item.priority] || '#999';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => { setSelectedAssignment(item); setDetailModal(true); }}
      >
        <View style={styles.cardTop}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>{(display.name || '?')[0].toUpperCase()}</Text>
          </View>
          <View style={styles.cardMiddle}>
            <Text style={styles.enquiryName}>{display.name}</Text>
            <Text style={styles.enquirySub}>{display.sub}</Text>
            {display.phone !== '-' && (
              <Text style={styles.enquiryPhone}>
                <MaterialIcons name="phone" size={11} color="#888" /> {display.phone}
              </Text>
            )}
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
              <Text style={[styles.badgeText, { color: statusColor.text }]}>{item.status || 'active'}</Text>
            </View>
            <View style={styles.priorityDot}>
              <View style={[styles.dot, { backgroundColor: priorityColor }]} />
              <Text style={[styles.priorityText, { color: priorityColor }]}>{item.priority || 'medium'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.empRow}>
            <MaterialIcons name="badge" size={14} color="#3b82f6" />
            <Text style={styles.empName}>{item.employeeId?.name || 'Unknown'}</Text>
          </View>
          <TouchableOpacity style={styles.unassignBtn} onPress={() => handleUnassign(item)}>
            <MaterialIcons name="link-off" size={14} color="#ef4444" />
            <Text style={styles.unassignText}>Unassign</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const filtered = getFiltered();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#7c3aed" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#7c3aed' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lead Assignments</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.headerBtn}>
          <MaterialIcons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats strip */}
      <View style={styles.statsStrip}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{assignments.length}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#16a34a' }]}>{assignments.filter(a => a.status === 'active').length}</Text>
          <Text style={styles.statLbl}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#d97706' }]}>{assignments.filter(a => a.status === 'pending').length}</Text>
          <Text style={styles.statLbl}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#2563eb' }]}>{assignments.filter(a => a.status === 'completed').length}</Text>
          <Text style={styles.statLbl}>Done</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={18} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by buyer, employee, phone..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="clear" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {['All', 'active', 'pending', 'in-progress', 'completed'].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Navigate to Enquiries to create new assignment */}
      <TouchableOpacity
        style={styles.newAssignBtn}
        onPress={() => navigation.navigate('Enquiries')}
      >
        <MaterialIcons name="add-task" size={18} color="#7c3aed" />
        <Text style={styles.newAssignText}>Assign New Lead  Go to Enquiries</Text>
        <MaterialIcons name="chevron-right" size={18} color="#7c3aed" />
      </TouchableOpacity>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 12 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="assignment-late" size={52} color="#ccc" />
              <Text style={styles.emptyText}>No lead assignments found</Text>
              <Text style={styles.emptySub}>Assignments are created from the Enquiries screen</Text>
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      <Modal visible={detailModal} transparent animationType="slide" onRequestClose={() => setDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assignment Details</Text>
              <TouchableOpacity onPress={() => setDetailModal(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {selectedAssignment && (() => {
              const display = getEnquiryDisplay(selectedAssignment);
              const statusColor = STATUS_COLORS[selectedAssignment.status] || STATUS_COLORS['pending'];
              return (
                <ScrollView>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Buyer/Contact</Text><Text style={styles.detailValue}>{display.name}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Property/Type</Text><Text style={styles.detailValue}>{display.sub}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Phone</Text><Text style={styles.detailValue}>{display.phone}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Assigned To</Text><Text style={styles.detailValue}>{selectedAssignment.employeeId?.name}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Status</Text>
                    <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
                      <Text style={[styles.badgeText, { color: statusColor.text }]}>{selectedAssignment.status}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Priority</Text><Text style={[styles.detailValue, { color: PRIORITY_COLORS[selectedAssignment.priority] }]}>{selectedAssignment.priority}</Text></View>
                  {selectedAssignment.notes ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Notes</Text><Text style={styles.detailValue}>{selectedAssignment.notes}</Text></View> : null}
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Enquiry Type</Text><Text style={styles.detailValue}>{selectedAssignment.enquiryType}</Text></View>
                  <TouchableOpacity
                    style={[styles.confirmBtn, { backgroundColor: '#ef4444', marginTop: 16 }]}
                    onPress={() => { setDetailModal(false); handleUnassign(selectedAssignment); }}
                  >
                    <MaterialIcons name="link-off" size={18} color="#fff" />
                    <Text style={styles.confirmBtnText}>Unassign This Lead</Text>
                  </TouchableOpacity>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 14,
  },  
  headerBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  statsStrip: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '700', color: '#111' },
  statLbl: { fontSize: 11, color: '#888', marginTop: 2 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    margin: 12, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb',
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#333' },
  filterScroll: { maxHeight: 44 },
  filterRow: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
  },
  filterChipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  filterChipText: { fontSize: 13, color: '#666', fontWeight: '500' },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },
  newAssignBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f3f0ff', marginHorizontal: 12, marginBottom: 4,
    paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#ddd6fe',
    gap: 6,
  },
  newAssignText: { color: '#7c3aed', fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  iconCircle: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#7c3aed',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  iconText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cardMiddle: { flex: 1 },
  enquiryName: { fontSize: 14, fontWeight: '600', color: '#111' },
  enquirySub: { fontSize: 12, color: '#666', marginTop: 2 },
  enquiryPhone: { fontSize: 11, color: '#888', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  priorityDot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  priorityText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  empRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  empName: { fontSize: 12, color: '#3b82f6', fontWeight: '500' },
  unassignBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  unassignText: { fontSize: 12, color: '#ef4444', fontWeight: '500' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12, fontWeight: '500' },
  emptySub: { fontSize: 13, color: '#bbb', marginTop: 6, textAlign: 'center', paddingHorizontal: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '75%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  detailLabel: { fontSize: 13, color: '#888', flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#111', flex: 2, textAlign: 'right' },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 14, borderRadius: 12, gap: 8,
  },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default LeadAssignmentsScreen;