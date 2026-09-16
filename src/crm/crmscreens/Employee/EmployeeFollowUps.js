/**
 * Employee Follow-ups Screen
 * Manage follow-up activities with leads and contacts
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  TextInput,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';
import { 
  getMyFollowUps, 
  updateFollowUpStatus, 
  addFollowUpComment,
  deleteFollowUp 
} from '../../services/employeeApiService';

const EmployeeFollowUps = ({ navigation, openDrawer }) => {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [followUps, setFollowUps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    my_followups: 0,
    open: 0,
    closed: 0,
  });

  // Modal States
  const [showResultModal, setShowResultModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [resultText, setResultText] = useState('');
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

  // Filter Options
  const FILTER_OPTIONS = [
    { label: 'All', value: 'all', icon: 'format-list-bulleted' },
    { label: 'Open', value: 'open', icon: 'clock-outline' },
    { label: 'Closed', value: 'close', icon: 'check-circle-outline' },
    { label: 'Not Interested', value: 'not-interested', icon: 'close-circle-outline' },
  ];

  // ============================================
  // LIFECYCLE
  // ============================================
  useEffect(() => {
    loadFollowUps();
  }, [selectedFilter]);

  // ============================================
  // FETCH FOLLOW-UPS
  // ============================================
  const loadFollowUps = async () => {
    try {
      console.log('🔄 Starting to load follow-ups...');
      setIsLoading(true);

      // Build query params
      const params = { limit: 100 };
      if (selectedFilter !== 'all') {
        params.caseStatus = selectedFilter;
      }

      console.log('📞 Calling getMyFollowUps with params:', params);
      const response = await getMyFollowUps(params);
      console.log('📞 Follow-ups Response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        const followUpList = response.data.followUps || response.data || [];
        const statistics = response.data.statistics || { my_followups: followUpList.length };
        
        console.log('✅ Loaded follow-ups:', followUpList.length);
        console.log('📊 Statistics:', statistics);
        
        setFollowUps(followUpList);
        setStats({
          my_followups: statistics.my_followups || followUpList.length,
          open: followUpList.filter(f => f.caseStatus === 'open').length,
          closed: followUpList.filter(f => f.caseStatus === 'close').length,
        });
      } else {
        console.log('⚠️ No success or no data in response:', response);
        setFollowUps([]);
      }
    } catch (error) {
      console.error('❌ Error loading follow-ups:', error);
      CrossPlatformAlert.alert('Error', error.message || 'Failed to load follow-ups');
      setFollowUps([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // ============================================
  // REFRESH HANDLER
  // ============================================
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadFollowUps();
  }, [selectedFilter]);

  // ============================================
  // FILTERED DATA
  // ============================================
  const getFilteredFollowUps = () => {
    if (!searchQuery.trim()) return followUps;
    
    const query = searchQuery.toLowerCase();
    return followUps.filter(item => {
      const clientName = item.leadData?.clientName?.toLowerCase() || '';
      const clientPhone = item.leadData?.clientPhone || '';
      const comment = item.comment?.toLowerCase() || '';
      const location = item.leadData?.location?.toLowerCase() || '';
      
      return clientName.includes(query) || 
             clientPhone.includes(query) ||
             comment.includes(query) ||
             location.includes(query);
    });
  };

  // ============================================
  // CLOSE FOLLOW-UP WITH RESULT
  // ============================================
  const handleCloseFollowUp = (followUp) => {
    setSelectedFollowUp(followUp);
    setResultText('');
    setShowResultModal(true);
  };

  const submitCloseFollowUp = async () => {
    if (!resultText.trim()) {
      CrossPlatformAlert.alert('Required', 'Please enter a result/outcome for this follow-up');
      return;
    }

    try {
      setIsSubmitting(true);
      const wordCount = resultText.trim().split(/\s+/).length;
      
      const response = await updateFollowUpStatus(selectedFollowUp._id, {
        caseStatus: 'close',
        result: resultText.trim(),
        wordCount: wordCount,
      });

      if (response.success) {
        setShowResultModal(false);
        setSelectedFollowUp(null);
        setResultText('');
        loadFollowUps();
        CrossPlatformAlert.alert('Success', 'Follow-up closed successfully');
      } else {
        CrossPlatformAlert.alert('Error', response.message || 'Failed to close follow-up');
      }
    } catch (error) {
      console.error('Error closing follow-up:', error);
      CrossPlatformAlert.alert('Error', error.message || 'Failed to close follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // ADD COMMENT TO FOLLOW-UP
  // ============================================
  const handleAddComment = (followUp) => {
    setSelectedFollowUp(followUp);
    setCommentText('');
    setSelectedActionTaken('other');
    setShowCommentModal(true);
  };

  const submitAddComment = async () => {
    if (!commentText.trim()) {
      CrossPlatformAlert.alert('Required', 'Please enter a comment');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const response = await addFollowUpComment(selectedFollowUp._id, {
        text: commentText.trim(),
        actionTaken: selectedActionTaken,
      });

      if (response.success) {
        setShowCommentModal(false);
        setSelectedFollowUp(null);
        setCommentText('');
        setSelectedActionTaken('other');
        loadFollowUps();
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
  // MARK NOT INTERESTED
  // ============================================
  const handleMarkNotInterested = async (followUpId, title) => {
    CrossPlatformAlert.alert(
      'Mark as Not Interested',
      `Mark "${title}" as not interested?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const response = await updateFollowUpStatus(followUpId, {
                caseStatus: 'not-interested',
                result: 'Client marked as not interested',
                wordCount: 5,
              });

              if (response.success) {
                loadFollowUps();
                CrossPlatformAlert.alert('Success', 'Marked as not interested');
              }
            } catch (error) {
              console.error('Error updating follow-up:', error);
              CrossPlatformAlert.alert('Error', error.message || 'Failed to update follow-up');
            }
          },
        },
      ]
    );
  };

  // ============================================
  // DELETE FOLLOW-UP
  // ============================================
  const handleDeleteFollowUp = async (followUpId, title) => {
    CrossPlatformAlert.alert(
      'Delete Follow-up',
      `Are you sure you want to delete "${title}"?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteFollowUp(followUpId);

              if (response.success) {
                setFollowUps(prev => prev.filter(f => f._id !== followUpId));
                CrossPlatformAlert.alert('Success', 'Follow-up deleted successfully');
              } else {
                CrossPlatformAlert.alert('Error', response.message || 'Failed to delete follow-up');
              }
            } catch (error) {
              console.error('Error deleting follow-up:', error);
              CrossPlatformAlert.alert('Error', error.message || 'Failed to delete follow-up');
            }
          },
        },
      ]
    );
  };

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

  const isOverdue = (dateString) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  // ============================================
  // RENDER FOLLOW-UP CARD
  // ============================================
  const renderFollowUpCard = ({ item }) => {
    const clientName = item.leadData?.clientName || item.title || 'Follow-up';
    const overdue = item.caseStatus === 'open' && isOverdue(item.nextFollowUpDate);
    
    return (
      <TouchableOpacity
        style={[styles.followUpCard, overdue && styles.overdueCard]}
        onPress={() => {
          // Navigate to details if available
          if (navigation.navigate) {
            try {
              navigation.navigate('FollowUpDetails', { followUpId: item._id, followUp: item });
            } catch (e) {
              console.log('FollowUpDetails screen not available');
            }
          }
        }}
        activeOpacity={0.7}
      >
        {/* Header Row */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.avatarCircle, { backgroundColor: getStatusColor(item.caseStatus) + '20' }]}>
              <Icon 
                name={item.caseStatus === 'open' ? 'phone-clock' : item.caseStatus === 'close' ? 'phone-check' : 'phone-off'} 
                size={20} 
                color={getStatusColor(item.caseStatus)} 
              />
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName} numberOfLines={1}>{clientName}</Text>
              {item.leadData?.clientPhone && (
                <Text style={styles.clientPhone}>{item.leadData.clientPhone}</Text>
              )}
            </View>
          </View>
          
          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.caseStatus) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.caseStatus) }]}>
              {getStatusLabel(item.caseStatus)}
            </Text>
          </View>
        </View>

        {/* Comments */}
        {item.comments && item.comments.length > 0 && (
          <View style={styles.commentsContainer}>
            {item.comments.slice(-2).reverse().map((comment, idx) => (
              <View key={idx} style={styles.commentBubble}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>
                    {comment.commentByName || 'Unknown'}
                  </Text>
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
                    <Text style={styles.actionBadgeText}>{comment.actionTaken?.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.commentBodyText} numberOfLines={2}>
                  {comment.text}
                </Text>
                <Text style={styles.commentTime}>
                  {formatDate(comment.commentDate)}
                </Text>
              </View>
            ))}
            {item.comments.length > 2 && (
              <Text style={styles.moreComments}>
                +{item.comments.length - 2} more comment{item.comments.length - 2 > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        )}

        {/* Meta Info Row */}
        <View style={styles.metaRow}>
          {/* Location */}
          {item.leadData?.location && (
            <View style={styles.metaItem}>
              <Icon name="map-marker-outline" size={14} color="#6B7280" />
              <Text style={styles.metaText}>{item.leadData.location}</Text>
            </View>
          )}
          
          {/* Lead Type */}
          <View style={styles.metaItem}>
            <Icon name="tag-outline" size={14} color="#6B7280" />
            <Text style={styles.metaText}>{item.leadType || 'enquiry'}</Text>
          </View>
          
          {/* Priority */}
          {item.priority && (
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                {item.priority.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Next Follow-up Date */}
        {item.nextFollowUpDate && (
          <View style={[styles.dateRow, overdue && styles.overdueDateRow]}>
            <Icon 
              name="calendar-clock" 
              size={16} 
              color={overdue ? '#EF4444' : '#4F46E5'} 
            />
            <Text style={[styles.dateText, overdue && styles.overdueText]}>
              Next: {formatDate(item.nextFollowUpDate)}
              {overdue && ' (Overdue)'}
            </Text>
          </View>
        )}

        {/* Action Buttons (Only for Open status) */}
        {item.caseStatus === 'open' && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.closeButton]}
              onPress={() => handleCloseFollowUp(item)}
              activeOpacity={0.8}
            >
              <Icon name="check-circle" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.commentButton]}
              onPress={() => handleAddComment(item)}
              activeOpacity={0.8}
            >
              <Icon name="comment-plus" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Comment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleMarkNotInterested(item._id, clientName)}
              activeOpacity={0.8}
            >
              <Icon name="close-circle" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteFollowUp(item._id, clientName)}
              activeOpacity={0.8}
            >
              <Icon name="trash-can-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Comment Button (For closed follow-ups too) */}
        {item.caseStatus !== 'open' && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.commentButton, { flex: 1 }]}
              onPress={() => handleAddComment(item)}
              activeOpacity={0.8}
            >
              <Icon name="comment-plus" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Add Note</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Result for closed follow-ups */}
        {item.caseStatus !== 'open' && item.result && (
          <View style={styles.resultSection}>
            <Icon name="text-box-check-outline" size={14} color="#10B981" />
            <Text style={styles.resultText} numberOfLines={2}>{item.result}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ============================================
  // RENDER EMPTY STATE
  // ============================================
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Icon name="phone-off-outline" size={48} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyText}>No follow-ups found</Text>
      <Text style={styles.emptySubtext}>
        {selectedFilter !== 'all' 
          ? `No ${getStatusLabel(selectedFilter).toLowerCase()} follow-ups` 
          : searchQuery 
            ? 'Try a different search term'
            : 'Your follow-ups will appear here'}
      </Text>
      {selectedFilter !== 'all' && (
        <TouchableOpacity 
          style={styles.clearFilterButton}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={styles.clearFilterText}>Show All</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ============================================
  // RENDER RESULT MODAL
  // ============================================
  const renderResultModal = () => (
    <Modal
      visible={showResultModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowResultModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Close Follow-up</Text>
            <TouchableOpacity onPress={() => setShowResultModal(false)}>
              <Icon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalSubtitle}>
            Enter the result/outcome for: {selectedFollowUp?.leadData?.clientName || 'this follow-up'}
          </Text>
          
          <TextInput
            style={styles.resultInput}
            placeholder="Enter result (e.g., Customer purchased property, Scheduled site visit, etc.)"
            placeholderTextColor="#9CA3AF"
            value={resultText}
            onChangeText={setResultText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowResultModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.submitButton, isSubmitting && styles.disabledButton]}
              onPress={submitCloseFollowUp}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Close Follow-up</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
                <Text style={styles.commentModalSubtitle}>{selectedFollowUp?.leadData?.clientName || 'Follow-up'}</Text>
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

  // ============================================
  // LOADING STATE
  // ============================================
  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EF4444" />
        <Text style={styles.loadingText}>Loading Follow-ups...</Text>
      </View>
    );
  }

  const filteredData = getFilteredFollowUps();

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#EF4444" />
      
      {/* Premium Header */}
      <View style={styles.header}>
        <View style={styles.headerGradient}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={openDrawer}
          >
            <Icon name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Follow-ups</Text>
            <Text style={styles.headerSubtitle}>Stay connected with your leads</Text>
          </View>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefresh}
          >
            <Icon name="refresh" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.my_followups}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.open}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#6B7280' }]}>{stats.closed}</Text>
            <Text style={styles.statLabel}>Closed</Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="magnify" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone, location..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_OPTIONS}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedFilter === item.value && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(item.value)}
            >
              <Icon 
                name={item.icon} 
                size={16} 
                color={selectedFilter === item.value ? '#fff' : '#64748B'} 
              />
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === item.value && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterListContent}
        />
      </View>

      {/* Follow-ups List */}
      <FlatList
        data={filteredData}
        renderItem={renderFollowUpCard}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh}
            colors={['#EF4444']}
            tintColor="#EF4444"
          />
        }
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      {/* Result Modal */}
      {renderResultModal()}

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
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Header
  header: {
    backgroundColor: '#EF4444',
    paddingBottom: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  headerGradient: {
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
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#1F2937',
  },
  
  // Filter Chips
  filterContainer: {
    paddingBottom: 12,
  },
  filterListContent: {
    paddingHorizontal: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#fff',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
    elevation: 3,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  
  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  
  // Follow-up Card
  followUpCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  overdueCard: {
    borderColor: '#FEE2E2',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientInfo: {
    marginLeft: 12,
    flex: 1,
  },
  clientName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.2,
  },
  clientPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  
  // Status Badge
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  
  // Comment
  commentSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  commentText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  
  // Comments Container
  commentsContainer: {
    marginBottom: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  commentBubble: {
    marginBottom: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
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
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  moreComments: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
    marginTop: 4,
  },
  
  // Meta Row
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  
  // Priority Badge
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  
  // Date Row
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  overdueDateRow: {
    backgroundColor: '#FEF2F2',
  },
  dateText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
  overdueText: {
    color: '#EF4444',
  },
  
  // Actions Row
  actionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  closeButton: {
    backgroundColor: '#10B981',
  },
  commentButton: {
    backgroundColor: '#3B82F6',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  deleteButton: {
    backgroundColor: '#6B7280',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  
  // Result Section
  resultSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    color: '#059669',
    lineHeight: 20,
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  clearFilterButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#EF4444',
    borderRadius: 20,
  },
  clearFilterText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  
  // Modal
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  resultInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  
  // Comment Input
  commentInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  commentLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  
  // Comment Modal Styles
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
    fontFamily: 'System',
  },
  commentCharCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
    textAlign: 'right',
  },
  
  // Dropdown Styles
  dropdownSection: {
    marginBottom: 16,
  },
  dropdownLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
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
  
  // Comment Modal Actions
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

export default EmployeeFollowUps;
