/**
 * Follow-Up Details Screen
 * Complete details of a follow-up with all comments
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';
import { 
  addFollowUpComment,
  updateFollowUpStatus,
  deleteFollowUp 
} from '../../services/employeeApiService';

const FollowUpDetails = ({ route, navigation }) => {
  const { followUp: initialFollowUp, followUpId } = route.params;
  
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [followUp, setFollowUp] = useState(initialFollowUp);
  const [isLoading, setIsLoading] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedActionTaken, setSelectedActionTaken] = useState('other');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Action Types for comments
  const ACTION_TYPES = [
    { label: 'Call', value: 'call' },
    { label: 'Email', value: 'email' },
    { label: 'Meeting', value: 'meeting' },
    { label: 'Site Visit', value: 'site_visit' },
    { label: 'Document Sent', value: 'document_sent' },
    { label: 'Follow-up Scheduled', value: 'follow_up_scheduled' },
    { label: 'Other', value: 'other' },
  ];

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getActionTypeColor = (actionType) => {
    const colors = {
      call: '#3B82F6',
      email: '#8B5CF6',
      meeting: '#EC4899',
      site_visit: '#F59E0B',
      document_sent: '#10B981',
      follow_up_scheduled: '#6366F1',
      other: '#6B7280',
    };
    return colors[actionType] || '#6B7280';
  };

  const getStatusColor = (status) => {
    const colors = {
      open: '#10B981',
      close: '#6B7280',
      'not-interested': '#F59E0B',
    };
    return colors[status] || '#6B7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      open: 'Open',
      close: 'Closed',
      'not-interested': 'Not Interested',
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      urgent: '#DC2626',
    };
    return colors[priority] || '#6B7280';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOverdue = (dateString) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  // ============================================
  // ADD COMMENT
  // ============================================
  const submitAddComment = async () => {
    if (!commentText.trim()) {
      CrossPlatformAlert.alert('Required', 'Please enter a comment');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const response = await addFollowUpComment(followUp._id, {
        text: commentText.trim(),
        actionTaken: selectedActionTaken,
      });

      if (response.success) {
        // Update local state with new comment
        if (response.data.followUp) {
          setFollowUp(response.data.followUp);
        }
        setShowCommentModal(false);
        setCommentText('');
        setSelectedActionTaken('other');
        CrossPlatformAlert.alert('Success', 'Comment added successfully');
      } else {
        CrossPlatformAlert.alert('Error', response.message || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      CrossPlatformAlert.alert('Error', error.message || 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // CLOSE FOLLOW-UP
  // ============================================
  const handleCloseFollowUp = () => {
    Alert.prompt(
      'Close Follow-up',
      'Enter the result/outcome:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          onPress: async (resultText) => {
            if (!resultText.trim()) {
              CrossPlatformAlert.alert('Required', 'Please enter a result');
              return;
            }

            try {
              const response = await updateFollowUpStatus(followUp._id, {
                caseStatus: 'close',
                result: resultText.trim(),
                wordCount: resultText.trim().split(/\s+/).length,
              });

              if (response.success) {
                CrossPlatformAlert.alert('Success', 'Follow-up closed successfully', [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              }
            } catch (error) {
              CrossPlatformAlert.alert('Error', error.message || 'Failed to close follow-up');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  // ============================================
  // DELETE FOLLOW-UP
  // ============================================
  const handleDeleteFollowUp = () => {
    CrossPlatformAlert.alert(
      'Delete Follow-up',
      'Are you sure you want to delete this follow-up?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteFollowUp(followUp._id);
              if (response.success) {
                CrossPlatformAlert.alert('Success', 'Follow-up deleted successfully', [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              }
            } catch (error) {
              CrossPlatformAlert.alert('Error', error.message || 'Failed to delete follow-up');
            }
          },
        },
      ]
    );
  };

  // ============================================
  // RENDER COMMENT MODAL
  // ============================================
  const renderCommentModal = () => (
    <Modal
      visible={showCommentModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCommentModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.commentModalHeader}>
            <View style={styles.commentHeaderLeft}>
              <View style={styles.commentIconBg}>
                <Icon name="comment-plus-outline" size={22} color="#fff" />
              </View>
              <View style={styles.commentHeaderText}>
                <Text style={styles.commentModalTitle}>Add Comment</Text>
                <Text style={styles.commentModalSubtitle}>{followUp.leadData?.clientName || 'Follow-up'}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.commentCloseBtn}
              onPress={() => setShowCommentModal(false)}
            >
              <Icon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.commentDivider} />
          
          {/* Action Taken Dropdown */}
          <View style={styles.commentSection}>
            <Text style={styles.commentSectionLabel}>
              <Text style={styles.commentRequired}>*</Text> Action Taken
            </Text>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => {
                  const nextIndex = (ACTION_TYPES.findIndex(a => a.value === selectedActionTaken) + 1) % ACTION_TYPES.length;
                  setSelectedActionTaken(ACTION_TYPES[nextIndex].value);
                }}
              >
                <View style={styles.actionIconContainer}>
                  <Icon 
                    name={selectedActionTaken === 'call' ? 'phone' : 
                          selectedActionTaken === 'email' ? 'email' :
                          selectedActionTaken === 'meeting' ? 'calendar-check' :
                          selectedActionTaken === 'site_visit' ? 'map-marker-check' :
                          selectedActionTaken === 'document_sent' ? 'file-document-outline' :
                          selectedActionTaken === 'follow_up_scheduled' ? 'clock-outline' : 'dots-horizontal'} 
                    size={18} 
                    color="#4F46E5" 
                  />
                </View>
                <Text style={styles.dropdownButtonText}>
                  {ACTION_TYPES.find(a => a.value === selectedActionTaken)?.label || 'Select Action'}
                </Text>
                <Icon name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Comment Input */}
          <View style={styles.commentSection}>
            <Text style={styles.commentSectionLabel}>
              <Text style={styles.commentRequired}>*</Text> Comment
            </Text>
            <TextInput
              style={styles.commentModalInput}
              placeholder="Add your comment or note..."
              placeholderTextColor="#9CA3AF"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.commentCharCount}>
              {commentText.length} characters
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.commentModalActions}>
            <TouchableOpacity 
              style={[styles.commentModalButton, styles.commentCancelButton]}
              onPress={() => setShowCommentModal(false)}
            >
              <Text style={styles.commentCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.commentModalButton, 
                styles.commentSubmitButton,
                (!commentText.trim() || isSubmitting) && styles.commentDisabledButton
              ]}
              onPress={submitAddComment}
              disabled={!commentText.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="check-circle" size={20} color="#fff" />
                  <Text style={styles.commentSubmitButtonText}>Add Comment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#EF4444" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Follow-up Details</Text>
            <Text style={styles.headerSubtitle}>{followUp.leadData?.clientName || 'Follow-up'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => {
              CrossPlatformAlert.alert('Actions', '', [
                { text: 'Close', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: handleDeleteFollowUp },
              ]);
            }}
          >
            <Icon name="dots-vertical" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Client Info Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Icon name="account-circle-outline" size={20} color="#4F46E5" />
                <Text style={styles.infoLabelText}>Name</Text>
              </View>
              <Text style={styles.infoValue}>{followUp.leadData?.clientName || 'N/A'}</Text>
            </View>

            {followUp.leadData?.clientPhone && (
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <Icon name="phone-outline" size={20} color="#4F46E5" />
                  <Text style={styles.infoLabelText}>Phone</Text>
                </View>
                <Text style={styles.infoValue}>{followUp.leadData.clientPhone}</Text>
              </View>
            )}

            {followUp.leadData?.location && (
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <Icon name="map-marker-outline" size={20} color="#4F46E5" />
                  <Text style={styles.infoLabelText}>Location</Text>
                </View>
                <Text style={styles.infoValue}>{followUp.leadData.location}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status & Details</Text>
          <View style={styles.infoCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusLabelCol}>
                <Text style={styles.statusLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(followUp.caseStatus) + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(followUp.caseStatus) }]}>
                    {getStatusLabel(followUp.caseStatus)}
                  </Text>
                </View>
              </View>

              {followUp.priority && (
                <View style={styles.statusLabelCol}>
                  <Text style={styles.statusLabel}>Priority</Text>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(followUp.priority) + '20' }]}>
                    <Text style={[styles.priorityBadgeText, { color: getPriorityColor(followUp.priority) }]}>
                      {followUp.priority.toUpperCase()}
                    </Text>
                  </View>
                </View>
              )}

              {followUp.leadType && (
                <View style={styles.statusLabelCol}>
                  <Text style={styles.statusLabel}>Lead Type</Text>
                  <Text style={styles.statusValue}>{followUp.leadType}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Dates Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Icon name="calendar-outline" size={20} color="#4F46E5" />
                <Text style={styles.infoLabelText}>Created</Text>
              </View>
              <Text style={styles.infoValue}>{formatDate(followUp.createdAt)}</Text>
            </View>

            {followUp.nextFollowUpDate && (
              <View style={[
                styles.infoRow,
                isOverdue(followUp.nextFollowUpDate) && styles.infoRowOverdue
              ]}>
                <View style={styles.infoLabel}>
                  <Icon 
                    name="calendar-clock" 
                    size={20} 
                    color={isOverdue(followUp.nextFollowUpDate) ? '#EF4444' : '#4F46E5'} 
                  />
                  <Text style={styles.infoLabelText}>Next Follow-up</Text>
                </View>
                <Text style={[styles.infoValue, isOverdue(followUp.nextFollowUpDate) && styles.infoValueOverdue]}>
                  {formatDate(followUp.nextFollowUpDate)}
                  {isOverdue(followUp.nextFollowUpDate) && ' (Overdue)'}
                </Text>
              </View>
            )}

            {followUp.result && (
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}>
                  <Icon name="text-box-outline" size={20} color="#10B981" />
                  <Text style={styles.infoLabelText}>Result</Text>
                </View>
              </View>
            )}
            {followUp.result && (
              <Text style={styles.resultText}>{followUp.result}</Text>
            )}
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.section}>
          <View style={styles.commentsTitleRow}>
            <Text style={styles.sectionTitle}>
              Comments ({followUp.comments?.length || 0})
            </Text>
            <TouchableOpacity 
              style={styles.addCommentBtn}
              onPress={() => {
                setCommentText('');
                setSelectedActionTaken('other');
                setShowCommentModal(true);
              }}
            >
              <Icon name="plus-circle" size={24} color="#4F46E5" />
            </TouchableOpacity>
          </View>

          {followUp.comments && followUp.comments.length > 0 ? (
            <View style={styles.commentsList}>
              {followUp.comments.map((comment, idx) => (
                <View key={idx} style={styles.commentItem}>
                  <View style={styles.commentItemHeader}>
                    <View>
                      <Text style={styles.commentAuthor}>
                        {comment.commentByName || 'Unknown'}
                      </Text>
                      <Text style={styles.commentDateTime}>
                        {formatDateTime(comment.commentDate)}
                      </Text>
                    </View>
                    <View style={[styles.actionBadge, { backgroundColor: getActionTypeColor(comment.actionTaken) }]}>
                      <Icon 
                        name={comment.actionTaken === 'call' ? 'phone' : 
                              comment.actionTaken === 'email' ? 'email' :
                              comment.actionTaken === 'meeting' ? 'calendar-check' :
                              comment.actionTaken === 'site_visit' ? 'map-marker-check' :
                              comment.actionTaken === 'document_sent' ? 'file-document-outline' :
                              comment.actionTaken === 'follow_up_scheduled' ? 'clock-outline' : 'dots-horizontal'} 
                        size={12} 
                        color="#fff" 
                      />
                      <Text style={styles.actionBadgeText}>
                        {comment.actionTaken?.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.commentBodyText}>
                    {comment.text}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noComments}>
              <Icon name="comment-outline" size={48} color="#D1D5DB" />
              <Text style={styles.noCommentsText}>No comments yet</Text>
              <Text style={styles.noCommentsSubtext}>Add a comment to get started</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {followUp.caseStatus === 'open' && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.closeBtnStyle]}
              onPress={handleCloseFollowUp}
            >
              <Icon name="check-circle" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Close Follow-up</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Comment Modal */}
      {renderCommentModal()}
    </View>
  );
};

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Header
  header: {
    backgroundColor: '#EF4444',
    paddingBottom: 0,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content
  content: {
    flex: 1,
  },

  // Section
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },

  // Info Row
  infoRow: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoRowOverdue: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 14,
    borderBottomWidth: 0,
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 28,
  },
  infoValueOverdue: {
    color: '#EF4444',
  },

  // Status
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  statusLabelCol: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Result
  resultText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginLeft: 28,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Comments
  commentsTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addCommentBtn: {
    padding: 8,
  },
  commentsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  commentItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  commentItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  commentDateTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  commentBodyText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },

  // No Comments
  noComments: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  noCommentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  noCommentsSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },

  // Action Buttons
  actionButtonsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  closeBtnStyle: {
    backgroundColor: '#10B981',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Comment Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  commentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  commentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commentIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commentHeaderText: {
    flex: 1,
  },
  commentModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  commentModalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  commentCloseBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  commentDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  commentSection: {
    marginBottom: 16,
  },
  commentSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  commentRequired: {
    color: '#EF4444',
    fontSize: 16,
  },
  commentModalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  commentCharCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
    textAlign: 'right',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  actionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  commentModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  commentModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  commentCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  commentSubmitButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    gap: 8,
  },
  commentSubmitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  commentDisabledButton: {
    opacity: 0.6,
  },
});

export default FollowUpDetails;
