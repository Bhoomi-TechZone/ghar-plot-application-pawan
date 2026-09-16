import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl,
  Dimensions,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { 
  getLeadsWithPagination,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  assignLeadToEmployee,
  updateLeadStatus,
  getLeadStats,
  searchLeads,
  bulkAssignLeads,
  getLeadConversionData,
} from '../../services/crmLeadsApi';
import { getAllEmployees } from '../../services/crmEmployeeManagementApi';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const { width: screenWidth } = Dimensions.get('window');

const EnhancedLeadManagementScreen = ({ navigation }) => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  
  // Selection & Bulk Operations
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  
  // Form Data
  const [editingLead, setEditingLead] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'website',
    status: 'new',
    priority: 'medium',
    notes: '',
    budget: '',
    requirements: '',
  });
  
  // Employees & Assignment
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  
  // Stats Data
  const [statsData, setStatsData] = useState(null);
  const [conversionData, setConversionData] = useState(null);
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Lead Status Options
  const statusOptions = [
    { label: 'All Status', value: 'all' },
    { label: 'New', value: 'new' },
    { label: 'Contacted', value: 'contacted' },
    { label: 'Qualified', value: 'qualified' },
    { label: 'Proposal', value: 'proposal' },
    { label: 'Negotiation', value: 'negotiation' },
    { label: 'Converted', value: 'converted' },
    { label: 'Lost', value: 'lost' },
  ];

  const priorityOptions = [
    { label: 'All Priority', value: 'all' },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
  ];

  const sourceOptions = [
    { label: 'All Sources', value: 'all' },
    { label: 'Website', value: 'website' },
    { label: 'Phone Call', value: 'phone' },
    { label: 'Referral', value: 'referral' },
    { label: 'Social Media', value: 'social' },
    { label: 'Advertisement', value: 'advertisement' },
    { label: 'Walk-in', value: 'walkin' },
  ];

  useEffect(() => {
    loadInitialData();
    
    // Animate on load
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (currentPage > 1) {
      fetchLeads();
    }
  }, [currentPage]);

  useEffect(() => {
    applyFilters();
  }, [leads, searchQuery, selectedStatus, selectedPriority, selectedSource]);

  const loadInitialData = async () => {
    await fetchLeads();
    await loadEmployees();
    await loadStats();
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      
      const response = await getLeadsWithPagination({
        page: currentPage,
        limit: 15,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        priority: selectedPriority !== 'all' ? selectedPriority : undefined,
        source: selectedSource !== 'all' ? selectedSource : undefined,
      });

      if (response && response.leads) {
        if (currentPage === 1) {
          setLeads(response.leads);
        } else {
          setLeads(prev => [...prev, ...response.leads]);
        }
        setTotalPages(response.totalPages || 1);
        setTotalLeads(response.totalLeads || 0);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      CrossPlatformAlert.alert('Error', 'Failed to load leads');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await getAllEmployees();
      if (response && response.employees) {
        setEmployees(response.employees);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadStats = async () => {
    try {
      const [stats, conversion] = await Promise.all([
        getLeadStats(),
        getLeadConversionData(),
      ]);
      
      setStatsData(stats);
      setConversionData(conversion);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...leads];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.phone?.includes(query) ||
        lead.notes?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(lead => lead.status === selectedStatus);
    }

    // Priority filter
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(lead => lead.priority === selectedPriority);
    }

    // Source filter
    if (selectedSource !== 'all') {
      filtered = filtered.filter(lead => lead.source === selectedSource);
    }

    setFilteredLeads(filtered);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      source: 'website',
      status: 'new',
      priority: 'medium',
      notes: '',
      budget: '',
      requirements: '',
    });
    setEditingLead(null);
  };

  const handleCreateLead = async () => {
    try {
      if (!formData.name.trim() || !formData.phone.trim()) {
        CrossPlatformAlert.alert('Error', 'Name and phone are required');
        return;
      }

      const newLead = await createLead(formData);
      if (newLead) {
        CrossPlatformAlert.alert('Success', 'Lead created successfully');
        setShowCreateModal(false);
        resetForm();
        fetchLeads();
      }
    } catch (error) {
      console.error('Error creating lead:', error);
      CrossPlatformAlert.alert('Error', error.message || 'Failed to create lead');
    }
  };

  const handleUpdateLead = async () => {
    try {
      if (!editingLead || !formData.name.trim()) {
        CrossPlatformAlert.alert('Error', 'Name is required');
        return;
      }

      const updatedLead = await updateLead(editingLead.id, formData);
      if (updatedLead) {
        CrossPlatformAlert.alert('Success', 'Lead updated successfully');
        setShowEditModal(false);
        resetForm();
        fetchLeads();
      }
    } catch (error) {
      console.error('Error updating lead:', error);
      CrossPlatformAlert.alert('Error', error.message || 'Failed to update lead');
    }
  };

  const handleDeleteLead = (leadId, leadName) => {
    CrossPlatformAlert.alert(
      'Confirm Delete',
      `Are you sure you want to delete lead "${leadName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLead(leadId);
              CrossPlatformAlert.alert('Success', 'Lead deleted successfully');
              fetchLeads();
            } catch (error) {
              console.error('Error deleting lead:', error);
              CrossPlatformAlert.alert('Error', error.message || 'Failed to delete lead');
            }
          },
        },
      ]
    );
  };

  const handleAssignLeads = async () => {
    if (selectedLeads.size === 0) {
      CrossPlatformAlert.alert('Error', 'Please select at least one lead');
      return;
    }
    
    if (!selectedEmployee) {
      CrossPlatformAlert.alert('Error', 'Please select an employee');
      return;
    }
    
    try {
      setAssignmentLoading(true);
      const leadIds = Array.from(selectedLeads);
      
      if (leadIds.length === 1) {
        await assignLeadToEmployee(leadIds[0], selectedEmployee);
      } else {
        await bulkAssignLeads({ leadIds, employeeId: selectedEmployee });
      }
      
      CrossPlatformAlert.alert('Success', `${leadIds.length} lead(s) assigned successfully`);
      setShowAssignModal(false);
      clearSelection();
      setSelectedEmployee('');
      fetchLeads();
    } catch (error) {
      console.error('Error assigning leads:', error);
      CrossPlatformAlert.alert('Error', error.message || 'Failed to assign leads');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleStatusUpdate = async (leadId, newStatus) => {
    try {
      await updateLeadStatus(leadId, newStatus);
      CrossPlatformAlert.alert('Success', 'Lead status updated successfully');
      fetchLeads();
    } catch (error) {
      console.error('Error updating status:', error);
      CrossPlatformAlert.alert('Error', error.message || 'Failed to update status');
    }
  };

  const toggleLeadSelection = (leadId) => {
    const newSelection = new Set(selectedLeads);
    if (newSelection.has(leadId)) {
      newSelection.delete(leadId);
    } else {
      newSelection.add(leadId);
    }
    setSelectedLeads(newSelection);
  };

  const selectAllLeads = () => {
    const allLeadIds = new Set(filteredLeads.map(lead => lead.id));
    setSelectedLeads(allLeadIds);
  };

  const clearSelection = () => {
    setSelectedLeads(new Set());
    setIsSelectionMode(false);
  };

  const enterSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedLeads(new Set());
  };

  const openEditModal = (lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      source: lead.source || 'website',
      status: lead.status || 'new',
      priority: lead.priority || 'medium',
      notes: lead.notes || '',
      budget: lead.budget?.toString() || '',
      requirements: lead.requirements || '',
    });
    setShowEditModal(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      new: '#3B82F6',
      contacted: '#F59E0B',
      qualified: '#8B5CF6',
      proposal: '#06B6D4',
      negotiation: '#EF4444',
      converted: '#10B981',
      lost: '#6B7280',
    };
    return colors[status] || '#6B7280';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: '#EF4444',
      medium: '#F59E0B',
      low: '#10B981',
    };
    return colors[priority] || '#6B7280';
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Not specified';
    return `₹${Number(amount).toLocaleString()}`;
  };

  const renderLeadCard = ({ item }) => {
    const isSelected = selectedLeads.has(item.id);
    
    return (
      <Animated.View
        style={[
          styles.leadCard,
          isSelected && styles.selectedCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            if (isSelectionMode) {
              toggleLeadSelection(item.id);
            }
          }}
          onLongPress={() => {
            if (!isSelectionMode) {
              enterSelectionMode();
              toggleLeadSelection(item.id);
            }
          }}
          activeOpacity={0.7}
        >
          {isSelectionMode && (
            <View style={styles.selectionIndicator}>
              <MaterialCommunityIcons 
                name={isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
                size={24} 
                color={isSelected ? "#10B981" : "#94A3B8"} 
              />
            </View>
          )}
          
          {/* Lead Header */}
          <View style={styles.leadHeader}>
            <View style={styles.leadInfo}>
              <Text style={styles.leadName}>{item.name}</Text>
              <Text style={styles.leadContact}>📧 {item.email || 'No email'}</Text>
              <Text style={styles.leadContact}>📞 {item.phone}</Text>
            </View>
            
            <View style={styles.leadBadges}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
                  {item.status?.toUpperCase()}
                </Text>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
                <Text style={[styles.badgeText, { color: getPriorityColor(item.priority) }]}>
                  {item.priority?.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Lead Details */}
          <View style={styles.leadDetails}>
            <Text style={styles.leadMeta}>💰 Budget: {formatCurrency(item.budget)}</Text>
            <Text style={styles.leadMeta}>📍 Source: {item.source}</Text>
            <Text style={styles.leadMeta}>👤 Assigned: {item.assignedEmployee || 'Unassigned'}</Text>
            <Text style={styles.leadMeta}>📅 Created: {new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>

          {item.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesText} numberOfLines={2}>{item.notes}</Text>
            </View>
          )}

          {/* Actions */}
          {!isSelectionMode && (
            <View style={styles.leadActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => openEditModal(item)}
              >
                <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                onPress={() => {
                  setSelectedLeads(new Set([item.id]));
                  setShowAssignModal(true);
                }}
              >
                <MaterialCommunityIcons name="account-plus" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Assign</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                onPress={() => handleDeleteLead(item.id, item.name)}
              >
                <MaterialCommunityIcons name="delete" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Lead Management</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              loadStats();
              setShowStatsModal(true);
            }}
          >
            <MaterialCommunityIcons name="chart-bar" size={20} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowFiltersModal(true)}
          >
            <MaterialCommunityIcons name="filter" size={20} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowCreateModal(true)}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads by name, email, or phone..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalLeads}</Text>
          <Text style={styles.statLabel}>Total Leads</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{selectedLeads.size}</Text>
          <Text style={styles.statLabel}>Selected</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{filteredLeads.length}</Text>
          <Text style={styles.statLabel}>Filtered</Text>
        </View>
      </View>

      {/* Selection Mode Actions */}
      {isSelectionMode && (
        <View style={styles.selectionActions}>
          <TouchableOpacity 
            style={styles.selectionButton}
            onPress={selectAllLeads}
          >
            <MaterialCommunityIcons name="checkbox-multiple-marked" size={20} color="#2563EB" />
            <Text style={styles.selectionButtonText}>Select All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.selectionButton}
            onPress={() => setShowAssignModal(true)}
            disabled={selectedLeads.size === 0}
          >
            <MaterialCommunityIcons name="account-plus" size={20} color="#10B981" />
            <Text style={styles.selectionButtonText}>Assign</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.selectionButton}
            onPress={clearSelection}
          >
            <MaterialCommunityIcons name="close" size={20} color="#64748B" />
            <Text style={styles.selectionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Leads List */}
      {loading && currentPage === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading leads...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLeads}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLeadCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                setCurrentPage(1);
                fetchLeads();
              }}
              colors={['#2563EB']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-search" size={64} color="#CBD5E1" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No leads found for your search' : 'No leads available'}
              </Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Text style={styles.createButtonText}>Create First Lead</Text>
              </TouchableOpacity>
            </View>
          }
          onEndReached={() => {
            if (!loading && currentPage < totalPages) {
              setCurrentPage(prev => prev + 1);
            }
          }}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            disabled={currentPage === 1}
            style={[styles.pageButton, currentPage === 1 && styles.disabledButton]}
            onPress={() => {
              setCurrentPage(1);
              fetchLeads();
            }}
          >
            <Text style={styles.pageButtonText}>Page {currentPage} of {totalPages}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create/Edit Modal will go here... */}
      {/* Assignment Modal will go here... */}
      {/* Stats Modal will go here... */}
      {/* Filters Modal will go here... */}
      
    </View>
  );
};

export default EnhancedLeadManagementScreen;

// Styles will be similar to UserManagementScreen but optimized for leads
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header styles
  header: {
    backgroundColor: '#1E293B',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search styles
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    paddingVertical: 4,
  },

  // Stats styles
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // Selection styles
  selectionActions: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  selectionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  selectionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },

  // List styles
  listContainer: {
    padding: 16,
  },
  leadCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },

  // Lead card content
  leadHeader: {
    padding: 16,
    paddingBottom: 12,
  },
  leadInfo: {
    marginBottom: 12,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  leadContact: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  leadBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  leadDetails: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  leadMeta: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },

  notesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },

  leadActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Loading & Empty states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Pagination
  pagination: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  pageButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#CBD5E1',
  },
  pageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});