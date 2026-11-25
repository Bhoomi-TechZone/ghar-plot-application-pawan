import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as attendanceApi from '../../services/attendanceApi';

const { width } = Dimensions.get('window');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const AdminAttendanceScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'shifts'

  const [loading, setLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  const [departmentFilter, setDepartmentFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [matrixData, setMatrixData] = useState(null);
  const [shiftsList, setShiftsList] = useState([]);

  // Day Details Modal state
  const [dayDetailInfo, setDayDetailInfo] = useState(null);

  // Regularize Attendance Modal state
  const [regularizeModalVisible, setRegularizeModalVisible] = useState(false);
  const [regularizeForm, setRegularizeForm] = useState({
    employeeId: '',
    employeeName: '',
    dateStr: '',
    status: 'Present',
    checkInTimeStr: '09:30 AM',
    checkOutTimeStr: '06:30 PM',
    workingHours: '8.0',
    reason: '',
  });

  // Shift Edit Modal state
  const [shiftModalVisible, setShiftModalVisible] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [shiftForm, setShiftForm] = useState({
    name: 'General Day Shift',
    startTime: '09:30',
    endTime: '18:30',
    gracePeriodMinutes: '15',
    halfDayThresholdHours: '4.5',
  });

  // Assign Shift Modal state
  const [assignShiftModalVisible, setAssignShiftModalVisible] = useState(false);
  const [assignTargetEmp, setAssignTargetEmp] = useState(null);
  const [customShiftForm, setCustomShiftForm] = useState({
    startTime: '09:30',
    endTime: '18:30',
    gracePeriodMinutes: '15',
  });

  const loadMatrix = useCallback(async () => {
    try {
      setLoading(true);
      const data = await attendanceApi.getAdminMonthlyMatrix({
        month: currentMonth,
        year: currentYear,
        department: departmentFilter,
        search: searchQuery,
      });
      setMatrixData(data);
    } catch (e) {
      console.warn('Error loading matrix:', e);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear, departmentFilter, searchQuery]);

  const loadShifts = useCallback(async () => {
    try {
      const data = await attendanceApi.getShifts();
      setShiftsList(data);
      if (data.length > 0) {
        const def = data.find((s) => s.isDefault) || data[0];
        setSelectedShift(def);
        setShiftForm({
          name: def.name,
          startTime: def.startTime,
          endTime: def.endTime,
          gracePeriodMinutes: String(def.gracePeriodMinutes || 15),
          halfDayThresholdHours: String(def.halfDayThresholdHours || 4.5),
        });
      }
    } catch (e) {
      console.warn('Error loading shifts:', e);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'matrix') {
      loadMatrix();
    } else {
      loadShifts();
    }
  }, [activeTab, loadMatrix, loadShifts]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleExportCSV = async () => {
    if (!matrixData || !matrixData.matrix) return;
    try {
      const totalDays = matrixData.totalDays || 30;
      const headers = ['Employee Code', 'Employee Name', 'Department', ...Array.from({ length: totalDays }, (_, i) => `Day ${i + 1}`), 'Present', 'Late', 'Half Day', 'Absent', 'Total Hours'];

      const rows = matrixData.matrix.map((emp) => {
        const dayCols = emp.days.map((d) => d.status);
        return [
          emp.code,
          emp.name,
          emp.department,
          ...dayCols,
          emp.summary.present,
          emp.summary.late,
          emp.summary.halfDay,
          emp.summary.absent,
          emp.summary.totalHours,
        ];
      });

      const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');

      await Share.share({
        title: `Attendance_${MONTH_NAMES[currentMonth - 1]}_${currentYear}.csv`,
        message: csvContent,
      });
    } catch (e) {
      Alert.alert('Export Error', e.message);
    }
  };

  const formatHHMMTo12Hr = (hhmm) => {
    if (!hhmm) return '';
    const str = String(hhmm).trim();
    if (/AM|PM/i.test(str)) return str.toUpperCase();
    const parts = str.split(':');
    if (parts.length < 2) return str;
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return str;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const formatShiftRange = (rangeStr) => {
    const raw = String(rangeStr || '09:30 - 18:30');
    const parts = raw.split('-').map((p) => p.trim());
    if (parts.length === 2) {
      return `${formatHHMMTo12Hr(parts[0])} - ${formatHHMMTo12Hr(parts[1])}`;
    }
    return raw;
  };

  const formatDuration = (hoursDecimal) => {
    const totalMins = Math.max(0, Math.round((Number(hoursDecimal) || 0) * 60));
    if (totalMins <= 0) return '0 mins';
    if (totalMins < 60) return `${totalMins} mins`;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h} hrs`;
  };

  const openDayDetailModal = (emp, dayInfo) => {
    const formattedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayInfo.day).padStart(2, '0')}`;
    const rawSt = dayInfo.status;
    const displayStatus =
      rawSt === 'P' ? 'Present'
      : rawSt === 'L' ? 'Late'
      : rawSt === 'HD' ? 'Half Day'
      : rawSt === 'A' ? 'Absent'
      : rawSt === 'OFF' ? 'Week Off'
      : rawSt === '-' ? 'Upcoming'
      : rawSt;
    setDayDetailInfo({ emp, dayInfo, dateStr: formattedDate, displayStatus });
  };

  const openRegularizeModal = (emp, dayInfo) => {
    const formattedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayInfo.day).padStart(2, '0')}`;
    setRegularizeForm({
      employeeId: emp.employeeId,
      employeeName: emp.name,
      dateStr: formattedDate,
      status: dayInfo.status === 'A' || dayInfo.status === 'Absent' ? 'Present' : (dayInfo.status === 'L' ? 'Late' : 'Present'),
      checkInTimeStr: dayInfo.checkIn || '09:30 AM',
      checkOutTimeStr: dayInfo.checkOut || '06:30 PM',
      workingHours: String(dayInfo.hours || '8.0'),
      reason: '',
    });
    setRegularizeModalVisible(true);
  };

  const handleRegularizeSubmit = async () => {
    try {
      await attendanceApi.regularizeAttendance(regularizeForm);
      Alert.alert('Success', 'Attendance regularized successfully!');
      setRegularizeModalVisible(false);
      loadMatrix();
    } catch (e) {
      Alert.alert('Error', e.message || 'Regularize failed');
    }
  };

  const handleSaveShift = async () => {
    try {
      if (selectedShift?._id) {
        await attendanceApi.updateShift(selectedShift._id, {
          name: shiftForm.name,
          startTime: shiftForm.startTime,
          endTime: shiftForm.endTime,
          gracePeriodMinutes: parseInt(shiftForm.gracePeriodMinutes, 10),
          halfDayThresholdHours: parseFloat(shiftForm.halfDayThresholdHours),
        });
        Alert.alert('Success', 'Shift updated successfully!');
      } else {
        await attendanceApi.createShift({
          name: shiftForm.name,
          startTime: shiftForm.startTime,
          endTime: shiftForm.endTime,
          gracePeriodMinutes: parseInt(shiftForm.gracePeriodMinutes, 10),
          halfDayThresholdHours: parseFloat(shiftForm.halfDayThresholdHours),
          isDefault: true,
        });
        Alert.alert('Success', 'Shift created successfully!');
      }
      setShiftModalVisible(false);
      loadShifts();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save shift');
    }
  };

  const handleAssignShiftSubmit = async () => {
    if (!assignTargetEmp) return;
    try {
      await attendanceApi.assignShiftToEmployee(assignTargetEmp.employeeId, null, {
        startTime: customShiftForm.startTime,
        endTime: customShiftForm.endTime,
        gracePeriodMinutes: parseInt(customShiftForm.gracePeriodMinutes, 10) || 15,
      });
      Alert.alert('Success', `Shift assigned to ${assignTargetEmp.name} successfully!`);
      setAssignShiftModalVisible(false);
      loadMatrix();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to assign shift');
    }
  };

  const kpi = matrixData?.todayKpi || {
    totalEmployees: 0,
    present: 0,
    late: 0,
    halfDay: 0,
    absent: 0,
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Management</Text>
        <TouchableOpacity style={styles.headerRightBtn} onPress={handleExportCSV}>
          <Icon name="download-outline" size={20} color="#0284c7" />
        </TouchableOpacity>
      </View>

      {/* Tabs Bar */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'matrix' && styles.tabBtnActive]}
          onPress={() => setActiveTab('matrix')}
        >
          <Icon
            name="grid-outline"
            size={16}
            color={activeTab === 'matrix' ? '#0ea5e9' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabBtnText, activeTab === 'matrix' && styles.tabBtnTextActive]}>
            Monthly Matrix
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'shifts' && styles.tabBtnActive]}
          onPress={() => setActiveTab('shifts')}
        >
          <Icon
            name="time-outline"
            size={16}
            color={activeTab === 'shifts' ? '#0ea5e9' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabBtnText, activeTab === 'shifts' && styles.tabBtnTextActive]}>
            Shift Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: MONTHLY MATRIX */}
      {activeTab === 'matrix' && (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {/* Today KPI Overview Bar */}
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { borderColor: '#e2e8f0' }]}>
              <Text style={styles.kpiVal}>{kpi.totalEmployees}</Text>
              <Text style={styles.kpiLbl}>Total Active</Text>
            </View>
            <View style={[styles.kpiCard, { borderColor: '#bbf7d0' }]}>
              <Text style={[styles.kpiVal, { color: '#16a34a' }]}>{kpi.present}</Text>
              <Text style={styles.kpiLbl}>Present Today</Text>
            </View>
            <View style={[styles.kpiCard, { borderColor: '#fde68a' }]}>
              <Text style={[styles.kpiVal, { color: '#d97706' }]}>{kpi.late}</Text>
              <Text style={styles.kpiLbl}>Late Today</Text>
            </View>
            <View style={[styles.kpiCard, { borderColor: '#fecaca' }]}>
              <Text style={[styles.kpiVal, { color: '#dc2626' }]}>{kpi.absent}</Text>
              <Text style={styles.kpiLbl}>Absent Today</Text>
            </View>
          </View>

          {/* Month Navigator & Filter Bar */}
          <View style={styles.filterCard}>
            <View style={styles.monthNavRow}>
              <TouchableOpacity style={styles.navArrowBtn} onPress={handlePrevMonth}>
                <Icon name="chevron-back" size={18} color="#0f172a" />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {MONTH_NAMES[currentMonth - 1]} {currentYear}
              </Text>
              <TouchableOpacity style={styles.navArrowBtn} onPress={handleNextMonth}>
                <Icon name="chevron-forward" size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Icon name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search employee or code..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
                <Icon name="share-outline" size={16} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.exportBtnText}>Export CSV</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Monthly Matrix Horizontal Scrollable Table */}
          <View style={styles.matrixContainer}>
            <View style={styles.matrixHeaderRow}>
              <Text style={styles.matrixHeaderTitle}>All Employees Monthly Sheet</Text>
              <Text style={styles.matrixSubNote}>Tap any day badge to regularize/edit</Text>
            </View>

            {loading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#0ea5e9" />
              </View>
            ) : !matrixData || !matrixData.matrix || matrixData.matrix.length === 0 ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <Text style={{ color: '#94a3b8' }}>No employees or attendance found</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View>
                  {/* Table Column Headers */}
                  <View style={styles.thRow}>
                    <Text style={[styles.thCell, { width: 140 }]}>Employee</Text>
                    <Text style={[styles.thCell, { width: 85 }]}>Dept</Text>
                    {Array.from({ length: matrixData.totalDays || 30 }, (_, i) => (
                      <Text key={i} style={[styles.thCell, styles.dayThCell]}>
                        {i + 1}
                      </Text>
                    ))}
                    <Text style={[styles.thCell, styles.summaryThCell, { color: '#16a34a' }]}>P</Text>
                    <Text style={[styles.thCell, styles.summaryThCell, { color: '#d97706' }]}>L</Text>
                    <Text style={[styles.thCell, styles.summaryThCell, { color: '#ea580c' }]}>HD</Text>
                    <Text style={[styles.thCell, styles.summaryThCell, { color: '#dc2626' }]}>A</Text>
                    <Text style={[styles.thCell, { width: 55, textAlign: 'center' }]}>Hrs</Text>
                  </View>

                  {/* Table Data Rows */}
                  {matrixData.matrix.map((emp, rowIdx) => (
                    <View
                      key={emp.employeeId}
                      style={[
                        styles.tdRow,
                        { backgroundColor: rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc' },
                      ]}
                    >
                      <TouchableOpacity
                        style={[styles.tdCell, { width: 140 }]}
                        onPress={() => {
                          setAssignTargetEmp(emp);
                          setAssignShiftModalVisible(true);
                        }}
                      >
                        <Text style={styles.empNameText} numberOfLines={1}>{emp.name}</Text>
                        <Text style={styles.empCodeText}>{emp.code}</Text>
                      </TouchableOpacity>

                      <Text style={[styles.tdCell, { width: 85, fontSize: 11, color: '#64748b' }]} numberOfLines={1}>
                        {emp.department}
                      </Text>

                      {/* Day Badges */}
                      {emp.days.map((dayItem) => {
                        const st = dayItem.status;
                        const isP = st === 'Present' || st === 'P';
                        const isL = st === 'Late' || st === 'L';
                        const isHD = st === 'Half Day' || st === 'HD';
                        const isA = st === 'Absent' || st === 'A';
                        const isOff = st === 'OFF' || st === 'Week Off';

                        const bg = isP ? '#dcfce7' : isL ? '#fef3c7' : isHD ? '#ffedd5' : isA ? '#fee2e2' : isOff ? '#f1f5f9' : '#f8fafc';
                        const fg = isP ? '#15803d' : isL ? '#b45309' : isHD ? '#c2410c' : isA ? '#b91c1c' : isOff ? '#64748b' : '#94a3b8';
                        const text = isP ? 'P' : isL ? 'L' : isHD ? 'HD' : isA ? 'A' : isOff ? 'O' : '-';

                        return (
                          <TouchableOpacity
                            key={dayItem.day}
                            style={[styles.matrixBadgeCell, { backgroundColor: bg }]}
                            onPress={() => openDayDetailModal(emp, dayItem)}
                          >
                            <Text style={[styles.matrixBadgeText, { color: fg }]}>{text}</Text>
                          </TouchableOpacity>
                        );
                      })}

                      {/* Totals Summary */}
                      <Text style={[styles.tdCell, styles.summaryThCell, { fontWeight: '700', color: '#16a34a' }]}>
                        {emp.summary.present}
                      </Text>
                      <Text style={[styles.tdCell, styles.summaryThCell, { fontWeight: '700', color: '#d97706' }]}>
                        {emp.summary.late}
                      </Text>
                      <Text style={[styles.tdCell, styles.summaryThCell, { fontWeight: '700', color: '#ea580c' }]}>
                        {emp.summary.halfDay}
                      </Text>
                      <Text style={[styles.tdCell, styles.summaryThCell, { fontWeight: '700', color: '#dc2626' }]}>
                        {emp.summary.absent}
                      </Text>
                      <Text style={[styles.tdCell, { width: 55, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#0284c7' }]}>
                        {emp.summary.totalHours}h
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </ScrollView>
      )}

      {/* TAB 2: SHIFT SETTINGS */}
      {activeTab === 'shifts' && (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {/* Main Shift Policy Card */}
          <View style={styles.shiftCard}>
            <View style={styles.shiftCardHeader}>
              <View style={styles.shiftHeaderInfo}>
                <Text style={styles.shiftCardTitle}>{selectedShift?.name || 'General Day Shift'}</Text>
                <Text style={styles.shiftCardSubtitle}>Primary attendance & timing rule for all employees</Text>
              </View>
              <TouchableOpacity
                style={styles.editShiftBtn}
                onPress={() => setShiftModalVisible(true)}
              >
                <Icon name="create-outline" size={16} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.btnTextWhite}>Edit Shift</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.shiftDivider} />

            <View style={styles.shiftDetailGrid}>
              <View style={styles.shiftParamBox}>
                <Text style={styles.shiftParamLbl}>Shift Start</Text>
                <Text style={styles.shiftParamVal}>{formatHHMMTo12Hr(selectedShift?.startTime || '09:30')}</Text>
              </View>
              <View style={styles.shiftParamBox}>
                <Text style={styles.shiftParamLbl}>Shift End</Text>
                <Text style={styles.shiftParamVal}>{formatHHMMTo12Hr(selectedShift?.endTime || '18:30')}</Text>
              </View>
              <View style={styles.shiftParamBox}>
                <Text style={styles.shiftParamLbl}>Grace Period</Text>
                <Text style={[styles.shiftParamVal, { color: '#d97706' }]}>
                  {selectedShift?.gracePeriodMinutes || 15} Mins
                </Text>
              </View>
              <View style={styles.shiftParamBox}>
                <Text style={styles.shiftParamLbl}>Half-Day Cutoff</Text>
                <Text style={[styles.shiftParamVal, { color: '#ea580c' }]}>
                  &lt; {selectedShift?.halfDayThresholdHours || 4.5} Hrs
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Help Card */}
          <View style={styles.helpCard}>
            <Text style={styles.helpCardTitle}>How Shift Timing Works:</Text>
            <Text style={styles.helpCardText}>
              • If employee punches in after {selectedShift?.startTime || '09:30'} + {selectedShift?.gracePeriodMinutes || 15} mins, marked as LATE.
            </Text>
            <Text style={styles.helpCardText}>
              • If total duration is less than {selectedShift?.halfDayThresholdHours || 4.5} hours, marked as HALF DAY.
            </Text>
            <Text style={styles.helpCardText}>
              • In the Monthly Matrix tab, tap any employee's name to set a personalized custom shift.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Day Details Modal */}
      {dayDetailInfo && (
        <Modal transparent animationType="fade" visible={!!dayDetailInfo}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Attendance Details</Text>
                <TouchableOpacity onPress={() => setDayDetailInfo(null)}>
                  <Icon name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubHeader}>
                {dayDetailInfo.emp.name} ({dayDetailInfo.emp.code}) • {dayDetailInfo.dateStr}
              </Text>

              <View style={styles.dayDetailRow}>
                <Text style={styles.dayDetailLbl}>Day Status:</Text>
                <Text
                  style={[
                    styles.dayDetailVal,
                    {
                      fontWeight: '700',
                      color:
                        dayDetailInfo.displayStatus === 'Present'
                          ? '#16a34a'
                          : dayDetailInfo.displayStatus === 'Late'
                          ? '#d97706'
                          : dayDetailInfo.displayStatus === 'Half Day'
                          ? '#ea580c'
                          : dayDetailInfo.displayStatus === 'Absent'
                          ? '#dc2626'
                          : '#64748b',
                    },
                  ]}
                >
                  {dayDetailInfo.displayStatus}
                </Text>
              </View>

              <View style={styles.dayDetailRow}>
                <Text style={styles.dayDetailLbl}>Check-In Time:</Text>
                <Text style={styles.dayDetailVal}>
                  {dayDetailInfo.dayInfo.checkIn || 'Not Checked In'}
                </Text>
              </View>

              <View style={styles.dayDetailRow}>
                <Text style={styles.dayDetailLbl}>Check-Out Time:</Text>
                <Text style={styles.dayDetailVal}>
                  {dayDetailInfo.dayInfo.checkOut || 'Not Checked Out'}
                </Text>
              </View>

              <View style={styles.dayDetailRow}>
                <Text style={styles.dayDetailLbl}>Working Hours:</Text>
                <Text style={[styles.dayDetailVal, { color: '#0284c7', fontWeight: '700' }]}>
                  {formatDuration(dayDetailInfo.dayInfo.hours)}
                </Text>
              </View>

              {!!dayDetailInfo.dayInfo.shiftTiming && (
                <View style={styles.dayDetailRow}>
                  <Text style={styles.dayDetailLbl}>Shift Timing:</Text>
                  <Text style={styles.dayDetailVal}>{formatShiftRange(dayDetailInfo.dayInfo.shiftTiming)}</Text>
                </View>
              )}

              {dayDetailInfo.dayInfo.lateMinutes > 0 && (
                <View style={styles.dayDetailRow}>
                  <Text style={styles.dayDetailLbl}>Late By:</Text>
                  <Text style={[styles.dayDetailVal, { color: '#d97706', fontWeight: '700' }]}>
                    {dayDetailInfo.dayInfo.lateMinutes} mins
                  </Text>
                </View>
              )}

              {!!dayDetailInfo.dayInfo.lateReason && (
                <View style={styles.dayDetailRow}>
                  <Text style={styles.dayDetailLbl}>Late Reason:</Text>
                  <Text style={[styles.dayDetailVal, { flex: 1, textAlign: 'right', marginLeft: 12 }]}>
                    {dayDetailInfo.dayInfo.lateReason}
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <TouchableOpacity
                  style={[styles.submitBtn, { flex: 1, marginTop: 0, backgroundColor: '#64748b' }]}
                  onPress={() => setDayDetailInfo(null)}
                >
                  <Text style={styles.btnTextWhite}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, { flex: 1, marginTop: 0, backgroundColor: '#0ea5e9' }]}
                  onPress={() => {
                    const { emp, dayInfo } = dayDetailInfo;
                    setDayDetailInfo(null);
                    openRegularizeModal(emp, dayInfo);
                  }}
                >
                  <Text style={styles.btnTextWhite}>Edit / Regularize</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Regularize Modal */}
      <Modal transparent animationType="fade" visible={regularizeModalVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Regularize Attendance</Text>
              <TouchableOpacity onPress={() => setRegularizeModalVisible(false)}>
                <Icon name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubHeader}>
              {regularizeForm.employeeName} • {regularizeForm.dateStr}
            </Text>

            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.statusPillRow}>
              {['Present', 'Late', 'Half Day', 'Absent', 'Week Off'].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.statusPill,
                    regularizeForm.status === st && styles.statusPillSelected,
                  ]}
                  onPress={() => setRegularizeForm({ ...regularizeForm, status: st })}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      regularizeForm.status === st && styles.statusPillTextSelected,
                    ]}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Check-In Time</Text>
                <TextInput
                  style={styles.textInput}
                  value={regularizeForm.checkInTimeStr}
                  onChangeText={(val) => setRegularizeForm({ ...regularizeForm, checkInTimeStr: val })}
                  placeholder="09:30 AM"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Check-Out Time</Text>
                <TextInput
                  style={styles.textInput}
                  value={regularizeForm.checkOutTimeStr}
                  onChangeText={(val) => setRegularizeForm({ ...regularizeForm, checkOutTimeStr: val })}
                  placeholder="06:30 PM"
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>Reason / Remarks</Text>
            <TextInput
              style={styles.textInput}
              value={regularizeForm.reason}
              onChangeText={(val) => setRegularizeForm({ ...regularizeForm, reason: val })}
              placeholder="e.g. Punch missed due to field work"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleRegularizeSubmit}>
              <Text style={styles.btnTextWhite}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Shift Policy Modal */}
      <Modal transparent animationType="fade" visible={shiftModalVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Shift Timing</Text>
              <TouchableOpacity onPress={() => setShiftModalVisible(false)}>
                <Icon name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Shift Name</Text>
            <TextInput
              style={styles.textInput}
              value={shiftForm.name}
              onChangeText={(val) => setShiftForm({ ...shiftForm, name: val })}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Start Time (HH:mm)</Text>
                <TextInput
                  style={styles.textInput}
                  value={shiftForm.startTime}
                  onChangeText={(val) => setShiftForm({ ...shiftForm, startTime: val })}
                  placeholder="09:30"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>End Time (HH:mm)</Text>
                <TextInput
                  style={styles.textInput}
                  value={shiftForm.endTime}
                  onChangeText={(val) => setShiftForm({ ...shiftForm, endTime: val })}
                  placeholder="18:30"
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Grace (Mins)</Text>
                <TextInput
                  style={styles.textInput}
                  value={shiftForm.gracePeriodMinutes}
                  onChangeText={(val) => setShiftForm({ ...shiftForm, gracePeriodMinutes: val })}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Half-Day (Hrs)</Text>
                <TextInput
                  style={styles.textInput}
                  value={shiftForm.halfDayThresholdHours}
                  onChangeText={(val) => setShiftForm({ ...shiftForm, halfDayThresholdHours: val })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveShift}>
              <Text style={styles.btnTextWhite}>Save Shift Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Assign Custom Shift Modal */}
      <Modal transparent animationType="fade" visible={assignShiftModalVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Employee Shift</Text>
              <TouchableOpacity onPress={() => setAssignShiftModalVisible(false)}>
                <Icon name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubHeader}>
              Custom timing for: {assignTargetEmp?.name} ({assignTargetEmp?.code})
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Start Time (HH:mm)</Text>
                <TextInput
                  style={styles.textInput}
                  value={customShiftForm.startTime}
                  onChangeText={(val) => setCustomShiftForm({ ...customShiftForm, startTime: val })}
                  placeholder="09:30"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>End Time (HH:mm)</Text>
                <TextInput
                  style={styles.textInput}
                  value={customShiftForm.endTime}
                  onChangeText={(val) => setCustomShiftForm({ ...customShiftForm, endTime: val })}
                  placeholder="18:30"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleAssignShiftSubmit}>
              <Text style={styles.btnTextWhite}>Assign Shift</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  topHeader: {
    height: 52,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerRightBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  tabBtnActive: {
    backgroundColor: '#e0f2fe',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#0369a1',
    fontWeight: '700',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  kpiVal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  kpiLbl: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
  },
  filterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    height: 36,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    padding: 0,
  },
  exportBtn: {
    backgroundColor: '#00897b',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 6,
  },
  exportBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  matrixContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  matrixHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  matrixHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  matrixSubNote: {
    fontSize: 11,
    color: '#0284c7',
  },
  thRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  thCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    paddingHorizontal: 4,
  },
  dayThCell: {
    width: 28,
    textAlign: 'center',
  },
  summaryThCell: {
    width: 32,
    textAlign: 'center',
  },
  tdRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tdCell: {
    paddingHorizontal: 4,
  },
  empNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  empCodeText: {
    fontSize: 10,
    color: '#64748b',
  },
  matrixBadgeCell: {
    width: 26,
    height: 26,
    borderRadius: 4,
    marginHorizontal: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matrixBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  shiftCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  shiftHeaderInfo: {
    flex: 1,
    paddingRight: 6,
  },
  shiftCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  shiftCardSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  editShiftBtn: {
    backgroundColor: '#0ea5e9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    flexShrink: 0,
  },
  shiftDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  shiftDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  shiftParamBox: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  shiftParamLbl: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 3,
  },
  shiftParamVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  helpCard: {
    backgroundColor: '#f0fdfa',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  helpCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f766e',
    marginBottom: 6,
  },
  helpCardText: {
    fontSize: 12,
    color: '#115e59',
    lineHeight: 18,
    marginBottom: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubHeader: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  statusPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusPillSelected: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0284c7',
  },
  statusPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  statusPillTextSelected: {
    color: '#ffffff',
  },
  textInput: {
    height: 38,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  submitBtn: {
    backgroundColor: '#00897b',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 18,
  },
  btnTextWhite: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  dayDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dayDetailLbl: {
    fontSize: 13,
    color: '#64748b',
  },
  dayDetailVal: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
});

export default AdminAttendanceScreen;
