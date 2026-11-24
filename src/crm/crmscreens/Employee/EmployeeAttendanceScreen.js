import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
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

const STATUS_CONFIG = {
  Present: { color: '#10b981', bg: '#ecfdf5', label: 'Present', icon: 'checkmark-circle' },
  Late: { color: '#f59e0b', bg: '#fef3c7', label: 'Late', icon: 'time' },
  'Half Day': { color: '#f97316', bg: '#ffedd5', label: 'Half Day', icon: 'hourglass' },
  Absent: { color: '#ef4444', bg: '#fee2e2', label: 'Absent', icon: 'close-circle' },
  'Week Off': { color: '#3b82f6', bg: '#eff6ff', label: 'Week Off', icon: 'calendar' },
  Holiday: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Holiday', icon: 'ribbon' },
  Upcoming: { color: '#94a3b8', bg: '#f1f5f9', label: '-', icon: 'remove' },
};

const EmployeeAttendanceScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const passedEmployeeId = route?.params?.employeeId;

  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [punchLoading, setPunchLoading] = useState(false);

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  const [todayState, setTodayState] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);

  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  // Digital live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [todayRes, monthlyRes] = await Promise.all([
        attendanceApi.getTodayAttendance(),
        attendanceApi.getEmployeeMonthlyAttendance(currentMonth, currentYear, passedEmployeeId),
      ]);
      setTodayState(todayRes);
      setMonthlyData(monthlyRes);
    } catch (e) {
      console.warn('Error loading attendance:', e);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear, passedEmployeeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleCheckIn = async () => {
    try {
      setPunchLoading(true);
      const res = await attendanceApi.checkIn();
      Alert.alert('Attendance', res.message || 'Checked In successfully!');
      loadData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Check-in failed');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleCheckOut = async () => {
    Alert.alert('Confirm Check-Out', 'Are you sure you want to punch out for the day?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Punch Out',
        style: 'destructive',
        onPress: async () => {
          try {
            setPunchLoading(true);
            const res = await attendanceApi.checkOut();
            Alert.alert('Attendance', res.message || 'Checked Out successfully!');
            loadData();
          } catch (e) {
            Alert.alert('Error', e.message || 'Check-out failed');
          } finally {
            setPunchLoading(false);
          }
        },
      },
    ]);
  };

  const summary = monthlyData?.summary || {
    presentCount: 0,
    lateCount: 0,
    halfDayCount: 0,
    absentCount: 0,
    totalWorkingHours: 0,
  };

  const calendarDays = monthlyData?.calendar || [];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {passedEmployeeId ? `${monthlyData?.employee?.name || 'Employee'}'s Attendance` : 'My Attendance'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Punch In / Out Card (Only show if viewing own attendance) */}
        {!passedEmployeeId && (
          <View style={styles.punchCard}>
            <View style={styles.punchTopRow}>
              <View>
                <Text style={styles.digitalClock}>
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </Text>
                <Text style={styles.digitalDate}>
                  {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>

              <View style={styles.shiftBadge}>
                <Icon name="business" size={13} color="#0284c7" style={{ marginRight: 4 }} />
                <Text style={styles.shiftBadgeText}>
                  {todayState?.shift ? `${todayState.shift.startTime} - ${todayState.shift.endTime}` : '09:30 - 18:30'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Live Today Status */}
            <View style={styles.todayStatusRow}>
              <View style={styles.todayStatusItem}>
                <Text style={styles.todayStatusLbl}>Check In</Text>
                <Text style={[styles.todayStatusVal, { color: todayState?.isCheckedIn ? '#10b981' : '#94a3b8' }]}>
                  {todayState?.checkInTimeStr || '--:--'}
                </Text>
              </View>
              <View style={styles.todayStatusItem}>
                <Text style={styles.todayStatusLbl}>Check Out</Text>
                <Text style={[styles.todayStatusVal, { color: todayState?.isCheckedOut ? '#0284c7' : '#94a3b8' }]}>
                  {todayState?.checkOutTimeStr || '--:--'}
                </Text>
              </View>
              <View style={styles.todayStatusItem}>
                <Text style={styles.todayStatusLbl}>Status</Text>
                <Text
                  style={[
                    styles.todayStatusVal,
                    {
                      color:
                        todayState?.status === 'Present'
                          ? '#10b981'
                          : todayState?.status === 'Late'
                          ? '#f59e0b'
                          : todayState?.status === 'Half Day'
                          ? '#f97316'
                          : '#64748b',
                    },
                  ]}
                >
                  {todayState?.status || 'Pending'}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={{ marginTop: 16 }}>
              {punchLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color="#0ea5e9" />
                </View>
              ) : !todayState?.isCheckedIn ? (
                <TouchableOpacity style={styles.checkInBtn} onPress={handleCheckIn} activeOpacity={0.8}>
                  <Icon name="finger-print" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnTextWhite}>Punch In (Check In)</Text>
                </TouchableOpacity>
              ) : !todayState?.isCheckedOut ? (
                <TouchableOpacity style={styles.checkOutBtn} onPress={handleCheckOut} activeOpacity={0.8}>
                  <Icon name="exit-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnTextWhite}>Punch Out (Check Out)</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.completedBox}>
                  <Icon name="checkmark-circle" size={18} color="#10b981" style={{ marginRight: 6 }} />
                  <Text style={styles.completedText}>
                    Attendance completed today ({todayState.totalWorkingHours} hrs)
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Month Selector Bar */}
        <View style={styles.monthSelectorBar}>
          <TouchableOpacity style={styles.navArrowBtn} onPress={handlePrevMonth}>
            <Icon name="chevron-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.monthCenter}>
            <Icon name="calendar-outline" size={16} color="#0ea5e9" style={{ marginRight: 6 }} />
            <Text style={styles.monthTitle}>
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </Text>
          </View>
          <TouchableOpacity style={styles.navArrowBtn} onPress={handleNextMonth}>
            <Icon name="chevron-forward" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* Monthly Summary Statistics */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { borderColor: '#10b981' }]}>
            <Text style={[styles.statNumber, { color: '#10b981' }]}>{summary.presentCount}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={[styles.statBox, { borderColor: '#f59e0b' }]}>
            <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{summary.lateCount}</Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
          <View style={[styles.statBox, { borderColor: '#f97316' }]}>
            <Text style={[styles.statNumber, { color: '#f97316' }]}>{summary.halfDayCount}</Text>
            <Text style={styles.statLabel}>Half Day</Text>
          </View>
          <View style={[styles.statBox, { borderColor: '#ef4444' }]}>
            <Text style={[styles.statNumber, { color: '#ef4444' }]}>{summary.absentCount}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={[styles.statBox, { borderColor: '#0ea5e9' }]}>
            <Text style={[styles.statNumber, { color: '#0ea5e9' }]}>{summary.totalWorkingHours}h</Text>
            <Text style={styles.statLabel}>Hours</Text>
          </View>
        </View>

        {/* Calendar Grid Card */}
        <View style={styles.calendarCard}>
          <Text style={styles.calendarCardTitle}>Monthly Attendance Sheet</Text>

          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#0ea5e9" />
            </View>
          ) : (
            <View style={styles.calendarGrid}>
              {calendarDays.map((item) => {
                const conf = STATUS_CONFIG[item.status] || STATUS_CONFIG.Upcoming;
                return (
                  <TouchableOpacity
                    key={item.day}
                    style={[
                      styles.daySquare,
                      { backgroundColor: conf.bg, borderColor: conf.color },
                    ]}
                    onPress={() => setSelectedDayDetail(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.daySquareNum, { color: conf.color }]}>{item.day}</Text>
                    <Text style={[styles.daySquareStatus, { color: conf.color }]} numberOfLines={1}>
                      {item.status === 'Present' ? 'P' : item.status === 'Late' ? 'L' : item.status === 'Half Day' ? 'HD' : item.status === 'Absent' ? 'A' : item.status === 'Week Off' ? 'OFF' : '-'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.legendText}>Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.legendText}>Late</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
              <Text style={styles.legendText}>Half Day</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.legendText}>Absent</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.legendText}>Week Off</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Day Details Modal */}
      {selectedDayDetail && (
        <Modal transparent animationType="fade" visible={!!selectedDayDetail}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedDayDetail(null)}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Attendance Details</Text>
                <TouchableOpacity onPress={() => setSelectedDayDetail(null)}>
                  <Icon name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLbl}>Date:</Text>
                <Text style={styles.detailVal}>{selectedDayDetail.dateStr}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLbl}>Status:</Text>
                <Text
                  style={[
                    styles.detailVal,
                    {
                      fontWeight: '700',
                      color: STATUS_CONFIG[selectedDayDetail.status]?.color || '#0f172a',
                    },
                  ]}
                >
                  {selectedDayDetail.status}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLbl}>Shift Timing:</Text>
                <Text style={styles.detailVal}>{selectedDayDetail.shiftTiming || '09:30 - 18:30'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLbl}>Check In:</Text>
                <Text style={styles.detailVal}>{selectedDayDetail.checkIn || 'None'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLbl}>Check Out:</Text>
                <Text style={styles.detailVal}>{selectedDayDetail.checkOut || 'None'}</Text>
              </View>
              {selectedDayDetail.lateMinutes > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLbl}>Late By:</Text>
                  <Text style={[styles.detailVal, { color: '#f59e0b', fontWeight: '700' }]}>
                    {selectedDayDetail.lateMinutes} mins
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLbl}>Working Hours:</Text>
                <Text style={styles.detailVal}>{selectedDayDetail.totalWorkingHours} hrs</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  punchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  punchTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  digitalClock: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  digitalDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  shiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  shiftBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369a1',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  todayStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  todayStatusItem: {
    alignItems: 'center',
  },
  todayStatusLbl: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  todayStatusVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  checkInBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  checkOutBtn: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnTextWhite: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  completedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
  },
  loadingBox: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  monthSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
  },
  calendarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  calendarCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  daySquare: {
    width: (width - 28 - 28 - 48) / 7,
    aspectRatio: 1,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySquareNum: {
    fontSize: 12,
    fontWeight: '700',
  },
  daySquareStatus: {
    fontSize: 8,
    fontWeight: '800',
    marginTop: 1,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  detailLbl: {
    fontSize: 13,
    color: '#64748b',
  },
  detailVal: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
});

export default EmployeeAttendanceScreen;
