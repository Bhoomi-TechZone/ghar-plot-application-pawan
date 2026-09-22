/**
 * DailyReminderReport.js
 * Admin report: aaj kitne reminders lagaye gaye, kitne due aaye, kitne handle huye
 */

import React, { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    ActivityIndicator, StyleSheet, Platform,
    StatusBar, Dimensions, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const BASE_URL = 'https://gharplotbackend.gntechnology.de';
const { width } = Dimensions.get('window');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = n => String(n).padStart(2, '0');
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDate = d => `${DAYS[d.getDay()]}, ${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const fmtTime = iso => {
    if (!iso) return '�';
    const d = new Date(iso);
    let h = d.getHours(), m = pad(d.getMinutes());
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
};

const STATUS_COLOR = {
    completed: '#10b981', pending: '#f59e0b',
    snoozed: '#6366f1', dismissed: '#ef4444',
};
const STATUS_ICON = {
    completed: '?', pending: '?', snoozed: '??', dismissed: '?',
};

// -- Employee Row (Minimal) ---------------------------------------------------
const EmpRow = ({ emp, expanded, onToggle }) => (
    <View style={styles.empCard}>
        <TouchableOpacity style={styles.empHeader} onPress={onToggle} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
                <Text style={styles.empName}>{emp.employeeName}</Text>
                <Text style={styles.empDept}>
                    {emp.due} Due  �  {emp.completed} Done  �  {emp.pending} Pending
                </Text>
            </View>
            <Text style={styles.chevron}>{expanded ? '?' : '?'}</Text>
        </TouchableOpacity>

        {expanded && (
            <View style={styles.empDetail}>
                {emp.reminders.map((r, i) => (
                    <View key={r._id || i} style={styles.reminderRow}>
                        <Text style={styles.timeTxt}>{fmtTime(r.reminderDateTime)}</Text>
                        <View style={styles.remContent}>
                            <View style={styles.remTitleRow}>
                                <Text style={styles.remTitle} numberOfLines={1}>{r.title || '�'}</Text>
                                <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[r.status] }]} />
                            </View>
                            {r.clientName ? <Text style={styles.remClient}>{r.clientName}</Text> : null}
                            {r.comment ? <Text style={styles.remNote} numberOfLines={1}>{r.comment}</Text> : null}
                        </View>
                    </View>
                ))}
            </View>
        )}
    </View>
);

// -- Main Screen --------------------------------------------------------------
const DailyReminderReport = ({ hideHeader = false }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [expandedEmp, setExpandedEmp] = useState({});
    const [showPicker, setShowPicker] = useState(false);
    const [pickerDate, setPickerDate] = useState(new Date());

    // -- Fetch ------------------------------------------------------------------
    const fetchSummary = useCallback(async (date) => {
        setLoading(true);
        setData(null);
        setExpandedEmp({});
        try {
            const keys = ['crm_auth_token', 'adminToken', 'admin_token', 'crm_admin_token'];
            let token = null;
            for (const k of keys) { const t = await AsyncStorage.getItem(k); if (t) { token = t; break; } }

            const url = `${BASE_URL}/admin/reminders/daily-summary?date=${toISO(date)}`;
            const res = await fetch(url, {
                headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }
            });
            const json = await res.json();
            if (json.success) {
                setData(json);
                // Auto-expand all employees
                const expanded = {};
                (json.dueByEmployee || []).forEach(e => { expanded[e.employeeId] = true; });
                setExpandedEmp(expanded);
            } else {
                CrossPlatformAlert.alert('Error', json.message || 'Failed to load report');
            }
        } catch (e) {
            CrossPlatformAlert.alert('Network Error', 'Could not connect to server');
        } finally {
            setLoading(false);
        }
    }, []);

    // Load today on mount
    React.useEffect(() => { fetchSummary(selectedDate); }, []);

    // Date change helpers
    const shiftDate = (days) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d);
        fetchSummary(d);
    };

    const applyPickerDate = () => {
        setSelectedDate(new Date(pickerDate));
        setShowPicker(false);
        fetchSummary(pickerDate);
    };

    const isToday = toISO(selectedDate) === toISO(new Date());

    // -- Render -----------------------------------------------------------------
    return (
        <View style={styles.container}>
            <StatusBar backgroundColor="#0f2545" barStyle="light-content" />

            {/* Header � hide when parent provides it */}
            {!hideHeader && (
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>?? Daily Reminder Report</Text>
                    <Text style={styles.headerSub}>Placements � Due � Handled</Text>
                </View>
            )}

            {/* Date Navigator */}
            <View style={styles.dateNav}>
                <TouchableOpacity style={styles.navArrow} onPress={() => shiftDate(-1)}>
                    <Text style={styles.navArrowTxt}>�</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dateSelector} onPress={() => { setPickerDate(selectedDate); setShowPicker(true); }}>
                    <Text style={styles.dateSelectorTxt}>
                        {fmtDate(selectedDate)} {isToday ? '  �  Today' : ''}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navArrow}
                    onPress={() => !isToday && shiftDate(1)}
                    disabled={isToday}
                >
                    <Text style={[styles.navArrowTxt, isToday && { color: '#cbd5e1' }]}>�</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            ) : !data ? (
                <View style={styles.center}>
                    <Text style={styles.emptyTxt}>No data loaded</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>

                    {/* -- Compact Overview -- */}
                    <Text style={styles.sectionTitle}>Overview</Text>

                    <View style={styles.overviewCard}>
                        <View style={styles.overviewTop}>
                            <View style={styles.overviewStatBox}>
                                <Text style={styles.overviewVal}>{data.summary.placed}</Text>
                                <Text style={styles.overviewLbl}>Placed</Text>
                            </View>
                            <View style={styles.overviewDivider} />
                            <View style={styles.overviewStatBox}>
                                <Text style={styles.overviewVal}>{data.summary.due}</Text>
                                <Text style={styles.overviewLbl}>Due</Text>
                            </View>
                            <View style={styles.overviewDivider} />
                            <View style={styles.overviewStatBox}>
                                <Text style={[styles.overviewVal, { color: '#10b981' }]}>{data.summary.handledRate}%</Text>
                                <Text style={styles.overviewLbl}>Handled</Text>
                            </View>
                        </View>
                        <View style={styles.overviewBottom}>
                            <Text style={styles.botStat}>? {data.summary.completed}</Text>
                            <Text style={styles.botStat}>? {data.summary.pending}</Text>
                            <Text style={styles.botStat}>?? {data.summary.snoozed}</Text>
                            <Text style={styles.botStat}>? {data.summary.dismissed}</Text>
                        </View>
                    </View>

                    {/* -- Placed by Employee -- */}
                    {data.placedByEmployee?.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Placements by Employee</Text>

                            <View style={styles.placedTable}>
                                <View style={styles.placedRow}>
                                    <Text style={[styles.placedCell, styles.placedHead, { flex: 2 }]}>Employee</Text>
                                    <Text style={[styles.placedCell, styles.placedHead]}>Reminders Set</Text>
                                </View>
                                {data.placedByEmployee.map((e, i) => (
                                    <View key={e.employeeId || i} style={[styles.placedRow, i % 2 === 1 && styles.placedRowAlt]}>
                                        <Text style={[styles.placedCell, { flex: 2 }]}>{e.employeeName}</Text>
                                        <View style={[styles.placedCell, { alignItems: 'center' }]}>
                                            <View style={styles.countBadge}>
                                                <Text style={styles.countBadgeTxt}>{e.count}</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}

                    {/* -- Due reminders by Employee -- */}
                    {data.dueByEmployee?.length > 0 ? (
                        <>
                            <Text style={styles.sectionTitle}>Due Reminders � Employee Wise</Text>

                            {data.dueByEmployee.map(emp => (
                                <EmpRow
                                    key={emp.employeeId}
                                    emp={emp}
                                    expanded={!!expandedEmp[emp.employeeId]}
                                    onToggle={() => setExpandedEmp(prev => ({ ...prev, [emp.employeeId]: !prev[emp.employeeId] }))}
                                />
                            ))}
                        </>
                    ) : (
                        <View style={styles.noData}>
                            <Text style={styles.noDataIcon}>??</Text>
                            <Text style={styles.noDataTxt}>No reminders were due on this day</Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* -- Mini Date Picker overlay -- */}
            {showPicker && (
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerBox}>
                        <Text style={styles.pickerTitle}>Select Date</Text>
                        <Text style={styles.pickerDisplay}>{fmtDate(pickerDate)}</Text>
                        <View style={styles.pickerBtnRow}>
                            <TouchableOpacity style={styles.pickerArrow} onPress={() => { const d = new Date(pickerDate); d.setDate(d.getDate() - 1); setPickerDate(d); }}>
                                <Text style={styles.pickerArrowTxt}>?  -1 day</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.pickerArrow} onPress={() => { const d = new Date(pickerDate); d.setDate(d.getDate() + 1); setPickerDate(d); }}>
                                <Text style={styles.pickerArrowTxt}>+1 day  ?</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.pickerBtnRow}>
                            <TouchableOpacity style={styles.pickerArrow} onPress={() => { const d = new Date(pickerDate); d.setDate(d.getDate() - 7); setPickerDate(d); }}>
                                <Text style={styles.pickerArrowTxt}>??  -7 days</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.pickerArrow} onPress={() => { const d = new Date(pickerDate); d.setDate(d.getDate() + 7); setPickerDate(d); }}>
                                <Text style={styles.pickerArrowTxt}>+7 days  ??</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                            <TouchableOpacity style={[styles.pickerConfirm, { backgroundColor: '#6b7280' }]} onPress={() => setShowPicker(false)}>
                                <Text style={{ color: '#fff', fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.pickerConfirm} onPress={applyPickerDate}>
                                <Text style={{ color: '#fff', fontWeight: '600' }}>? Apply</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
};

// -- Styles --------------------------------------------------------------------
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfc' },

    header: {
        backgroundColor: '#0f2545',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 48,
        paddingBottom: 16, paddingHorizontal: 20,
    },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
    headerSub: { fontSize: 12, color: '#93c5fd', marginTop: 4 },

    // Minimal Date Nav
    dateNav: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    },
    dateSelector: { paddingHorizontal: 20 },
    dateSelectorTxt: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
    navArrow: { paddingHorizontal: 20 },
    navArrowTxt: { fontSize: 24, color: '#3b82f6', lineHeight: 28 },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyTxt: { fontSize: 14, color: '#94a3b8' },

    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 16 },

    // Overview Card
    overviewCard: {
        backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9',
        marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4,
    },
    overviewTop: { flexDirection: 'row', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    overviewStatBox: { flex: 1, alignItems: 'center' },
    overviewVal: { fontSize: 24, fontWeight: '700', color: '#1e293b' },
    overviewLbl: { fontSize: 12, color: '#64748b', marginTop: 4 },
    overviewDivider: { width: 1, backgroundColor: '#f1f5f9', height: '80%', alignSelf: 'center' },

    overviewBottom: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, backgroundColor: '#fafaf9', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
    botStat: { fontSize: 12, color: '#475569', fontWeight: '500' },

    // Placed table
    placedTable: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
    placedRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc', alignItems: 'center', justifyContent: 'space-between' },
    placedRowAlt: { backgroundColor: '#fdfdfd' },
    placedCell: { fontSize: 14, color: '#334155', fontWeight: '500' },
    placedHead: { fontWeight: '600', color: '#94a3b8', fontSize: 12, textTransform: 'uppercase' },
    countBadgeText: { color: '#64748b', fontWeight: '600', fontSize: 14 },

    // Employee card
    empCard: {
        backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#f1f5f9',
        marginBottom: 10, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOpacity: 0.02,
    },
    empHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    empName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
    empDept: { fontSize: 12, color: '#64748b', marginTop: 4 },
    chevron: { fontSize: 12, color: '#cbd5e1' },

    empDetail: { borderTopWidth: 1, borderTopColor: '#f8fafc', padding: 12, backgroundColor: '#fafaf9' },

    // Reminder row
    reminderRow: { flexDirection: 'row', marginBottom: 12 },
    timeTxt: { fontSize: 12, color: '#64748b', fontWeight: '500', width: 68, paddingTop: 2 },
    remContent: { flex: 1 },
    remTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    remTitle: { fontSize: 14, fontWeight: '500', color: '#0f172a', flex: 1 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
    remClient: { fontSize: 12, color: '#475569', marginTop: 2 },
    remNote: { fontSize: 13, color: '#6366f1', marginTop: 4, fontStyle: 'italic' },

    noData: { alignItems: 'center', padding: 30, opacity: 0.6 },
    noDataIcon: { fontSize: 30 },
    noDataTxt: { fontSize: 14, color: '#64748b', marginTop: 8 },

    // Picker
    pickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    pickerBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: width * 0.8, alignItems: 'center' },
    pickerTitle: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 10 },
    pickerDisplay: { fontSize: 18, fontWeight: '700', color: '#0f2545', marginBottom: 20 },
    pickerBtnRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
    pickerArrow: { backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    pickerArrowTxt: { fontSize: 13, color: '#3b82f6', fontWeight: '600' },
    pickerConfirm: { flex: 1, backgroundColor: '#0f2545', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
});

export default DailyReminderReport;
