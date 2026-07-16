import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  TextInput,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as crmAlertApi from '../../services/crmAlertApi';
import AlertNotificationService from '../../../services/AlertNotificationService';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';
import { formatDateToIST, formatTimeToIST } from '../../../utils/timezoneHelper'; // 🔥 Import IST helpers
import AdminNotificationPopup from '../../../components/AdminNotificationPopup';

const AlertsScreen = ({ navigation, route }) => {
  const filterCategory = route?.params?.filterCategory || 'alert'; // 'alert' or 'reminder'
  const screenTitle = filterCategory === 'reminder' ? 'My Reminders' : 'Alert Management';

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [pinnedIds, setPinnedIds] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupData, setPopupData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAlerts({}, true);
    setRefreshing(false);
  };

  // Refresh list every time screen comes into focus (e.g. after creating a new alert)
  useFocusEffect(
    useCallback(() => {
      const loadPins = async () => {
        try {
          const stored = await AsyncStorage.getItem(`pinned_alerts_${filterCategory}`);
          if (stored) {
            setPinnedIds(JSON.parse(stored));
          } else {
            setPinnedIds([]);
          }
        } catch (e) {
          console.error('Failed to load pinned alerts', e);
        }
      };
      loadPins();
      fetchAlerts();
    }, [filterCategory])
  );

  const fetchAlerts = async (params = {}, isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      console.log('📡 Fetching alerts with params:', params);
      const response = await crmAlertApi.getSystemAlerts(params);
      console.log('📥 Raw response:', response);
      const data = response?.alerts || response?.data || [];
      console.log('✅ Fetched alerts:', data.length);
      const allAlerts = Array.isArray(data) ? data : [];

      let filtered;
      if (filterCategory === 'reminder') {
        // My Reminders: show only items tagged as 'reminder'
        filtered = allAlerts.filter(item => item.category === 'reminder');
      } else {
        // Alerts: show items tagged as 'alert' OR items with no category (old data)
        filtered = allAlerts.filter(item => !item.category || item.category === 'alert');
      }
      console.log(`📊 Filtered ${filtered.length} items for category: ${filterCategory}`);
      setAlerts(filtered);
    } catch (e) {
      console.error('❌ Error fetching alerts:', e);
      console.error('❌ Error message:', e.message);
      console.error('❌ Error stack:', e.stack);
      CrossPlatformAlert.alert('Error', `Failed to fetch alerts: ${e.message}`);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    // 🔥 Use IST helper to convert UTC to IST for display
    return formatDateToIST(iso);
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    // 🔥 Use IST helper to convert UTC to IST for display
    return formatTimeToIST(iso);
  };

  // 🔥 NEW: Format Date object to YYYY-MM-DD for API
  const formatDateForAPI = (dateObj) => {
    if (!dateObj) return '';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleFilter = () => {
    const params = {};
    // 🔥 FIX: Use formatDateForAPI instead of formatDate for API params
    if (startDate) params.startDate = formatDateForAPI(startDate);
    if (endDate) params.endDate = formatDateForAPI(endDate);
    console.log('🔍 Filter params:', params);
    fetchAlerts(params);
  };

  const clearFilter = () => {
    setStartDate(null);
    setEndDate(null);
    setSearchQuery('');
    fetchAlerts();
  };

  const handleDelete = (id) => {
    CrossPlatformAlert.alert('Delete Alert', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await crmAlertApi.deleteSystemAlert(id);
            await AlertNotificationService.cancelAlert(id);
            fetchAlerts();
          } catch (error) {
            CrossPlatformAlert.alert('Error', 'Failed to delete alert');
          }
        },
      },
    ]);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;

    CrossPlatformAlert.alert(
      'Delete Selected',
      `Are you sure you want to delete ${selectedIds.length} items?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await crmAlertApi.deleteMultipleAlerts(selectedIds);

              // Cancel local notifications for each selected item
              for (const id of selectedIds) {
                try { await AlertNotificationService.cancelAlert(id); } catch (_) { }
              }

              setIsSelectionMode(false);
              setSelectedIds([]);
              fetchAlerts();
            } catch (error) {
              CrossPlatformAlert.alert('Error', 'Failed to delete selected alerts');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAll = () => {
    CrossPlatformAlert.alert(
      'Delete All',
      'This will permanentally delete ALL alerts in this category. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete ALL',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await crmAlertApi.deleteAllAlerts(filterCategory);

              // Cancel all local alerts from service
              try { await AlertNotificationService.cancelAllAlerts(); } catch (_) { }

              fetchAlerts();
            } catch (error) {
              CrossPlatformAlert.alert('Error', 'Failed to delete all alerts');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getItemCategory = (item) => item?.category || (filterCategory === 'reminder' ? 'reminder' : 'alert');

  const handleEdit = (alert) => {
    const itemId = alert._id || alert.id || alert.alertId;
    const itemCategory = getItemCategory(alert);
    console.log('📝 Editing notification:', itemId, itemCategory);

    if (itemCategory === 'reminder') {
      navigation.navigate('EditReminder', {
        reminderId: itemId,
        clientName: alert.clientName || alert.title || 'Reminder',
        originalMessage: alert.note || alert.reason || alert.message || '',
        enquiryId: alert.enquiryId,
        phone: alert.phone,
        location: alert.location,
        reminderTitle: alert.title,
        isAdmin: true,
        scheduledDateTime: alert.nextScheduledAt || alert.reminderDateTime || alert.scheduledDateTime || `${alert.date} ${alert.time}`,
        isRepeating: !!(alert.isRepeating || alert.repeatDaily || (alert.repeatFrequency && alert.repeatFrequency !== 'none')),
        repeatType: alert.repeatType || alert.repeatFrequency || (alert.repeatDaily ? 'daily' : 'none'),
        customIntervalMinutes: alert.repeatMetadata?.customIntervalMinutes ||
          alert.customIntervalMinutes ||
          alert.customRepeatMinutes ||
          alert.repeatInterval ||
          '',
      });
      return;
    }

    // 🔥 Extract customIntervalMinutes from all possible locations
    const customMins = alert.repeatMetadata?.customIntervalMinutes ||
      alert.customIntervalMinutes ||
      alert.customRepeatMinutes ||
      alert.repeatInterval ||
      '';

    navigation.navigate('EditAlert', {
      alertId: itemId,
      originalTitle: alert.title,
      originalReason: alert.reason,
      originalDate: alert.date,
      originalTime: alert.time,
      repeatDaily: alert.repeatDaily,
      // 🔥 Pass the next scheduled date so EditAlert shows the correct upcoming date
      scheduledDateTime: alert.nextScheduledAt || alert.reminderDateTime || `${alert.date} ${alert.time}`,
      repeatFrequency: alert.repeatFrequency || (alert.repeatDaily ? 'daily' : 'none'),
      // 🔥 FIX: Pass existing repeat configuration to preserve it
      customIntervalMinutes: customMins,
      repeatMetadata: alert.repeatMetadata, // Pass complete repeatMetadata object
    });
  };

  const openNotificationPopup = (item) => {
    setPopupData({
      _id: item._id || item.id,
      alertId: item._id || item.id,
      id: item._id || item.id,
      category: item.category || filterCategory,
      title: item.title || item.reason || 'Notification',
      clientName: item.clientName || item.employee?.name || '',
      reason: item.reason || item.note || '',
      note: item.note,
      message: item.message,
      date: item.date,
      time: item.time,
      reminderDateTime: item.reminderDateTime,
      scheduledDateTime: item.scheduledDateTime,
      scheduledAt: item.scheduledDateTime || `${item.date}T${item.time}`,
      nextScheduledAt: item.nextScheduledAt,
      createdAt: item.createdAt || item.date,
      repeatDaily: item.repeatDaily,
      repeatFrequency: item.repeatFrequency,
      repeatType: item.repeatType,
      isRepeating: item.isRepeating,
      repeatMetadata: item.repeatMetadata,
      customIntervalMinutes: item.customIntervalMinutes,
      type: filterCategory === 'reminder' ? 'admin_reminder' : 'alert',
    });
    setPopupVisible(true);
  };

  const handleTogglePin = async (id) => {
    if (isSelectionMode) {
      handleSelect(id);
      return;
    }

    let newPinned;
    if (pinnedIds.includes(id)) {
      newPinned = pinnedIds.filter(pid => pid !== id);
    } else {
      newPinned = [...pinnedIds, id];
    }
    setPinnedIds(newPinned);
    try {
      await AsyncStorage.setItem(`pinned_alerts_${filterCategory}`, JSON.stringify(newPinned));
    } catch (e) { console.error('Error saving pins', e); }
  };

  const handleSelect = (id) => {
    if (selectedIds.includes(id)) {
      const remaining = selectedIds.filter(sid => sid !== id);
      setSelectedIds(remaining);
      if (remaining.length === 0) setIsSelectionMode(false);
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const startSelection = (id) => {
    setIsSelectionMode(true);
    setSelectedIds([id]);
  };

  /* ================= MOBILE CARD ================= */
  const renderRow = ({ item }) => {
    const created = item.createdAt || item.date;
    const itemId = item._id || item.id;
    const isPinned = pinnedIds.includes(itemId);
    const isSelected = selectedIds.includes(itemId);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => startSelection(itemId)}
        onPress={() => isSelectionMode ? handleSelect(itemId) : openNotificationPopup(item)}
        style={[
          styles.alertCard,
          isPinned && styles.alertCardPinned,
          isSelected && styles.alertCardSelected
        ]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isSelectionMode && (
              <Icon
                name={isSelected ? "checkbox" : "square-outline"}
                size={20}
                color={isSelected ? "#2563eb" : "#94a3b8"}
                style={{ marginRight: 10 }}
              />
            )}
            <Text style={[styles.cardDate, { marginBottom: 0 }]}>
              {formatDate(created)} • {formatTime(created)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isPinned && <Icon name="pin" size={16} color="#f59e0b" style={{ marginRight: 8 }} />}
            <View
              style={[
                styles.badge,
                { marginRight: 0 },
                item.isActive ? styles.badgeActive : styles.badgeInactive,
              ]}
            >
              <Text style={styles.badgeText}>
                {item.isActive ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title || item.reason}
        </Text>

        {item.title && (
          <Text style={styles.cardReason} numberOfLines={2}>
            {item.reason}
          </Text>
        )}

        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              (item.repeatFrequency && item.repeatFrequency !== 'none') || item.repeatDaily ? styles.badgeYes : styles.badgeNo,
            ]}
          >
            <Text style={styles.badgeText}>
              {(() => {
                const prefix = 'REPEAT: ';
                // Check all possible minute fields including nested repeatMetadata
                const mins = item.repeatMetadata?.customIntervalMinutes ||
                  item.customIntervalMinutes ||
                  item.repeatInterval ||
                  item.customRepeatMinutes;

                if (item.repeatFrequency && item.repeatFrequency !== 'none') {
                  const freq = item.repeatFrequency.toLowerCase();
                  if (freq === 'custom' || !!mins) {
                    return mins ? `${prefix}${mins} MINS` : `${prefix}CUSTOM`;
                  }
                  return `${prefix}${freq.toUpperCase()}`;
                }

                if (item.repeatDaily) return `${prefix}DAILY`;
                if (mins) return `${prefix}${mins} MINS`;

                return `${prefix}NO`;
              })()}
            </Text>
          </View>

          {item.time && (
            <View style={[styles.badge, { backgroundColor: '#e0f2fe' }]}>
              <Text style={styles.badgeText}>SCHEDULED: {formatTime(item.scheduledDateTime || `${item.date}T${item.time}`)}</Text>
            </View>
          )}

        </View>

        {item.nextScheduledAt && (
          <View style={[styles.badgeRow, { marginBottom: 10 }]}>
            <View style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
              <Text style={styles.badgeText}>
                NEXT: {formatDate(item.nextScheduledAt)} • {formatTime(item.nextScheduledAt)}
              </Text>
            </View>
          </View>
        )}

        {!isSelectionMode && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: isPinned ? '#f59e0b' : '#64748b' }]}
              onPress={() => handleTogglePin(itemId)}
            >
              <Icon name={isPinned ? "pin-outline" : "pin"} size={16} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => handleEdit(item)}
            >
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item._id || item.id)}
            >
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.topRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{isSelectionMode ? `${selectedIds.length} Selected` : screenTitle}</Text>
            {isSelectionMode && (
              <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedIds([]); }}>
                <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '700', marginTop: 2 }}>Cancel Selection</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ flexDirection: 'row' }}>
          {isSelectionMode ? (
            <TouchableOpacity
              style={[styles.deleteBtn, { paddingHorizontal: 12, paddingVertical: 8 }]}
              onPress={handleDeleteSelected}
            >
              <Icon name="trash-outline" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: '#64748b', marginRight: 10, paddingHorizontal: 12, paddingVertical: 8 }]}
                onPress={handleDeleteAll}
              >
                <Text style={styles.createBtnText}>Delete All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => navigation.navigate('CreateAlert', { forceCategory: filterCategory })}
              >
                <Text style={styles.createBtnText}>
                  {filterCategory === 'reminder' ? '+ New' : '+ New'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Filter */}
      <AdminNotificationPopup
        visible={popupVisible}
        onClose={() => setPopupVisible(false)}
        {...popupData}
        onEdit={() => {
          setPopupVisible(false);
          if (!popupData) return;
          handleEdit(popupData);
        }}
      />
      <View style={styles.filterCard}>
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Search</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.inputRow}>
          <View style={styles.inputCol}>
            <Text style={styles.label}>Start Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowStartPicker(true)}
            >
              <Text>
                {startDate ? formatDate(startDate) : 'dd-mm-yyyy'}
              </Text>
              <Icon name="calendar-outline" size={18} />
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, d) => {
                  setShowStartPicker(false);
                  if (d) setStartDate(d);
                }}
              />
            )}
          </View>

          <View style={styles.inputCol}>
            <Text style={styles.label}>End Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowEndPicker(true)}
            >
              <Text>{endDate ? formatDate(endDate) : 'dd-mm-yyyy'}</Text>
              <Icon name="calendar-outline" size={18} />
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, d) => {
                  setShowEndPicker(false);
                  if (d) setEndDate(d);
                }}
              />
            )}
          </View>
        </View>

        <View style={styles.filterActions}>
          <TouchableOpacity style={styles.filterBtn} onPress={handleFilter}>
            <Text style={styles.filterText}>Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearBtn} onPress={clearFilter}>
            <Text style={styles.filterText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          data={[...alerts]
            .filter(item => {
              if (!searchQuery) return true;
              const title = item.title || item.reason || '';
              return title.toLowerCase().includes(searchQuery.toLowerCase());
            })}
          renderItem={renderRow}
          keyExtractor={(i) => i._id || i.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 40 }}>
              No alerts found
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default AlertsScreen;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7fb' },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 16,
    alignItems: 'center',
  },

  title: { fontSize: 18, fontWeight: '700' },

  createBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },

  createBtnText: { color: '#fff', fontWeight: '700' },

  filterCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    elevation: 2,
  },

  searchInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#f9fafb',
    color: '#000',
  },

  inputRow: { flexDirection: 'row' },

  inputCol: { flex: 1, marginRight: 8 },

  label: { fontSize: 12, color: '#6b7280', marginBottom: 6 },

  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
  },

  filterActions: {
    flexDirection: 'row',
    marginTop: 12,
  },

  filterBtn: {
    backgroundColor: '#0ea5e9',
    padding: 10,
    borderRadius: 6,
    marginRight: 8,
  },

  clearBtn: {
    backgroundColor: '#ef4444',
    padding: 10,
    borderRadius: 6,
  },

  filterText: { color: '#fff', fontWeight: '700' },

  /* CARD */
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
  },

  cardDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 6,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    color: '#111827',
  },

  cardReason: {
    fontSize: 14,
    marginBottom: 10,
    color: '#6b7280',
    fontStyle: 'italic',
  },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },

  badgeYes: { backgroundColor: '#dcfce7' },
  badgeNo: { backgroundColor: '#fee2e2' },
  badgeActive: { backgroundColor: '#bbf7d0' },
  badgeInactive: { backgroundColor: '#e5e7eb' },

  badgeText: { fontSize: 12, fontWeight: '700' },

  alertCardPinned: {
    borderColor: '#f59e0b',
    borderWidth: 1.5,
    backgroundColor: '#fffbeb',
  },

  alertCardSelected: {
    borderColor: '#2563eb',
    borderWidth: 1.5,
    backgroundColor: '#eff6ff',
  },

  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  editBtn: {
    backgroundColor: '#2563eb',
    padding: 10,
    borderRadius: 6,
    marginRight: 10,
  },

  deleteBtn: {
    backgroundColor: '#ef4444',
    padding: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionText: { color: '#fff', fontWeight: '700' },
});
