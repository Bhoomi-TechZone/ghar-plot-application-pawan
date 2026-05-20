/**
 * Beautiful Employee Notification Popup for Admin
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const EmployeeNotificationPopup = ({
  visible,
  onClose,
  type = 'reminder', // 'reminder' or 'alert'
  employeeName = 'Employee',
  title = '',
  clientName = '',
  reason = '',
  note = '',
  scheduledAt = '',
  nextScheduledAt = '',
  onEdit,
}) => {
  // 🔥 SYNCED DETECTION: Separate Admin status from Reminder status
  const isFromAdmin = 
    String(type).toLowerCase().includes('admin') ||
    String(title).toLowerCase().includes('admin') ||
    String(employeeName).toLowerCase().includes('admin');

  const isReminder =
    String(type).toLowerCase().includes('reminder') ||
    String(title).toLowerCase().includes('reminder') ||
    String(title).toLowerCase().includes('remind') ||
    String(title).toLowerCase().includes('follow') ||
    String(title).toLowerCase().includes('check') ||
    String(title).includes('रिमाइंडर') ||
    String(reason).toLowerCase().includes('reminder') ||
    String(reason).toLowerCase().includes('remind') ||
    String(reason).toLowerCase().includes('follow') ||
    String(reason).includes('रिमाइंडर') ||
    String(note).toLowerCase().includes('reminder') ||
    String(note).toLowerCase().includes('remind') ||
    String(note).toLowerCase().includes('follow') ||
    String(note).includes('रिमाइंडर');

  const isAdminReminder = isReminder && isFromAdmin;

  const primaryColor = isReminder ? '#4F46E5' : '#EF4444';
  const bgColor = isReminder ? '#EEF2FF' : '#FEF2F2';
  const iconName = isReminder ? 'notifications-active' : 'warning';

  // Format ISO date to readable string
  const formatDateTime = (isoStr) => {
    if (!isoStr) return null;
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return null;
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} \u2022 ${hh}:${min}`;
    } catch (_) { return null; }
  };

  const formattedScheduled = formatDateTime(scheduledAt);
  const formattedNext = formatDateTime(nextScheduledAt);

  // Dynamic Header Title
  // Restore 'Admin Alert' as default for Red popups as requested
  const headerTitle = isReminder 
    ? (isFromAdmin ? 'Admin Reminder' : 'Reminder Alert') 
    : 'Admin Alert';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: primaryColor }]}>
            <View style={styles.headerIcon}>
              <MaterialIcons name={iconName} size={28} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
          </View>
 
          {/* Content */}
          <View style={styles.content}>
            {/* Employee Badge */}
            <View style={styles.employeeBadge}>
              <View style={[styles.avatar, { backgroundColor: primaryColor + '20' }]}>
                <MaterialIcons name="person" size={24} color={primaryColor} />
              </View>
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName}>
                  {(isFromAdmin || !isReminder) ? (employeeName === 'Employee' ? 'Admin' : employeeName) : employeeName}
                </Text>
                <Text style={styles.employeeAction}>
                  {isReminder ? 'created a reminder' : 'created an alert'}
                </Text>
              </View>
            </View>

            {/* Details Card */}
            <View style={[styles.detailsCard, { backgroundColor: bgColor }]}>
              {/* Title/Reminder */}
              <View style={styles.detailRow}>
                <MaterialIcons
                  name={isReminder ? 'event-note' : 'report-problem'}
                  size={20}
                  color={primaryColor}
                />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>
                    {isReminder ? 'Reminder' : 'Alert'}
                  </Text>
                  <Text style={styles.detailValue}>{title || 'N/A'}</Text>
                </View>
              </View>

              {/* Client Name (for reminders) */}
              {isReminder && clientName ? (
                <View style={styles.detailRow}>
                  <MaterialIcons name="person-outline" size={20} color={primaryColor} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Client</Text>
                    <Text style={styles.detailValue}>{clientName}</Text>
                  </View>
                </View>
              ) : null}

              {/* Reason (for alerts) */}
              {!isReminder && reason ? (
                <View style={styles.detailRow}>
                  <MaterialIcons name="description" size={20} color={primaryColor} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Reason</Text>
                    <Text style={styles.detailValue}>{reason}</Text>
                  </View>
                </View>
              ) : null}

              {/* Note (for reminders) */}
              {isReminder && note ? (
                <View style={[styles.detailRow, styles.noteRow]}>
                  <MaterialIcons name="notes" size={20} color={primaryColor} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Note</Text>
                    <Text style={styles.detailValue}>{note}</Text>
                  </View>
                </View>
              ) : null}

              {/* Scheduled Date/Time */}
              {formattedScheduled ? (
                <View style={[styles.detailRow, styles.noteRow]}>
                  <MaterialIcons name="schedule" size={20} color={primaryColor} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Scheduled At</Text>
                    <Text style={styles.detailValue}>📅 {formattedScheduled}</Text>
                  </View>
                </View>
              ) : null}

              {/* Next Scheduled Notification */}
              {formattedNext ? (
                <View style={[styles.detailRow, styles.noteRow]}>
                  <MaterialIcons name="update" size={20} color={primaryColor} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Next Scheduled</Text>
                    <Text style={styles.detailValue}>⏭️ {formattedNext}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#64748b' }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: primaryColor }]}
              onPress={() => {
                onClose();
                if (onEdit) onEdit();
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="edit" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: width - 48,
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 14,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 12,
  },
  content: {
    padding: 16,
  },
  employeeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  employeeName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  employeeAction: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  detailsCard: {
    borderRadius: 12,
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  noteRow: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 8,
    padding: 6,
  },
  detailContent: {
    marginLeft: 10,
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default EmployeeNotificationPopup;
