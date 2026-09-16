/**
 * AllReportsScreen.js
 * Date-range based reminder report for Admin
 * Shows all reminders set between start & end date
 * Each item is clickable to view client profile (EnquiryDetail)
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    Alert,
    Platform,
    StatusBar,
    Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const BASE_URL = 'https://gharplotbackend.gntechnology.de';
const { width } = Dimensions.get('window');

// ── Date Picker helpers (no library needed) ──────────────────────────────────
const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Status color map
const STATUS_COLOR = {
    pending: '#f59e0b',
    completed: '#10b981',
    snoozed: '#6366f1',
    dismissed: '#ef4444',
};

const STATUS_LABEL = {
    pending: '⏳ Pending',
    completed: '✅ Completed',
    snoozed: '😴 Snoozed',
    dismissed: '❌ Dismissed',
};

// ── Main Component ────────────────────────────────────────────────────────────
const AllReportsScreen = ({ navigation, hideHeader = false }) => {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 30);

    const [startDate, setStartDate] = useState(monthAgo);
    const [endDate, setEndDate] = useState(today);
    const [reminders, setReminders] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // DatePicker mini-state
    const [pickerFor, setPickerFor] = useState(null); // 'start' | 'end' | null
    const [pickerDate, setPickerDate] = useState(new Date());

    // ── API Call ──────────────────────────────────────────────────────────────
    const fetchReport = useCallback(async () => {
        setLoading(true);
        setHasSearched(true);
        try {
            const keys = ['crm_auth_token', 'adminToken', 'admin_token', 'crm_admin_token'];
            let token = null;
            for (const key of keys) {
                const t = await AsyncStorage.getItem(key);
                if (t) { token = t; break; }
            }

            const url = `${BASE_URL}/admin/reminders/report?startDate=${toISO(startDate)}&endDate=${toISO(endDate)}&limit=100`;
            const res = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                },
            });
            const json = await res.json();
            if (json.success) {
                setReminders(json.data || []);
                setSummary(json.summary || null);
            } else {
                CrossPlatformAlert.alert('Error', json.message || 'Failed to load report');
            }
        } catch (e) {
            console.error('Report fetch error:', e);
            CrossPlatformAlert.alert('Network Error', 'Could not connect to server');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    // ── Navigate to client profile ────────────────────────────────────────────
    const openClientProfile = (reminder) => {
        const manualInquiry = reminder.manualInquiryId;
        if (manualInquiry && manualInquiry._id) {
            navigation.navigate('EnquiryDetail', {
                enquiryId: manualInquiry._id,
                clientName: manualInquiry.clientName || reminder.clientName || 'Client',
            });
        } else if (reminder.clientName || reminder.phone) {
            // Show info if no enquiry linked
            CrossPlatformAlert.alert(
                '👤 Client Info',
                `Name: ${reminder.clientName || 'N/A'}\nPhone: ${reminder.phone || 'N/A'}\nEmail: ${reminder.email || 'N/A'}\nLocation: ${reminder.location || 'N/A'}`,
                [{ text: 'OK' }]
            );
        } else {
            CrossPlatformAlert.alert('Info', 'No client profile linked to this reminder.');
        }
    };

    // ── Inline Date Picker ────────────────────────────────────────────────────
    const openPicker = (forWhat) => {
        setPickerDate(forWhat === 'start' ? startDate : endDate);
        setPickerFor(forWhat);
    };

    const applyDate = () => {
        if (pickerFor === 'start') {
            if (pickerDate > endDate) {
                CrossPlatformAlert.alert('Invalid', 'Start date cannot be after end date');
                return;
            }
            setStartDate(new Date(pickerDate));
        } else {
            if (pickerDate < startDate) {
                CrossPlatformAlert.alert('Invalid', 'End date cannot be before start date');
                return;
            }
            setEndDate(new Date(pickerDate));
        }
        setPickerFor(null);
    };

    const changePickerDateBy = (days) => {
        const d = new Date(pickerDate);
        d.setDate(d.getDate() + days);
        setPickerDate(d);
    };

    // ── Render single reminder card (Minimal) ─────────────────────────────────
    const renderItem = ({ item }) => {
        const employeeName = item.employeeId?.name || '—';
        const status = item.status || 'pending';
        const clientName = item.clientName || item.manualInquiryId?.clientName || 'Unknown Client';
        const phone = item.phone || item.manualInquiryId?.contactNumber || '';
        const reminderTime = item.reminderDateTime ? new Date(item.reminderDateTime) : null;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => openClientProfile(item)}
            >
                <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Untitled Reminder'}</Text>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[status] }]} />
                </View>

                <View style={styles.cardDetailRow}>
                    <Text style={styles.cardClientTxt}>{clientName}{phone ? ` • ${phone}` : ''}</Text>
                </View>

                <View style={styles.cardFooterRow}>
                    <Text style={styles.cardSubTxt}>👔 {employeeName}</Text>
                    {reminderTime ? (
                        <Text style={styles.cardSubTxt}>
                            {pad(reminderTime.getDate())} {MONTHS[reminderTime.getMonth()]} • {pad(reminderTime.getHours())}:{pad(reminderTime.getMinutes())}
                        </Text>
                    ) : (<Text style={styles.cardSubTxt}>No time</Text>)}
                </View>
            </TouchableOpacity>
        );
    };

    // ── Summary cards (Minimal) ───────────────────────────────────────────────
    const renderSummary = () => {
        if (!summary) return null;
        const items = [
            { label: 'Total', value: summary.total, color: '#1e293b' },
            { label: 'Done', value: summary.completed, color: '#10b981' },
            { label: 'Wait', value: summary.pending, color: '#f59e0b' },
            { label: 'Snooze', value: summary.snoozed, color: '#6366f1' },
            { label: 'Drop', value: summary.dismissed, color: '#ef4444' },
        ];
        return (
            <View style={styles.summaryRow}>
                {items.map((it) => (
                    <View key={it.label} style={styles.summaryCard}>
                        <Text style={[styles.summaryNum, { color: it.color }]}>{it.value}</Text>
                        <Text style={styles.summaryLabel}>{it.label}</Text>
                    </View>
                ))}
            </View>
        );
    };

    // ── Inline Date Picker UI ─────────────────────────────────────────────────
    const renderDatePicker = () => {
        if (!pickerFor) return null;
        return (
            <View style={styles.pickerOverlay}>
                <View style={styles.pickerBox}>
                    <Text style={styles.pickerTitle}>
                        Select {pickerFor === 'start' ? 'Start' : 'End'} Date
                    </Text>
                    <Text style={styles.pickerDateDisplay}>{fmt(pickerDate)}</Text>

                    <View style={styles.pickerBtnRow}>
                        <TouchableOpacity style={styles.pickerArrow} onPress={() => changePickerDateBy(-1)}>
                            <Text style={styles.pickerArrowTxt}>◀  -1 day</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.pickerArrow} onPress={() => changePickerDateBy(1)}>
                            <Text style={styles.pickerArrowTxt}>+1 day  ▶</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.pickerBtnRow}>
                        <TouchableOpacity style={styles.pickerArrow} onPress={() => changePickerDateBy(-7)}>
                            <Text style={styles.pickerArrowTxt}>◀◀  -7 days</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.pickerArrow} onPress={() => changePickerDateBy(7)}>
                            <Text style={styles.pickerArrowTxt}>+7 days  ▶▶</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                        <TouchableOpacity style={[styles.pickerConfirm, { backgroundColor: '#6b7280' }]} onPress={() => setPickerFor(null)}>
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.pickerConfirm} onPress={applyDate}>
                            <Text style={{ color: '#fff', fontWeight: '600' }}>✓ Apply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <StatusBar backgroundColor="#0f2545" barStyle="light-content" />

            {/* Header — hidden when embedded in AllReportsHome */}
            {!hideHeader && (
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>📊 Reminder Report</Text>
                    <Text style={styles.headerSubtitle}>Filter reminders by date range</Text>
                </View>
            )}

            {/* Date filter bar */}
            <View style={styles.filterBar}>
                <TouchableOpacity style={styles.dateSelector} onPress={() => openPicker('start')}>
                    <Text style={styles.dateSelectorTxt}>{fmt(startDate)}</Text>
                </TouchableOpacity>

                <Text style={styles.toText}>→</Text>

                <TouchableOpacity style={styles.dateSelector} onPress={() => openPicker('end')}>
                    <Text style={styles.dateSelectorTxt}>{fmt(endDate)}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.searchBtn}
                    onPress={fetchReport}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.searchBtnText}>Go</Text>}
                </TouchableOpacity>
            </View>

            {/* Summary */}
            {renderSummary()}

            {/* List */}
            {!hasSearched ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>📋</Text>
                    <Text style={styles.emptyTitle}>Select date range to view report</Text>
                    <Text style={styles.emptySubtitle}>Choose start & end date then tap Search</Text>
                </View>
            ) : loading ? (
                <View style={styles.emptyState}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.emptySubtitle}>Loading reminders...</Text>
                </View>
            ) : reminders.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🔍</Text>
                    <Text style={styles.emptyTitle}>No reminders found</Text>
                    <Text style={styles.emptySubtitle}>No reminders were set in this date range</Text>
                </View>
            ) : (
                <FlatList
                    data={reminders}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                />
            )}

            {/* Inline date picker overlay */}
            {renderDatePicker()}
        </View>
    );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfc' },
    header: { backgroundColor: '#0f2545', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 48, paddingBottom: 16, paddingHorizontal: 20 },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff', letterSpacing: 0.3 },
    headerSubtitle: { fontSize: 13, color: '#93c5fd', marginTop: 4 },

    // Filter bar (Minimal)
    filterBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    },
    dateSelector: { backgroundColor: '#f8fafc', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
    dateSelectorTxt: { fontSize: 13, color: '#1e293b', fontWeight: '600' },
    toText: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
    searchBtn: { backgroundColor: '#0f2545', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, minWidth: 60, alignItems: 'center' },
    searchBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

    // Summary (Minimal)
    summaryRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fcfcfc', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    summaryCard: { flex: 1, alignItems: 'center' },
    summaryNum: { fontSize: 16, fontWeight: '700' },
    summaryLabel: { fontSize: 10, color: '#64748b', fontWeight: '500', marginTop: 2 },

    // Card (Minimal)
    card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 4, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1, shadowColor: '#000', shadowOpacity: 0.02 },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    cardTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a', flex: 1 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
    cardDetailRow: { marginBottom: 10 },
    cardClientTxt: { fontSize: 13, color: '#475569' },
    cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 10 },
    cardSubTxt: { fontSize: 12, color: '#64748b' },

    // Empty state
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
    emptyIcon: { fontSize: 44, marginBottom: 8, opacity: 0.5 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', textAlign: 'center' },
    emptySubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },

    // Date Picker overlay (Minimal)
    pickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
    pickerBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: width * 0.82, alignItems: 'center' },
    pickerTitle: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 12 },
    pickerDateDisplay: { fontSize: 18, fontWeight: '700', color: '#0f2545', marginBottom: 20 },
    pickerBtnRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
    pickerArrow: { backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    pickerArrowTxt: { fontSize: 13, color: '#3b82f6', fontWeight: '600' },
    pickerConfirm: { flex: 1, backgroundColor: '#0f2545', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
});

export default AllReportsScreen;
