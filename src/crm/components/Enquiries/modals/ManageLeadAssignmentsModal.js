/**
 * ManageLeadAssignmentsModal.js
 * Toggle-based employee assignment/unassignment modal for a single lead/enquiry.
 * Supports assigning/unassigning one or multiple employees with instant Switch toggles.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { assignEnquiriesToEmployee } from '../../../services/assignmentService';
import { unassignEnquiry } from '../../../services/crmEnquiryApi';
import { getAllEmployees } from '../../../services/crmEmployeeManagementApi';
import CrossPlatformAlert from '../../../../utils/crossPlatformAlert';

const ManageLeadAssignmentsModal = ({
  visible,
  onClose,
  enquiry,
  employees: propEmployees = [],
  onChanged,
}) => {
  const [employees, setEmployees] = useState(propEmployees);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [search, setSearch] = useState('');
  const [assignedIds, setAssignedIds] = useState(new Set());
  const [togglingId, setTogglingId] = useState(null);
  const [unassigningAll, setUnassigningAll] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync assigned employee IDs whenever enquiry or modal visibility changes
  useEffect(() => {
    if (!visible || !enquiry) return;
    setSearch('');
    setHasChanges(false);

    const list = enquiry.assignments?.length
      ? enquiry.assignments
      : (enquiry.assignment ? [enquiry.assignment] : []);

    const ids = new Set(
      list
        .map((a) => (a?.employeeId?._id || a?.employeeId)?.toString())
        .filter(Boolean)
    );
    setAssignedIds(ids);

    if (propEmployees && propEmployees.length > 0) {
      setEmployees(propEmployees);
    } else {
      fetchEmployees();
    }
  }, [visible, enquiry]);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const result = await getAllEmployees({ page: 1, limit: 999, isActive: true });
      if (result?.employees && Array.isArray(result.employees)) {
        setEmployees(result.employees);
      }
    } catch (e) {
      console.error('Error fetching employees:', e);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = employees.filter((emp) => {
      if (!q) return true;
      const name = (emp.fullName || emp.name || '').toLowerCase();
      const email = (emp.email || '').toLowerCase();
      const phone = (emp.phone || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
    // Sort currently assigned employees to top
    return [...list].sort((a, b) => {
      const aAssigned = assignedIds.has(a._id?.toString()) ? 0 : 1;
      const bAssigned = assignedIds.has(b._id?.toString()) ? 0 : 1;
      return aAssigned - bAssigned;
    });
  }, [employees, search, assignedIds]);

  const handleToggleEmployee = async (emp, nextValue) => {
    if (!enquiry?._id || togglingId) return;
    const empId = emp._id?.toString();
    if (!empId) return;

    setTogglingId(empId);
    try {
      if (nextValue) {
        // Assign this employee
        const res = await assignEnquiriesToEmployee({
          enquiries: [{ enquiryId: enquiry._id, enquiryType: enquiry.enquiryType }],
          employeeId: empId,
          priority: enquiry.assignment?.priority || 'medium',
          notes: 'Assigned via toggle',
        });
        if (res?.success) {
          setAssignedIds((prev) => new Set([...prev, empId]));
          setHasChanges(true);
        } else {
          CrossPlatformAlert.alert('Error', res?.message || 'Failed to assign employee');
        }
      } else {
        // Unassign this specific employee
        const res = await unassignEnquiry(enquiry._id, enquiry.enquiryType, empId);
        if (res?.success) {
          setAssignedIds((prev) => {
            const next = new Set(prev);
            next.delete(empId);
            return next;
          });
          setHasChanges(true);
        } else {
          CrossPlatformAlert.alert('Error', res?.message || 'Failed to unassign employee');
        }
      }
    } catch (err) {
      CrossPlatformAlert.alert('Error', err?.message || 'Operation failed');
    } finally {
      setTogglingId(null);
    }
  };

  const handleUnassignAll = () => {
    if (!enquiry?._id || assignedIds.size === 0) return;
    CrossPlatformAlert.alert(
      'Unassign All Employees',
      `Remove all ${assignedIds.size} assigned employee(s) from this lead?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unassign All',
          style: 'destructive',
          onPress: async () => {
            try {
              setUnassigningAll(true);
              const res = await unassignEnquiry(enquiry._id, enquiry.enquiryType, null);
              if (res?.success) {
                setAssignedIds(new Set());
                setHasChanges(true);
              } else {
                CrossPlatformAlert.alert('Error', res?.message || 'Failed to unassign all');
              }
            } catch (err) {
              CrossPlatformAlert.alert('Error', err?.message || 'Failed to unassign all');
            } finally {
              setUnassigningAll(false);
            }
          },
        },
      ]
    );
  };

  const handleDone = () => {
    if (hasChanges && onChanged) {
      onChanged();
    }
    onClose();
  };

  const leadName = enquiry?.clientName || enquiry?.buyerName || 'Lead';
  const leadPhone = enquiry?.contactNumber || enquiry?.buyerPhone || '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleDone}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Assign / Unassign Employees</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {leadName}{leadPhone && leadPhone !== 'N/A' ? ` • ${leadPhone}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={handleDone} style={styles.closeBtn}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Status Strip + Unassign All */}
          <View style={styles.statusStrip}>
            <View style={styles.countBadge}>
              <Text style={styles.countTxt}>
                {assignedIds.size} {assignedIds.size === 1 ? 'Employee' : 'Employees'} Assigned
              </Text>
            </View>
            {assignedIds.size > 0 && (
              <TouchableOpacity
                style={styles.unassignAllBtn}
                onPress={handleUnassignAll}
                disabled={unassigningAll}
              >
                {unassigningAll ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <Text style={styles.unassignAllTxt}>Unassign All</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search employee by name, email or phone..."
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Employee List with Toggle Switches */}
          {loadingEmployees ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loaderTxt}>Loading employees...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredEmployees}
              keyExtractor={(item) => item._id?.toString()}
              style={styles.list}
              contentContainerStyle={{ paddingBottom: 12 }}
              ListEmptyComponent={
                <Text style={styles.emptyTxt}>No employees found</Text>
              }
              renderItem={({ item }) => {
                const empId = item._id?.toString();
                const isAssigned = assignedIds.has(empId);
                const isBusy = togglingId === empId;
                const empName = item.fullName || item.name || 'Employee';

                return (
                  <View style={[styles.empRow, isAssigned && styles.empRowActive]}>
                    <View style={styles.empInfo}>
                      <Text style={styles.empName}>{empName}</Text>
                      {item.email ? (
                        <Text style={styles.empMeta} numberOfLines={1}>{item.email}</Text>
                      ) : null}
                      {item.role?.name ? (
                        <Text style={styles.empRole}>{item.role.name}</Text>
                      ) : null}
                    </View>
                    <View style={styles.switchWrap}>
                      {isBusy ? (
                        <ActivityIndicator size="small" color="#2563eb" />
                      ) : (
                        <Switch
                          value={isAssigned}
                          onValueChange={(val) => handleToggleEmployee(item, val)}
                          trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                          thumbColor={isAssigned ? '#2563eb' : '#f8fafc'}
                        />
                      )}
                      <Text style={[styles.switchLabel, isAssigned ? styles.switchOn : styles.switchOff]}>
                        {isAssigned ? 'Assigned' : 'Off'}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Footer Done Button */}
          <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
            <Text style={styles.doneTxt}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '700',
  },
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  countBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  unassignAllBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  unassignAllTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  list: {
    paddingHorizontal: 16,
    maxHeight: 380,
  },
  empRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  empRowActive: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  empInfo: {
    flex: 1,
    paddingRight: 12,
  },
  empName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  empMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  empRole: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '600',
    marginTop: 2,
  },
  switchWrap: {
    alignItems: 'center',
    minWidth: 58,
  },
  switchLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  switchOn: {
    color: '#1d4ed8',
  },
  switchOff: {
    color: '#94a3b8',
  },
  loaderBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loaderTxt: {
    marginTop: 10,
    fontSize: 13,
    color: '#6b7280',
  },
  emptyTxt: {
    textAlign: 'center',
    color: '#9ca3af',
    paddingVertical: 28,
    fontSize: 14,
  },
  doneBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  doneTxt: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ManageLeadAssignmentsModal;
