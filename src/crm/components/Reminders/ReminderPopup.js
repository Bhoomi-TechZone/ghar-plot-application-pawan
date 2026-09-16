/**
 * Reminder Popup - Employee Side
 * 100% same as EmployeeNotificationPopup (Admin style)
 */
import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Vibration,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const ReminderPopup = ({ visible, onClose, reminder, onEdit }) => {
  const primaryColor = '#4F46E5';
  const secondaryColor = '#64748b';
  const bgColor = '#EEF2FF';
  const iconName = 'notifications-active';
  const headerTitle = 'Reminder Alert';

  // Vibrate when popup opens
  useEffect(() => {
    if (visible && reminder) {
      Vibration.vibrate([0, 600, 300, 600, 300, 600]);
    }
  }, [visible, reminder]);

  if (!reminder) return null;

  const clientName = reminder.clientName || reminder.name || '';
  const note = reminder.note || reminder.message || reminder.comment || '';
  const title = reminder.title || 'Reminder';

  const handleClose = () => {
    if (onClose) onClose('done');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
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
            {/* Employee/Reminder Badge */}
            <View style={styles.employeeBadge}>
              <View style={[styles.avatar, { backgroundColor: primaryColor + '20' }]}>
                <MaterialIcons name="event-note" size={24} color={primaryColor} />
              </View>
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName}>{title}</Text>
                <Text style={styles.employeeAction}>due reminder</Text>
              </View>
            </View>

            {/* Details Card */}
            <View style={[styles.detailsCard, { backgroundColor: bgColor }]}>
              {/* Reminder Title */}
              <View style={styles.detailRow}>
                <MaterialIcons name="event-note" size={20} color={primaryColor} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Reminder</Text>
                  <Text style={styles.detailValue}>{title}</Text>
                </View>
              </View>

              {/* Client Name */}
              {!!clientName && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="person-outline" size={20} color={primaryColor} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Client</Text>
                    <Text style={styles.detailValue}>{clientName}</Text>
                  </View>
                </View>
              )}

              {/* Note */}
              {!!note && (
                <View style={[styles.detailRow, styles.noteRow]}>
                  <MaterialIcons name="notes" size={20} color={primaryColor} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Note</Text>
                    <Text style={styles.detailValue}>{note}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: secondaryColor }]}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: primaryColor }]}
              onPress={() => {
                handleClose();
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

export default ReminderPopup;
