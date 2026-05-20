/**
 * Lead Details Screen
 * Shows full information of a lead
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ReminderModal from '../../components/Enquiries/modals/ReminderModal';
import FollowUpModal from '../../components/Enquiries/modals/FollowUpModal';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const LeadDetails = ({ navigation, route }) => {
  const { lead } = route.params || {};
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [followUpModalVisible, setFollowUpModalVisible] = useState(false);

  if (!lead) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorText}>Lead data not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Helper functions
  const getStatusColor = (status) => {
    const colors = {
      active: '#3B82F6',
      completed: '#10B981',
      cancelled: '#EF4444',
    };
    return colors[status] || '#6B7280';
  };

  const getStatusIcon = (status) => {
    const icons = {
      active: 'clock-outline',
      completed: 'check-circle',
      cancelled: 'close-circle',
    };
    return icons[status] || 'help-circle';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: '#DC2626',
      high: '#F59E0B',
      medium: '#3B82F6',
      low: '#10B981',
    };
    return colors[priority] || '#6B7280';
  };

  const getLeadTypeColor = (type) => {
    return type === 'enquiry' ? '#8B5CF6' : '#06B6D4';
  };

  const getLeadTypeIcon = (type) => {
    return type === 'enquiry' ? 'home-search' : 'account-tie';
  };

  // Actions
  const handleCall = () => {
    if (lead.clientPhone && lead.clientPhone !== 'N/A') {
      Linking.openURL(`tel:${lead.clientPhone}`);
    } else {
      CrossPlatformAlert.alert('Error', 'Phone number not available');
    }
  };

  const handleWhatsApp = () => {
    if (lead.clientPhone && lead.clientPhone !== 'N/A') {
      const phone = lead.clientPhone.replace(/[^0-9]/g, '');
      Linking.openURL(`whatsapp://send?phone=91${phone}`);
    } else {
      CrossPlatformAlert.alert('Error', 'Phone number not available');
    }
  };

  const handleEmail = () => {
    if (lead.clientEmail && lead.clientEmail !== 'N/A') {
      Linking.openURL(`mailto:${lead.clientEmail}`);
    } else {
      CrossPlatformAlert.alert('Error', 'Email not available');
    }
  };

  const handleSetReminder = () => {
    setReminderModalVisible(true);
  };

  const handleCreateFollowUp = () => {
    setFollowUpModalVisible(true);
  };

  // Prepare data for modals
  const enquiryData = {
    _id: lead._id,
    leadId: lead._id,
    leadType: lead.leadType,
    clientName: lead.clientName,
    email: lead.clientEmail,
    phone: lead.clientPhone,
    contactNumber: lead.clientPhone,
    propertyLocation: lead.propertyLocation,
    location: lead.propertyLocation,
    propertyType: lead.propertyType,
    message: lead.notes || lead.message || '',
    enquiryType: lead.leadType === 'enquiry' ? 'Inquiry' : 'ClientLead',
    source: lead.leadType,
    type: lead.leadType,
    assignmentId: lead._id,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3730A3" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Lead Details</Text>
          <Text style={styles.headerSubtitle}>
            {lead.leadType === 'enquiry' ? 'Enquiry Lead' : 'Client Lead'}
          </Text>
        </View>
        <View style={[styles.statusHeaderBadge, { backgroundColor: getStatusColor(lead.status) }]}>
          <Text style={styles.statusHeaderText}>{lead.status?.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Lead Type & Priority Card */}
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: `${getLeadTypeColor(lead.leadType)}20` }]}>
              <Icon name={getLeadTypeIcon(lead.leadType)} size={18} color={getLeadTypeColor(lead.leadType)} />
              <Text style={[styles.typeText, { color: getLeadTypeColor(lead.leadType) }]}>
                {lead.leadType === 'enquiry' ? 'Enquiry Lead' : 'Client Lead'}
              </Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(lead.priority)}20` }]}>
              <Icon name="flag" size={14} color={getPriorityColor(lead.priority)} />
              <Text style={[styles.priorityText, { color: getPriorityColor(lead.priority) }]}>
                {lead.priority?.toUpperCase()} Priority
              </Text>
            </View>
          </View>
        </View>

        {/* Client Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="account-circle" size={22} color="#3730A3" />
            <Text style={styles.cardTitle}>Client Information</Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Icon name="account" size={20} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{lead.clientName}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Icon name="phone" size={20} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{lead.clientPhone}</Text>
            </View>
            {lead.clientPhone && lead.clientPhone !== 'N/A' && (
              <TouchableOpacity style={styles.actionIconBtn} onPress={handleCall}>
                <Icon name="phone" size={18} color="#10B981" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Icon name="email" size={20} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{lead.clientEmail}</Text>
            </View>
            {lead.clientEmail && lead.clientEmail !== 'N/A' && (
              <TouchableOpacity style={styles.actionIconBtn} onPress={handleEmail}>
                <Icon name="email-send" size={18} color="#3B82F6" />
              </TouchableOpacity>
            )}
          </View>

          {/* Verification Status for Client Leads */}
          {lead.leadType === 'client' && (
            <View style={styles.verificationRow}>
              <View style={[styles.verifyBadge, lead.isEmailVerified && styles.verifiedBadge]}>
                <Icon 
                  name={lead.isEmailVerified ? 'check-decagram' : 'email-outline'} 
                  size={14} 
                  color={lead.isEmailVerified ? '#10B981' : '#9CA3AF'} 
                />
                <Text style={[styles.verifyText, lead.isEmailVerified && styles.verifiedText]}>
                  Email {lead.isEmailVerified ? 'Verified' : 'Not Verified'}
                </Text>
              </View>
              <View style={[styles.verifyBadge, lead.isPhoneVerified && styles.verifiedBadge]}>
                <Icon 
                  name={lead.isPhoneVerified ? 'check-decagram' : 'phone-outline'} 
                  size={14} 
                  color={lead.isPhoneVerified ? '#10B981' : '#9CA3AF'} 
                />
                <Text style={[styles.verifyText, lead.isPhoneVerified && styles.verifiedText]}>
                  Phone {lead.isPhoneVerified ? 'Verified' : 'Not Verified'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Property Information (for Enquiry Leads) */}
        {lead.leadType === 'enquiry' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="home-city" size={22} color="#3730A3" />
              <Text style={styles.cardTitle}>Property Information</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name="home-variant" size={20} color="#6B7280" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Property Type</Text>
                <Text style={styles.infoValue}>{lead.propertyType}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name="map-marker" size={20} color="#6B7280" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{lead.propertyLocation}</Text>
              </View>
            </View>

            {lead.propertyPrice > 0 && (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Icon name="currency-inr" size={20} color="#6B7280" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Price</Text>
                  <Text style={styles.priceValue}>₹{(lead.propertyPrice / 100000).toFixed(2)} Lakh</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Location Info (for Client Leads) */}
        {lead.leadType === 'client' && (lead.city || lead.state) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="map-marker-radius" size={22} color="#3730A3" />
              <Text style={styles.cardTitle}>Location</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name="city" size={20} color="#6B7280" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>City</Text>
                <Text style={styles.infoValue}>{lead.city || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name="map" size={20} color="#6B7280" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>State</Text>
                <Text style={styles.infoValue}>{lead.state || 'N/A'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Assignment Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="clipboard-text" size={22} color="#3730A3" />
            <Text style={styles.cardTitle}>Assignment Details</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Icon name={getStatusIcon(lead.status)} size={20} color={getStatusColor(lead.status)} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Status</Text>
              <View style={[styles.statusBadgeSmall, { backgroundColor: `${getStatusColor(lead.status)}20` }]}>
                <Text style={[styles.statusTextSmall, { color: getStatusColor(lead.status) }]}>
                  {lead.status?.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Icon name="calendar" size={20} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Assigned Date</Text>
              <Text style={styles.infoValue}>
                {lead.assignedDate 
                  ? new Date(lead.assignedDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'N/A'}
              </Text>
            </View>
          </View>

          {lead.assignedBy && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name="account-supervisor" size={20} color="#6B7280" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Assigned By</Text>
                <Text style={styles.infoValue}>{lead.assignedBy}</Text>
              </View>
            </View>
          )}

          {lead.lastLogin && lead.leadType === 'client' && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name="login" size={20} color="#6B7280" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Last Login</Text>
                <Text style={styles.infoValue}>
                  {new Date(lead.lastLogin).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Notes / Message */}
        {(lead.notes || lead.message) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="note-text" size={22} color="#3730A3" />
              <Text style={styles.cardTitle}>Notes / Message</Text>
            </View>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{lead.notes || lead.message}</Text>
            </View>
          </View>
        )}

        {/* Spacer for bottom actions */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Quick Action Buttons */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionBtn} onPress={handleCall}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#D1FAE5' }]}>
            <Icon name="phone" size={22} color="#10B981" />
          </View>
          <Text style={styles.quickActionText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionBtn} onPress={handleWhatsApp}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#D1FAE5' }]}>
            <Icon name="whatsapp" size={22} color="#25D366" />
          </View>
          <Text style={styles.quickActionText}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionBtn} onPress={handleCreateFollowUp}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#DBEAFE' }]}>
            <Icon name="phone-callback" size={22} color="#3B82F6" />
          </View>
          <Text style={styles.quickActionText}>Follow-up</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionBtn} onPress={handleSetReminder}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="bell" size={22} color="#F59E0B" />
          </View>
          <Text style={styles.quickActionText}>Reminder</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <ReminderModal
        visible={reminderModalVisible}
        onClose={() => setReminderModalVisible(false)}
        enquiry={enquiryData}
        onSuccess={() => console.log('Reminder set successfully')}
      />

      <FollowUpModal
        visible={followUpModalVisible}
        onClose={() => setFollowUpModalVisible(false)}
        enquiry={enquiryData}
        onSuccess={() => console.log('Follow-up created successfully')}
      />
    </View>
  );
};

export default LeadDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
  },
  backBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3730A3',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Header
  header: {
    backgroundColor: '#3730A3',
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 10,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#3730A3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontWeight: '500',
  },
  statusHeaderBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },

  // Content
  content: {
    flex: 1,
    padding: 16,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 10,
  },

  // Badge Row
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
  },
  actionIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Verification
  verificationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  verifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 5,
  },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
  },
  verifyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  verifiedText: {
    color: '#10B981',
  },

  // Status Badge Small
  statusBadgeSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Notes
  notesBox: {
    backgroundColor: '#FFFBEB',
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  notesText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 22,
    fontWeight: '500',
  },

  // Quick Actions
  quickActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
});
