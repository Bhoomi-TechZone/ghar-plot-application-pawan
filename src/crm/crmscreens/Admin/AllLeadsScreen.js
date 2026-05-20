import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import * as crmLeadsApi from '../../services/crmLeadsApi';

const AllLeadsScreen = ({ navigation }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching leads...');
      const res = await crmLeadsApi.getAllLeadsAlternative();
      console.log('📦 Leads response:', res);
      
      // Backend returns data in data.data.assignments
      const leadsData = res?.data?.data?.assignments || res?.data?.assignments || res?.data || [];
      console.log('✅ Leads data:', leadsData);
      
      setLeads(leadsData);
    } catch (error) {
      console.error('❌ Error fetching leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredLeads = leads.filter(l => {
    const enquiry = l.enquiry || {};
    const clientName = enquiry.fullName || enquiry.name || '';
    const phone = enquiry.phone || enquiry.mobile || '';
    const employeeName = l.employeeId?.name || '';
    
    const searchLower = search.toLowerCase();
    return (
      clientName.toLowerCase().includes(searchLower) ||
      phone.includes(searchLower) ||
      employeeName.toLowerCase().includes(searchLower)
    );
  });

  const StatCard = ({ title, value }) => (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const renderLeadCard = ({ item, index }) => {
    const enquiry = item.enquiry || {};
    const employeeName = item.employeeId?.name || 'Unassigned';
    const clientName = enquiry.fullName || enquiry.name || 'N/A';
    const phone = enquiry.phone || enquiry.mobile || 'N/A';
    const priority = item.priority || 'medium';
    const status = item.status || 'pending';

    const priorityColor = priority === 'high' ? '#ef4444' : priority === 'medium' ? '#f59e0b' : '#6b7280';
    const statusColor = status === 'active' ? '#10b981' : status === 'completed' ? '#6366f1' : '#6b7280';

    return (
      <View style={styles.leadCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardNumber}>#{index + 1}</Text>
            <View style={styles.typeBadge}>
              <Icon name="document-text" size={12} color="#3b82f6" />
              <Text style={styles.typeText}>Enquiry Lead</Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20', borderColor: priorityColor }]}>
              <Text style={[styles.priorityText, { color: priorityColor }]}>
                {priority.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Icon name="person" size={16} color="#6b7280" />
            <Text style={styles.infoLabel}>Client:</Text>
            <Text style={styles.infoValue}>{clientName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Icon name="call" size={16} color="#6b7280" />
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{phone}</Text>
          </View>

          <View style={styles.infoRow}>
            <Icon name="people" size={16} color="#6b7280" />
            <Text style={styles.infoLabel}>Employee:</Text>
            <Text style={styles.infoValue}>{employeeName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Icon name="checkmark-circle" size={16} color="#6b7280" />
            <Text style={styles.infoLabel}>Status:</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.actionBtn}>
            <Icon name="eye-outline" size={18} color="#3b82f6" />
            <Text style={styles.actionText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Icon name="create-outline" size={18} color="#10b981" />
            <Text style={[styles.actionText, { color: '#10b981' }]}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#3b82f6" 
        translucent={false}
      />
      
      {/* HEADER */}
      <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>All Leads</Text>
            <Text style={styles.headerSub}>Manage & track all leads</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard title="TOTAL" value={leads.length} />
          <StatCard title="ENQUIRY" value={leads.length} />
          <StatCard title="CLIENT" value={0} />
        </View>
      </LinearGradient>

      {/* SEARCH */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#9ca3af" />
          <TextInput
            placeholder="Search by name, phone..."
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Icon name="filter" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* LEADS LIST */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading leads...</Text>
        </View>
      ) : filteredLeads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="folder-open-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No leads found</Text>
          <Text style={styles.emptySubtext}>Start by assigning leads to employees</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLeads}
          renderItem={renderLeadCard}
          keyExtractor={(item, i) => i.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => {
                setRefreshing(true);
                fetchLeads();
              }}
              colors={['#3b82f6']}
              tintColor="#3b82f6"
            />
          }
        />
      )}
    </View>
  );
};

export default AllLeadsScreen;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f3f4f6',
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: { 
    color: '#fff', 
    fontSize: 22, 
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSub: { 
    color: 'rgba(255,255,255,0.8)', 
    fontSize: 13,
  },

  statsRow: { 
    flexDirection: 'row', 
    marginTop: 8,
    justifyContent: 'space-between',
  },
  statBox: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: '800',
    marginBottom: 4,
  },
  statTitle: { 
    color: 'rgba(255,255,255,0.9)', 
    fontSize: 11,
    fontWeight: '600',
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 8,
    fontSize: 14,
    color: '#1f2937',
  },
  filterBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },

  // List
  listContainer: {
    padding: 16,
  },

  // Lead Card
  leadCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
  },
  cardRight: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
  },

  cardBody: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
    width: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  cardFooter: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },

  // Loading & Empty
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
});
