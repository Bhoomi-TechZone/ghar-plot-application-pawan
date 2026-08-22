/**
 * AdminReminderDetailsScreen.js
 * Premium detailed view for Admin reminder notifications
 * Features: View Details, Edit, Cancel, Complete, Add Comment, Reassign Info
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
  TextInput,
  StatusBar,
  Platform,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateReminder } from '../../../services/api';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const { width } = Dimensions.get('window');
const CRM_BASE_URL = 'https://gharplotbackend.gntechnology.de';

const AdminReminderDetailsScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    reminderId,
    employeeName: paramEmployeeName,
    employeeEmail: paramEmployeeEmail,
    reminderTitle: paramReminderTitle,
    clientName: paramClientName,
    phone: paramPhone,
    location: paramLocation,
    note: paramNote,
    reminderTime: paramReminderTime,
    enquiryId,
    fromNotification,
  } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentNote, setCurrentNote] = useState(paramNote || '');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [reminderStatus, setReminderStatus] = useState('pending');
  const [fetchedDetails, setFetchedDetails] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Derived values
  const employeeName = fetchedDetails?.employeeName || paramEmployeeName || 'Unknown Employee';
  const employeeEmail = fetchedDetails?.employeeEmail || paramEmployeeEmail || '';
  const clientName = fetchedDetails?.clientName || paramClientName || 'General Reminder';
  const phone = fetchedDetails?.phone || paramPhone || '';
  const location = fetchedDetails?.location || paramLocation || '';
  const reminderTime =
    fetchedDetails?.reminderDateTime ||
    fetchedDetails?.reminderTime ||
    paramReminderTime || '';
  const reminderTitle = fetchedDetails?.title || paramReminderTitle || 'Untitled Reminder';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const fetchReminderDetails = useCallback(async () => {
    if (!reminderId) return;
    try {
      const token =
        await AsyncStorage.getItem('adminToken') ||
        await AsyncStorage.getItem('accessToken') ||
        await AsyncStorage.getItem('userToken');
      
      if (!token) return;

      const response = await fetch(`${CRM_BASE_URL}/api/reminder/${reminderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        const details = result.reminder || result.data || result;
        if (details && typeof details === 'object') {
          setFetchedDetails(details);
          setReminderStatus(details.status || 'pending');
          if (details.comment || details.note) {
            setCurrentNote(details.comment || details.note || paramNote || '');
          }
          console.log('✅ Admin: Fetched reminder details');
        }
      }
    } catch (err) {
      console.log('⚠️ Could not fetch details:', err.message);
    }
  }, [reminderId]);

  useEffect(() => {
    fetchReminderDetails();
  }, [fetchReminderDetails]);

  const formatDateTime = (isoString) => {
    if (!isoString) return 'Not scheduled';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const handleCall = () => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      CrossPlatformAlert.alert('Not Available', 'Phone number not provided.');
    }
  };

  const handleEmailEmployee = () => {
    if (employeeEmail) {
      Linking.openURL(`mailto:${employeeEmail}`);
    }
  };

  const handleEdit = async () => {
    // Determine if this is an Alert or a real Reminder
    // Admin reminders created via CreateAlertScreen.js use alertIds (often prefixed with 'alert_')
    const isAlert = reminderId && String(reminderId).includes('alert_');
    
    if (isAlert) {
      console.log('✏️ Navigating to EditAlert for admin reminder');
      navigation.navigate('EditAlert', {
        alertId: String(reminderId).replace('alert_', ''),
        originalTitle: reminderTitle,
        originalReason: currentNote,
        originalDate: fetchedDetails?.date || fetchedDetails?.scheduledDate || '',
        originalTime: fetchedDetails?.time || fetchedDetails?.scheduledTime || '',
        repeatDaily: fetchedDetails?.repeatDaily || fetchedDetails?.repeatFrequency === 'daily'
      });
    } else {
      console.log('✏️ Navigating to EditReminder');
      // Navigate to common edit screen
      navigation.navigate('EditReminder', {
        reminderId,
        clientName,
        originalMessage: currentNote,
        enquiryId,
        phone,
        location,
        reminderTitle,
        isAdmin: true,
        // 🔥 Pass the scheduled date/time so EditReminder can show the correct date
        scheduledDateTime: fetchedDetails?.reminderDateTime || fetchedDetails?.nextOccurrence || reminderTime,
        isRepeating: fetchedDetails?.isRepeating || false,
        repeatType: fetchedDetails?.repeatType || fetchedDetails?.repeatFrequency || 'daily'
      });
    }
  };

  const handleCancel = () => {
    CrossPlatformAlert.alert(
      '❌ Cancel Reminder',
      'Are you sure you want to cancel this reminder?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await updateReminder(reminderId, {
                status: 'cancelled',
                isActive: false,
              });
              if (result?.success !== false) {
                setReminderStatus('cancelled');
                CrossPlatformAlert.alert('Success', 'Reminder has been cancelled.', [
                  { text: 'OK', onPress: () => navigation.goBack() },
                ]);
              }
            } catch (error) {
              setReminderStatus('cancelled');
              navigation.goBack();
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleComplete = () => {
    CrossPlatformAlert.alert(
      '✅ Complete Reminder',
      'Mark this reminder as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await updateReminder(reminderId, {
                status: 'completed',
                isActive: false,
              });
              if (result?.success !== false) {
                setReminderStatus('completed');
                CrossPlatformAlert.alert('Success', 'Reminder marked as completed.', [
                  { text: 'OK', onPress: () => navigation.goBack() },
                ]);
              }
            } catch (error) {
              setReminderStatus('completed');
              navigation.goBack();
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const submitComment = async () => {
    if (!newComment.trim()) {
      CrossPlatformAlert.alert('Required', 'Please enter a comment.');
      return;
    }
    setIsUpdating(true);
    try {
      const timestamp = new Date().toLocaleString('en-IN', { hour12: true });
      const updatedNote = currentNote
        ? `${currentNote}\n\n👑 [Admin ${timestamp}]: ${newComment.trim()}`
        : `👑 [Admin ${timestamp}]: ${newComment.trim()}`;

      const result = await updateReminder(reminderId, {
        comment: updatedNote,
        note: updatedNote,
      });

      if (result?.success !== false) {
        setCurrentNote(updatedNote);
        setShowCommentModal(false);
        setNewComment('');
        CrossPlatformAlert.alert('Success', 'Admin comment added.');
      }
    } catch (error) {
      CrossPlatformAlert.alert('Error', 'Failed to add comment');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = () => {
    switch (reminderStatus) {
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      case 'overdue': return '#F59E0B';
      default: return '#1F2937';
    }
  };

  const isActionable = reminderStatus === 'pending' || reminderStatus === 'overdue';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="chevron-left" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Details</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20', borderColor: getStatusColor() }]}>
            <Text style={[styles.statusBadgeText, { color: getStatusColor() }]}>
              {reminderStatus.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.headerHero}>
           <View style={styles.heroAvatar}>
              <Icon name="shield-check" size={30} color="#FFD700" />
           </View>
           <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle} numberOfLines={1}>{reminderTitle}</Text>
              <Text style={styles.heroSubTitle}>Set by: {employeeName}</Text>
           </View>
        </View>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchReminderDetails();
              setRefreshing(false);
            }}
            colors={['#1F2937']}
          />
        }
      >
        {/* EMPLOYEE INFO */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="account-tie" size={20} color="#1F2937" />
            <Text style={styles.sectionTitle}>Employee Information</Text>
          </View>
          <View style={styles.infoCard}>
             <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{employeeName}</Text>
             </View>
             {employeeEmail ? (
               <TouchableOpacity style={styles.emailBtn} onPress={handleEmailEmployee}>
                  <Icon name="email-outline" size={18} color="#4F46E5" />
                  <Text style={styles.emailBtnText}>{employeeEmail}</Text>
               </TouchableOpacity>
             ) : null}
          </View>
        </View>

        {/* REMINDER INFO */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="bell-outline" size={20} color="#1F2937" />
            <Text style={styles.sectionTitle}>Reminder Details</Text>
          </View>
          <View style={styles.infoCard}>
             <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Scheduled Time</Text>
                <View style={styles.timePill}>
                   <Icon name="clock-outline" size={16} color="#EF4444" />
                   <Text style={styles.timePillText}>{formatDateTime(reminderTime)}</Text>
                </View>
             </View>
             <View style={styles.divider} />
             <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Note / Comment</Text>
                <Text style={styles.noteBody}>{currentNote || 'No notes provided'}</Text>
             </View>
          </View>
        </View>

        {/* CLIENT INFO */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="account-circle-outline" size={20} color="#1F2937" />
            <Text style={styles.sectionTitle}>Client Information</Text>
          </View>
          <View style={styles.infoCard}>
             <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{clientName}</Text>
             </View>
             {phone ? (
               <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{phone}</Text>
               </View>
             ) : null}
             {location ? (
               <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>{location}</Text>
               </View>
             ) : null}

             {phone && (
               <View style={styles.contactActions}>
                  <TouchableOpacity style={styles.primaryAction} onPress={handleCall}>
                     <Icon name="phone" size={20} color="#fff" />
                     <Text style={styles.primaryActionText}>Call Client</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.secondaryAction} 
                    onPress={() => {
                        const cleanPhone = phone.replace(/[^\d]/g, '');
                        Linking.openURL(`whatsapp://send?phone=${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}`);
                    }}
                  >
                     <Icon name="whatsapp" size={20} color="#25D366" />
                  </TouchableOpacity>
               </View>
             )}
          </View>
        </View>

        {enquiryId && (
          <TouchableOpacity 
            style={styles.leadBtn}
            onPress={() => navigation.navigate('AdminApp', { screen: 'EnquiryDetail', params: { enquiryId } })}
          >
             <Text style={styles.leadBtnText}>View Full Lead Details</Text>
             <Icon name="arrow-right" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* FOOTER ACTIONS */}
      {isActionable && (
        <View style={[styles.footer, { bottom: 25 + (insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 20 : 0)) }]}>
          <TouchableOpacity style={styles.footerEdit} onPress={handleEdit}>
            <Icon name="pencil" size={20} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerMsg} onPress={() => setShowCommentModal(true)}>
            <Icon name="comment-plus-outline" size={20} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerCancel} onPress={handleCancel}>
            <Text style={styles.footerCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerDone} onPress={handleComplete}>
            <Icon name="check-all" size={22} color="#fff" />
            <Text style={styles.footerDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* COMMENT MODAL */}
      <Modal visible={showCommentModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
           <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Admin Comment</Text>
              <TextInput 
                style={styles.modalInput}
                multiline
                numberOfLines={4}
                placeholder="Type your feedback/comment..."
                value={newComment}
                onChangeText={setNewComment}
              />
              <View style={styles.modalFooter}>
                 <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCommentModal(false)}>
                    <Text style={styles.modalCancelText}>Close</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={styles.modalSave} onPress={submitComment}>
                    {isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>Post Comment</Text>}
                 </TouchableOpacity>
              </View>
           </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#111827',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
  headerHero: { flexDirection: 'row', alignItems: 'center', marginTop: 25, gap: 15 },
  heroAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  heroTitle: { fontSize: 22, color: '#fff', fontWeight: 'bold' },
  heroSubTitle: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },

  scrollContent: { padding: 20 },
  section: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, color: '#1F2937', fontWeight: '700' },
  infoCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  infoRow: { marginBottom: 15 },
  infoLabel: { fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  infoValue: { fontSize: 16, color: '#111827', fontWeight: '600' },
  emailBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emailBtnText: { color: '#4F46E5', fontSize: 14, fontWeight: '500' },
  timePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start' },
  timePillText: { marginLeft: 6, color: '#EF4444', fontWeight: 'bold', fontSize: 14 },
  noteBody: { fontSize: 14, color: '#374151', lineHeight: 22 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 15 },

  contactActions: { flexDirection: 'row', gap: 10, marginTop: 5 },
  primaryAction: { flex: 1, backgroundColor: '#1F2937', height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryActionText: { color: '#fff', fontWeight: 'bold' },
  secondaryAction: { width: 48, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: '#25D366', justifyContent: 'center', alignItems: 'center' },

  leadBtn: { backgroundColor: '#4F46E5', padding: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 4 },
  leadBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  footer: { position: 'absolute', left: 20, right: 20, backgroundColor: '#fff', padding: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20 },
  footerEdit: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  footerMsg: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  footerCancel: { paddingHorizontal: 15, height: 48, justifyContent: 'center' },
  footerCancelText: { color: '#EF4444', fontWeight: 'bold' },
  footerDone: { flex: 1, height: 48, backgroundColor: '#10B981', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  footerDoneText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 25 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  modalInput: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 15, textAlignVertical: 'top', borderSize: 1, borderColor: '#E5E7EB', color: '#111827' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 },
  modalCancel: { padding: 12 },
  modalCancelText: { color: '#6B7280', fontWeight: '600' },
  modalSave: { backgroundColor: '#111827', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  modalSaveText: { color: '#fff', fontWeight: 'bold' },
});

export default AdminReminderDetailsScreen;
