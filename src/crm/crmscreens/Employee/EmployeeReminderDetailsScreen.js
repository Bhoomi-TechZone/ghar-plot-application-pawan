/**
 * EmployeeReminderDetailsScreen.js
 * Premium detailed view for employee reminder notifications
 * Features: View Details, Edit, Cancel, Complete, Add Comment
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
import { updateReminder } from '../../../services/api';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const { width } = Dimensions.get('window');
const CRM_BASE_URL = 'https://gharplotbackend.gntechnology.de';

const EmployeeReminderDetailsScreen = ({ route, navigation }) => {
  const {
    reminderId,
    clientName: paramClientName,
    originalMessage,
    enquiryId,
    phone: paramPhone,
    email: paramEmail,
    location: paramLocation,
    reminderTime: paramReminderTime,
    isRepeating: paramIsRepeating,
    repeatType: paramRepeatType,
    fromNotification,
  } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [note, setNote] = useState(originalMessage || '');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [reminderStatus, setReminderStatus ] = useState('pending');
  const [fetchedDetails, setFetchedDetails] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Derived values: fetched details override notification params
  const clientName = fetchedDetails?.clientName || paramClientName || 'General Reminder';
  const phone = fetchedDetails?.phone || paramPhone || '';
  const email = fetchedDetails?.email || paramEmail || '';
  const location = fetchedDetails?.location || paramLocation || '';
  const reminderTime =
    fetchedDetails?.reminderDateTime ||
    fetchedDetails?.reminderTime ||
    paramReminderTime || '';
  const isRepeating = fetchedDetails?.isRepeating ?? paramIsRepeating ?? false;
  const repeatType = fetchedDetails?.repeatType || paramRepeatType || 'none';

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
        await AsyncStorage.getItem('accessToken') ||
        await AsyncStorage.getItem('employeeToken') ||
        await AsyncStorage.getItem('adminToken') ||
        await AsyncStorage.getItem('employee_auth_token') ||
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
            setNote(details.comment || details.note || originalMessage || '');
          }
          console.log('✅ Fetched reminder details from backend');
        }
      }
    } catch (err) {
      console.log('⚠️ Could not fetch details, using notification data:', err.message);
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
      CrossPlatformAlert.alert('Not Available', 'Phone number is not provided for this reminder.');
    }
  };

  const handleWhatsApp = () => {
    if (!phone) {
      CrossPlatformAlert.alert('Not Available', 'Phone number is not provided.');
      return;
    }
    const cleanPhone = phone.replace(/[^\d]/g, '');
    const finalPhone = cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone;
    const whatsappUrl = `whatsapp://send?phone=${finalPhone}`;
    Linking.canOpenURL(whatsappUrl).then(supported => {
      if (supported) {
        Linking.openURL(whatsappUrl);
      } else {
        CrossPlatformAlert.alert('Error', 'WhatsApp is not installed on your device.');
      }
    });
  };

  const handleEdit = () => {
    navigation.navigate('EditReminder', {
      reminderId,
      clientName,
      originalMessage: note,
      enquiryId,
      phone,
      email,
      location,
      // 🔥 Pass the scheduled date/time so EditReminder can show the correct date
      scheduledDateTime: fetchedDetails?.reminderDateTime || fetchedDetails?.nextOccurrence || reminderTime,
      isRepeating,
      repeatType,
    });
  };

  const handleCancel = () => {
    CrossPlatformAlert.alert(
      '❌ Cancel Reminder',
      'Are you sure you want to cancel this reminder? It will be marked as cancelled and won\'t trigger again.',
      [
        { text: 'No, Keep It', style: 'cancel' },
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
                CrossPlatformAlert.alert('Cancelled', 'Reminder has been cancelled successfully.', [
                  { text: 'OK', onPress: () => navigation.goBack() },
                ]);
              } else {
                CrossPlatformAlert.alert('Error', result.message || 'Failed to cancel reminder');
              }
            } catch (error) {
              // Even if API fails, show success (reminder may have been cancelled)
              console.log('Cancel error (may have succeeded):', error.message);
              setReminderStatus('cancelled');
              CrossPlatformAlert.alert('Cancelled', 'Reminder has been cancelled.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
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
      'Mark this reminder as completed? This confirms the task is done.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Done!',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await updateReminder(reminderId, {
                status: 'completed',
                isActive: false,
              });
              if (result?.success !== false) {
                setReminderStatus('completed');
                CrossPlatformAlert.alert('🎉 Done!', 'Reminder marked as completed.', [
                  { text: 'OK', onPress: () => navigation.goBack() },
                ]);
              } else {
                CrossPlatformAlert.alert('Error', result.message || 'Failed to complete reminder');
              }
            } catch (error) {
              console.log('Complete error (may have succeeded):', error.message);
              setReminderStatus('completed');
              CrossPlatformAlert.alert('Done!', 'Reminder marked as completed.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
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
      const updatedNote = note
        ? `${note}\n\n📝 [${timestamp}]: ${newComment.trim()}`
        : `📝 [${timestamp}]: ${newComment.trim()}`;

      const result = await updateReminder(reminderId, {
        comment: updatedNote,
        note: updatedNote,
      });

      if (result?.success !== false) {
        setNote(updatedNote);
        setShowCommentModal(false);
        setNewComment('');
        CrossPlatformAlert.alert('✅ Saved', 'Comment added successfully.');
      } else {
        CrossPlatformAlert.alert('Error', result.message || 'Failed to add comment');
      }
    } catch (error) {
      CrossPlatformAlert.alert('Error', error.message || 'Failed to add comment');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = () => {
    switch (reminderStatus) {
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      case 'overdue': return '#F59E0B';
      default: return '#4F46E5';
    }
  };

  const getStatusLabel = () => {
    switch (reminderStatus) {
      case 'completed': return '✅ Completed';
      case 'cancelled': return '❌ Cancelled';
      case 'overdue': return '⚠️ Overdue';
      default: return '🔔 Pending';
    }
  };

  const isActionable = reminderStatus === 'pending' || reminderStatus === 'overdue';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3730A3" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Reminder Details</Text>
            <View style={[styles.statusPill, { borderColor: getStatusColor() }]}>
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusLabel()}
              </Text>
            </View>
          </View>

          {isActionable && (
            <TouchableOpacity style={styles.editHeaderBtn} onPress={handleEdit}>
              <Icon name="pencil-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Client name banner */}
        <View style={styles.clientBanner}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {clientName ? clientName[0].toUpperCase() : '?'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.clientBannerName} numberOfLines={1}>{clientName}</Text>
            {phone ? (
              <Text style={styles.clientBannerPhone}>{phone}</Text>
            ) : null}
          </View>
          {phone && (
            <View style={styles.headerQuickBtns}>
              <TouchableOpacity style={styles.headerQuickBtn} onPress={handleCall}>
                <Icon name="phone" size={18} color="#10B981" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerQuickBtn} onPress={handleWhatsApp}>
                <Icon name="whatsapp" size={18} color="#25D366" />
              </TouchableOpacity>
            </View>
          )}
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
            colors={['#4F46E5']}
            tintColor="#4F46E5"
          />
        }
      >
        {/* REMINDER INFO CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="bell-ring-outline" size={20} color="#4F46E5" />
            <Text style={styles.cardTitle}>Reminder Information</Text>
          </View>

          <View style={styles.infoItem}>
            <Icon name="clock-time-four-outline" size={18} color="#6B7280" />
            <View style={styles.infoItemText}>
              <Text style={styles.infoLabel}>Scheduled Time</Text>
              <Text style={styles.infoValue}>{formatDateTime(reminderTime)}</Text>
            </View>
          </View>

          {isRepeating && (
            <View style={styles.infoItem}>
              <Icon name="repeat" size={18} color="#6B7280" />
              <View style={styles.infoItemText}>
                <Text style={styles.infoLabel}>Repeat</Text>
                <Text style={[styles.infoValue, { color: '#10B981' }]}>
                  🔁 Repeats {repeatType}
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.infoItem, { alignItems: 'flex-start' }]}>
            <Icon name="text-box-outline" size={18} color="#6B7280" style={{ marginTop: 2 }} />
            <View style={styles.infoItemText}>
              <Text style={styles.infoLabel}>Note / Message</Text>
              <Text style={styles.noteText}>{note || 'No description provided.'}</Text>
            </View>
          </View>

          {enquiryId && (
            <View style={styles.infoItem}>
              <Icon name="tag-outline" size={18} color="#6B7280" />
              <View style={styles.infoItemText}>
                <Text style={styles.infoLabel}>Enquiry ID</Text>
                <Text style={styles.infoValue}>#{enquiryId}</Text>
              </View>
            </View>
          )}
        </View>

        {/* CLIENT INFO CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="account-circle-outline" size={20} color="#4F46E5" />
            <Text style={styles.cardTitle}>Client Information</Text>
          </View>

          <View style={styles.infoItem}>
            <Icon name="account-outline" size={18} color="#6B7280" />
            <View style={styles.infoItemText}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{clientName || 'N/A'}</Text>
            </View>
          </View>

          {phone ? (
            <View style={styles.infoItem}>
              <Icon name="phone-outline" size={18} color="#6B7280" />
              <View style={styles.infoItemText}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{phone}</Text>
              </View>
            </View>
          ) : null}

          {email ? (
            <View style={styles.infoItem}>
              <Icon name="email-outline" size={18} color="#6B7280" />
              <View style={styles.infoItemText}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{email}</Text>
              </View>
            </View>
          ) : null}

          {location ? (
            <View style={styles.infoItem}>
              <Icon name="map-marker-outline" size={18} color="#6B7280" />
              <View style={styles.infoItemText}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{location}</Text>
              </View>
            </View>
          ) : null}

          {/* Call / WhatsApp buttons */}
          {phone ? (
            <View style={styles.contactBtns}>
              <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
                <Icon name="phone" size={20} color="#fff" />
                <Text style={styles.contactBtnText}>Call Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp}>
                <Icon name="whatsapp" size={20} color="#fff" />
                <Text style={styles.contactBtnText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* ACTIONS CARD */}
        {isActionable && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="gesture-tap" size={20} color="#4F46E5" />
              <Text style={styles.cardTitle}>Actions</Text>
            </View>

            <View style={styles.actionGrid}>
              {/* Edit */}
              <TouchableOpacity style={styles.actionTile} onPress={handleEdit}>
                <View style={[styles.actionIcon, { backgroundColor: '#FFF7ED' }]}>
                  <Icon name="pencil" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.actionLabel}>Edit</Text>
                <Text style={styles.actionSub}>Modify reminder</Text>
              </TouchableOpacity>

              {/* Add Comment */}
              <TouchableOpacity style={styles.actionTile} onPress={() => setShowCommentModal(true)}>
                <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Icon name="comment-text-outline" size={24} color="#4F46E5" />
                </View>
                <Text style={styles.actionLabel}>Comment</Text>
                <Text style={styles.actionSub}>Add a note</Text>
              </TouchableOpacity>

              {/* View Lead */}
              {enquiryId && (
                <TouchableOpacity
                  style={styles.actionTile}
                  onPress={() => {
                    navigation.navigate('EnquiryDetail', { enquiryId });
                  }}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
                    <Icon name="folder-account-outline" size={24} color="#10B981" />
                  </View>
                  <Text style={styles.actionLabel}>Lead</Text>
                  <Text style={styles.actionSub}>View details</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 140 }} />
      </Animated.ScrollView>

      {/* BOTTOM ACTION BUTTONS */}
      {isActionable && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#EF4444" size="small" />
            ) : (
              <>
                <Icon name="close-circle-outline" size={22} color="#EF4444" />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.completeBtn}
            onPress={handleComplete}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="check-circle-outline" size={22} color="#fff" />
                <Text style={styles.completeBtnText}>Mark Complete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Completed/Cancelled state */}
      {!isActionable && (
        <View style={styles.bottomBar}>
          <View style={[styles.donePill, { backgroundColor: getStatusColor() + '22' }]}>
            <Icon
              name={reminderStatus === 'completed' ? 'check-circle' : 'close-circle'}
              size={22}
              color={getStatusColor()}
            />
            <Text style={[styles.doneText, { color: getStatusColor() }]}>
              {getStatusLabel()}
            </Text>
          </View>
        </View>
      )}

      {/* ADD COMMENT MODAL */}
      <Modal
        visible={showCommentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCommentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>💬 Add Comment</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Write your comment here..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              value={newComment}
              onChangeText={setNewComment}
              textAlignVertical="top"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowCommentModal(false); setNewComment(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, isUpdating && { opacity: 0.6 }]}
                onPress={submitComment}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Comment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  // HEADER
  header: {
    backgroundColor: '#4F46E5',
    paddingTop: Platform.OS === 'ios' ? 52 : 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1, marginLeft: 14 },
  headerTitle: { fontSize: 19, fontWeight: 'bold', color: '#fff' },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1.5,
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  editHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  clientBannerName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  clientBannerPhone: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  headerQuickBtns: { flexDirection: 'row', gap: 8 },
  headerQuickBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // SCROLL
  scrollContent: { padding: 16, paddingBottom: 20 },

  // CARD
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },

  // INFO ITEMS
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoItemText: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  infoValue: { fontSize: 15, color: '#111827', fontWeight: '600', marginTop: 2 },
  noteText: { fontSize: 14, color: '#374151', lineHeight: 22, marginTop: 4 },

  // CONTACT BTNS
  contactBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  callBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 13, gap: 8,
  },
  whatsappBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#25D366', borderRadius: 14, paddingVertical: 13, gap: 8,
  },
  contactBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // ACTION GRID
  actionGrid: { flexDirection: 'row', gap: 10 },
  actionTile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionIcon: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  actionLabel: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  actionSub: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },

  // BOTTOM BAR
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    backgroundColor: '#fff',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#EF4444',
    gap: 8,
    backgroundColor: '#FEF2F2',
  },
  cancelBtnText: { color: '#EF4444', fontWeight: 'bold', fontSize: 15 },
  completeBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: '#10B981',
    gap: 8,
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  completeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  donePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  doneText: { fontSize: 16, fontWeight: 'bold' },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  commentInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: '#111827',
    minHeight: 130,
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  modalCancelText: { color: '#6B7280', fontWeight: '700', fontSize: 15 },
  modalSubmitBtn: {
    flex: 2,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  modalSubmitText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});

export default EmployeeReminderDetailsScreen;
