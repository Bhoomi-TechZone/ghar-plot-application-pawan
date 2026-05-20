/**
 * Follow Up Sheet Screen
 * Displays follow-up tracking and management
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../constants/theme';
import CrossPlatformAlert from '../../utils/crossPlatformAlert';

const FollowUpSheetScreen = ({ navigation }) => {
  const [followUps, setFollowUps] = useState([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [customers, setCustomers] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    dateRange: '',
  });

  useEffect(() => {
    fetchFollowUps();
  }, []);

  // Mock follow-ups data if not available
  const mockFollowUps = followUps?.length ? followUps : [
    {
      id: 1,
      customerId: 'customer_1',
      title: 'Property Site Visit Follow-up',
      description: 'Follow up on yesterday\'s site visit for 2BHK apartment',
      status: 'pending',
      priority: 'high',
      dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      assignedTo: 'employee_123',
      createdAt: new Date().toISOString(),
      notes: 'Customer showed interest in the north-facing unit',
      lastContact: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    },
    {
      id: 2,
      customerId: 'customer_2',
      title: 'Loan Documentation Follow-up',
      description: 'Check on home loan approval status',
      status: 'in-progress',
      priority: 'medium',
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString(), // 3 days from now
      assignedTo: 'employee_456',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
      notes: 'Bank requested additional salary certificates',
      lastContact: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  // Filter follow-ups based on search and filters
  const filteredFollowUps = mockFollowUps.filter(followUp => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!followUp.title.toLowerCase().includes(query) &&
          !followUp.description.toLowerCase().includes(query)) {
        return false;
      }
    }

    if (filters.status && followUp.status !== filters.status) {
      return false;
    }

    if (filters.priority && followUp.priority !== filters.priority) {
      return false;
    }

    return true;
  });

  const handleFollowUpPress = (followUp) => {
    // Navigate to follow-up detail or edit screen
    console.log('Follow-up pressed:', followUp.id);
  };

  const handleUpdateStatus = async (followUpId, newStatus) => {
    try {
      if (updateFollowUp) {
        await updateFollowUp(followUpId, { status: newStatus });
      } else {
        CrossPlatformAlert.alert('Success', `Follow-up marked as ${newStatus}`);
      }
    } catch (error) {
      CrossPlatformAlert.alert('Error', 'Failed to update follow-up status');
    }
  };

  const handleAddFollowUp = () => {
    navigation.navigate('AddFollowUp');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#52C41A';
      case 'in-progress': return '#1890FF';
      case 'overdue': return '#FF4D4F';
      case 'pending': return '#FA8C16';
      case 'cancelled': return '#FF4D4F';
      default: return '#FA8C16'; // pending (fallback for undefined)
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#FF4D4F';
      case 'medium': return '#FA8C16';
      case 'low': return '#52C41A';
      default: return '#FA8C16'; // medium (fallback for undefined)
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntilDue = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filterConfig = {
    status: {
      type: 'select',
      label: 'Status',
      options: [
        { label: 'All', value: '' },
        { label: 'Pending', value: 'pending' },
        { label: 'In Progress', value: 'in-progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Overdue', value: 'overdue' },
      ],
    },
    priority: {
      type: 'select',
      label: 'Priority',
      options: [
        { label: 'All', value: '' },
        { label: 'High', value: 'high' },
        { label: 'Medium', value: 'medium' },
        { label: 'Low', value: 'low' },
      ],
    },
  };

  const renderFollowUpItem = ({ item }) => {
    const daysUntilDue = getDaysUntilDue(item.dueDate);
    const isOverdue = daysUntilDue < 0;
    const isDueSoon = daysUntilDue <= 2 && daysUntilDue >= 0;

    return (
      <TouchableOpacity style={styles.followUpCard} onPress={() => handleFollowUpPress(item)}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.followUpTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{(item.status || 'pending').toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.metaRow}>
            <View style={styles.priorityContainer}>
              <MaterialCommunityIcons
                name="flag"
                size={12}
                color={getPriorityColor(item.priority)}
              />
              <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                {(item.priority || 'medium').toUpperCase()}
              </Text>
            </View>
            
            <Text style={styles.dueDateText}>
              Due: {formatDate(item.dueDate)}
              {isOverdue && <Text style={styles.overdueText}> (Overdue)</Text>}
              {isDueSoon && <Text style={styles.dueSoonText}> (Due Soon)</Text>}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Notes */}
        {item.notes && (
          <View style={styles.notesContainer}>
            <MaterialCommunityIcons name="note-text" size={14} color={theme.colors.text.secondary} />
            <Text style={styles.notesText} numberOfLines={1}>
              {item.notes}
            </Text>
          </View>
        )}

        {/* Actions */}
        {item.status !== 'completed' && (
          <View style={styles.actionRow}>
            {item.status === 'pending' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.startButton]}
                onPress={() => handleUpdateStatus(item.id, 'in-progress')}
              >
                <MaterialCommunityIcons name="play" size={14} color="#fff" />
                <Text style={styles.actionButtonText}>Start</Text>
              </TouchableOpacity>
            )}
            
            {item.status === 'in-progress' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={() => handleUpdateStatus(item.id, 'completed')}
              >
                <MaterialCommunityIcons name="check" size={14} color="#fff" />
                <Text style={styles.actionButtonText}>Complete</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={[styles.actionButton, styles.editButton]}>
              <MaterialCommunityIcons name="pencil" size={14} color="#fff" />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="clipboard-list" size={64} color={theme.colors.text.secondary} />
      <Text style={styles.emptyText}>No Follow-ups Found</Text>
      <Text style={styles.emptySubtext}>
        {searchQuery || Object.values(filters).some(f => f)
          ? 'Try adjusting your search or filters'
          : 'Add follow-ups to track customer interactions'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchBarContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search follow-ups..."
            style={styles.searchBar}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <MaterialCommunityIcons name="filter" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Follow-ups List */}
      <FlatList
        data={filteredFollowUps}
        renderItem={renderFollowUpItem}
        keyExtractor={(item) => item.id?.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={followUpsLoading || false}
            onRefresh={fetchFollowUps}
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
      />

      <FloatingActionButton
        onPress={handleAddFollowUp}
        icon="clipboard-plus"
        label="Add Follow-up"
      />

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filterConfig={filterConfig}
        currentFilters={filters}
        onApplyFilters={setFilters}
        title="Filter Follow-ups"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchBarContainer: {
    flex: 1,
    marginRight: 12,
  },
  searchBar: {
    margin: 0,
  },
  filterButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  followUpCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  followUpTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginRight: 12,
    lineHeight: 22,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  dueDateText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  overdueText: {
    color: '#FF4D4F',
    fontWeight: '600',
  },
  dueSoonText: {
    color: '#FA8C16',
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    color: theme.colors.text.primary,
    lineHeight: 22,
    marginBottom: 10,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  notesText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginLeft: 8,
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    minHeight: 36,
  },
  startButton: {
    backgroundColor: '#1890FF',
    shadowColor: '#1890FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  completeButton: {
    backgroundColor: '#52C41A',
    shadowColor: '#52C41A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  editButton: {
    backgroundColor: '#722ED1',
    shadowColor: '#722ED1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default FollowUpSheetScreen;