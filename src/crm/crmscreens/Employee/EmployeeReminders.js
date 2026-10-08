import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
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
import { formatDateToIST, formatTimeToIST } from '../../../utils/timezoneHelper';
import AdminNotificationPopup from '../../../components/AdminNotificationPopup';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EmployeeReminders = ({ navigation, route, openDrawer }) => {
  const insets = useSafeAreaInsets();
  const statusBarTop = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0
  );
  const filterCategory = route?.params?.filterCategory || 'reminder'; // Default to 'reminder' for employee reminders
  const screenTitle = 'My Reminders';

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

  // Refresh list every time screen comes into focus
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
      console.log('Fetching employee reminders with params:', params);
      const response = await crmAlertApi.getSystemAlerts(params);
      console.log('Raw response:', response);
      const data = response?.alerts || response?.data || [];
      console.log('Fetched alerts/reminders:', data.length);
      const allAlerts = Array.isArray(data) ? data : [];

      let filtered;
      if (filterCategory === 'reminder') {
        // My Reminders: show items tagged as 'reminder'
        filtered = allAlerts.filter(item => item.category === 'reminder');
      } else {
        filtered = allAlerts.filter(item => !item.category || item.category === 'alert');
      }
      console.log(`Filtered ${filtered.length} items for category: ${filterCategory}`);
      setAlerts(filtered);
    } catch (e) {
      console.error('Error fetching employee reminders:', e);
      CrossPlatformAlert.alert('Error', `Failed to fetch reminders: ${e.message}`);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Calculate next scheduled datetime for display on card badge
  const getNextScheduledDisplay = (item) => {
    try {
      if (!item) return null;

      const rawFreq = String(item.repeatFrequency || '').toLowerCase();
      const customMins = parseInt(
        item.repeatMetadata?.customIntervalMinutes ||
        item.customIntervalMinutes ||
        item.customRepeatMinutes ||
        item.repeatInterval ||
        0
      );

      const isCustom = rawFreq === 'custom' || rawFreq === '1 min' || rawFreq === '1_min' || customMins > 0;
      const effectiveMins = (rawFreq === '1 min' || rawFreq === '1_min') ? 1 : (customMins || 1);

      // 1. If backend already computed scheduledDateTime or nextScheduledAt, use it
      const targetIso = item.nextScheduledAt || item.scheduledDateTime;
      if (targetIso) {
        const sDate = new Date(targetIso);
        if (!isNaN(sDate.getTime())) {
          const nowMs = Date.now();
          let nextMs = sDate.getTime();

          if (isCustom && nextMs <= nowMs) {
            const intervalMs = effectiveMins * 60 * 1000;
            while (nextMs <= nowMs) {
              nextMs += intervalMs;
            }
          }

          const nextDate = new Date(nextMs);
          const dateStr = nextDate.toLocaleDateString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit', month: '2-digit', year: 'numeric',
          });
          const timeStr = nextDate.toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: 'numeric', minute: '2-digit', hour12: true,
          }).toLowerCase();
          return `${dateStr} • ${timeStr}`;
        }
      }

      const dateStr = item.date;
      const timeStr = item.time;
      if (!dateStr || !timeStr) return null;

      const datePart = String(dateStr).split('T')[0];
      const dateMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!dateMatch) return null;

      let year = Number(dateMatch[1]);
      let month = Number(dateMatch[2]);
      let day = Number(dateMatch[3]);

      const timeMatch = String(timeStr).match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) return null;

      const hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2]);

      if (isCustom) {
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        const baseMs = Date.UTC(year, month - 1, day, hours, minutes, 0) - istOffsetMs;
        const intervalMs = effectiveMins * 60 * 1000;
        const nowMs = Date.now();
        let nextMs = baseMs;
        while (nextMs <= nowMs) {
          nextMs += intervalMs;
        }
        const nextDate = new Date(nextMs);
        const dateStrOut = nextDate.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit', month: '2-digit', year: 'numeric',
        });
        const timeStrOut = nextDate.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric', minute: '2-digit', hour12: true,
        }).toLowerCase();
        return `${dateStrOut} • ${timeStrOut}`;
      }

      const isDaily = rawFreq === 'daily' || item.repeatDaily;
      if (isDaily) {
        const istParts = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', hour12: false,
        }).formatToParts(new Date());
        const ist = {};
        istParts.forEach(p => { if (p.type !== 'literal') ist[p.type] = Number(p.value); });

        const candidateValue = year * 100000000 + month * 1000000 + day * 10000 + hours * 100 + minutes;
        const nowValue = ist.year * 100000000 + ist.month * 1000000 + ist.day * 10000 + ist.hour * 100 + ist.minute;

        if (candidateValue <= nowValue) {
          const candidateUtc = new Date(Date.UTC(year, month - 1, day + 1, hours, minutes));
          year = candidateUtc.getUTCFullYear();
          month = candidateUtc.getUTCMonth() + 1;
          day = candidateUtc.getUTCDate();
        }

        const dateStrOut = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
        const ampm = hours >= 12 ? 'pm' : 'am';
        const displayHours = hours % 12 || 12;
        const timeStrOut = `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
        return `${dateStrOut} • ${timeStrOut}`;
      }

      return null;
    } catch (_) {
      return null;
    }
  };

  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return '';
    try {
      const datePart = String(dateStr).split('T')[0];
      const [year, month, day] = datePart.split('-');
      if (!year || !month || !day) return dateStr;
      const formattedDate = `${day}-${month}-${year}`;
      if (!timeStr) return formattedDate;

      const [hours, minutes] = timeStr.split(':');
      if (hours === undefined || minutes === undefined) return `${formattedDate} ${timeStr}`;
      const hourNum = parseInt(hours, 10);
      const ampm = hourNum >= 12 ? 'pm' : 'am';
      const displayHours = hourNum % 12 || 12;
      return `${formattedDate} • ${displayHours}:${minutes} ${ampm}`;
    } catch (e) {
      return `${dateStr} ${timeStr || ''}`.trim();
    }
  };

  const handleFilter = () => {
    const params = {};
    if (startDate) params.startDate = startDate.toISOString().split('T')[0];
    if (endDate) params.endDate = endDate.toISOString().split('T')[0];
    fetchAlerts(params);
  };

  const clearFilter = () => {
    setStartDate(null);
    setEndDate(null);
    setSearchQuery('');
    fetchAlerts();
  };

  const handleDelete = (id) => {
    CrossPlatformAlert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await crmAlertApi.deleteAlert(id);
              try {
                await AlertNotificationService.cancelAlert(id);
              } catch (notifErr) {
                console.log('Error cancelling notification:', notifErr);
              }
              fetchAlerts();
            } catch (error) {
              CrossPlatformAlert.alert('Error', 'Failed to delete reminder');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    CrossPlatformAlert.alert(
      'Delete Selected',
      `Are you sure you want to delete ${selectedIds.length} reminders?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await crmAlertApi.deleteMultipleAlerts(selectedIds);
              for (const id of selectedIds) {
                try { await AlertNotificationService.cancelAlert(id); } catch (_) { }
              }
              setIsSelectionMode(false);
              setSelectedIds([]);
              fetchAlerts();
            } catch (error) {
              CrossPlatformAlert.alert('Error', 'Failed to delete selected reminders');
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
      'This will permanently delete ALL reminders in this category. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete ALL',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await crmAlertApi.deleteAllAlerts(filterCategory);
              try { await AlertNotificationService.cancelAllAlerts(); } catch (_) { }
              fetchAlerts();
            } catch (error) {
              CrossPlatformAlert.alert('Error', 'Failed to delete all reminders');
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
    console.log('📝 Editing reminder:', itemId, itemCategory);

    navigation.navigate('EditReminder', {
      reminderId: itemId,
      clientName: alert.clientName || alert.title || 'Reminder',
      originalMessage: alert.note || alert.reason || alert.message || '',
      enquiryId: alert.enquiryId,
      phone: alert.phone,
      location: alert.location,
      reminderTitle: alert.title,
      isAdmin: false,
      originalTime: alert.time,
      scheduledDateTime: alert.nextScheduledAt || alert.scheduledDateTime || `${alert.date}T${alert.time}`,
      isRepeating: !!(alert.isRepeating || alert.repeatDaily || (alert.repeatFrequency && alert.repeatFrequency !== 'none')),
      repeatType: alert.repeatType || alert.repeatFrequency || (alert.repeatDaily ? 'daily' : 'none'),
      customIntervalMinutes: alert.repeatMetadata?.customIntervalMinutes ||
        alert.customIntervalMinutes ||
        alert.customRepeatMinutes ||
        alert.repeatInterval ||
        '',
      placeReminder: alert.placeReminder !== false,
    });
  };

  const openNotificationPopup = (item) => {
    setPopupData({
      _id: item._id || item.id,
      title: item.title || item.reason,
      reason: item.reason,
      date: item.date,
      time: item.time,
      nextScheduledAt: item.nextScheduledAt,
      repeatFrequency: item.repeatFrequency,
      repeatDaily: item.repeatDaily,
      customIntervalMinutes: item.customIntervalMinutes || item.customRepeatMinutes || item.repeatMetadata?.customIntervalMinutes || '',
      customRepeatMinutes: item.customRepeatMinutes || item.customIntervalMinutes || item.repeatMetadata?.customRepeatMinutes || item.repeatMetadata?.customIntervalMinutes || '',
      type: 'admin_reminder',
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
            {((item.repeatFrequency && item.repeatFrequency !== 'none') || item.repeatDaily || item.repeatMetadata?.customIntervalMinutes || item.customIntervalMinutes || item.repeatInterval || item.customRepeatMinutes) ? (
              <View style={[styles.badge, { backgroundColor: '#fef3c7', marginBottom: 0 }]}>
                <Text style={styles.badgeText}>
                  NEXT: {getNextScheduledDisplay(item) || formatDateTime(item.date, item.time)}
                </Text>
              </View>
            ) : (
              item.time && (
                <View style={[styles.badge, { backgroundColor: '#e0f2fe', marginBottom: 0 }]}>
                  <Text style={styles.badgeText}>SCHEDULED: {item.time}</Text>
                </View>
              )
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isPinned && <Icon name="pin" size={16} color="#f59e0b" style={{ marginRight: 8 }} />}
            <View
              style={[
                styles.badge,
                { marginRight: 0 },
                item.placeReminder === false
                  ? { backgroundColor: '#f3f4f6' }
                  : (item.isActive ? styles.badgeActive : styles.badgeInactive),
              ]}
            >
              <Text style={[
                styles.badgeText,
                item.placeReminder === false ? { color: '#6b7280' } : null,
              ]}>
                {item.placeReminder === false ? 'NOTE' : (item.isActive ? 'ACTIVE' : 'INACTIVE')}
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
                const mins = item.repeatMetadata?.customIntervalMinutes ||
                  item.customIntervalMinutes ||
                  item.repeatInterval ||
                  item.customRepeatMinutes;

                if (item.repeatFrequency && item.repeatFrequency !== 'none') {
                  const freq = item.repeatFrequency.toLowerCase();
                  if (freq === 'custom') {
                    return mins ? `${prefix}${mins} MINS` : `${prefix}CUSTOM`;
                  }
                  return `${prefix}${freq.toUpperCase()}`;
                }

                if (item.repeatDaily) return `${prefix}DAILY`;
                if (mins && (!item.repeatFrequency || item.repeatFrequency === 'none')) return `${prefix}${mins} MINS`;

                return `${prefix}NO`;
              })()}
            </Text>
          </View>
        </View>

        <View style={[styles.badgeRow, { marginBottom: 10 }]}>
          <View style={[styles.badge, { backgroundColor: '#a7f3d0' }]}>
            <Text style={styles.badgeText}>
              PLACED ON: {formatDate(created)} {formatTime(created)}
            </Text>
          </View>
        </View>

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
      <View style={[styles.topRow, { paddingTop: statusBarTop + 14 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {openDrawer ? (
            <TouchableOpacity onPress={openDrawer} style={{ marginRight: 12 }}>
              <Icon name="menu" size={26} color="#000" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
              <Icon name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.title}>{isSelectionMode ? `${selectedIds.length} Selected` : screenTitle}</Text>
            {isSelectionMode && (
              <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedIds([]); }}>
                <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '700', marginTop: 2 }}>Cancel Selection</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                <Text style={styles.createBtnText}>+ New</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Pop up */}
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

      {/* Filter Card */}
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
              const searchLower = searchQuery.toLowerCase();
              const title = (item.title || '').toLowerCase();
              const description = (item.reason || item.note || item.message || item.description || '').toLowerCase();
              return title.includes(searchLower) || description.includes(searchLower);
            })}
          renderItem={renderRow}
          keyExtractor={(i) => i._id || i.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 40, color: '#64748b' }}>
              No reminders found
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default EmployeeReminders;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7fb' },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
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
