import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
  Linking,
  TextInput,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getClientReceivedInquiriesAPI } from '../services/propertyapi';
import { BASE_URL } from '../services/api';
import CrossPlatformAlert from '../utils/crossPlatformAlert';

const ClientInquiriesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const statusBarTop = insets.top > 0 ? insets.top : Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [filteredInquiries, setFilteredInquiries] = useState([]);
  const [canReceiveInquiries, setCanReceiveInquiries] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInquiries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getClientReceivedInquiriesAPI();
      console.log('📬 getClientReceivedInquiriesAPI response:', res);

      if (res && res.canReceiveInquiries === false) {
        setCanReceiveInquiries(false);
        setStatusMessage(res.message || 'Inquiries are managed directly by Admin for your account.');
        setInquiries([]);
        setFilteredInquiries([]);
      } else {
        setCanReceiveInquiries(true);
        const list = (res && res.data) || [];
        setInquiries(list);
        setFilteredInquiries(list);
      }
    } catch (error) {
      console.error('Failed to load received inquiries:', error);
      CrossPlatformAlert.alert('Error', error?.message || 'Failed to load received inquiries.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInquiries();
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredInquiries(inquiries);
      return;
    }
    const q = text.toLowerCase();
    const filtered = inquiries.filter((inq) => {
      const propId = (inq.customPropertyId || inq.propertyId?.customPropertyId || '').toLowerCase();
      const name = (inq.fullName || inq.name || inq.buyerId?.fullName || '').toLowerCase();
      const phone = (inq.phone || inq.buyerId?.phone || '').toLowerCase();
      const title = (inq.propertyId?.title || inq.propertyId?.propertyLocation || '').toLowerCase();
      return propId.includes(q) || name.includes(q) || phone.includes(q) || title.includes(q);
    });
    setFilteredInquiries(filtered);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateStr);
    }
  };

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) {
      CrossPlatformAlert.alert('Notice', 'Phone number not available');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      CrossPlatformAlert.alert('Error', 'Unable to initiate call');
    });
  };

  const handleEmail = (emailAddr) => {
    if (!emailAddr) {
      CrossPlatformAlert.alert('Notice', 'Email address not available');
      return;
    }
    Linking.openURL(`mailto:${emailAddr}`).catch(() => {
      CrossPlatformAlert.alert('Error', 'Unable to open mail client');
    });
  };

  const renderInquiryCard = ({ item }) => {
    const propId = item.customPropertyId || item.propertyId?.customPropertyId || 'N/A';
    const propTitle = item.propertyId?.title || item.propertyId?.propertyLocation || 'Property Inquiry';
    const buyerName = item.fullName || item.name || item.buyerId?.fullName || 'Interested Buyer';
    const buyerPhone = item.phone || item.buyerId?.phone || '';
    const buyerEmail = item.email || item.buyerId?.email || '';
    const buyerMessage = item.message || item.description || item.inquiryDetails || '';

    // Property first image
    let photoUri = null;
    if (item.propertyId?.photosAndVideo && item.propertyId.photosAndVideo.length > 0) {
      const first = item.propertyId.photosAndVideo[0];
      photoUri = first.startsWith('http') ? first : `${BASE_URL}/${first.replace(/^(\.\/|\/)/, '')}`;
    }

    return (
      <View style={styles.card}>
        {/* Top Header: Property ID & Date */}
        <View style={styles.cardHeader}>
          <View style={styles.propBadgeContainer}>
            <MaterialCommunityIcons name="home-analytics" size={16} color="#0284c7" />
            <Text style={styles.propBadgeText}>Property ID: {propId}</Text>
          </View>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* Property Brief */}
        <View style={styles.propSection}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.propThumb} resizeMode="cover" />
          ) : (
            <View style={[styles.propThumb, styles.propThumbPlaceholder]}>
              <Icon name="business" size={24} color="#94a3b8" />
            </View>
          )}
          <View style={styles.propDetails}>
            <Text style={styles.propTitle} numberOfLines={1}>
              {propTitle}
            </Text>
            {item.propertyId?.price ? (
              <Text style={styles.propPrice}>₹ {Number(item.propertyId.price).toLocaleString('en-IN')}</Text>
            ) : null}
            {item.propertyId?.propertyLocation ? (
              <Text style={styles.propLocation} numberOfLines={1}>
                📍 {item.propertyId.propertyLocation}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Buyer Info */}
        <View style={styles.buyerSection}>
          <View style={styles.avatarCircle}>
            <Icon name="person" size={18} color="#0284c7" />
          </View>
          <View style={styles.buyerDetails}>
            <Text style={styles.buyerName}>{buyerName}</Text>
            {buyerPhone ? <Text style={styles.buyerContact}>📞 {buyerPhone}</Text> : null}
            {buyerEmail ? <Text style={styles.buyerContact}>✉️ {buyerEmail}</Text> : null}
          </View>
        </View>

        {/* Message */}
        {buyerMessage ? (
          <View style={styles.messageBox}>
            <Icon name="chatbubble-ellipses-outline" size={14} color="#64748b" style={{ marginTop: 2 }} />
            <Text style={styles.messageText}>"{buyerMessage}"</Text>
          </View>
        ) : null}

        {/* Action Buttons: Call / Email */}
        <View style={styles.actionRow}>
          {buyerPhone ? (
            <TouchableOpacity style={styles.callButton} onPress={() => handleCall(buyerPhone)} activeOpacity={0.8}>
              <Icon name="call" size={16} color="#fff" />
              <Text style={styles.buttonText}>Call Buyer</Text>
            </TouchableOpacity>
          ) : null}

          {buyerEmail ? (
            <TouchableOpacity style={styles.emailButton} onPress={() => handleEmail(buyerEmail)} activeOpacity={0.8}>
              <Icon name="mail" size={16} color="#0284c7" />
              <Text style={[styles.buttonText, { color: '#0284c7' }]}>Email</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: statusBarTop }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>Received Inquiries</Text>
          <Text style={styles.headerSubtitle}>Buyer queries on your properties</Text>
        </View>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh}>
          <Icon name="refresh" size={20} color="#0284c7" />
        </TouchableOpacity>
      </View>

      {/* Disabled by Admin Banner */}
      {!canReceiveInquiries && (
        <View style={styles.disabledBanner}>
          <MaterialCommunityIcons name="shield-lock-outline" size={32} color="#b45309" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.disabledTitle}>Managed by Admin</Text>
            <Text style={styles.disabledText}>
              Inquiries for your properties are currently managed directly by Admin. You do not need to follow up manually; our dedicated team is handling inquiries on your behalf.
            </Text>
          </View>
        </View>
      )}

      {/* Search Input (Only when inquiries allowed) */}
      {canReceiveInquiries && inquiries.length > 0 && (
        <View style={styles.searchBox}>
          <Icon name="search-outline" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Property ID, buyer, or phone..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Icon name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading inquiries...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredInquiries}
          keyExtractor={(item, index) => item._id || item.id || `inq_${index}`}
          renderItem={renderInquiryCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284c7']} />}
          ListEmptyComponent={
            canReceiveInquiries ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="chat-question-outline" size={64} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No Inquiries Yet</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? 'No inquiries match your search filter.'
                    : 'When buyers submit inquiries on your posted properties, they will appear right here.'}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

export default ClientInquiriesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  refreshIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
  },
  disabledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    margin: 16,
    borderRadius: 12,
    padding: 14,
  },
  disabledTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  disabledText: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 18,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  propBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  propBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369a1',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  propSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  propThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  propThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  propDetails: {
    flex: 1,
  },
  propTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  propPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 2,
  },
  propLocation: {
    fontSize: 11,
    color: '#64748b',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 12,
  },
  buyerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyerDetails: {
    flex: 1,
  },
  buyerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  buyerContact: {
    fontSize: 12,
    color: '#475569',
    marginTop: 1,
  },
  messageBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  messageText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 8,
  },
  emailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
});

