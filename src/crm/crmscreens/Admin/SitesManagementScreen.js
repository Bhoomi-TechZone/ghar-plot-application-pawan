import React, { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  Dimensions,
  Platform,
  BackHandler,
  Modal,
  Share,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as adminSitesApi from '../../services/adminSitesApi';
import sitesMasterCache from '../../services/sitesMasterCache';

const { width } = Dimensions.get('window');

const formatISODateDisplay = (isoStr) => {
  if (!isoStr) return '';
  if (typeof isoStr === 'string' && isoStr.length >= 10) {
    const parts = isoStr.slice(0, 10).split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return String(isoStr);
  }
};


const paymentTypesList = [
  { label: 'Cash', value: 'Cash' },
  { label: 'Credit', value: 'Credit' },
  { label: 'Paytm', value: 'Paytm' },
  { label: 'Google Pay', value: 'Google Pay' },
  { label: 'PhonePay', value: 'PhonePay' },
  { label: 'Online Transfer', value: 'Online Transfer' },
  { label: 'Adjustment', value: 'Adjustment' },
  { label: 'Product Upsell', value: 'Product Upsell' },
];

// --- Reusable BottomSheet Dropdown for iOS & Android ---
const DropdownSelector = ({
  label,
  value,
  placeholder = 'Select',
  options = [],
  onSelect,
  title,
  required = false,
  containerStyle,
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          label: opt.label || opt.name || String(opt.value !== undefined ? opt.value : ''),
          value: opt.value !== undefined ? opt.value : (opt.id ?? opt.name),
        };
      }
      return { label: String(opt), value: opt };
    });
  }, [options]);

  const selectedOption = normalizedOptions.find((o) => String(o.value) === String(value));
  const displayText = selectedOption ? selectedOption.label : (value ? String(value) : placeholder);
  const isSelected = !!selectedOption && selectedOption.value !== '';

  const filteredOptions = useMemo(() => {
    if (!searchText.trim()) return normalizedOptions;
    const q = searchText.toLowerCase();
    return normalizedOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [normalizedOptions, searchText]);

  return (
    <View style={containerStyle}>
      {label ? (
        <Text style={styles.formLabel}>
          {label} {required ? <Text style={styles.required}>*</Text> : null}
        </Text>
      ) : null}
      <TouchableOpacity
        style={[
          styles.dropdownSelectorBtn,
          isSelected && styles.dropdownSelectorBtnActive,
          disabled && { opacity: 0.6 },
        ]}
        onPress={() => {
          if (disabled) return;
          setSearchText('');
          setModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dropdownSelectorText,
            !isSelected && styles.dropdownPlaceholderText,
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <MaterialIcons name="keyboard-arrow-down" size={22} color="#009688" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownModalBackdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.dropdownModalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.dropdownModalDragBar} />
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle} numberOfLines={1}>
                {title || label || 'Select Option'}
              </Text>
              <TouchableOpacity
                style={styles.dropdownModalCloseBtn}
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {normalizedOptions.length > 5 ? (
              <View style={styles.dropdownSearchWrapper}>
                <MaterialIcons name="search" size={20} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.dropdownSearchInput}
                  placeholder="Search..."
                  placeholderTextColor="#94a3b8"
                  value={searchText}
                  onChangeText={setSearchText}
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                {searchText ? (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <MaterialIcons name="cancel" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            <ScrollView
              style={{ maxHeight: 340 }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((item, idx) => {
                  const itemIsSelected = String(item.value) === String(value);
                  return (
                    <TouchableOpacity
                      key={item.value !== undefined ? String(item.value) + idx : idx}
                      style={[
                        styles.dropdownOptionItem,
                        itemIsSelected && styles.dropdownOptionItemSelected,
                      ]}
                      onPress={() => {
                        onSelect(item.value);
                        setModalVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownOptionText,
                          itemIsSelected && styles.dropdownOptionTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      {itemIsSelected ? (
                        <MaterialIcons name="check-circle" size={20} color="#009688" />
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>No options found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const SitesManagementScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const statusBarTop = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const { viewType: initialViewType } = route.params || { viewType: 'all_projects' };
  const [currentView, setCurrentView] = useState(initialViewType);

  React.useEffect(() => {
    if (route.params?.viewType) {
      setCurrentView(route.params.viewType);
    }
  }, [route.params?.viewType]);

  // Handle back navigation for sub-views or stack pop
  const handleBack = () => {
    switch (currentView) {
      case 'add_project':
      case 'edit_project':
        setCurrentView('all_projects');
        break;
      case 'add_cash_flow':
      case 'edit_cash_flow':
        setCurrentView('cash_flow');
        break;
      case 'add_expenses':
      case 'daily_project_sheet':
        setCurrentView('all_expenses');
        break;
      case 'add_work_status':
        setCurrentView('work_status');
        break;
      case 'add_client_payment':
      case 'edit_client_payment':
        setCurrentView('client_payments');
        break;
      default:
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('AdminMainTabs', { screen: 'Dashboard' });
        }
        break;
    }
  };

  // Hardware back press handler on Android
  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [currentView, navigation]);

  // --- Helpers ---
  const getTodayDateString = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const exportToCsv = async (filename, headerColumns, dataRows, directDownloadUrl = null) => {
    try {
      if ((!dataRows || dataRows.length === 0) && !directDownloadUrl) {
        Alert.alert('Export', 'No data available to export.');
        return;
      }

      const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;

      // 1. Web Platform: Instant direct browser download
      if (Platform.OS === 'web') {
        if (directDownloadUrl) {
          if (typeof window !== 'undefined') {
            window.open(directDownloadUrl, '_blank');
            return;
          }
        }
        const headerLine = headerColumns.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',');
        const bodyLines = (dataRows || []).map(row =>
          row.map(val => `"${String(val !== undefined && val !== null ? val : '').replace(/"/g, '""')}"`).join(',')
        );
        const csvContent = '\uFEFF' + [headerLine, ...bodyLines].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = cleanFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // 2. Direct Download URL on Mobile (Android & iOS)
      if (directDownloadUrl) {
        let finalDirectUrl = directDownloadUrl;
        if (finalDirectUrl.startsWith('http://') && !finalDirectUrl.includes('localhost') && !finalDirectUrl.includes('127.0.0.1')) {
          finalDirectUrl = finalDirectUrl.replace(/^http:\/\//i, 'https://');
        }
        try {
          await Linking.openURL(finalDirectUrl);
          Alert.alert(
            'Downloading File',
            `Your file "${cleanFilename}" is downloading to your device's Downloads folder.`
          );
          return;
        } catch (linkDirectErr) {
          console.warn('Direct URL open failed, trying alternative:', linkDirectErr);
        }
      }

      // 3. Server File Generation + Native Download Trigger
      try {
        const res = await adminSitesApi.generateExportFile(cleanFilename, headerColumns, dataRows || []);
        if (res && (res.downloadUrl || res.exportId)) {
          let downloadUrl = res.downloadUrl;
          if (!downloadUrl || !downloadUrl.startsWith('http')) {
            downloadUrl = `${adminSitesApi.BASE_URL || 'https://gharplotbackend.gntechnology.de'}/admin/export/file/${res.exportId}`;
          } else if (downloadUrl.startsWith('http://') && !downloadUrl.includes('localhost') && !downloadUrl.includes('127.0.0.1')) {
            downloadUrl = downloadUrl.replace(/^http:\/\//i, 'https://');
          }

          try {
            await Linking.openURL(downloadUrl);
            Alert.alert(
              'Downloading File',
              `Your file "${cleanFilename}" is downloading to your device's Downloads folder.`
            );
            return;
          } catch (linkErr) {
            console.warn('Linking.openURL failed:', linkErr);
          }
        }
      } catch (apiErr) {
        console.warn('Server file download failed, falling back to Share:', apiErr);
      }

      // 4. Safe Share Sheet Fallback (max 300 rows to prevent Android Binder buffer overflow)
      if (dataRows && dataRows.length > 0) {
        const headerLine = headerColumns.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',');
        const safeRows = dataRows.slice(0, 300);
        const bodyLines = safeRows.map(row =>
          row.map(val => `"${String(val !== undefined && val !== null ? val : '').replace(/"/g, '""')}"`).join(',')
        );
        const csvContent = [headerLine, ...bodyLines].join('\n');
        await Share.share({
          title: cleanFilename,
          message: csvContent,
        });
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Export Error', 'Could not export file: ' + (error.message || 'Unknown error'));
    }
  };

  // --- API Data States ---
  const [apiClients, setApiClients] = useState([]);
  const [apiProjects, setApiProjects] = useState([]);
  const [apiCashFlows, setApiCashFlows] = useState([]);
  const [apiEmployees, setApiEmployees] = useState([]);
  const [apiExpenses, setApiExpenses] = useState([]);
  const [categoriesList, setCategoriesList] = useState([
    'Keele',
    'Eat',
    'Sariya',
    'Kulhadi',
    'Fabda',
    'Materials',
    'Labor',
    'Equipment',
    'Utility',
    'Others',
  ]);
  const [apiLoading, setApiLoading] = useState(true);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [cashFlowPage, setCashFlowPage] = useState(1);
  const [cashFlowPageSize, setCashFlowPageSize] = useState(25);
  const [projectsPage, setProjectsPage] = useState(1);
  const [projectsPageSize, setProjectsPageSize] = useState(25);
  const [expensesPage, setExpensesPage] = useState(1);
  const [expensesPageSize, setExpensesPageSize] = useState(25);

  // Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Date Expenses Modal (for drill-down from Cash Flow & Date Export)
  const [dateExpensesModal, setDateExpensesModal] = useState({
    visible: false,
    loading: false,
    associateName: '',
    associateId: '',
    date: '',
    rawDate: '',
    totalAmount: 0,
    items: [],
  });

  // --- Granular Data Refresh Helpers (Fast, No Full-Screen Loader) ---
  const refreshCashFlowsOnly = async () => {
    try {
      const data = await adminSitesApi.getCashFlows();
      if (Array.isArray(data)) {
        const mapped = data.map(cf => ({
          id: cf._id,
          date: formatISODateDisplay(cf.date),
          rawDate: cf.date,
          associate: cf.businessAssociate?.name || '',
          associateId: cf.businessAssociate?._id || '',
          openingBal: `Rs. ${(cf.openingBalance || 0).toFixed(2)}`,
          totalRec: `Rs. ${(cf.totalReceived || 0).toFixed(2)}`,
          totalExp: `Rs. ${(cf.totalExpense || 0).toFixed(2)}`,
          rawTotalExp: cf.totalExpense || 0,
          rawTotalRec: cf.totalReceived || 0,
          rawClosingBal: cf.closingBalance || 0,
          expenseCount: cf.expenseCount || 0,
          from: cf.entries?.map(e => e.receivedFrom).filter(Boolean).join(', ') || '',
          closingBal: `Rs. ${(cf.closingBalance || 0).toFixed(2)}`,
          amount: cf.entries?.reduce((sum, e) => sum + (parseFloat(e.receivedAmount) || 0), 0).toString() || '0',
          type: cf.entries?.[0]?.type || '',
          rawEntries: Array.isArray(cf.entries) ? cf.entries : [],
          rawOpeningBalance: cf.openingBalance || 0,
        }));
        setApiCashFlows(mapped);
      }
    } catch (e) {
      console.warn('Background cash flow refresh failed:', e);
    }
  };

  const refreshExpensesOnly = async () => {
    try {
      const data = await adminSitesApi.getExpenses();
      if (Array.isArray(data)) {
        const mapped = data.map(e => ({
          id: e._id,
          date: formatISODateDisplay(e.date),
          rawDate: e.date,
          project: e.project?.projectName || '',
          projectId: e.project?._id || '',
          projectStatus: e.project?.status || 'Active',
          client: e.client?.name || '',
          clientId: e.client?._id || '',
          associate: e.businessAssociate?.name || '',
          associateId: e.businessAssociate?._id || '',
          category: e.category || '',
          itemName: e.itemName || '',
          quantity: e.quantity || 1,
          unit: e.unit || 'Pcs',
          amount: `Rs. ${(e.amount || 0).toLocaleString()}`,
          rawAmount: e.amount || 0,
          paidTo: e.paidTo || '',
          type: e.paymentType || 'Cash',
          remarks: e.remarks || '',
        }));
        setApiExpenses(mapped);
      }
    } catch (e) {
      console.warn('Background expenses refresh failed:', e);
    }
  };

  const refreshProjectsOnly = async () => {
    try {
      const data = await adminSitesApi.getProjects();
      if (Array.isArray(data)) {
        const mapped = data.map(p => ({
          id: p._id,
          name: p.projectName || p.name || '',
          client: p.client?.name || (typeof p.client === 'string' ? p.client : '') || '',
          clientId: p.client?._id || (typeof p.client === 'string' ? p.client : ''),
          status: p.status || 'Active',
        }));
        setApiProjects(mapped);
        sitesMasterCache.updateCachedProjects(mapped);
      }
    } catch (e) {
      console.warn('Background projects refresh failed:', e);
    }
  };

  // --- Fetch API data on mount ---
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async (isPull = false, forceMaster = false) => {
    console.log('🔄 [SitesManagement] Fetching all data, isPull:', isPull, 'forceMaster:', forceMaster);
    if (!isPull) setApiLoading(true);

    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('TIMEOUT'), 7000));

    try {
      const results = await Promise.race([
        Promise.allSettled([
          sitesMasterCache.getMasterData(forceMaster || isPull),
          adminSitesApi.getCashFlows(),
          adminSitesApi.getExpenses(),
        ]),
        timeoutPromise,
      ]);

      if (results !== 'TIMEOUT' && Array.isArray(results)) {
        const [masterRes, cashFlowsRes, expensesRes] = results;

        if (masterRes.status === 'fulfilled' && masterRes.value) {
          const { clients, employees, categories, projects } = masterRes.value;
          if (Array.isArray(clients)) setApiClients(clients);
          if (Array.isArray(employees)) setApiEmployees(employees);
          if (Array.isArray(projects)) setApiProjects(projects);
          if (Array.isArray(categories) && categories.length > 0) setCategoriesList(categories);
        }

        if (cashFlowsRes.status === 'fulfilled' && Array.isArray(cashFlowsRes.value)) {
          const mappedCashFlows = cashFlowsRes.value.map(cf => ({
            id: cf._id,
            date: formatISODateDisplay(cf.date),
            rawDate: cf.date,
            associate: cf.businessAssociate?.name || '',
            associateId: cf.businessAssociate?._id || '',
            openingBal: `Rs. ${(cf.openingBalance || 0).toFixed(2)}`,
            totalRec: `Rs. ${(cf.totalReceived || 0).toFixed(2)}`,
            totalExp: `Rs. ${(cf.totalExpense || 0).toFixed(2)}`,
            rawTotalExp: cf.totalExpense || 0,
            rawTotalRec: cf.totalReceived || 0,
            rawClosingBal: cf.closingBalance || 0,
            expenseCount: cf.expenseCount || 0,
            from: cf.entries?.map(e => e.receivedFrom).filter(Boolean).join(', ') || '',
            closingBal: `Rs. ${(cf.closingBalance || 0).toFixed(2)}`,
            amount: cf.entries?.reduce((sum, e) => sum + (parseFloat(e.receivedAmount) || 0), 0).toString() || '0',
            type: cf.entries?.[0]?.type || '',
            rawEntries: Array.isArray(cf.entries) ? cf.entries : [],
            rawOpeningBalance: cf.openingBalance || 0,
          }));
          setApiCashFlows(mappedCashFlows);
        }

        if (expensesRes.status === 'fulfilled' && Array.isArray(expensesRes.value)) {
          const mappedExpenses = expensesRes.value.map(e => ({
            id: e._id,
            date: formatISODateDisplay(e.date),
            rawDate: e.date,
            project: e.project?.projectName || '',
            projectId: e.project?._id || '',
            projectStatus: e.project?.status || 'Active',
            client: e.client?.name || '',
            clientId: e.client?._id || '',
            associate: e.businessAssociate?.name || '',
            associateId: e.businessAssociate?._id || '',
            category: e.category || '',
            itemName: e.itemName || '',
            quantity: e.quantity || 1,
            unit: e.unit || 'Pcs',
            amount: `Rs. ${(e.amount || 0).toLocaleString()}`,
            rawAmount: e.amount || 0,
            paidTo: e.paidTo || '',
            type: e.paymentType || 'Cash',
            remarks: e.remarks || '',
          }));
          setApiExpenses(mappedExpenses);
        }
      }
    } catch (error) {
      console.error('Error fetching API data:', error);
    } finally {
      console.log('✅ [SitesManagement] Data fetch completed. setApiLoading(false)');
      setApiLoading(false);
    }
  };

  const handlePullRefresh = async () => {
    setIsPullRefreshing(true);
    try {
      await fetchAllData(true, true);
    } catch (e) {
      console.warn('Pull refresh error:', e);
    } finally {
      setIsPullRefreshing(false);
    }
  };

  // --- Form States ---
  // Add Cash Flow Form State
  const [cashFlowForm, setCashFlowForm] = useState({
    id: null,
    associate: '',
    date: getTodayDateString(),
    openingBalance: '0',
    entries: [
      { id: Date.now().toString(), receivedFrom: '', receivedAmount: '', type: '' }
    ]
  });

  // Project Form State
  const [editingProject, setEditingProject] = useState(null);
  const [projectForm, setProjectForm] = useState({
    name: '',
    client: '',
    status: 'Active',
  });

  // Add Expenses Form State
  const [expensesForm, setExpensesForm] = useState({
    client: '',
    project: '',
    associate: '',
    category: 'Keele',
    itemName: '',
    quantity: '1',
    unit: 'Pcs',
    unitPrice: '',
    amount: '',
    paidTo: '',
    date: getTodayDateString(),
    paymentType: 'Cash',
    remarks: '',
  });

  // Add Work Status Form State
  const [workStatusForm, setWorkStatusForm] = useState({
    associate: '',
    client: '',
    project: '',
    date: getTodayDateString(),
    todayStatus: '',
    tomorrowPlan: '',
    dayAfterTomorrowPlan: '',
  });

  // Add Client Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    client: '',
    project: '',
    date: getTodayDateString(),
    amount: '',
    mode: '',
    remarks: '',
  });
  const [editingPayment, setEditingPayment] = useState(null);

  // --- Filter States ---
  const [selectedClientFilter, setSelectedClientFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedAssociateFilter, setSelectedAssociateFilter] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState(getTodayDateString());
  const [selectedEndDateFilter, setSelectedEndDateFilter] = useState(getTodayDateString());
  const [selectedPaymentTypeFilter, setSelectedPaymentTypeFilter] = useState('');

  // --- Cash Flow Filter States ---
  const [cashFlowAssociateFilter, setCashFlowAssociateFilter] = useState('');
  const [cashFlowDateFilter, setCashFlowDateFilter] = useState('');

  // --- Daily Project Expense Sheet State ---
  const [sheetDate, setSheetDate] = useState(getTodayDateString());
  const [sheetAssociateFilter, setSheetAssociateFilter] = useState('');
  const [sheetProjectFilter, setSheetProjectFilter] = useState('');
  const [dailySheetData, setDailySheetData] = useState([]);
  const [dailySheetLoading, setDailySheetLoading] = useState(false);
  const [dailySheetGrandTotal, setDailySheetGrandTotal] = useState(0);
  const [dailySheetTotalCount, setDailySheetTotalCount] = useState(0);

  // --- Work Status / Civil Action Plan Sheet State (User Provided UI) ---
  const getTodayFormattedDDMMYYYY = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const [workStatusAssociateFilter, setWorkStatusAssociateFilter] = useState('');
  const [workStatusClientFilter, setWorkStatusClientFilter] = useState('');
  const [workStatusProjectFilter, setWorkStatusProjectFilter] = useState('');
  const [workStatusDateFilter, setWorkStatusDateFilter] = useState(getTodayFormattedDDMMYYYY());

  // Submit button loader states
  const [submitLoading, setSubmitLoading] = useState(false);
  const [savingCivilSheet, setSavingCivilSheet] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);

  // --- Work Status Synchronized State (from MongoDB) ---
  const [workStatusList, setWorkStatusList] = useState([]);
  const [workStatusLoading, setWorkStatusLoading] = useState(false);
  const [workStatusEditingItem, setWorkStatusEditingItem] = useState(null);
  const [workStatusEditModalVisible, setWorkStatusEditModalVisible] = useState(false);
  const [workStatusSaving, setWorkStatusSaving] = useState(false);

  // Work Status Pagination State
  const [workStatusPage, setWorkStatusPage] = useState(1);
  const [workStatusLimit, setWorkStatusLimit] = useState(25);
  const [workStatusTotal, setWorkStatusTotal] = useState(0);
  const [workStatusTotalPages, setWorkStatusTotalPages] = useState(1);

  const fetchWorkStatuses = async (targetPage = 1, targetLimit = workStatusLimit) => {
    setWorkStatusLoading(true);
    try {
      const params = {
        page: targetPage,
        limit: targetLimit,
      };
      if (workStatusProjectFilter) params.project = workStatusProjectFilter;
      if (workStatusClientFilter) params.client = workStatusClientFilter;
      if (workStatusDateFilter) params.date = workStatusDateFilter;

      const res = await adminSitesApi.getWorkStatuses(params);
      if (res && res.success && Array.isArray(res.data)) {
        setWorkStatusList(res.data);
        setWorkStatusTotal(res.total || 0);
        setWorkStatusTotalPages(res.totalPages || 1);
        setWorkStatusPage(targetPage);
      } else {
        setWorkStatusList([]);
        setWorkStatusTotal(0);
        setWorkStatusTotalPages(1);
      }
    } catch (err) {
      console.error('Error fetching work statuses:', err);
      setWorkStatusList([]);
    } finally {
      setWorkStatusLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'work_status') {
      fetchWorkStatuses(1, workStatusLimit);
    }
  }, [currentView, workStatusDateFilter, workStatusProjectFilter, workStatusClientFilter, workStatusLimit]);

  // --- Date Picker State & Handlers ---
  const [datePickerConfig, setDatePickerConfig] = useState({
    show: false,
    targetField: null,
    currentValue: new Date()
  });
  const [iosTempDate, setIosTempDate] = useState(new Date());

  const openDatePicker = (targetField, currentValueString) => {
    let parsedDate = new Date();
    if (currentValueString) {
      const parts = currentValueString.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          parsedDate = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
        } else if (parts[2].length === 4) {
          parsedDate = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
        }
      }
      if (isNaN(parsedDate.getTime())) parsedDate = new Date();
    }
    setIosTempDate(parsedDate);
    setDatePickerConfig({
      show: true,
      targetField,
      currentValue: parsedDate
    });
  };

  const applySelectedDate = (selectedDate) => {
    if (!selectedDate || isNaN(selectedDate.getTime())) return;
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const year = selectedDate.getFullYear();
    const formattedStr = `${month}/${day}/${year}`;

    switch (datePickerConfig.targetField) {
      case 'cashFlowForm.date': {
        setCashFlowForm(prev => ({...prev, date: formattedStr}));
        if (cashFlowForm.associate) {
          fetchAndSetOpeningBalance(cashFlowForm.associate, formattedStr);
        }
        break;
      }
      case 'expensesForm.date': setExpensesForm(prev => ({...prev, date: formattedStr})); break;
      case 'sheetDate': setSheetDate(formattedStr); break;
      case 'workStatusForm.date': setWorkStatusForm(prev => ({...prev, date: formattedStr})); break;
      case 'paymentForm.date': setPaymentForm(prev => ({...prev, date: formattedStr})); break;
      case 'selectedDateFilterExpenses': setSelectedDateFilter(formattedStr); break;
      case 'selectedEndDateFilterExpenses': setSelectedEndDateFilter(formattedStr); break;
      case 'selectedDateFilterWorkStatus': setSelectedDateFilter(formattedStr); break;
      case 'selectedEndDateFilterWorkStatus': setSelectedEndDateFilter(formattedStr); break;
      case 'selectedDateFilterClientPayments': setSelectedDateFilter(formattedStr); break;
      case 'cashFlowDateFilter': 
        setCashFlowDateFilter(formattedStr); 
        setCashFlowPage(1); 
        break;
      case 'workStatusDateFilter': {
        const d = String(selectedDate.getDate()).padStart(2, '0');
        const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const y = selectedDate.getFullYear();
        setWorkStatusDateFilter(`${d}-${m}-${y}`);
        break;
      }
      default:
        break;
    }
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setDatePickerConfig(prev => ({ ...prev, show: false }));
      if (selectedDate) {
        applySelectedDate(selectedDate);
      }
    } else {
      if (selectedDate) {
        setIosTempDate(selectedDate);
      }
    }
  };

  // --- Auto-balance Helper ---
  const fetchAndSetOpeningBalance = async (associateName, dateStr) => {
    const emp = apiEmployees.find(e => e.name === associateName);
    if (!emp) return;
    try {
      const parts = dateStr.split(/[-/]/);
      const formattedDate = `${parts[2]}-${parts[0]}-${parts[1]}`;
      const prevBal = await adminSitesApi.getPreviousClosingBalance(emp.id, formattedDate);
      setCashFlowForm(prev => ({ ...prev, openingBalance: String(prevBal || 0) }));
    } catch (err) {
      console.log('Error getting opening balance:', err);
    }
  };

  const handleAssociateChangeInCashFlow = (assocName) => {
    setCashFlowForm(prev => ({ ...prev, associate: assocName }));
    if (assocName) {
      fetchAndSetOpeningBalance(assocName, cashFlowForm.date);
    }
  };

  // Helper to detect if cashflow already exists for this associate on this date (for auto-settlement UI)
  const existingAssociateCashFlow = useMemo(() => {
    if (!cashFlowForm.associate || !cashFlowForm.date) return null;
    const dateParts = cashFlowForm.date.split(/[-/]/);
    if (dateParts.length !== 3) return null;
    const formattedDate = `${dateParts[2]}-${String(dateParts[0]).padStart(2, '0')}-${String(dateParts[1]).padStart(2, '0')}`;
    return apiCashFlows.find(cf => {
      if (cf.associate !== cashFlowForm.associate) return false;
      if (!cf.rawDate) return false;
      const cfD = new Date(cf.rawDate).toISOString().split('T')[0];
      return cfD === formattedDate;
    });
  }, [cashFlowForm.associate, cashFlowForm.date, apiCashFlows]);

  // --- Project Handlers ---
  const handleAddProject = () => {
    setProjectForm({ name: '', client: '', status: 'Active' });
    setEditingProject(null);
    setCurrentView('add_project');
  };

  const handleEditProject = (id, currentName, client, status) => {
    setEditingProject({ id, name: currentName });
    setProjectForm({ name: currentName, client: client || '', status: status || 'Active' });
    setCurrentView('edit_project');
  };

  const handleSaveProject = async () => {
    if (!projectForm.name || !projectForm.client) {
      Alert.alert('Validation Error', 'Please fill all required fields.');
      return;
    }
    const selectedClient = apiClients.find(c => c.name === projectForm.client || c.id === projectForm.client);
    const requestBody = {
      projectName: projectForm.name,
      client: selectedClient?.id || projectForm.client,
      status: projectForm.status,
    };

    setSubmitLoading(true);
    try {
      if (editingProject) {
        await adminSitesApi.updateProject(editingProject.id, requestBody);
        Alert.alert('Success', 'Project updated successfully!');
      } else {
        await adminSitesApi.createProject(requestBody);
        Alert.alert('Success', 'Project added successfully!');
      }
      await refreshProjectsOnly();
      setCurrentView('all_projects');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save project. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteProject = (id) => {
    Alert.alert('Delete Project', 'Are you sure you want to delete this project?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // Optimistic local removal
          setApiProjects(prev => prev.filter(p => p.id !== id));
          try {
            await adminSitesApi.deleteProject(id);
            sitesMasterCache.updateCachedProjects(apiProjects.filter(p => p.id !== id));
            Alert.alert('Success', 'Project deleted successfully!');
          } catch (e) {
            Alert.alert('Error', 'Failed to delete project on server.');
            refreshProjectsOnly();
          }
        },
      },
    ]);
  };

  // --- Cash Flow Handlers ---
  const handleAddCashFlowSubmit = async () => {
    if (!cashFlowForm.associate || cashFlowForm.entries.some(e => !e.receivedFrom || !e.receivedAmount || !e.type)) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }
    const selectedAssociate = apiEmployees.find(e => e.name === cashFlowForm.associate);
    if (!selectedAssociate) {
      Alert.alert('Validation Error', 'Please select a valid business associate.');
      return;
    }

    setSubmitLoading(true);
    try {
      const dateParts = cashFlowForm.date.split(/[-/]/);
      const formattedDate = `${dateParts[2]}-${String(dateParts[0]).padStart(2, '0')}-${String(dateParts[1]).padStart(2, '0')}`;
      
      const newEntries = cashFlowForm.entries.map(e => ({
        receivedFrom: e.receivedFrom,
        receivedAmount: parseFloat(e.receivedAmount) || 0,
        type: e.type,
      }));

      const targetId = cashFlowForm.id || existingAssociateCashFlow?.id;

      if (targetId) {
        // If updating an explicit form or auto-settling with existing daily record
        let mergedEntries = newEntries;
        let openingBal = parseFloat(cashFlowForm.openingBalance) || 0;

        if (existingAssociateCashFlow && !cashFlowForm.id) {
          const prevEntries = Array.isArray(existingAssociateCashFlow.rawEntries) ? existingAssociateCashFlow.rawEntries : [];
          mergedEntries = [...prevEntries, ...newEntries];
          if (openingBal === 0 && (existingAssociateCashFlow.rawOpeningBalance || 0) > 0) {
            openingBal = existingAssociateCashFlow.rawOpeningBalance;
          }
        }

        const requestBody = {
          businessAssociate: selectedAssociate.id,
          date: formattedDate,
          openingBalance: openingBal,
          entries: mergedEntries,
        };

        const res = await adminSitesApi.updateCashFlow(targetId, requestBody);
        Alert.alert('Success', res?.message || 'Cash flow entry settled and updated successfully!');
      } else {
        const requestBody = {
          businessAssociate: selectedAssociate.id,
          date: formattedDate,
          openingBalance: parseFloat(cashFlowForm.openingBalance) || 0,
          entries: newEntries,
        };
        const res = await adminSitesApi.createCashFlow(requestBody);
        Alert.alert('Success', res?.message || 'Cash flow entry assigned & settled successfully!');
      }
      await refreshCashFlowsOnly();
      setCurrentView('cash_flow');
      setCashFlowForm({
        id: null,
        associate: '',
        date: getTodayDateString(),
        openingBalance: '0',
        entries: [{ id: Date.now().toString(), receivedFrom: '', receivedAmount: '', type: '' }]
      });
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save cash flow. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const addCashFlowEntry = () => {
    setCashFlowForm({
      ...cashFlowForm,
      entries: [...cashFlowForm.entries, { id: Date.now().toString(), receivedFrom: '', receivedAmount: '', type: '' }]
    });
  };

  const removeCashFlowEntry = (id) => {
    setCashFlowForm({
      ...cashFlowForm,
      entries: cashFlowForm.entries.filter(e => e.id !== id)
    });
  };

  const updateCashFlowEntry = (id, field, value) => {
    setCashFlowForm({
      ...cashFlowForm,
      entries: cashFlowForm.entries.map(e => e.id === id ? { ...e, [field]: value } : e)
    });
  };

  const handleEditCashFlow = (c) => {
    setCashFlowForm({
      id: c.id,
      associate: c.associate,
      date: c.date,
      openingBalance: c.openingBal.replace('Rs. ', '').replace('₹', '').replace(/,/g, ''),
      entries: [{ id: Date.now().toString(), receivedFrom: c.from, receivedAmount: c.amount.replace('Rs. ', '').replace('₹', '').replace(/,/g, ''), type: c.type }]
    });
    setCurrentView('edit_cash_flow');
  };

  const handleDeleteCashFlow = (id) => {
    Alert.alert('Delete Record', 'Are you sure you want to delete this cash flow record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // Optimistic local removal
          setApiCashFlows(prev => prev.filter(c => c.id !== id));
          try {
            await adminSitesApi.deleteCashFlow(id);
            Alert.alert('Success', 'Cash flow record deleted successfully!');
          } catch (e) {
            Alert.alert('Error', 'Failed to delete record on server.');
            refreshCashFlowsOnly();
          }
        },
      },
    ]);
  };

  // --- Date Expenses Drill-down Modal Handlers ---
  const handleOpenDateExpensesModal = async (cashFlowRow) => {
    setDateExpensesModal({
      visible: true,
      loading: true,
      associateName: cashFlowRow.associate,
      associateId: cashFlowRow.associateId,
      date: cashFlowRow.date,
      rawDate: cashFlowRow.rawDate,
      totalAmount: cashFlowRow.rawTotalExp || 0,
      items: [],
    });
    try {
      const summary = await adminSitesApi.getDateExpensesSummary(cashFlowRow.associateId, cashFlowRow.rawDate);
      setDateExpensesModal(prev => ({
        ...prev,
        loading: false,
        items: summary.data || [],
        totalAmount: summary.totalExpenseAmount || 0,
      }));
    } catch (err) {
      console.error('Error fetching date expenses:', err);
      setDateExpensesModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleExportDateExpenses = () => {
    const headers = ['Category', 'Item Description', 'Quantity', 'Unit', 'Amount (Rs)', 'Project', 'Client', 'Paid To', 'Payment Mode', 'Remarks'];
    const rows = dateExpensesModal.items.map(item => [
      item.category || '',
      item.itemName || '',
      item.quantity || 1,
      item.unit || '',
      item.amount || 0,
      item.project?.projectName || '',
      item.client?.name || '',
      item.paidTo || '',
      item.paymentType || '',
      item.remarks || '',
    ]);
    exportToCsv(`Expenses_${dateExpensesModal.associateName}_${dateExpensesModal.date}.csv`, headers, rows);
  };

  // Expense Auto-Calculate Total Price Handlers
  const handleExpenseQuantityChange = (val) => {
    const qty = parseFloat(val);
    const unitP = parseFloat(expensesForm.unitPrice);
    const newAmount = (!isNaN(qty) && !isNaN(unitP) && qty > 0 && unitP >= 0)
      ? (qty * unitP).toString()
      : expensesForm.amount;
    setExpensesForm(prev => ({
      ...prev,
      quantity: val,
      amount: (!isNaN(qty) && !isNaN(unitP) && qty > 0 && unitP >= 0) ? newAmount : prev.amount
    }));
  };

  const handleExpenseUnitPriceChange = (val) => {
    const unitP = parseFloat(val);
    const qty = parseFloat(expensesForm.quantity);
    const newAmount = (!isNaN(qty) && !isNaN(unitP) && qty > 0 && unitP >= 0)
      ? (qty * unitP).toString()
      : '';
    setExpensesForm(prev => ({
      ...prev,
      unitPrice: val,
      amount: (!isNaN(qty) && !isNaN(unitP) && qty > 0 && unitP >= 0) ? newAmount : prev.amount
    }));
  };

  const handleExpenseTotalAmountChange = (val) => {
    const amt = parseFloat(val);
    const qty = parseFloat(expensesForm.quantity);
    const newUnitPrice = (!isNaN(amt) && !isNaN(qty) && qty > 0)
      ? (amt / qty).toFixed(2)
      : expensesForm.unitPrice;
    setExpensesForm(prev => ({
      ...prev,
      amount: val,
      unitPrice: (!isNaN(amt) && !isNaN(qty) && qty > 0) ? newUnitPrice : prev.unitPrice
    }));
  };

  // --- Expenses Handlers ---
  const handleAddExpensesSubmit = async () => {
    const parsedQty = parseFloat(expensesForm.quantity) || 1;
    const parsedUnitPrice = parseFloat(expensesForm.unitPrice) || 0;
    const finalAmount = (expensesForm.amount && !isNaN(parseFloat(expensesForm.amount)))
      ? parseFloat(expensesForm.amount)
      : (parsedQty * parsedUnitPrice);

    if (!expensesForm.project || !expensesForm.associate || finalAmount <= 0 || !expensesForm.paidTo || !expensesForm.category) {
      Alert.alert('Validation Error', 'Please fill in required fields: Project, Business Associate, Category, Single Item Price / Total Amount, and Paid To.');
      return;
    }
    setSubmitLoading(true);
    try {
      const selectedProject = apiProjects.find(p => p.name === expensesForm.project || p.id === expensesForm.project);
      const selectedAssociate = apiEmployees.find(e => e.name === expensesForm.associate || e.id === expensesForm.associate);
      const selectedClient = apiClients.find(c => c.name === expensesForm.client || c.id === expensesForm.client);

      const dateParts = expensesForm.date.split(/[-/]/);
      const formattedDate = `${dateParts[2]}-${dateParts[0]}-${dateParts[1]}`;

      const requestBody = {
        project: selectedProject?.id || expensesForm.project,
        client: selectedClient?.id || selectedProject?.clientId || undefined,
        businessAssociate: selectedAssociate?.id || expensesForm.associate,
        category: expensesForm.category,
        itemName: expensesForm.itemName,
        quantity: parsedQty,
        unit: expensesForm.unit || 'Pcs',
        unitPrice: parsedUnitPrice || (parsedQty > 0 ? (finalAmount / parsedQty) : 0),
        amount: finalAmount,
        paidTo: expensesForm.paidTo,
        date: formattedDate,
        paymentType: expensesForm.paymentType || 'Cash',
        remarks: expensesForm.remarks,
      };

      await adminSitesApi.createExpense(requestBody);
      await refreshExpensesOnly();
      refreshCashFlowsOnly();
      Alert.alert('Success', 'Expense record added and cash flow synced successfully!');
      setExpensesForm({
        client: '',
        project: '',
        associate: '',
        category: 'Keele',
        itemName: '',
        quantity: '1',
        unit: 'Pcs',
        unitPrice: '',
        amount: '',
        paidTo: '',
        date: getTodayDateString(),
        paymentType: 'Cash',
        remarks: '',
      });
      setCurrentView('all_expenses');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add expense record.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteExpense = (id) => {
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // Optimistic local removal
          setApiExpenses(prev => prev.filter(e => e.id !== id));
          try {
            await adminSitesApi.deleteExpense(id);
            refreshCashFlowsOnly();
            if (currentView === 'daily_project_sheet') {
              fetchDailyProjectSheet(sheetDate, sheetAssociateFilter, sheetProjectFilter);
            }
            Alert.alert('Success', 'Expense deleted and cash flow updated!');
          } catch (e) {
            Alert.alert('Error', 'Failed to delete expense on server.');
            refreshExpensesOnly();
          }
        },
      },
    ]);
  };

  // --- Fetch Daily Project Expense Sheet ---
  const fetchDailyProjectSheet = async (targetDate = sheetDate, associate = sheetAssociateFilter, project = sheetProjectFilter) => {
    setDailySheetLoading(true);
    try {
      const params = { date: targetDate };
      if (associate) {
        const found = apiEmployees.find(e => e.name === associate || e.id === associate);
        params.businessAssociate = found?.id || associate;
      }
      if (project) {
        const foundP = apiProjects.find(p => p.name === project || p.id === project);
        params.project = foundP?.id || project;
      }
      const res = await adminSitesApi.getDailyProjectExpenseSheet(params);
      if (res && res.success) {
        setDailySheetData(res.data || []);
        setDailySheetGrandTotal(res.totalDayExpense || 0);
        setDailySheetTotalCount(res.totalExpensesCount || 0);
      } else {
        setDailySheetData([]);
        setDailySheetGrandTotal(0);
        setDailySheetTotalCount(0);
      }
    } catch (err) {
      console.error('Error fetching daily project sheet:', err);
      setDailySheetData([]);
      setDailySheetGrandTotal(0);
      setDailySheetTotalCount(0);
    } finally {
      setDailySheetLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'daily_project_sheet') {
      fetchDailyProjectSheet(sheetDate, sheetAssociateFilter, sheetProjectFilter);
    }
  }, [currentView, sheetDate, sheetAssociateFilter, sheetProjectFilter]);

  const handleAddCustomCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Validation Error', 'Category name cannot be empty.');
      return;
    }
    setAddingCategory(true);
    try {
      await adminSitesApi.addExpenseCategory(newCategoryName.trim());
      const updatedCategories = await adminSitesApi.getExpenseCategories();
      setCategoriesList(updatedCategories);
      setExpensesForm(prev => ({ ...prev, category: newCategoryName.trim() }));
      setNewCategoryName('');
      setShowCategoryModal(false);
      Alert.alert('Success', 'New category added!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add category.');
    } finally {
      setAddingCategory(false);
    }
  };

  const handleAddWorkStatusSubmit = async () => {
    if (!workStatusForm.project) {
      Alert.alert('Validation Error', 'Please select a Project.');
      return;
    }
    setSubmitLoading(true);
    try {
      await adminSitesApi.createWorkStatus({
        projectName: workStatusForm.project,
        clientName: workStatusForm.client,
        dateStr: workStatusForm.date || getTodayFormattedDDMMYYYY(),
        today: workStatusForm.todayStatus || '',
        tomorrow: workStatusForm.tomorrowPlan || '',
        dayAfterTomorrow: workStatusForm.dayAfterTomorrowPlan || '',
        createdBy: workStatusForm.associate || 'Admin',
      });
      Alert.alert('Success', 'Work status added and synchronized to database successfully!');
      setWorkStatusForm({
        associate: '',
        client: '',
        project: '',
        date: getTodayFormattedDDMMYYYY(),
        todayStatus: '',
        tomorrowPlan: '',
        dayAfterTomorrowPlan: '',
      });
      fetchWorkStatuses(1, workStatusLimit);
      setCurrentView('work_status');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save work status.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditWorkStatus = (item) => {
    setWorkStatusEditingItem({
      ...item,
      today: item.today || '',
      tomorrow: item.tomorrow || '',
      dayAfterTomorrow: item.dayAfterTomorrow || '',
      notes: item.notes || '',
    });
    setWorkStatusEditModalVisible(true);
  };

  const handleSaveWorkStatusEdit = async () => {
    if (!workStatusEditingItem) return;
    setWorkStatusSaving(true);
    try {
      await adminSitesApi.updateWorkStatus(workStatusEditingItem._id, {
        today: workStatusEditingItem.today,
        tomorrow: workStatusEditingItem.tomorrow,
        dayAfterTomorrow: workStatusEditingItem.dayAfterTomorrow,
        notes: workStatusEditingItem.notes,
      });
      Alert.alert('Updated', 'Work status updated successfully!');
      setWorkStatusEditModalVisible(false);
      setWorkStatusEditingItem(null);
      fetchWorkStatuses();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update work status.');
    } finally {
      setWorkStatusSaving(false);
    }
  };

  const handleDeleteWorkStatus = (item) => {
    Alert.alert(
      'Delete Work Status',
      `Are you sure you want to delete status for ${item.projectName} (${item.dateStr})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminSitesApi.deleteWorkStatus(item._id);
              Alert.alert('Deleted', 'Work status deleted successfully.');
              fetchWorkStatuses();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete work status.');
            }
          },
        },
      ]
    );
  };

  const handleAddPaymentSubmit = () => {
    if (!paymentForm.client || !paymentForm.project || !paymentForm.amount) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }
    setSubmitLoading(true);
    setTimeout(() => {
      setSubmitLoading(false);
      Alert.alert('Success', editingPayment ? 'Client payment updated successfully!' : 'Client payment added successfully!');
      setEditingPayment(null);
      setPaymentForm({
        client: '',
        project: '',
        date: getTodayDateString(),
        amount: '',
        mode: 'UPI',
        reference: '',
        remarks: '',
      });
      setCurrentView('client_payments');
    }, 400);
  };

  const handleEditClientPayment = (payment) => {
    setEditingPayment(payment);
    setPaymentForm({
      client: payment.client,
      project: payment.project,
      date: payment.date || '06/12/2026',
      amount: payment.amount ? payment.amount.replace('Rs. ', '') : '',
      mode: payment.type,
      remarks: payment.comment,
    });
    setCurrentView('edit_client_payment');
  };

  // --- Dynamic View Title ---
  const getViewConfig = () => {
    switch (currentView) {
      case 'all_projects':
        return { title: 'Projects' };
      case 'add_project':
        return { title: 'Add Project' };
      case 'edit_project':
        return { title: editingProject?.name || 'Edit Project' };
      case 'tomorrow_clients':
        return { title: "Tomorrow's Clients Plan" };
      case 'tomorrow_leads':
        return { title: "Tomorrow's Leads Plan" };
      case 'add_cash_flow':
        return { title: 'Add Cash Flow' };
      case 'edit_cash_flow':
        return { title: 'Cash Flow Update' };
      case 'cash_flow':
        return { title: 'Cash Flow List' };
      case 'all_expenses':
        return { title: 'All Expenses' };
      case 'daily_project_sheet':
        return { title: 'Daily Project Sheet' };
      case 'add_expenses':
        return { title: 'Add Expenses' };
      case 'work_status':
        return { title: 'Work Status' };
      case 'add_work_status':
        return { title: 'Add Work Status' };
      case 'client_payments':
        return { title: 'Client Payments' };
      case 'add_client_payment':
        return { title: 'Add Client Payment' };
      case 'edit_client_payment':
        return { title: 'Edit Client Payment' };
      default:
        return { title: 'Sites Management' };
    }
  };

  const config = getViewConfig();

  // --- View Renderers ---

  // 1. All Projects UI
  const renderAllProjects = () => {
    const filteredProjects = apiProjects.filter((p) => {
      const matchClient = !selectedClientFilter || p.client === selectedClientFilter;
      const matchStatus = !selectedStatusFilter || p.status === selectedStatusFilter;
      return matchClient && matchStatus;
    });

    const totalProjectsPages = Math.max(1, Math.ceil(filteredProjects.length / projectsPageSize));
    const safeProjectsPage = Math.min(Math.max(1, projectsPage), totalProjectsPages);
    const startProjectIndex = (safeProjectsPage - 1) * projectsPageSize;
    const endProjectIndex = Math.min(startProjectIndex + projectsPageSize, filteredProjects.length);
    const paginatedProjects = filteredProjects.slice(startProjectIndex, endProjectIndex);

    return (
      <View style={styles.viewContainer}>
        {/* Unified Filter Card - Stacked Vertically for mobile spacing */}
        <View style={styles.filterCard}>
          <Text style={styles.cardHeaderTitle}>Filter Projects</Text>
          
          <DropdownSelector
            label="Client"
            value={selectedClientFilter}
            placeholder="All Clients"
            title="Filter by Client"
            options={[{ label: 'All Clients', value: '' }, ...apiClients.map(c => ({ label: c.name, value: c.name }))]}
            onSelect={(val) => {
              setSelectedClientFilter(val);
              setProjectsPage(1);
            }}
            containerStyle={styles.fieldContainer}
          />

          <DropdownSelector
            label="Project Status"
            value={selectedStatusFilter}
            placeholder="All Statuses"
            title="Filter by Status"
            options={[
              { label: 'All Statuses', value: '' },
              { label: 'Active', value: 'Active' },
              { label: 'Inactive', value: 'Inactive' },
            ]}
            onSelect={(val) => {
              setSelectedStatusFilter(val);
              setProjectsPage(1);
            }}
            containerStyle={styles.fieldContainer}
          />
        </View>

        {/* Action Buttons & Table Section */}
        <View style={styles.tableCard}>
          {/* Refined Header: Stacks layout to prevent overlaps on mobile screens */}
          <View style={styles.tableCardHeader}>
            <View>
              <Text style={styles.tableTitle}>Projects List</Text>
              <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 }}>
                {filteredProjects.length} total projects
              </Text>
            </View>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.tealButton}
                onPress={() => {
                  const headers = ['S. No.', 'Project Name', 'Client Name', 'Status'];
                  const rows = filteredProjects.map((p, idx) => [idx + 1, p.name || p.projectName, p.client, p.status]);
                  const directUrl = adminSitesApi.getDirectExportUrl('projects');
                  exportToCsv(`Projects_List_${getTodayFormattedDDMMYYYY()}.csv`, headers, rows, directUrl);
                }}
              >
                <MaterialIcons name="file-download" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.tealButtonText}>Export</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tealButton, { marginLeft: 8 }]} onPress={handleAddProject}>
                <MaterialIcons name="add" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.tealButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Table with optimized columns to minimize scrolling */}
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableColHeader, { width: 170 }]}>Project Name</Text>
                <Text style={[styles.tableColHeader, { width: 130 }]}>Client Name</Text>
                <Text style={[styles.tableColHeader, { width: 80 }]}>Status</Text>
                <Text style={[styles.tableColHeader, { width: 100, textAlign: 'center' }]}>Action</Text>
              </View>

              {/* Table Body */}
              {paginatedProjects.length > 0 ? (
                paginatedProjects.map((p, pIdx) => (
                  <View key={p.id} style={[styles.tableRow, { backgroundColor: pIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }]}>
                    <Text style={[styles.tableCell, { width: 170 }]} numberOfLines={2}>{p.name}</Text>
                    <Text style={[styles.tableCell, { width: 130 }]} numberOfLines={1}>{p.client}</Text>
                    <View style={[{ width: 80 }, styles.centerAlign]}>
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>{p.status}</Text>
                      </View>
                    </View>
                    <View style={[styles.actionCell, { width: 100 }]}>
                      <TouchableOpacity style={styles.editBtn} onPress={() => handleEditProject(p.id, p.name, p.client, p.status)}>
                        <MaterialIcons name="edit" size={14} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteProject(p.id)}>
                        <MaterialIcons name="delete" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noDataRow}>
                  <Text style={styles.noDataText}>No projects found</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Pagination Controls */}
          {filteredProjects.length > 0 && (
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: '#ffffff',
              borderTopWidth: 1,
              borderTopColor: '#f1f5f9',
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>
                Showing {startProjectIndex + 1} - {endProjectIndex} of {filteredProjects.length}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: safeProjectsPage > 1 ? '#009688' : '#f1f5f9',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  disabled={safeProjectsPage <= 1}
                  onPress={() => setProjectsPage(p => Math.max(1, p - 1))}
                >
                  <MaterialIcons name="chevron-left" size={18} color={safeProjectsPage > 1 ? '#fff' : '#94a3b8'} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: safeProjectsPage > 1 ? '#fff' : '#94a3b8' }}>Prev</Text>
                </TouchableOpacity>

                <View style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b' }}>
                    {safeProjectsPage} / {totalProjectsPages}
                  </Text>
                </View>

                <TouchableOpacity
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: safeProjectsPage < totalProjectsPages ? '#009688' : '#f1f5f9',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  disabled={safeProjectsPage >= totalProjectsPages}
                  onPress={() => setProjectsPage(p => Math.min(totalProjectsPages, p + 1))}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: safeProjectsPage < totalProjectsPages ? '#fff' : '#94a3b8' }}>Next</Text>
                  <MaterialIcons name="chevron-right" size={18} color={safeProjectsPage < totalProjectsPages ? '#fff' : '#94a3b8'} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  // 1a. Add / Edit Project UI
  const renderAddEditProject = () => {
    return (
      <View style={styles.viewContainer}>
        <View style={styles.formCard}>
          <Text style={styles.formSectionTitle}>{editingProject ? 'Edit Project' : 'Add Project'} Details</Text>
          
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Project/Site Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.formInput}
              value={projectForm.name}
              onChangeText={(val) => setProjectForm({ ...projectForm, name: val })}
              placeholder="Enter Project Name"
              placeholderTextColor="#94a3b8"
            />
          </View>
          
          <DropdownSelector
            label="Client"
            required
            value={projectForm.client}
            placeholder="Select Client"
            title="Select Client"
            options={[{ label: 'Select Client', value: '' }, ...apiClients.map(c => ({ label: c.name, value: c.name }))]}
            onSelect={(val) => setProjectForm({ ...projectForm, client: val })}
            containerStyle={styles.formField}
          />

          <DropdownSelector
            label="Project/Site Status"
            required
            value={projectForm.status}
            placeholder="Select Status"
            title="Select Project Status"
            options={[
              { label: 'Active', value: 'Active' },
              { label: 'Inactive', value: 'Inactive' },
            ]}
            onSelect={(val) => setProjectForm({ ...projectForm, status: val })}
            containerStyle={styles.formField}
          />
          
          <View style={[styles.formFooter, { justifyContent: 'flex-end' }]}>
            <TouchableOpacity 
              style={[styles.solidTealButton, submitLoading && { opacity: 0.7 }]} 
              onPress={handleSaveProject}
              disabled={submitLoading}
            >
              {submitLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.solidTealButtonText}>Saving...</Text>
                </View>
              ) : (
                <Text style={styles.solidTealButtonText}>
                  {editingProject ? 'Update Project' : 'Submit'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // 2. Tomorrow's Action Plan Clients UI (Points to Civil Action Plan Sheet)
  const renderTomorrowClients = () => {
    return renderWorkStatus();
  };

  // 3. Tomorrow's Action Plan Leads UI
  const renderTomorrowLeads = () => {
    const plans = [
      { id: '1', lead: 'Amit Sharma', plan: 'Coordinate site visit for flat inspection.', contact: '9876543210', supervisor: 'Admin', date: '06/12/2026' },
      { id: '2', lead: 'Rita Patel', plan: 'Forward custom payment schedules and pricing details.', contact: '9988776655', supervisor: 'Admin', date: '06/12/2026' },
    ];
    return (
      <View style={styles.viewContainer}>
        <View style={styles.tableCard}>
          <View style={styles.tableCardHeader}>
            <Text style={styles.tableTitle}>Leads Action Plan</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.tableContainer}>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableColHeader, { width: 130 }]}>Lead Name</Text>
                <Text style={[styles.tableColHeader, { width: 200 }]}>Action Plan for Tomorrow</Text>
                <Text style={[styles.tableColHeader, { width: 110 }]}>Contact No.</Text>
                <Text style={[styles.tableColHeader, { width: 90 }]}>Supervisor</Text>
                <Text style={[styles.tableColHeader, { width: 100 }]}>Date</Text>
              </View>
              {plans.map((p) => (
                <View key={p.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: 130 }]}>{p.lead}</Text>
                  <Text style={[styles.tableCell, { width: 200 }]} numberOfLines={3}>{p.plan}</Text>
                  <Text style={[styles.tableCell, { width: 110 }]}>{p.contact}</Text>
                  <Text style={[styles.tableCell, { width: 90 }]}>{p.supervisor}</Text>
                  <Text style={[styles.tableCell, { width: 100 }]}>{p.date}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  // 4. Add Cash Flow UI (Image 5)
  const renderAddCashFlow = () => {
    return (
      <View style={styles.viewContainer}>
        <View style={styles.formCard}>
          <Text style={styles.formSectionTitle}>Cash Flow Details</Text>

          {/* Settle Badge if existing record found for this associate on this date */}
          {existingAssociateCashFlow && !cashFlowForm.id && (
            <View style={styles.settleInfoBadge}>
              <MaterialIcons name="sync" size={22} color="#00796b" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.settleInfoTitle}>Auto-Settlement Active</Text>
                <Text style={styles.settleInfoText}>
                  A cash flow record already exists for {cashFlowForm.associate} on this date.
                  Submitting will automatically settle and append these cash entries to their daily balance.
                </Text>
              </View>
            </View>
          )}

          {/* Top Fields */}
          <DropdownSelector
            label="Business Associate"
            required
            value={cashFlowForm.associate}
            placeholder="Select Associate"
            title="Select Business Associate"
            options={[{ label: 'Select Associate', value: '' }, ...apiEmployees.map(a => ({ label: a.name, value: a.name }))]}
            onSelect={(val) => handleAssociateChangeInCashFlow(val)}
            containerStyle={styles.formField}
          />

          <View style={{flexDirection: 'row', gap: 10, marginBottom: 16}}>
            <View style={{flex: 1}}>
              <Text style={styles.formLabel}>Date <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity onPress={() => openDatePicker('cashFlowForm.date', cashFlowForm.date)}>
                <View style={styles.dateInputWrapper} pointerEvents="none">
                  <TextInput
                    style={styles.dateInput}
                    value={cashFlowForm.date}
                    placeholder="mm/dd/yyyy"
                    placeholderTextColor="#94a3b8"
                    editable={false}
                  />
                  <MaterialIcons name="event" size={20} color="#009688" style={styles.dateIcon} />
                </View>
              </TouchableOpacity>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.formLabel}>Opening Balance (Auto/Edit)</Text>
              <TextInput
                style={styles.formInput}
                value={cashFlowForm.openingBalance}
                onChangeText={(val) => setCashFlowForm({ ...cashFlowForm, openingBalance: val })}
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          {/* Dynamic Entries */}
          {cashFlowForm.entries.map((entry, index) => (
            <View key={entry.id} style={{ marginBottom: 16, padding: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8 }}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                <Text style={{fontWeight: 'bold', color: '#475569'}}>Entry {index + 1}</Text>
                {cashFlowForm.entries.length > 1 && (
                  <TouchableOpacity onPress={() => removeCashFlowEntry(entry.id)}>
                    <Text style={{color: '#ef4444', fontWeight: '600'}}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={{flexDirection: 'row', gap: 10, marginBottom: 10}}>
                <View style={{flex: 1}}>
                  <Text style={styles.formLabel}>Received From <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.formInput}
                    value={entry.receivedFrom}
                    onChangeText={(val) => updateCashFlowEntry(entry.id, 'receivedFrom', val)}
                    placeholder="Enter sender"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.formLabel}>Received Amount <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.formInput}
                    value={entry.receivedAmount}
                    onChangeText={(val) => updateCashFlowEntry(entry.id, 'receivedAmount', val)}
                    keyboardType="numeric"
                    placeholder="Amount"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <DropdownSelector
                label="Type"
                required
                value={entry.type}
                placeholder="Select Type"
                title="Select Payment Type"
                options={paymentTypesList}
                onSelect={(val) => updateCashFlowEntry(entry.id, 'type', val)}
                containerStyle={styles.formField}
              />
            </View>
          ))}

          <View style={styles.formFooter}>
            <TouchableOpacity style={styles.outlineTealButton} onPress={addCashFlowEntry}>
              <Text style={styles.outlineTealButtonText}>Add More</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.solidTealButton, submitLoading && { opacity: 0.7 }]} 
              onPress={handleAddCashFlowSubmit}
              disabled={submitLoading}
            >
              {submitLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.solidTealButtonText}>Submitting...</Text>
                </View>
              ) : (
                <Text style={styles.solidTealButtonText}>
                  {cashFlowForm.id ? 'Update Cash Flow' : (existingAssociateCashFlow ? 'Settle & Add Cash Flow' : 'Submit')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // 5. Cash Flow Listing UI
  const renderCashFlowList = () => {
    const isSameDayMatch = (dateVal, filterStr) => {
      if (!filterStr) return true;
      if (!dateVal) return false;
      const d1 = new Date(dateVal);
      const d2 = new Date(filterStr);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
      }
      return String(dateVal).includes(filterStr);
    };

    const filteredCashFlows = apiCashFlows.filter((c) => {
      const matchAssociate = !cashFlowAssociateFilter || c.associate === cashFlowAssociateFilter;
      const matchDate = !cashFlowDateFilter || isSameDayMatch(c.rawDate || c.date, cashFlowDateFilter);
      return matchAssociate && matchDate;
    });

    const totalFilteredReceived = filteredCashFlows.reduce((sum, c) => sum + (c.rawTotalRec || 0), 0);
    const totalFilteredExpense = filteredCashFlows.reduce((sum, c) => sum + (c.rawTotalExp || 0), 0);
    const totalFilteredClosing = filteredCashFlows.reduce((sum, c) => sum + (c.rawClosingBal || 0), 0);

    const resetCashFlowFilters = () => {
      setCashFlowAssociateFilter('');
      setCashFlowDateFilter('');
      setCashFlowPage(1);
    };

    const totalPages = Math.max(1, Math.ceil(filteredCashFlows.length / cashFlowPageSize));
    const safeCurrentPage = Math.min(Math.max(1, cashFlowPage), totalPages);
    const startIndex = (safeCurrentPage - 1) * cashFlowPageSize;
    const endIndex = Math.min(startIndex + cashFlowPageSize, filteredCashFlows.length);
    const paginatedCashFlows = filteredCashFlows.slice(startIndex, endIndex);

    return (
      <View style={styles.viewContainer}>
        {/* Cash Flow Filter Card */}
        <View style={styles.filterCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={styles.cardHeaderTitle}>Filter Cash Flow</Text>
            {(cashFlowAssociateFilter || cashFlowDateFilter) ? (
              <TouchableOpacity onPress={resetCashFlowFilters}>
                <Text style={{ color: '#009688', fontWeight: '700', fontSize: 13 }}>Reset Filters</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Business Associate Filter */}
          <DropdownSelector
            label="Business Associate"
            value={cashFlowAssociateFilter}
            placeholder="All Associates"
            title="Filter by Business Associate"
            options={[{ label: 'All Associates', value: '' }, ...apiEmployees.map(e => ({ label: e.name, value: e.name }))]}
            onSelect={(val) => {
              setCashFlowAssociateFilter(val);
              setCashFlowPage(1);
            }}
            containerStyle={styles.fieldContainer}
          />

          {/* Date Filter */}
          <View style={styles.fieldContainer}>
            <Text style={styles.filterLabel}>Date</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={[styles.pickerBorder, { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, justifyContent: 'space-between' }]}
                onPress={() => openDatePicker('cashFlowDateFilter', cashFlowDateFilter || getTodayDateString())}
              >
                <Text style={{ color: cashFlowDateFilter ? '#1e293b' : '#94a3b8', fontSize: 14, fontWeight: '500' }}>
                  {cashFlowDateFilter || 'Filter by Date (All)'}
                </Text>
                <MaterialIcons name="calendar-today" size={18} color="#009688" />
              </TouchableOpacity>
              {cashFlowDateFilter ? (
                <TouchableOpacity
                  style={{ padding: 12, backgroundColor: '#fee2e2', borderRadius: 10 }}
                  onPress={() => {
                    setCashFlowDateFilter('');
                    setCashFlowPage(1);
                  }}
                >
                  <MaterialIcons name="clear" size={18} color="#ef4444" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* Cash Flow Summary Metrics */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {/* Total Received */}
          <View style={{
            flex: 1,
            backgroundColor: '#f0fdf4',
            borderRadius: 12,
            padding: 10,
            borderLeftWidth: 4,
            borderLeftColor: '#16a34a',
            elevation: 2,
            shadowColor: '#16a34a',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>
              Received
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#166534', marginTop: 4 }} numberOfLines={1}>
              Rs. {totalFilteredReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>

          {/* Total Expense */}
          <View style={{
            flex: 1,
            backgroundColor: '#fef2f2',
            borderRadius: 12,
            padding: 10,
            borderLeftWidth: 4,
            borderLeftColor: '#dc2626',
            elevation: 2,
            shadowColor: '#dc2626',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#b91c1c', textTransform: 'uppercase' }}>
              Expense
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#991b1b', marginTop: 4 }} numberOfLines={1}>
              Rs. {totalFilteredExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>

          {/* Net Closing Balance */}
          <View style={{
            flex: 1,
            backgroundColor: totalFilteredClosing < 0 ? '#fef2f2' : '#f0fdfa',
            borderRadius: 12,
            padding: 10,
            borderLeftWidth: 4,
            borderLeftColor: totalFilteredClosing < 0 ? '#ef4444' : '#009688',
            elevation: 2,
            shadowColor: '#009688',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: totalFilteredClosing < 0 ? '#b91c1c' : '#00796b', textTransform: 'uppercase' }}>
              Closing
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: totalFilteredClosing < 0 ? '#dc2626' : '#004d40', marginTop: 4 }} numberOfLines={1}>
              Rs. {totalFilteredClosing.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Table Card */}
        <View style={styles.tableCard}>
          <View style={styles.tableCardHeader}>
            <View>
              <Text style={styles.tableTitle}>Cash Flow Report</Text>
              <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 }}>
                {filteredCashFlows.length} total records
              </Text>
            </View>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.tealButton}
                onPress={() => {
                  const headers = ['Business Associate', 'Date', 'Opening Balance', 'Total Received', 'Total Expense', 'Received From', 'Closing Balance'];
                  const rows = filteredCashFlows.map(c => [c.associate, c.date, c.openingBal, c.totalRec, c.totalExp, c.from, c.closingBal]);
                  const directUrl = adminSitesApi.getDirectExportUrl('cashflow', { associate: selectedAssociateFilter || undefined });
                  exportToCsv(`CashFlow_Report_${getTodayFormattedDDMMYYYY()}.csv`, headers, rows, directUrl);
                }}
              >
                <MaterialIcons name="file-download" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.tealButtonText}>Export</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tealButton, { marginLeft: 8 }]}
                onPress={() => setCurrentView('add_cash_flow')}
              >
                <MaterialIcons name="add" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.tealButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.tableContainer}>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableColHeader, { width: 140 }]}>Business Associate</Text>
                <Text style={[styles.tableColHeader, { width: 90 }]}>Date</Text>
                <Text style={[styles.tableColHeader, { width: 110 }]}>Opening Balance</Text>
                <Text style={[styles.tableColHeader, { width: 100 }]}>Total Received</Text>
                <Text style={[styles.tableColHeader, { width: 120, textAlign: 'center' }]}>Total Expense</Text>
                <Text style={[styles.tableColHeader, { width: 130 }]}>Received From</Text>
                <Text style={[styles.tableColHeader, { width: 110 }]}>Closing Balance</Text>
                <Text style={[styles.tableColHeader, { width: 90, textAlign: 'center' }]}>Action</Text>
              </View>
              {paginatedCashFlows.length > 0 ? (
                paginatedCashFlows.map((c, cIdx) => {
                  const isNegative = c.closingBal.includes('-');
                  const isPositive = !isNegative && c.closingBal !== 'Rs. 0.00' && c.closingBal !== '0';
                  return (
                    <View key={c.id} style={[styles.tableRow, { backgroundColor: cIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }]}>
                      <Text style={[styles.tableCell, { width: 140 }]}>{c.associate}</Text>
                      <Text style={[styles.tableCell, { width: 90 }]}>{c.date}</Text>
                      <Text style={[styles.tableCell, { width: 110 }]}>{c.openingBal}</Text>
                      <Text style={[styles.tableCell, { width: 100 }]}>{c.totalRec}</Text>
                      <View style={[{ width: 120 }, styles.centerAlign]}>
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#e0f2f1',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: '#009688',
                          }}
                          onPress={() => handleOpenDateExpensesModal(c)}
                        >
                          <Text style={{ color: '#00796b', fontWeight: '700', fontSize: 13 }}>{c.totalExp}</Text>
                          <MaterialIcons name="visibility" size={13} color="#00796b" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.tableCell, { width: 130 }]} numberOfLines={1}>{c.from}</Text>
                      <View style={[{ width: 110 }, styles.centerAlign]}>
                        <View style={{
                          backgroundColor: isNegative ? '#ef4444' : isPositive ? '#16a34a' : 'transparent',
                          paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4
                        }}>
                          <Text style={{ color: isNegative || isPositive ? '#fff' : '#334155', fontWeight: '600' }}>
                            {c.closingBal}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.actionCell, { width: 90 }]}>
                        <TouchableOpacity style={styles.editBtn} onPress={() => handleEditCashFlow(c)}>
                          <MaterialIcons name="edit" size={14} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteCashFlow(c.id)}>
                          <MaterialIcons name="delete" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.noDataRow}>
                  <Text style={styles.noDataText}>No cash flow records found for selected filters</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Pagination Controls */}
          {filteredCashFlows.length > 0 && (
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: '#ffffff',
              borderTopWidth: 1,
              borderTopColor: '#f1f5f9',
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>
                Showing {startIndex + 1} - {endIndex} of {filteredCashFlows.length}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: safeCurrentPage > 1 ? '#009688' : '#f1f5f9',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  disabled={safeCurrentPage <= 1}
                  onPress={() => setCashFlowPage(p => Math.max(1, p - 1))}
                >
                  <MaterialIcons name="chevron-left" size={18} color={safeCurrentPage > 1 ? '#fff' : '#94a3b8'} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: safeCurrentPage > 1 ? '#fff' : '#94a3b8' }}>Prev</Text>
                </TouchableOpacity>

                <View style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b' }}>
                    {safeCurrentPage} / {totalPages}
                  </Text>
                </View>

                <TouchableOpacity
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: safeCurrentPage < totalPages ? '#009688' : '#f1f5f9',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  disabled={safeCurrentPage >= totalPages}
                  onPress={() => setCashFlowPage(p => Math.min(totalPages, p + 1))}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: safeCurrentPage < totalPages ? '#fff' : '#94a3b8' }}>Next</Text>
                  <MaterialIcons name="chevron-right" size={18} color={safeCurrentPage < totalPages ? '#fff' : '#94a3b8'} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  // 6. All Expenses Listing UI
  const renderExpensesList = () => {
    const filteredExpenses = apiExpenses.filter((e) => {
      const matchAssociate = !selectedAssociateFilter || e.associate === selectedAssociateFilter;
      const matchClient = !selectedClientFilter || e.client === selectedClientFilter;
      const matchProject = !selectedProjectFilter || e.project === selectedProjectFilter;
      const matchStatus = !selectedStatusFilter || e.projectStatus === selectedStatusFilter;
      const matchCategory = !selectedCategoryFilter || e.category === selectedCategoryFilter;
      const matchType = !selectedPaymentTypeFilter || e.type === selectedPaymentTypeFilter;
      return matchAssociate && matchClient && matchProject && matchStatus && matchCategory && matchType;
    });

    const totalExpensesPages = Math.max(1, Math.ceil(filteredExpenses.length / expensesPageSize));
    const safeExpensesPage = Math.min(Math.max(1, expensesPage), totalExpensesPages);
    const startExpenseIndex = (safeExpensesPage - 1) * expensesPageSize;
    const endExpenseIndex = Math.min(startExpenseIndex + expensesPageSize, filteredExpenses.length);
    const paginatedExpenses = filteredExpenses.slice(startExpenseIndex, endExpenseIndex);

    const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + (e.rawAmount || 0), 0);

    const handleExportExpenses = () => {
      const headers = ['Date', 'Business Associate', 'Project', 'Client', 'Category', 'Item Description', 'Quantity', 'Unit', 'Amount (Rs)', 'Paid To', 'Payment Type', 'Remarks'];
      const rows = filteredExpenses.map(e => [
        e.date,
        e.associate,
        e.project,
        e.client,
        e.category,
        e.itemName,
        e.quantity,
        e.unit,
        e.rawAmount,
        e.paidTo,
        e.type,
        e.remarks,
      ]);
      const params = {};
      if (selectedAssociateFilter) params.associate = selectedAssociateFilter;
      if (selectedProjectFilter) params.project = selectedProjectFilter;
      if (selectedClientFilter) params.client = selectedClientFilter;
      const directUrl = adminSitesApi.getDirectExportUrl('expenses', params);
      exportToCsv(`Expenses_List_${getTodayFormattedDDMMYYYY()}.csv`, headers, rows, directUrl);
    };

    const resetExpenseFilters = () => {
      setSelectedAssociateFilter('');
      setSelectedClientFilter('');
      setSelectedProjectFilter('');
      setSelectedStatusFilter('');
      setSelectedCategoryFilter('');
      setSelectedPaymentTypeFilter('');
      setExpensesPage(1);
    };

    return (
      <View style={styles.viewContainer}>
        {/* Advanced 7-Attribute Filter Card */}
        <View style={styles.filterCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={styles.cardHeaderTitle}>Filter Expenses</Text>
            <TouchableOpacity onPress={resetExpenseFilters}>
              <Text style={{ color: '#009688', fontWeight: '700', fontSize: 13 }}>Reset Filters</Text>
            </TouchableOpacity>
          </View>

          {/* Filter 1: Business Associate */}
          <DropdownSelector
            label="Business Associate"
            value={selectedAssociateFilter}
            placeholder="All Associates"
            title="Filter by Business Associate"
            options={[{ label: 'All Associates', value: '' }, ...apiEmployees.map(a => ({ label: a.name, value: a.name }))]}
            onSelect={(val) => {
              setSelectedAssociateFilter(val);
              setExpensesPage(1);
            }}
            containerStyle={styles.fieldContainer}
          />

          {/* Filter 2 & 3: Client & Project */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <DropdownSelector
              label="Client"
              value={selectedClientFilter}
              placeholder="All Clients"
              title="Filter by Client"
              options={[{ label: 'All Clients', value: '' }, ...apiClients.map(c => ({ label: c.name, value: c.name }))]}
              onSelect={(val) => {
                setSelectedClientFilter(val);
                setExpensesPage(1);
              }}
              containerStyle={[styles.fieldContainer, { flex: 1 }]}
            />

            <DropdownSelector
              label="Project"
              value={selectedProjectFilter}
              placeholder="All Projects"
              title="Filter by Project"
              options={[{ label: 'All Projects', value: '' }, ...apiProjects.map(p => ({ label: p.name, value: p.name }))]}
              onSelect={(val) => {
                setSelectedProjectFilter(val);
                setExpensesPage(1);
              }}
              containerStyle={[styles.fieldContainer, { flex: 1 }]}
            />
          </View>

          {/* Filter 4 & 5: Project Status & Category */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <DropdownSelector
              label="Project Status"
              value={selectedStatusFilter}
              placeholder="All Statuses"
              title="Filter by Status"
              options={[
                { label: 'All Statuses', value: '' },
                { label: 'Active', value: 'Active' },
                { label: 'Completed', value: 'Completed' },
              ]}
              onSelect={(val) => {
                setSelectedStatusFilter(val);
                setExpensesPage(1);
              }}
              containerStyle={[styles.fieldContainer, { flex: 1 }]}
            />

            <DropdownSelector
              label="Category"
              value={selectedCategoryFilter}
              placeholder="All Categories"
              title="Filter by Category"
              options={[{ label: 'All Categories', value: '' }, ...categoriesList.map(cat => ({ label: cat, value: cat }))]}
              onSelect={(val) => {
                setSelectedCategoryFilter(val);
                setExpensesPage(1);
              }}
              containerStyle={[styles.fieldContainer, { flex: 1 }]}
            />
          </View>

          {/* Filter 6: Payment Type */}
          <DropdownSelector
            label="Payment Type"
            value={selectedPaymentTypeFilter}
            placeholder="All Payment Types"
            title="Filter by Payment Type"
            options={[{ label: 'All Payment Types', value: '' }, ...paymentTypesList]}
            onSelect={(val) => {
              setSelectedPaymentTypeFilter(val);
              setExpensesPage(1);
            }}
            containerStyle={styles.fieldContainer}
          />
        </View>

        {/* Expenses Summary Banner */}
        <View style={{
          backgroundColor: '#004d40',
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          elevation: 3,
        }}>
          <View>
            <Text style={{ color: '#80cbc4', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
              Filtered Total Expense
            </Text>
            <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '800', marginTop: 4 }}>
              Rs. {totalFilteredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>
              {filteredExpenses.length} Records
            </Text>
          </View>
        </View>

        {/* Action Buttons & Table Section */}
        <View style={styles.tableCard}>
          <View style={styles.tableCardHeader}>
            <View>
              <Text style={styles.tableTitle}>Expenses List</Text>
              <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 }}>
                {filteredExpenses.length} total records
              </Text>
            </View>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.tealButton, { backgroundColor: '#0284c7', marginRight: 8 }]}
                onPress={() => setCurrentView('daily_project_sheet')}
              >
                <MaterialIcons name="table-chart" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.tealButtonText}>Daily Sheet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tealButton} onPress={handleExportExpenses}>
                <MaterialIcons name="file-download" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.tealButtonText}>Export</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tealButton, { marginLeft: 8 }]}
                onPress={() => setCurrentView('add_expenses')}
              >
                <MaterialIcons name="add" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.tealButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.tableContainer}>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableColHeader, { width: 95 }]}>Date</Text>
                <Text style={[styles.tableColHeader, { width: 130 }]}>Associate</Text>
                <Text style={[styles.tableColHeader, { width: 160 }]}>Project</Text>
                <Text style={[styles.tableColHeader, { width: 120 }]}>Client</Text>
                <Text style={[styles.tableColHeader, { width: 100 }]}>Category</Text>
                <Text style={[styles.tableColHeader, { width: 130 }]}>Item / Paid To</Text>
                <Text style={[styles.tableColHeader, { width: 85 }]}>Qty / Unit</Text>
                <Text style={[styles.tableColHeader, { width: 110 }]}>Amount</Text>
                <Text style={[styles.tableColHeader, { width: 80 }]}>Type</Text>
                <Text style={[styles.tableColHeader, { width: 70, textAlign: 'center' }]}>Action</Text>
              </View>
              {paginatedExpenses.length > 0 ? (
                paginatedExpenses.map((c, cIdx) => (
                  <View key={c.id} style={[styles.tableRow, { backgroundColor: cIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }]}>
                    <Text style={[styles.tableCell, { width: 95 }]}>{c.date}</Text>
                    <Text style={[styles.tableCell, { width: 130 }]} numberOfLines={1}>{c.associate}</Text>
                    <Text style={[styles.tableCell, { width: 160 }]} numberOfLines={1}>{c.project}</Text>
                    <Text style={[styles.tableCell, { width: 120 }]} numberOfLines={1}>{c.client}</Text>
                    <View style={[{ width: 100 }]}>
                      <View style={{ backgroundColor: '#e0f2f1', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' }}>
                        <Text style={{ color: '#00796b', fontSize: 12, fontWeight: '700' }}>{c.category}</Text>
                      </View>
                    </View>
                    <Text style={[styles.tableCell, { width: 130 }]} numberOfLines={1}>{c.itemName ? `${c.itemName} (${c.paidTo})` : c.paidTo}</Text>
                    <Text style={[styles.tableCell, { width: 85 }]}>{c.quantity} {c.unit}</Text>
                    <Text style={[styles.tableCell, { width: 110, fontWeight: '700', color: '#0f172a' }]}>{c.amount}</Text>
                    <Text style={[styles.tableCell, { width: 80 }]}>{c.type}</Text>
                    <View style={[styles.actionCell, { width: 70 }]}>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteExpense(c.id)}>
                        <MaterialIcons name="delete" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noDataRow}>
                  <Text style={styles.noDataText}>No expense records found matching filters</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Pagination Controls */}
          {filteredExpenses.length > 0 && (
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: '#ffffff',
              borderTopWidth: 1,
              borderTopColor: '#f1f5f9',
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>
                Showing {startExpenseIndex + 1} - {endExpenseIndex} of {filteredExpenses.length}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: safeExpensesPage > 1 ? '#009688' : '#f1f5f9',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  disabled={safeExpensesPage <= 1}
                  onPress={() => setExpensesPage(p => Math.max(1, p - 1))}
                >
                  <MaterialIcons name="chevron-left" size={18} color={safeExpensesPage > 1 ? '#fff' : '#94a3b8'} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: safeExpensesPage > 1 ? '#fff' : '#94a3b8' }}>Prev</Text>
                </TouchableOpacity>

                <View style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b' }}>
                    {safeExpensesPage} / {totalExpensesPages}
                  </Text>
                </View>

                <TouchableOpacity
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: safeExpensesPage < totalExpensesPages ? '#009688' : '#f1f5f9',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  disabled={safeExpensesPage >= totalExpensesPages}
                  onPress={() => setExpensesPage(p => Math.min(totalExpensesPages, p + 1))}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: safeExpensesPage < totalExpensesPages ? '#fff' : '#94a3b8' }}>Next</Text>
                  <MaterialIcons name="chevron-right" size={18} color={safeExpensesPage < totalExpensesPages ? '#fff' : '#94a3b8'} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Helper for Category Colors in Daily Sheet
  const getCategoryColor = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'keele': return { bg: '#fee2e2', text: '#dc2626' };
      case 'eat': return { bg: '#ffedd5', text: '#ea580c' };
      case 'sariya': return { bg: '#fef3c7', text: '#d97706' };
      case 'kulhadi': return { bg: '#e0e7ff', text: '#4338ca' };
      case 'fabda': return { bg: '#ede9fe', text: '#6d28d9' };
      case 'labor': return { bg: '#dcfce7', text: '#15803d' };
      case 'materials': return { bg: '#e0f2fe', text: '#0369a1' };
      case 'equipment': return { bg: '#f1f5f9', text: '#334155' };
      case 'utility': return { bg: '#fce7f3', text: '#be185d' };
      default: return { bg: '#ccfbf1', text: '#0f766e' };
    }
  };

  // 6.b Daily Project Expense Sheet (Single Sheet View Grouped by Project)
  const renderDailyProjectSheet = () => {
    const handleExportSingleProjectSheet = (projectGroup) => {
      if (!projectGroup || !projectGroup.expenses || projectGroup.expenses.length === 0) {
        Alert.alert('Export', `No expenses recorded for ${projectGroup.projectName} on this date.`);
        return;
      }
      const headers = [
        'Date',
        'Project Name',
        'Client Name',
        'Project Status',
        'Category',
        'Item Description',
        'Quantity',
        'Unit',
        'Amount (Rs)',
        'Paid To',
        'Payment Type',
        'Associate',
        'Remarks',
      ];
      const rows = projectGroup.expenses.map((item) => [
        sheetDate,
        projectGroup.projectName,
        projectGroup.clientName,
        projectGroup.projectStatus,
        item.category,
        item.itemName,
        item.quantity,
        item.unit,
        item.amount,
        item.paidTo,
        item.paymentType,
        item.associateName,
        item.remarks,
      ]);

      rows.push([
        sheetDate,
        `TOTAL FOR [${projectGroup.projectName}]`,
        projectGroup.clientName,
        '',
        '',
        `${projectGroup.itemsCount} items`,
        '',
        '',
        projectGroup.projectSubtotal,
        '',
        '',
        '',
        '',
      ]);

      const safeProjName = projectGroup.projectName.replace(/[^a-zA-Z0-9]/g, '_');
      exportToCsv(`${safeProjName}_Expense_Sheet_${sheetDate.replace(/\//g, '-')}.csv`, headers, rows);
    };

    const handleExportDailySheet = () => {
      if (!dailySheetData || dailySheetData.length === 0) {
        Alert.alert('Export', 'No project expense records available for this date.');
        return;
      }
      const headers = [
        'Date',
        'Project Name',
        'Client Name',
        'Project Status',
        'Category',
        'Item Description',
        'Quantity',
        'Unit',
        'Amount (Rs)',
        'Paid To',
        'Payment Type',
        'Associate',
        'Remarks',
      ];
      const rows = [];
      dailySheetData.forEach((p) => {
        p.expenses.forEach((item) => {
          rows.push([
            sheetDate,
            p.projectName,
            p.clientName,
            p.projectStatus,
            item.category,
            item.itemName,
            item.quantity,
            item.unit,
            item.amount,
            item.paidTo,
            item.paymentType,
            item.associateName,
            item.remarks,
          ]);
        });
        // Subtotal row for this project
        rows.push([
          sheetDate,
          `SUBTOTAL [${p.projectName}]`,
          p.clientName,
          '',
          '',
          `${p.itemsCount} items`,
          '',
          '',
          p.projectSubtotal,
          '',
          '',
          '',
          '',
        ]);
      });
      // Grand Total row
      rows.push([
        sheetDate,
        '*** DAY GRAND TOTAL ***',
        '',
        '',
        '',
        `${dailySheetTotalCount} items across ${dailySheetData.length} projects`,
        '',
        '',
        dailySheetGrandTotal,
        '',
        '',
        '',
        '',
      ]);
      const directUrl = adminSitesApi.getDirectExportUrl('daily-sheet', { date: sheetDate });
      exportToCsv(`Daily_Project_Expense_Sheet_${sheetDate.replace(/\//g, '-')}.csv`, headers, rows, directUrl);
    };

    return (
      <View style={styles.viewContainer}>
        {/* Date Selector & Associate / Project Filters */}
        <View style={styles.filterCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="date-range" size={20} color="#009688" style={{ marginRight: 6 }} />
              <Text style={styles.cardHeaderTitle}>Daily Project Expense Sheet</Text>
            </View>
            <TouchableOpacity onPress={() => fetchDailyProjectSheet(sheetDate, sheetAssociateFilter, sheetProjectFilter)}>
              <Text style={{ color: '#009688', fontWeight: '700', fontSize: 13 }}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker Input */}
          <View style={styles.fieldContainer}>
            <Text style={styles.filterLabel}>Select Date</Text>
            <TouchableOpacity onPress={() => openDatePicker('sheetDate', sheetDate)}>
              <View style={styles.dateInputWrapper} pointerEvents="none">
                <TextInput
                  style={styles.dateInput}
                  value={sheetDate}
                  placeholder="mm/dd/yyyy"
                  placeholderTextColor="#94a3b8"
                  editable={false}
                />
                <MaterialIcons name="event" size={20} color="#009688" style={styles.dateIcon} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Associate & Project Filters */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <DropdownSelector
              label="Business Associate"
              value={sheetAssociateFilter}
              placeholder="All Associates"
              title="Filter by Business Associate"
              options={[{ label: 'All Associates', value: '' }, ...apiEmployees.map(a => ({ label: a.name, value: a.name }))]}
              onSelect={(val) => {
                setSheetAssociateFilter(val);
                fetchDailyProjectSheet(sheetDate, val, sheetProjectFilter);
              }}
              containerStyle={[styles.fieldContainer, { flex: 1 }]}
            />

            <DropdownSelector
              label="Project"
              value={sheetProjectFilter}
              placeholder="All Projects"
              title="Filter by Project"
              options={[{ label: 'All Projects', value: '' }, ...apiProjects.map(p => ({ label: p.name, value: p.name }))]}
              onSelect={(val) => {
                setSheetProjectFilter(val);
                fetchDailyProjectSheet(sheetDate, sheetAssociateFilter, val);
              }}
              containerStyle={[styles.fieldContainer, { flex: 1 }]}
            />
          </View>
        </View>

        {/* Day Grand Total Summary Banner */}
        <View
          style={{
            backgroundColor: '#0f766e',
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: '#99f6e4', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Day Grand Total Expense
              </Text>
              <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: '800', marginTop: 4 }}>
                Rs. {dailySheetGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 4 }}>
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                  {sheetDate}
                </Text>
              </View>
              <Text style={{ color: '#ccfbf1', fontSize: 12 }}>
                {dailySheetData.length} {dailySheetData.length === 1 ? 'Project' : 'Projects'} • {dailySheetTotalCount} Items
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons: Export & Add Expense */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <TouchableOpacity
            style={[styles.tealButton, { flex: 1, backgroundColor: '#059669', justifyContent: 'center' }]}
            onPress={handleExportDailySheet}
          >
            <MaterialIcons name="file-download" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.tealButtonText}>Export Daily Sheet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tealButton, { flex: 1, justifyContent: 'center' }]}
            onPress={() => setCurrentView('add_expenses')}
          >
            <MaterialIcons name="add-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.tealButtonText}>+ Add Site Expense</Text>
          </TouchableOpacity>
        </View>

        {/* Grouped Project Sheets */}
        {dailySheetLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#009688" />
            <Text style={{ marginTop: 12, color: '#64748b', fontWeight: '500' }}>Loading daily project sheet...</Text>
          </View>
        ) : dailySheetData.length === 0 ? (
          <View style={[styles.card, { padding: 30, alignItems: 'center', backgroundColor: '#fff', borderRadius: 14 }]}>
            <MaterialIcons name="assignment-late" size={48} color="#cbd5e1" />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 12 }}>No Expenses On This Date</Text>
            <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
              No project expenses logged for {sheetDate}.{'\n'}Tap below to log expenses across any project.
            </Text>
            <TouchableOpacity
              style={[styles.tealButton, { marginTop: 16 }]}
              onPress={() => setCurrentView('add_expenses')}
            >
              <Text style={styles.tealButtonText}>Add Expense Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          dailySheetData.map((projectGroup, pIdx) => (
            <View
              key={projectGroup.projectId || pIdx}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 14,
                marginBottom: 18,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                elevation: 2,
              }}
            >
              {/* Project Header Banner */}
              <View
                style={{
                  backgroundColor: '#f8fafc',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#e2e8f0',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                    <MaterialIcons name="apartment" size={18} color="#0f766e" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
                      {projectGroup.projectName}
                    </Text>
                    <View
                      style={{
                        backgroundColor: projectGroup.projectStatus === 'Active' ? '#dcfce7' : '#e2e8f0',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10,
                        marginLeft: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: projectGroup.projectStatus === 'Active' ? '#166534' : '#475569',
                        }}
                      >
                        {projectGroup.projectStatus}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Client: <Text style={{ fontWeight: '600', color: '#334155' }}>{projectGroup.clientName}</Text>
                    {projectGroup.clientContact ? ` (${projectGroup.clientContact})` : ''}
                  </Text>
                </View>

                {/* Subtotal Pill */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Subtotal</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f766e' }}>
                    Rs. {projectGroup.projectSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                    {projectGroup.itemsCount} {projectGroup.itemsCount === 1 ? 'item' : 'items'}
                  </Text>
                </View>
              </View>

              {/* Dedicated Project Sheet Action Bar */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#f8fafc',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: '#e2e8f0',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f766e' }}>
                  Project Expense Sheet • {sheetDate}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#0284c7',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 6,
                    }}
                    onPress={() => handleExportSingleProjectSheet(projectGroup)}
                  >
                    <MaterialIcons name="file-download" size={14} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Export Project Sheet</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#0f766e',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 6,
                    }}
                    onPress={() => {
                      setExpensesForm(prev => ({
                        ...prev,
                        project: projectGroup.projectName,
                        client: projectGroup.clientName,
                        date: sheetDate,
                      }));
                      setCurrentView('add_expenses');
                    }}
                  >
                    <MaterialIcons name="add" size={14} color="#fff" style={{ marginRight: 2 }} />
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>+ Add Item</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Horizontal Scroll Table for this project */}
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View>
                  {/* Table Header */}
                  <View style={[styles.tableHeaderRow, { backgroundColor: '#f1f5f9' }]}>
                    <Text style={[styles.tableHeaderCell, { width: 35, color: '#334155' }]}>#</Text>
                    <Text style={[styles.tableHeaderCell, { width: 95, color: '#334155' }]}>Category</Text>
                    <Text style={[styles.tableHeaderCell, { width: 140, color: '#334155' }]}>Item Description</Text>
                    <Text style={[styles.tableHeaderCell, { width: 85, color: '#334155' }]}>Qty & Unit</Text>
                    <Text style={[styles.tableHeaderCell, { width: 95, color: '#334155' }]}>Amount</Text>
                    <Text style={[styles.tableHeaderCell, { width: 110, color: '#334155' }]}>Paid To</Text>
                    <Text style={[styles.tableHeaderCell, { width: 85, color: '#334155' }]}>Type</Text>
                    <Text style={[styles.tableHeaderCell, { width: 100, color: '#334155' }]}>Associate</Text>
                    <Text style={[styles.tableHeaderCell, { width: 60, color: '#334155' }]}>Action</Text>
                  </View>

                  {/* Table Rows */}
                  {projectGroup.expenses.map((item, iIdx) => {
                    const catStyle = getCategoryColor(item.category);
                    return (
                      <View
                        key={item.id || iIdx}
                        style={[
                          styles.tableDataRow,
                          { backgroundColor: iIdx % 2 === 0 ? '#ffffff' : '#f8fafc' },
                        ]}
                      >
                        <Text style={[styles.tableCell, { width: 35, fontWeight: '700', color: '#64748b' }]}>
                          {iIdx + 1}
                        </Text>
                        <View style={{ width: 95, justifyContent: 'center' }}>
                          <View
                            style={{
                              backgroundColor: catStyle.bg,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                              alignSelf: 'flex-start',
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: catStyle.text }} numberOfLines={1}>
                              {item.category}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.tableCell, { width: 140, fontWeight: '600' }]} numberOfLines={2}>
                          {item.itemName || '—'}
                        </Text>
                        <Text style={[styles.tableCell, { width: 85, color: '#0f766e', fontWeight: '600' }]}>
                          {item.quantity} {item.unit}
                        </Text>
                        <Text style={[styles.tableCell, { width: 95, fontWeight: '700', color: '#111827' }]}>
                          Rs. {Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                        <Text style={[styles.tableCell, { width: 110 }]} numberOfLines={1}>
                          {item.paidTo || '—'}
                        </Text>
                        <Text style={[styles.tableCell, { width: 85 }]}>{item.paymentType}</Text>
                        <Text style={[styles.tableCell, { width: 100 }]} numberOfLines={1}>
                          {item.associateName}
                        </Text>
                        <View style={[styles.actionCell, { width: 60 }]}>
                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDeleteExpense(item.id)}
                          >
                            <MaterialIcons name="delete" size={14} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          ))
        )}
      </View>
    );
  };

  // 7. Add Expenses Form UI
  const renderAddExpenses = () => {
    // Filter projects based on selected client so admin only sees relevant projects
    const availableProjects = expensesForm.client
      ? apiProjects.filter((p) => p.client === expensesForm.client)
      : apiProjects;

    return (
      <View style={styles.viewContainer}>
        <View style={styles.formCard}>
          <Text style={styles.formSectionTitle}>Add Site Expense</Text>

          {/* CLIENT PICKER */}
          <DropdownSelector
            label="Client / Registered User"
            value={expensesForm.client}
            placeholder="Select Client / User"
            title="Select Client / User"
            options={[{ label: 'Select Client / User', value: '' }, ...apiClients.map(c => ({ label: `${c.name} (${c.clientType || 'Client'})`, value: c.name }))]}
            onSelect={(val) => setExpensesForm({ ...expensesForm, client: val, project: '' })}
            containerStyle={styles.formField}
          />
          
          {/* PROJECT / SITE PICKER */}
          <DropdownSelector
            label="Project / Site"
            required
            value={expensesForm.project}
            placeholder="Select Project"
            title="Select Project / Site"
            options={[{ label: 'Select Project', value: '' }, ...availableProjects.map(p => ({ label: `${p.name} (${p.client})`, value: p.name }))]}
            onSelect={(val) => {
              const foundProj = apiProjects.find(p => p.name === val || p.id === val);
              setExpensesForm({
                ...expensesForm,
                project: val,
                client: foundProj?.client || expensesForm.client,
              });
            }}
            containerStyle={styles.formField}
          />

          {/* BUSINESS ASSOCIATE (EMPLOYEE) PICKER */}
          <DropdownSelector
            label="Business Associate (Employee)"
            required
            value={expensesForm.associate}
            placeholder="Select Business Associate"
            title="Select Business Associate"
            options={[{ label: 'Select Business Associate', value: '' }, ...apiEmployees.map(a => ({ label: a.name, value: a.name }))]}
            onSelect={(val) => setExpensesForm({ ...expensesForm, associate: val })}
            containerStyle={styles.formField}
          />

          {/* DYNAMIC CATEGORY PICKER */}
          <View style={styles.formField}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.formLabel}>Category <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(true)}>
                <Text style={{ color: '#009688', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>+ Add Custom</Text>
              </TouchableOpacity>
            </View>
            <DropdownSelector
              value={expensesForm.category}
              placeholder="Select Category"
              title="Select Expense Category"
              options={[
                ...categoriesList.map(cat => ({ label: cat, value: cat })),
                { label: '+ Add Custom Category...', value: '__add_custom__' },
              ]}
              onSelect={(val) => {
                if (val === '__add_custom__') {
                  setShowCategoryModal(true);
                } else {
                  setExpensesForm({ ...expensesForm, category: val });
                }
              }}
            />
          </View>

          {/* ITEM DESCRIPTION / NAME */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Item Description / Specification</Text>
            <TextInput
              style={styles.formInput}
              value={expensesForm.itemName}
              onChangeText={(val) => setExpensesForm({ ...expensesForm, itemName: val })}
              placeholder="e.g. 10mm Sariya, 50 Bori Ultratech Cement"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* QUANTITY & UNIT FIELDS SIDE BY SIDE */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.formLabel}>Quantity <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                value={expensesForm.quantity}
                onChangeText={handleExpenseQuantityChange}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <DropdownSelector
              label="Unit"
              value={expensesForm.unit}
              placeholder="Select Unit"
              title="Select Unit"
              options={[
                { label: 'Pcs (Pieces)', value: 'Pcs' },
                { label: 'Kg (Kilograms)', value: 'Kg' },
                { label: 'Bags / Bori', value: 'Bags' },
                { label: 'Feet', value: 'Feet' },
                { label: 'Trolley', value: 'Trolley' },
                { label: 'Litre', value: 'Litre' },
                { label: 'Days', value: 'Days' },
                { label: 'Hours', value: 'Hours' },
              ]}
              onSelect={(val) => setExpensesForm({ ...expensesForm, unit: val })}
              containerStyle={{ flex: 1 }}
            />
          </View>

          {/* SINGLE ITEM PRICE & TOTAL PRICE SIDE BY SIDE (AUTO CALCULATED) */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.formLabel}>Price Per Item (₹) <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.formInput}
                value={expensesForm.unitPrice}
                onChangeText={handleExpenseUnitPriceChange}
                placeholder="e.g. 250"
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={[styles.formLabel, { marginBottom: 0 }]}>Total Price (₹) <Text style={styles.required}>*</Text></Text>
                <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#166534' }}>AUTO</Text>
                </View>
              </View>
              <TextInput
                style={[styles.formInput, { backgroundColor: '#f0fdf4', borderColor: '#86efac', fontWeight: '800', color: '#166534' }]}
                value={expensesForm.amount}
                onChangeText={handleExpenseTotalAmountChange}
                placeholder="Auto-calculated"
                keyboardType="numeric"
                placeholderTextColor="#86efac"
              />
            </View>
          </View>

          {/* PAID TO */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Paid To (Recipient) <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.formInput}
              value={expensesForm.paidTo}
              onChangeText={(val) => setExpensesForm({ ...expensesForm, paidTo: val })}
              placeholder="e.g. Ramesh Contractor, Gupta Building Materials"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* DATE PICKER */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Date <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity onPress={() => openDatePicker('expensesForm.date', expensesForm.date)}>
              <View style={styles.dateInputWrapper} pointerEvents="none">
                <TextInput
                  style={styles.dateInput}
                  value={expensesForm.date}
                  placeholder="mm/dd/yyyy"
                  placeholderTextColor="#94a3b8"
                  editable={false}
                />
                <MaterialIcons name="event" size={20} color="#009688" style={styles.dateIcon} />
              </View>
            </TouchableOpacity>
          </View>

          {/* PAYMENT TYPE */}
          <DropdownSelector
            label="Payment Type"
            required
            value={expensesForm.paymentType}
            placeholder="Select Payment Type"
            title="Select Payment Type"
            options={paymentTypesList}
            onSelect={(val) => setExpensesForm({ ...expensesForm, paymentType: val })}
            containerStyle={styles.formField}
          />

          {/* REMARKS */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Remarks</Text>
            <TextInput
              style={[styles.formInput, styles.multilineInput]}
              value={expensesForm.remarks}
              onChangeText={(val) => setExpensesForm({ ...expensesForm, remarks: val })}
              placeholder="Any comments, bill number, or notes"
              multiline={true}
              numberOfLines={3}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={[styles.formFooter, { justifyContent: 'flex-end' }]}>
            <TouchableOpacity 
              style={[styles.solidTealButton, submitLoading && { opacity: 0.7 }]} 
              onPress={handleAddExpensesSubmit}
              disabled={submitLoading}
            >
              {submitLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.solidTealButtonText}>Submitting Expense...</Text>
                </View>
              ) : (
                <Text style={styles.solidTealButtonText}>Submit Expense</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // 8. Work Status UI - Civil Action Plan Sheet (From User Screenshot)
  const handleUpdateCivilPlan = (id, field, value) => {
    setCivilSheetPlans(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSaveCivilSheet = async () => {
    setSavingCivilSheet(true);
    try {
      const activeDate = workStatusDateFilter || getTodayFormattedDDMMYYYY();
      const storageKey = `@civil_action_plans_${activeDate}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(civilSheetPlans));
      Alert.alert('Saved', `Civil Action Plan Sheet for ${activeDate} saved successfully!`);
    } catch (err) {
      console.error('Error saving civil sheet:', err);
      Alert.alert('Error', 'Failed to save sheet locally.');
    } finally {
      setSavingCivilSheet(false);
    }
  };

  const handlePrintCivilSheet = async () => {
    try {
      const activeDate = workStatusDateFilter || getTodayFormattedDDMMYYYY();
      let doc = `=================================================\n`;
      doc += `            ACTION PLAN - CIVIL SHEET            \n`;
      doc += `=================================================\n\n`;
      doc += `"The Law of Good Work- I Must Practice Civil Daily, My Time Is For Clients, I Must Catch All Instructions And Leads Moved Towards Me And Note Them Down."\n\n`;
      doc += `** Tarai is MUST at all sites. **\n`;
      doc += `Date: ${activeDate}\n\n`;
      doc += `-------------------------------------------------\n`;

      const listToPrint = filteredCivilPlans;
      if (listToPrint.length === 0) {
        doc += `No projects found for this filter.\n`;
      } else {
        listToPrint.forEach((plan, idx) => {
          doc += `[${idx + 1}] PROJECT: ${plan.projectName}\n`;
          if (plan.client) doc += `    Client: ${plan.client}\n`;
          doc += `    Action Plan for tomorrow: ${plan.actionPlanTomorrow || 'N/A'}\n`;
          doc += `    Manual Notes: ${plan.manualNotes || 'N/A'}\n`;
          doc += `    Supervisor: ${plan.supervisor || 'Admin'}\n`;
          doc += `    Work Stage: ${plan.workStage || 'N/A'}\n`;
          doc += `-------------------------------------------------\n`;
        });
      }

      await Share.share({
        title: `Civil Sheet - ${activeDate}`,
        message: doc,
      });
    } catch (error) {
      console.error('Error sharing/printing civil sheet:', error);
    }
  };

  const handleExportWorkStatusData = async () => {
    try {
      const todayStr = getTodayFormattedDDMMYYYY();
      const params = {};
      if (workStatusProjectFilter) params.project = workStatusProjectFilter;
      if (workStatusClientFilter) params.client = workStatusClientFilter;
      if (workStatusDateFilter) params.date = workStatusDateFilter;

      const directUrl = adminSitesApi.getDirectExportUrl('work-status', params);
      const filename = `Work_Status_${workStatusDateFilter || todayStr}.csv`;

      // Fast streaming direct download from server (handles 21,000+ rows instantly without mobile memory strain)
      await exportToCsv(filename, [], [], directUrl);
    } catch (err) {
      console.error('Error exporting work status:', err);
      Alert.alert('Error', 'Failed to export data: ' + (err.message || 'Unknown error'));
    }
  };

  const renderWorkStatus = () => {
    const activeDisplayDate = workStatusDateFilter || getTodayFormattedDDMMYYYY();

    return (
      <View style={styles.viewContainer}>
        {/* Top Horizontal Filter Bar (Business Associate, Client, Project, Date) */}
        <View style={styles.civilFilterCard}>
          <View style={styles.civilFilterTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="tune" size={18} color="#009688" style={{ marginRight: 6 }} />
              <Text style={styles.civilFilterCardTitle}>Filter Work Status</Text>
            </View>
            {(workStatusAssociateFilter || workStatusClientFilter || workStatusProjectFilter) ? (
              <TouchableOpacity
                onPress={() => {
                  setWorkStatusAssociateFilter('');
                  setWorkStatusClientFilter('');
                  setWorkStatusProjectFilter('');
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.civilFilterResetText}>Reset</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.civilFilterRow}>
            {/* Business Associate Dropdown */}
            <DropdownSelector
              label="Business Associate"
              value={workStatusAssociateFilter}
              placeholder="Select Associate"
              title="Filter by Business Associate"
              options={[{ label: 'All Associates', value: '' }, ...apiEmployees.map(a => ({ label: a.name, value: a.name }))]}
              onSelect={(val) => setWorkStatusAssociateFilter(val)}
              containerStyle={styles.civilFilterItem}
            />

            {/* Client Dropdown */}
            <DropdownSelector
              label="Client"
              value={workStatusClientFilter}
              placeholder="Select Client"
              title="Filter by Client"
              options={[{ label: 'All Clients', value: '' }, ...apiClients.map(c => ({ label: c.name, value: c.name }))]}
              onSelect={(val) => setWorkStatusClientFilter(val)}
              containerStyle={styles.civilFilterItem}
            />

            {/* Project Dropdown */}
            <DropdownSelector
              label="Project"
              value={workStatusProjectFilter}
              placeholder="Select Project"
              title="Filter by Project"
              options={[{ label: 'All Projects', value: '' }, ...apiProjects.map(p => ({ label: p.name, value: p.name }))]}
              onSelect={(val) => setWorkStatusProjectFilter(val)}
              containerStyle={styles.civilFilterItem}
            />

            {/* Filter by Date Picker */}
            <View style={styles.civilFilterItem}>
              <Text style={styles.civilItemLabel}>Date</Text>
              <TouchableOpacity
                style={styles.civilDateFilterBtn}
                onPress={() => openDatePicker('workStatusDateFilter', workStatusDateFilter)}
                activeOpacity={0.7}
              >
                <Text style={styles.civilDateValue}>{activeDisplayDate}</Text>
                <MaterialIcons name="event" size={20} color="#009688" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Action Buttons Row: Add Work Status (Green) & Export Whole Data (Teal) */}
        <View style={styles.wsActionBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.wsHeaderTitle}>Work Status</Text>
            <View style={styles.wsBadge}>
              <Text style={styles.wsBadgeText}>{workStatusList.length}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.wsAddBtn}
              onPress={() => setCurrentView('add_work_status')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={18} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.wsBtnText}>Add Work Status</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.wsExportBtn}
              onPress={handleExportWorkStatusData}
              activeOpacity={0.8}
            >
              <MaterialIcons name="file-download" size={16} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.wsBtnText}>Export Whole Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.wsRefreshBtn}
              onPress={fetchWorkStatuses}
              activeOpacity={0.8}
            >
              <MaterialIcons name="refresh" size={18} color="#009688" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Synchronized Work Status Table (Matching Web/Image Columns) */}
        <View style={styles.wsTableCard}>
          {workStatusLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#009688" />
              <Text style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>Loading Work Status data...</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={styles.wsTable}>
                {/* Table Header Row */}
                <View style={styles.wsTableHeaderRow}>
                  <Text style={[styles.wsColHeader, { width: 180 }]}>Project Name</Text>
                  <Text style={[styles.wsColHeader, { width: 150 }]}>Client Name</Text>
                  <Text style={[styles.wsColHeader, { width: 105 }]}>Date</Text>
                  <Text style={[styles.wsColHeader, { width: 220 }]}>Today</Text>
                  <Text style={[styles.wsColHeader, { width: 220 }]}>Tomorrow</Text>
                  <Text style={[styles.wsColHeader, { width: 220 }]}>Day After Tomorrow</Text>
                  <Text style={[styles.wsColHeader, { width: 110 }]}>Added By</Text>
                  <Text style={[styles.wsColHeader, { width: 95, borderRightWidth: 0, textAlign: 'center' }]}>Action</Text>
                </View>

                {/* Table Body Rows */}
                {workStatusList.length > 0 ? (
                  workStatusList.map((item, idx) => (
                    <View key={item._id || String(idx)} style={[styles.wsTableRow, idx % 2 === 1 && { backgroundColor: '#f8fafc' }]}>
                      {/* Project Name */}
                      <View style={[styles.wsCellWrapper, { width: 180 }]}>
                        <Text style={styles.wsProjectNameText} numberOfLines={2}>
                          {item.projectName}
                        </Text>
                      </View>

                      {/* Client Name */}
                      <View style={[styles.wsCellWrapper, { width: 150 }]}>
                        <Text style={styles.wsClientNameText} numberOfLines={2}>
                          {item.clientName || item.client?.name || '-'}
                        </Text>
                      </View>

                      {/* Date */}
                      <View style={[styles.wsCellWrapper, { width: 105 }]}>
                        <Text style={styles.wsDateText}>
                          {item.dateStr || (item.date ? String(item.date).substring(0, 10) : '-')}
                        </Text>
                      </View>

                      {/* Today Work Status */}
                      <View style={[styles.wsCellWrapper, { width: 220 }]}>
                        <Text style={[styles.wsContentText, !item.today && { color: '#94a3b8', fontStyle: 'italic' }]} numberOfLines={3}>
                          {item.today ? item.today : '-'}
                        </Text>
                      </View>

                      {/* Tomorrow Work Plan */}
                      <View style={[styles.wsCellWrapper, { width: 220 }]}>
                        <Text style={[styles.wsContentText, !item.tomorrow && { color: '#94a3b8', fontStyle: 'italic' }]} numberOfLines={3}>
                          {item.tomorrow ? item.tomorrow : '-'}
                        </Text>
                      </View>

                      {/* Day After Tomorrow Work Plan */}
                      <View style={[styles.wsCellWrapper, { width: 220 }]}>
                        <Text style={[styles.wsContentText, !item.dayAfterTomorrow && { color: '#94a3b8', fontStyle: 'italic' }]} numberOfLines={3}>
                          {item.dayAfterTomorrow ? item.dayAfterTomorrow : '-'}
                        </Text>
                      </View>

                      {/* Added By */}
                      <View style={[styles.wsCellWrapper, { width: 110 }]}>
                        <Text style={styles.wsAddedByText}>
                          {item.createdBy || 'Admin'}
                        </Text>
                      </View>

                      {/* Action (Edit [Green] & Delete [Red]) */}
                      <View style={[styles.wsCellWrapper, { width: 95, borderRightWidth: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}>
                        <TouchableOpacity
                          style={styles.wsActionEditBtn}
                          onPress={() => handleEditWorkStatus(item)}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons name="edit" size={15} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.wsActionDeleteBtn}
                          onPress={() => handleDeleteWorkStatus(item)}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons name="delete" size={15} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={[styles.wsEmptyRow, { width: 1300 }]}>
                    <MaterialIcons name="info-outline" size={24} color="#94a3b8" style={{ marginBottom: 6 }} />
                    <Text style={styles.wsEmptyText}>No work status records found for the selected date and filters.</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}

          {/* Pagination Bar */}
          {!workStatusLoading && workStatusTotal > 0 && (
            <View style={styles.wsPaginationContainer}>
              {/* Entries Info */}
              <View style={styles.wsPaginationInfo}>
                <Text style={styles.wsPaginationInfoText}>
                  Showing {Math.min((workStatusPage - 1) * workStatusLimit + 1, workStatusTotal)} to{' '}
                  {Math.min(workStatusPage * workStatusLimit, workStatusTotal)} of {workStatusTotal.toLocaleString()} entries
                </Text>
              </View>

              {/* Rows Per Page Picker */}
              <View style={styles.wsPageSizeRow}>
                <Text style={styles.wsPageSizeLabel}>Rows:</Text>
                {[15, 25, 50, 100].map((size) => (
                  <TouchableOpacity
                    key={String(size)}
                    style={[
                      styles.wsPageSizeBtn,
                      workStatusLimit === size && styles.wsPageSizeBtnActive,
                    ]}
                    onPress={() => {
                      setWorkStatusLimit(size);
                      fetchWorkStatuses(1, size);
                    }}
                  >
                    <Text
                      style={[
                        styles.wsPageSizeText,
                        workStatusLimit === size && styles.wsPageSizeTextActive,
                      ]}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Page Controls */}
              <View style={styles.wsPaginationControls}>
                {/* First Page */}
                <TouchableOpacity
                  style={[styles.wsPageNavBtn, workStatusPage <= 1 && styles.wsPageNavBtnDisabled]}
                  onPress={() => workStatusPage > 1 && fetchWorkStatuses(1, workStatusLimit)}
                  disabled={workStatusPage <= 1}
                >
                  <MaterialIcons
                    name="first-page"
                    size={18}
                    color={workStatusPage <= 1 ? '#cbd5e1' : '#00796b'}
                  />
                </TouchableOpacity>

                {/* Previous Page */}
                <TouchableOpacity
                  style={[styles.wsPageNavBtn, workStatusPage <= 1 && styles.wsPageNavBtnDisabled]}
                  onPress={() => workStatusPage > 1 && fetchWorkStatuses(workStatusPage - 1, workStatusLimit)}
                  disabled={workStatusPage <= 1}
                >
                  <MaterialIcons
                    name="chevron-left"
                    size={20}
                    color={workStatusPage <= 1 ? '#cbd5e1' : '#00796b'}
                  />
                </TouchableOpacity>

                {/* Page Badge */}
                <View style={styles.wsPageNumberBadge}>
                  <Text style={styles.wsPageNumberText}>
                    Page {workStatusPage} of {workStatusTotalPages}
                  </Text>
                </View>

                {/* Next Page */}
                <TouchableOpacity
                  style={[
                    styles.wsPageNavBtn,
                    workStatusPage >= workStatusTotalPages && styles.wsPageNavBtnDisabled,
                  ]}
                  onPress={() =>
                    workStatusPage < workStatusTotalPages && fetchWorkStatuses(workStatusPage + 1, workStatusLimit)
                  }
                  disabled={workStatusPage >= workStatusTotalPages}
                >
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={workStatusPage >= workStatusTotalPages ? '#cbd5e1' : '#00796b'}
                  />
                </TouchableOpacity>

                {/* Last Page */}
                <TouchableOpacity
                  style={[
                    styles.wsPageNavBtn,
                    workStatusPage >= workStatusTotalPages && styles.wsPageNavBtnDisabled,
                  ]}
                  onPress={() =>
                    workStatusPage < workStatusTotalPages && fetchWorkStatuses(workStatusTotalPages, workStatusLimit)
                  }
                  disabled={workStatusPage >= workStatusTotalPages}
                >
                  <MaterialIcons
                    name="last-page"
                    size={18}
                    color={workStatusPage >= workStatusTotalPages ? '#cbd5e1' : '#00796b'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  // 9. Add Work Status UI (Image 1)
  const renderAddWorkStatus = () => {
    return (
      <View style={styles.viewContainer}>
        <View style={styles.formCard}>
          <DropdownSelector
            label="Business Associate"
            value={workStatusForm.associate}
            placeholder="Select Associate"
            title="Select Business Associate"
            options={[{ label: 'Select Associate', value: '' }, ...apiEmployees.map(a => ({ label: a.name, value: a.name }))]}
            onSelect={(val) => setWorkStatusForm({ ...workStatusForm, associate: val })}
            containerStyle={styles.formField}
          />

          <DropdownSelector
            label="Client"
            value={workStatusForm.client}
            placeholder="Select Client"
            title="Select Client"
            options={[{ label: 'Select Client', value: '' }, ...apiClients.map(c => ({ label: c.name, value: c.name }))]}
            onSelect={(val) => setWorkStatusForm({ ...workStatusForm, client: val })}
            containerStyle={styles.formField}
          />

          <DropdownSelector
            label="Project"
            value={workStatusForm.project}
            placeholder="Select Project"
            title="Select Project"
            options={[{ label: 'Select Project', value: '' }, ...apiProjects.map(p => ({ label: p.name, value: p.name }))]}
            onSelect={(val) => {
              const selectedProj = apiProjects.find(p => p.name === val || p.projectName === val);
              const clientName = selectedProj?.client || selectedProj?.clientName;
              setWorkStatusForm(prev => ({
                ...prev,
                project: val,
                client: clientName || prev.client,
              }));
            }}
            containerStyle={styles.formField}
          />

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Date</Text>
            <TouchableOpacity onPress={() => openDatePicker('workStatusForm.date', workStatusForm.date)}>
              <View style={styles.dateInputWrapper} pointerEvents="none">
                <TextInput
                  style={styles.dateInput}
                  value={workStatusForm.date}
                  placeholder="mm/dd/yyyy"
                  placeholderTextColor="#94a3b8"
                  editable={false}
                />
                <MaterialIcons name="event" size={20} color="#009688" style={styles.dateIcon} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Today Work Status</Text>
            <TextInput
              style={[styles.formInput, styles.multilineInput]}
              value={workStatusForm.todayStatus}
              onChangeText={(val) => setWorkStatusForm({ ...workStatusForm, todayStatus: val })}
              placeholder="आज साइट पर कितने मिस्त्री और कितनी लेबर लगी ? आज साइट पर क्या-क्या काम हुआ ?"
              multiline={true}
              numberOfLines={3}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Tomorrow Work Plan</Text>
            <TextInput
              style={[styles.formInput, styles.multilineInput]}
              value={workStatusForm.tomorrowPlan}
              onChangeText={(val) => setWorkStatusForm({ ...workStatusForm, tomorrowPlan: val })}
              placeholder="कल साइट पर कितने मिस्त्री और कितने मजदूर लगेंगे ? कल साइट पर क्या-क्या काम होगा?"
              multiline={true}
              numberOfLines={3}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Day After Tomorrow Work Plan</Text>
            <TextInput
              style={[styles.formInput, styles.multilineInput]}
              value={workStatusForm.dayAfterTomorrowPlan}
              onChangeText={(val) => setWorkStatusForm({ ...workStatusForm, dayAfterTomorrowPlan: val })}
              multiline={true}
              numberOfLines={3}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={[styles.formFooter, { justifyContent: 'flex-end' }]}>
            <TouchableOpacity 
              style={[styles.solidTealButton, submitLoading && { opacity: 0.7 }]} 
              onPress={handleAddWorkStatusSubmit}
              disabled={submitLoading}
            >
              {submitLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.solidTealButtonText}>Submitting...</Text>
                </View>
              ) : (
                <Text style={styles.solidTealButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // 10. Client Payments Listing UI
  const renderClientPaymentsList = () => {
    const list = [
      { id: '1', project: 'K M 163 Kavi Nagar', client: 'Harsh Gupta', amount: 'Rs. 360000', type: 'Online Transfer', date: '01-02-2025', comment: '' },
      { id: '2', project: 'K M 163 Kavi Nagar', client: 'Harsh Gupta', amount: 'Rs. 535547', type: 'Online Transfer', date: '21-01-2025', comment: '' },
      { id: '3', project: 'K M 163 Kavi Nagar', client: 'Harsh Gupta', amount: 'Rs. 65000', type: 'Cash', date: '16-01-2025', comment: '' },
      { id: '4', project: 'K M 163 Kavi Nagar', client: 'Harsh Gupta', amount: 'Rs. 430438', type: 'Cash', date: '14-01-2025', comment: '' },
      { id: '5', project: 'K M 163 Kavi Nagar', client: 'Harsh Gupta', amount: 'Rs. 180164', type: 'Cash', date: '14-01-2025', comment: '' },
      { id: '6', project: 'K M 163 Kavi Nagar', client: 'Harsh Gupta', amount: 'Rs. 200000', type: 'Cash', date: '07-01-2025', comment: '' },
    ];
    return (
      <View style={styles.viewContainer}>
        {/* Filters */}
        <View style={{flexDirection: 'row', gap: 10, marginBottom: 10, flexWrap: 'wrap'}}>
          <DropdownSelector
            label="Client"
            value={selectedClientFilter}
            placeholder="Select Client"
            title="Filter by Client"
            options={[{ label: 'All Clients', value: '' }, ...apiClients.map(c => ({ label: c.name, value: c.name }))]}
            onSelect={(val) => setSelectedClientFilter(val)}
            containerStyle={{ flex: 1, minWidth: 150 }}
          />
          <DropdownSelector
            label="Project"
            value={selectedProjectFilter}
            placeholder="Select Project"
            title="Filter by Project"
            options={[{ label: 'All Projects', value: '' }, ...apiProjects.map(p => ({ label: p.name, value: p.name }))]}
            onSelect={(val) => setSelectedProjectFilter(val)}
            containerStyle={{ flex: 1, minWidth: 150 }}
          />
          <DropdownSelector
            label="Payment Type"
            value={selectedPaymentTypeFilter}
            placeholder="Select Payment Type"
            title="Filter by Payment Type"
            options={[{ label: 'All Payment Types', value: '' }, ...paymentTypesList]}
            onSelect={(val) => setSelectedPaymentTypeFilter(val)}
            containerStyle={{ flex: 1, minWidth: 150 }}
          />
          <View style={{flex: 1, minWidth: 150}}>
            <Text style={styles.filterLabel}>Date</Text>
            <View style={styles.dateInputWrapper}>
              <TextInput
                style={styles.dateInput}
                value={selectedDateFilter}
                onChangeText={(val) => setSelectedDateFilter(val)}
                placeholder="mm/dd/yyyy"
              />
              <MaterialIcons name="event" size={20} color="#009688" style={styles.dateIcon} />
            </View>
            <View style={{marginTop: 8, alignItems: 'flex-end'}}>
              <View style={{backgroundColor: '#009688', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4}}>
                <Text style={{color: '#fff', fontWeight: 'bold'}}>Total Amount: Rs. 38550209.00</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.tableCard}>
          <View style={styles.tableCardHeader}>
            <Text style={styles.tableTitle}>Client Payments</Text>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.tealButton} onPress={() => setCurrentView('add_client_payment')}>
                <Text style={styles.tealButtonText}>Add Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tealButton, { marginLeft: 8 }]}
                onPress={() => {
                  const headers = ['S. No.', 'Project Name', 'Client Name', 'Amount', 'Payment Type', 'Date', 'Comment'];
                  const rows = list.map((c, idx) => [idx + 1, c.project, c.client, c.amount, c.type, c.date, c.comment || '']);
                  const directUrl = adminSitesApi.getDirectExportUrl('client-payments');
                  exportToCsv(`Client_Payments_${getTodayFormattedDDMMYYYY()}.csv`, headers, rows, directUrl);
                }}
              >
                <Text style={styles.tealButtonText}>Export Whole Data</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.tableContainer}>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableColHeader, { width: 170 }]}>Project Name</Text>
                <Text style={[styles.tableColHeader, { width: 130 }]}>Client Name</Text>
                <Text style={[styles.tableColHeader, { width: 110 }]}>Amount</Text>
                <Text style={[styles.tableColHeader, { width: 110 }]}>Type</Text>
                <Text style={[styles.tableColHeader, { width: 90 }]}>Date</Text>
                <Text style={[styles.tableColHeader, { width: 140 }]}>Comment</Text>
                <Text style={[styles.tableColHeader, { width: 90, textAlign: 'center' }]}>Action</Text>
              </View>
              {list.map((c, cIdx) => (
                <View key={c.id} style={[styles.tableRow, { backgroundColor: cIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }]}>
                  <Text style={[styles.tableCell, { width: 170 }]}>{c.project}</Text>
                  <Text style={[styles.tableCell, { width: 130 }]}>{c.client}</Text>
                  <Text style={[styles.tableCell, { width: 110 }]}>{c.amount}</Text>
                  <Text style={[styles.tableCell, { width: 110 }]}>{c.type}</Text>
                  <Text style={[styles.tableCell, { width: 90 }]}>{c.date}</Text>
                  <Text style={[styles.tableCell, { width: 140 }]}>{c.comment}</Text>
                  <View style={[styles.actionCell, { width: 90 }]}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => handleEditClientPayment(c)}>
                      <MaterialIcons name="edit" size={14} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => Alert.alert('Delete', 'Delete client payment')}>
                      <MaterialIcons name="delete" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  // 11. Add Client Payment UI
  const renderAddClientPayment = () => {
    return (
      <View style={styles.viewContainer}>
        <View style={styles.formCard}>
          
          <DropdownSelector
            label="Client"
            required
            value={paymentForm.client}
            placeholder="Select Client"
            title="Select Client"
            options={[{ label: 'Select Client', value: '' }, ...apiClients.map(c => ({ label: c.name, value: c.name }))]}
            onSelect={(val) => setPaymentForm({ ...paymentForm, client: val })}
            containerStyle={styles.formField}
          />
          
          <DropdownSelector
            label="Project"
            required
            value={paymentForm.project}
            placeholder="Select Project"
            title="Select Project"
            options={[{ label: 'Select Project', value: '' }, ...apiProjects.map(p => ({ label: p.name, value: p.name }))]}
            onSelect={(val) => setPaymentForm({ ...paymentForm, project: val })}
            containerStyle={styles.formField}
          />

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Amount</Text>
            <TextInput
              style={styles.formInput}
              value={paymentForm.amount}
              onChangeText={(val) => setPaymentForm({ ...paymentForm, amount: val })}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Date</Text>
            <TouchableOpacity onPress={() => openDatePicker('paymentForm.date', paymentForm.date)}>
              <View style={styles.dateInputWrapper} pointerEvents="none">
                <TextInput
                  style={styles.dateInput}
                  value={paymentForm.date}
                  placeholder="mm/dd/yyyy"
                  placeholderTextColor="#94a3b8"
                  editable={false}
                />
                <MaterialIcons name="event" size={20} color="#009688" style={styles.dateIcon} />
              </View>
            </TouchableOpacity>
          </View>

          <DropdownSelector
            label="Payment Type"
            required
            value={paymentForm.mode}
            placeholder="Select Type"
            title="Select Payment Type"
            options={paymentTypesList}
            onSelect={(val) => setPaymentForm({ ...paymentForm, mode: val })}
            containerStyle={styles.formField}
          />

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Comment</Text>
            <TextInput
              style={[styles.formInput, styles.multilineInput]}
              value={paymentForm.remarks}
              onChangeText={(val) => setPaymentForm({ ...paymentForm, remarks: val })}
              multiline={true}
              numberOfLines={3}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={[styles.formFooter, { justifyContent: 'flex-end' }]}>
            <TouchableOpacity 
              style={[styles.solidTealButton, submitLoading && { opacity: 0.7 }]} 
              onPress={handleAddPaymentSubmit}
              disabled={submitLoading}
            >
              {submitLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.solidTealButtonText}>Submitting...</Text>
                </View>
              ) : (
                <Text style={styles.solidTealButtonText}>{editingPayment ? 'Update' : 'Submit'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // --- Main Render Dispatcher ---
  const renderContent = () => {
    // Global loader when any page/data is loading in Site Management
    if (apiLoading) {
      return (
        <View style={styles.centerAlignContainer}>
          <ActivityIndicator size="large" color="#009688" />
          <Text style={{ marginTop: 14, fontSize: 14, color: '#00796b', fontWeight: '700' }}>
            Loading site management data...
          </Text>
        </View>
      );
    }

    switch (currentView) {
      case 'all_projects':
        return renderAllProjects();
      case 'add_project':
      case 'edit_project':
        return renderAddEditProject();
      case 'tomorrow_clients':
        return renderTomorrowClients();
      case 'tomorrow_leads':
        return renderTomorrowLeads();
      case 'add_cash_flow':
      case 'edit_cash_flow':
        return renderAddCashFlow();
      case 'cash_flow':
        return renderCashFlowList();
      case 'all_expenses':
        return renderExpensesList();
      case 'daily_project_sheet':
        return renderDailyProjectSheet();
      case 'add_expenses':
        return renderAddExpenses();
      case 'work_status':
        return renderWorkStatus();
      case 'add_work_status':
        return renderAddWorkStatus();
      case 'client_payments':
        return renderClientPaymentsList();
      case 'add_client_payment':
      case 'edit_client_payment':
        return renderAddClientPayment();
      default:
        return (
          <View style={styles.centerAlignContainer}>
            <Text style={styles.infoText}>Select an option from the menu.</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#009688" translucent={true} />

      {/* Modern Teal Header with Safe Area Insets */}
      <View style={[styles.headerWrapper, { paddingTop: statusBarTop + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.iconButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{config.title}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => fetchAllData()}
              style={styles.iconButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
              disabled={apiLoading}
            >
              <Icon name="refresh" size={22} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('AdminMainTabs', { screen: 'Dashboard' })}
              style={styles.iconButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Icon name="home" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Path Breadcrumbs */}
      {config.path ? (
        <View style={styles.pathWrapper}>
          <Icon name="folder-open" size={16} color="#009688" style={{ marginRight: 6 }} />
          <Text style={styles.pathText}>{config.path}</Text>
        </View>
      ) : null}

      {/* Main Content Body */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 40 }}
        refreshControl={
          <RefreshControl refreshing={isPullRefreshing} onRefresh={handlePullRefresh} colors={['#009688']} />
        }
      >
        {renderContent()}
      </ScrollView>
      {/* Date Picker Modal for iOS and Android */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={datePickerConfig.show}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setDatePickerConfig(prev => ({ ...prev, show: false }))}
        >
          <TouchableOpacity
            style={styles.datePickerModalBackdrop}
            activeOpacity={1}
            onPress={() => setDatePickerConfig(prev => ({ ...prev, show: false }))}
          >
            <View style={styles.datePickerModalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.datePickerHeaderBar}>
                <TouchableOpacity
                  onPress={() => setDatePickerConfig(prev => ({ ...prev, show: false }))}
                  style={styles.datePickerActionBtn}
                >
                  <Text style={styles.datePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerModalTitle}>Select Date</Text>
                <TouchableOpacity
                  onPress={() => {
                    applySelectedDate(iosTempDate);
                    setDatePickerConfig(prev => ({ ...prev, show: false }));
                  }}
                  style={styles.datePickerActionBtn}
                >
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={iosTempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                textColor="#0f172a"
                style={{ height: 216, width: '100%' }}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      ) : (
        datePickerConfig.show && (
          <DateTimePicker
            value={datePickerConfig.currentValue}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )
      )}

      {/* Date Expenses Breakdown & Export Modal */}
      <Modal
        visible={dateExpensesModal.visible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDateExpensesModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                  {dateExpensesModal.associateName}
                </Text>
                <Text style={styles.modalHeaderSubtitle}>
                  Date: {dateExpensesModal.date}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDateExpensesModal(prev => ({ ...prev, visible: false }))}
                style={styles.modalCloseBtn}
              >
                <Icon name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Total Summary Card */}
            <View style={styles.modalTotalCard}>
              <View>
                <Text style={styles.modalTotalLabel}>Today Total Expense</Text>
                <Text style={styles.modalTotalAmount}>
                  Rs. {dateExpensesModal.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalExportBtn}
                onPress={handleExportDateExpenses}
                disabled={dateExpensesModal.items.length === 0}
              >
                <MaterialIcons name="file-download" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.modalExportBtnText}>Export CSV</Text>
              </TouchableOpacity>
            </View>

            {/* Itemized List */}
            {dateExpensesModal.loading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#009688" />
                <Text style={{ marginTop: 10, color: '#64748b' }}>Loading date expenses...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={true}>
                {dateExpensesModal.items.length > 0 ? (
                  dateExpensesModal.items.map((item, idx) => (
                    <View key={item._id || idx} style={styles.expenseItemCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <View style={styles.categoryBadge}>
                              <Text style={styles.categoryBadgeText}>{item.category || 'General'}</Text>
                            </View>
                            <Text style={styles.paymentTypeTag}>{item.paymentType || 'Cash'}</Text>
                          </View>
                          <Text style={styles.expenseItemTitle}>
                            {item.itemName || item.category}
                          </Text>
                        </View>
                        <Text style={styles.expenseItemPrice}>
                          Rs. {(item.amount || 0).toLocaleString()}
                        </Text>
                      </View>

                      <View style={styles.expenseItemDetails}>
                        <Text style={styles.expenseDetailRow}>
                          <Text style={{ fontWeight: '700' }}>Project: </Text>
                          {item.project?.projectName || 'N/A'}
                        </Text>
                        {item.client?.name ? (
                          <Text style={styles.expenseDetailRow}>
                            <Text style={{ fontWeight: '700' }}>Client: </Text>
                            {item.client.name}
                          </Text>
                        ) : null}
                        <Text style={styles.expenseDetailRow}>
                          <Text style={{ fontWeight: '700' }}>Paid To: </Text>
                          {item.paidTo}
                        </Text>
                        {item.quantity ? (
                          <Text style={styles.expenseDetailRow}>
                            <Text style={{ fontWeight: '700' }}>Qty: </Text>
                            {item.quantity} {item.unit || 'Pcs'}
                          </Text>
                        ) : null}
                        {item.remarks ? (
                          <Text style={[styles.expenseDetailRow, { fontStyle: 'italic', color: '#64748b' }]}>
                            Note: {item.remarks}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                    <Text style={{ color: '#94a3b8', fontSize: 14 }}>
                      No individual expense entries found for this date.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={{ marginTop: 16 }}>
              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={() => setDateExpensesModal(prev => ({ ...prev, visible: false }))}
              >
                <Text style={styles.modalDoneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Custom Category Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContainer, { maxWidth: 360 }]}>
            <Text style={styles.modalHeaderTitle}>Add Custom Category</Text>
            <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 14 }}>
              Enter name for new expense category (e.g. Sariya, Keele, Kulhadi)
            </Text>

            <TextInput
              style={styles.formInput}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="e.g. Fabda, Kulhadi, Paint"
              placeholderTextColor="#94a3b8"
              autoFocus={true}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={styles.outlineTealButton}
                onPress={() => {
                  setNewCategoryName('');
                  setShowCategoryModal(false);
                }}
              >
                <Text style={styles.outlineTealButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.solidTealButton, addingCategory && { opacity: 0.7 }]}
                onPress={handleAddCustomCategory}
                disabled={addingCategory}
              >
                {addingCategory ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.solidTealButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Work Status Modal */}
      <Modal
        visible={workStatusEditModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setWorkStatusEditModalVisible(false);
          setWorkStatusEditingItem(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContainer, { maxWidth: 500, maxHeight: '85%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.modalHeaderTitle}>Edit Work Status</Text>
              <TouchableOpacity
                onPress={() => {
                  setWorkStatusEditModalVisible(false);
                  setWorkStatusEditingItem(null);
                }}
              >
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {workStatusEditingItem && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                    {workStatusEditingItem.projectName}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Client: {workStatusEditingItem.clientName || 'N/A'} | Date: {workStatusEditingItem.dateStr}
                  </Text>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Today Work Status</Text>
                  <TextInput
                    style={[styles.formInput, styles.multilineInput]}
                    value={workStatusEditingItem.today}
                    onChangeText={(val) => setWorkStatusEditingItem({ ...workStatusEditingItem, today: val })}
                    placeholder="आज साइट पर क्या काम हुआ..."
                    placeholderTextColor="#94a3b8"
                    multiline={true}
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Tomorrow Work Plan</Text>
                  <TextInput
                    style={[styles.formInput, styles.multilineInput]}
                    value={workStatusEditingItem.tomorrow}
                    onChangeText={(val) => setWorkStatusEditingItem({ ...workStatusEditingItem, tomorrow: val })}
                    placeholder="कल साइट पर क्या काम होगा..."
                    placeholderTextColor="#94a3b8"
                    multiline={true}
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Day After Tomorrow Work Plan</Text>
                  <TextInput
                    style={[styles.formInput, styles.multilineInput]}
                    value={workStatusEditingItem.dayAfterTomorrow}
                    onChangeText={(val) => setWorkStatusEditingItem({ ...workStatusEditingItem, dayAfterTomorrow: val })}
                    placeholder="परसों का प्लान..."
                    placeholderTextColor="#94a3b8"
                    multiline={true}
                    numberOfLines={3}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                  <TouchableOpacity
                    style={styles.outlineTealButton}
                    onPress={() => {
                      setWorkStatusEditModalVisible(false);
                      setWorkStatusEditingItem(null);
                    }}
                  >
                    <Text style={styles.outlineTealButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.solidTealButton, workStatusSaving && { opacity: 0.7 }]}
                    onPress={handleSaveWorkStatusEdit}
                    disabled={workStatusSaving}
                  >
                    {workStatusSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.solidTealButtonText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerWrapper: {
    backgroundColor: '#009688',
    paddingHorizontal: 16,
    paddingBottom: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  pathWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#b2dfdb',
  },
  pathText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00796b',
  },
  scrollView: {
    flex: 1,
  },
  viewContainer: {
    padding: 16,
  },
  centerAlignContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  infoText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },

  /* Unified Filter Card */
  filterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'column',
    elevation: 4,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldContainer: {
    marginBottom: 14,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  pickerBorder: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    height: 50,
    justifyContent: 'center',
  },
  picker: {
    height: 50,
    color: '#334155',
    ...Platform.select({
      android: {
        backgroundColor: 'transparent',
      },
    }),
  },

  /* Form Styling */
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#334155',
    backgroundColor: '#ffffff',
    height: 50,
  },
  multilineInput: {
    textAlignVertical: 'top',
    height: 90,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingRight: 12,
    height: 50,
  },
  dateInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#334155',
  },
  dateIcon: {
    marginLeft: 8,
  },
  formFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    alignItems: 'center',
  },
  solidTealButton: {
    backgroundColor: '#009688',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#009688',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  solidTealButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  outlineTealButton: {
    borderWidth: 1.5,
    borderColor: '#009688',
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineTealButtonText: {
    color: '#009688',
    fontSize: 15,
    fontWeight: '700',
  },

  /* Tables Section */
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    marginBottom: 20,
  },
  tableCardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
  },
  tealButton: {
    backgroundColor: '#009688',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#009688',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  tealButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  tableContainer: {
    paddingBottom: 16,
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#cbd5e1',
    paddingHorizontal: 16,
  },
  tableColHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  tableCell: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
  },
  centerAlign: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCell: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  editBtn: {
    backgroundColor: '#009688',
    padding: 8,
    borderRadius: 6,
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
    padding: 8,
    borderRadius: 6,
  },
  activeBadge: {
    backgroundColor: '#e0f2f1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#009688',
  },
  activeBadgeText: {
    color: '#009688',
    fontSize: 11,
    fontWeight: '700',
  },
  noDataRow: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: width - 64,
  },
  noDataText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },

  /* Action Plan Card (Work Status) */
  actionPlanCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#0f172a',
    elevation: 3,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginBottom: 16,
  },
  actionPlanTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionPlanQuote: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3a8a',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  quoteCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#fef3c7',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b45309',
  },
  dateDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  dateDisplayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },

  /* Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    width: '100%',
    maxWidth: 460,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalHeaderSubtitle: {
    fontSize: 13,
    color: '#009688',
    fontWeight: '600',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  modalTotalCard: {
    backgroundColor: '#004d40',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTotalLabel: {
    color: '#80cbc4',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modalTotalAmount: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  modalExportBtn: {
    backgroundColor: '#009688',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalExportBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalDoneBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalDoneBtnText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  expenseItemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryBadge: {
    backgroundColor: '#e0f2f1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#00796b',
    fontSize: 11,
    fontWeight: '700',
  },
  paymentTypeTag: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expenseItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  expenseItemPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#009688',
  },
  expenseItemDetails: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 6,
  },
  expenseDetailRow: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 2,
  },

  /* Civil Sheet / Action Plan UI (User Screenshot) */
  civilFilterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  civilFilterTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  civilFilterCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  civilFilterResetText: {
    fontSize: 12,
    color: '#009688',
    fontWeight: '700',
  },
  civilFilterRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 4,
  },
  civilFilterItem: {
    minWidth: 180,
  },
  civilItemLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  civilPickerBorder: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    height: 52,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  civilPicker: {
    height: 52,
    color: '#1e293b',
    ...Platform.select({
      android: {
        backgroundColor: 'transparent',
        marginVertical: -2,
      },
    }),
  },
  civilDateFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    height: 52,
    minWidth: 180,
  },
  civilDateValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  civilDocCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  civilDocHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: '#475569',
    paddingVertical: 8,
    marginBottom: 12,
  },
  civilDocTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  civilQuoteBox: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 4,
    padding: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  civilQuoteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 20,
  },
  civilTaraiBanner: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#475569',
    paddingVertical: 7,
    alignItems: 'center',
    marginBottom: 8,
  },
  civilTaraiText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  civilDateRow: {
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#475569',
    marginBottom: 10,
  },
  civilDateRowText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  civilSheetTitleWrapper: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 10,
  },
  civilSheetTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 1,
  },
  civilTable: {
    borderWidth: 1,
    borderColor: '#64748b',
    borderRadius: 2,
    overflow: 'hidden',
  },
  civilTableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#df9494', // The exact salmon pink from user photo!
    borderBottomWidth: 1,
    borderColor: '#64748b',
  },
  civilColHeader: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    borderRightWidth: 1,
    borderColor: '#64748b',
    textAlign: 'center',
  },
  civilTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#94a3b8',
    backgroundColor: '#ffffff',
    minHeight: 56,
  },
  civilCellWrapper: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderColor: '#94a3b8',
    justifyContent: 'center',
  },
  civilProjectNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  civilClientSubText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  civilInlineInput: {
    fontSize: 12,
    color: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    minHeight: 40,
  },
  civilEmptyRow: {
    paddingVertical: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  civilEmptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  civilBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
  },
  civilPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15803d', // Exact green Print button from screenshot!
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
  },
  civilPrintBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  civilExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2f1',
    borderWidth: 1,
    borderColor: '#009688',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 6,
  },
  civilExportBtnText: {
    color: '#00796b',
    fontSize: 13,
    fontWeight: '700',
  },
  civilSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#009688',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 6,
  },
  civilSaveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  settleInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6fffa',
    borderWidth: 1,
    borderColor: '#38b2ac',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  settleInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00796b',
  },
  settleInfoText: {
    fontSize: 12,
    color: '#0f766e',
    marginTop: 2,
    lineHeight: 16,
  },

  /* Dropdown Selector Button & Modal Styles */
  dropdownSelectorBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    height: 50,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownSelectorBtnActive: {
    borderColor: '#009688',
    backgroundColor: '#f0fdfa',
  },
  dropdownSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  dropdownPlaceholderText: {
    color: '#94a3b8',
    fontWeight: '400',
  },
  dropdownModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  dropdownModalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  dropdownModalDragBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  dropdownModalCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  dropdownSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    paddingVertical: 0,
  },
  dropdownOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  dropdownOptionItemSelected: {
    backgroundColor: '#e0f2f1',
  },
  dropdownOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  dropdownOptionTextSelected: {
    fontWeight: '700',
    color: '#00796b',
  },

  /* iOS DatePicker Modal Styles */
  datePickerModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  datePickerHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  datePickerModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  datePickerActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  datePickerCancelText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  datePickerDoneText: {
    fontSize: 15,
    color: '#009688',
    fontWeight: '700',
  },

  /* Work Status Synchronized UI Styles (from Web Screenshot) */
  wsActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  wsHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  wsBadge: {
    backgroundColor: '#e0f2f1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  wsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00796b',
  },
  wsAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#009688',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  wsExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f766e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  wsRefreshBtn: {
    backgroundColor: '#e0f2f1',
    padding: 8,
    borderRadius: 6,
  },
  wsBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  wsTableCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  wsTable: {
    flexDirection: 'column',
  },
  wsTableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1.5,
    borderBottomColor: '#cbd5e1',
    alignItems: 'center',
  },
  wsColHeader: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  wsTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  wsCellWrapper: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
    justifyContent: 'center',
  },
  wsProjectNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  wsClientNameText: {
    fontSize: 13,
    color: '#475569',
  },
  wsDateText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  wsContentText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  wsAddedByText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  wsActionEditBtn: {
    backgroundColor: '#009688',
    width: 30,
    height: 30,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wsActionDeleteBtn: {
    backgroundColor: '#ef4444',
    width: 30,
    height: 30,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wsEmptyRow: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wsEmptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },

  /* Work Status Pagination Styles */
  wsPaginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexWrap: 'wrap',
    gap: 10,
  },
  wsPaginationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wsPaginationInfoText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  wsPageSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wsPageSizeLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginRight: 2,
  },
  wsPageSizeBtn: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  wsPageSizeBtnActive: {
    backgroundColor: '#009688',
    borderColor: '#009688',
  },
  wsPageSizeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  wsPageSizeTextActive: {
    color: '#ffffff',
  },
  wsPaginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wsPageNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wsPageNavBtnDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    opacity: 0.5,
  },
  wsPageNumberBadge: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 6,
    backgroundColor: '#e0f2f1',
  },
  wsPageNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00796b',
  },
});

export default SitesManagementScreen;

