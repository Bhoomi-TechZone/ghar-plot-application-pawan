/**
 * Beautiful Admin Notification Popup
 * Specifically for Admin Reminders & Alerts
 */
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

//const { width } = Dimensions.get('window');
const { width, height } = Dimensions.get('window');

const AdminNotificationPopup = ({
  visible,
  onClose,
  employeeName = 'Admin',
  title = 'Admin Notification',
  clientName = '',
  reason = '',
  note = '',
  scheduledAt = '',
  nextScheduledAt = '',
  createdAt = '', // 🔥 Add createdAt prop
  time = '', // 🔥 Add time prop for scheduled time display
  date = '', // 🔥 Add date prop for fallback
  type = 'admin_reminder',
  onEdit,
}) => {
  // Always use Indigo theme for Admin
  const primaryColor = '#4F46E5';
  const secondaryColor = '#64748b';
  const bgColor = '#EEF2FF';
  const iconName = 'notifications-active';
  
  const isAlert = String(type).toLowerCase().includes('alert') || String(title).toLowerCase().includes('alert');
  const headerTitle = isAlert ? 'Admin Alert' : 'Admin Reminder';
  const actionText = isAlert ? 'admin created an alert' : 'admin created a reminder';

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

  // Format time only (HH:mm)
  const formatTime = (timeStr) => {
    if (!timeStr) return null;
    // If it's already in HH:mm format, return it
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      return timeStr;
    }
    // Otherwise try to parse as ISO string
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return null;
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${min}`;
    } catch (_) { return null; }
  };

  const formattedScheduled = formatDateTime(scheduledAt);
  const formattedNext = formatDateTime(nextScheduledAt);
  const formattedCreated = formatDateTime(createdAt); // 🔥 Format created date
  
  // 🔥 Get scheduled time - try scheduledAt, then time prop, then date+time combo
  const scheduledTimeDisplay = time 
    ? (typeof time === 'object' 
        ? `${String(time.hour || 0).padStart(2, '0')}:${String(time.minute || 0).padStart(2, '0')}`
        : formatTime(time))
    : (scheduledAt ? formatTime(scheduledAt) : null);

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
         <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* YAHAN APNA POORA EXISTING CONTENT SAME RAKHO */}
          {/* Content */}      
            {/* Admin Badge */}
            <View style={styles.employeeBadge}>
              <View style={[styles.avatar, { backgroundColor: primaryColor + '20' }]}>
                <MaterialIcons name="security" size={24} color={primaryColor} />
              </View>
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName}>{employeeName === 'Employee' ? 'Admin' : employeeName}</Text>
                <Text style={styles.employeeAction}>{actionText}</Text>
              </View>
            </View>

            {/* Details Card */}
            <View style={[styles.detailsCard, { backgroundColor: bgColor }]}>
              {/* Reminder Title */}
              <View style={styles.detailRow}>
                <MaterialIcons name="event-note" size={20} color={primaryColor} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Reminder</Text>
                  <Text style={styles.detailValue}>{title || 'N/A'}</Text>
                </View>
              </View>

              {/* Client Name */}
              {clientName ? (
                <View style={styles.detailRow}>
                  <MaterialIcons name="person-outline" size={20} color={primaryColor} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Client</Text>
                    <Text style={styles.detailValue}>{clientName}</Text>
                  </View>
                </View>
              ) : null}

             {/* Message / Reason / Note / Scheduled Time / Created At */}
              {(note || reason || scheduledTimeDisplay || formattedCreated) ? (
                <View style={[styles.detailRow, styles.noteRow]}>
                  <MaterialIcons name="notes" size={20} color={primaryColor} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Details</Text>
                    <Text style={styles.detailValue}>
                      {note || reason}
                      {scheduledTimeDisplay
                        ? `\n⏰ Scheduled: ${scheduledTimeDisplay}`
                        : ''}
                      {formattedCreated
                        ? `\n🗓️ Created On: ${formattedCreated}`
                        : ''}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Scheduled Date/Time - REMOVED (now merged into DETAILS section above) */}

              {/* Created Date/Time - REMOVED (now merged into DETAILS section above) */}

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
          
        </ScrollView> 

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: secondaryColor }]}
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
  },
container: {
  width: width * 0.85,
  maxHeight: height * 0.80,
  backgroundColor: '#fff',
  borderRadius: 20,
  overflow: 'hidden',
  elevation: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.3,
  shadowRadius: 10,
},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    flexGrow: 0,
  },
  scrollContent: {
  padding: 20,
  paddingBottom: 10,
},
  employeeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeInfo: {
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
    padding: 16,
    borderRadius: 15,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
    lineHeight: 20,
  },
  noteRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(79, 70, 229, 0.1)',
    paddingTop: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
    backgroundColor: '#fff',
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

export default AdminNotificationPopup;
