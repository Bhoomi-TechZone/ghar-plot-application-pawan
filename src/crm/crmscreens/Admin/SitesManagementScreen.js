import React, { useState, useEffect } from 'react';
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
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Picker from '../../components/Common/AppDropdownPicker';
import * as adminSitesApi from '../../services/adminSitesApi';

const { width } = Dimensions.get('window');

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
        navigation.goBack();
        break;
    }
  };

  // Hardware back press handler on Android
  useEffect(() => {
    const onBackPress = () => {
      if (['add_project', 'edit_project', 'add_cash_flow', 'edit_cash_flow', 'add_expenses', 'daily_project_sheet', 'add_work_status', 'add_client_payment', 'edit_client_payment'].includes(currentView)) {
        handleBack();
        return true;
      }
      return false;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [currentView]);

  // --- Helpers ---
  const getTodayDateString = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const exportToCsv = async (filename, headerColumns, dataRows) => {
    try {
      if (!dataRows || dataRows.length === 0) {
        Alert.alert('Export', 'No data available to export.');
        return;
      }
      const headerLine = headerColumns.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',');
      const bodyLines = dataRows.map(row =>
        row.map(val => `"${String(val !== undefined && val !== null ? val : '').replace(/"/g, '""')}"`).join(',')
      );
      const csvContent = [headerLine, ...bodyLines].join('\n');
      await Share.share({
        title: filename,
        message: csvContent,
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Export Error', 'Could not export file.');
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

  // --- Fetch API data on mount ---
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setApiLoading(true);
    try {
      const [clientsData, projectsData, cashFlowsData, employeesData, expensesData, categoriesData] = await Promise.all([
        adminSitesApi.getClients(),
        adminSitesApi.getProjects(),
        adminSitesApi.getCashFlows(),
        adminSitesApi.getEmployees(),
        adminSitesApi.getExpenses(),
        adminSitesApi.getExpenseCategories(),
      ]);

      // Map clients from API (Includes registered App Users)
      const mappedClients = clientsData.map(c => ({
        id: c._id,
        name: c.name,
        contactNumber: c.contactNumber,
        comments: c.comments,
        source: c.source,
        clientType: c.clientType?.name || (typeof c.clientType === 'string' ? c.clientType : ''),
        status: c.status || 'Active',
        assignedTo: c.assignedTo,
        propertySellerType: c.propertySellerType,
        isRegisteredUser: !!c.isRegisteredUser,
      }));
      setApiClients(mappedClients);

      // Map projects from API
      const mappedProjects = projectsData.map(p => ({
        id: p._id,
        name: p.projectName || p.name || '',
        client: p.client?.name || p.client || '',
        clientId: p.client?._id || (typeof p.client === 'string' ? p.client : ''),
        status: p.status || 'Active',
      }));
      setApiProjects(mappedProjects);

      // Map cashflows from API
      const mappedCashFlows = cashFlowsData.map(cf => ({
        id: cf._id,
        date: cf.date ? new Date(cf.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '',
        rawDate: cf.date,
        associate: cf.businessAssociate?.name || '',
        associateId: cf.businessAssociate?._id || '',
        openingBal: `Rs. ${(cf.openingBalance || 0).toFixed(2)}`,
        totalRec: `Rs. ${(cf.totalReceived || 0).toFixed(2)}`,
        totalExp: `Rs. ${(cf.totalExpense || 0).toFixed(2)}`,
        rawTotalExp: cf.totalExpense || 0,
        expenseCount: cf.expenseCount || 0,
        from: cf.entries?.map(e => e.receivedFrom).filter(Boolean).join(', ') || '',
        closingBal: `Rs. ${(cf.closingBalance || 0).toFixed(2)}`,
        amount: cf.entries?.reduce((sum, e) => sum + (parseFloat(e.receivedAmount) || 0), 0).toString() || '0',
        type: cf.entries?.[0]?.type || '',
      }));
      setApiCashFlows(mappedCashFlows);

      // Map employees from API (used for Business Associate dropdowns)
      const mappedEmployees = employeesData.map(e => ({
        id: e._id,
        name: e.name,
        email: e.email,
        phone: e.phone,
        department: e.department,
        role: e.role?.name || '',
      }));
      setApiEmployees(mappedEmployees);

      // Map expenses from API
      const mappedExpenses = expensesData.map(e => ({
        id: e._id,
        date: e.date ? new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '',
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

      if (categoriesData && categoriesData.length > 0) {
        setCategoriesList(categoriesData);
      }
    } catch (error) {
      console.error('Error fetching API data:', error);
    } finally {
      setApiLoading(false);
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

  // Initialize civil sheet plans as empty (NO dummy data - only real database projects)
  const [civilSheetPlans, setCivilSheetPlans] = useState([]);

  // Merge projects from API into civil sheet plans (filtering out any previous dummy items)
  useEffect(() => {
    if (apiProjects && apiProjects.length > 0) {
      setCivilSheetPlans(prev => {
        // Strip out any previous mock/dummy projects
        const cleanedPrev = prev.filter(
          p => !p.id?.toString().startsWith('mock_') &&
               p.projectName !== '1363 Sector 3 Vasundhra Gzb' &&
               p.projectName !== '201 Sector 11 Raj Nagar'
        );
        const existingNames = new Set(cleanedPrev.map(p => (p.projectName || '').toLowerCase().trim()));
        const newFromApi = apiProjects
          .filter(p => p.name && !existingNames.has(p.name.toLowerCase().trim()))
          .map(p => ({
            id: p.id || String(Date.now() + Math.random()),
            projectName: p.name,
            client: p.client || '',
            actionPlanTomorrow: '',
            manualNotes: '',
            supervisor: 'Admin',
            workStage: '',
          }));
        return [...cleanedPrev, ...newFromApi];
      });
    }
  }, [apiProjects]);

  // Load saved civil sheet plans for selected date (also cleaning any previous mock data)
  useEffect(() => {
    const loadSavedPlansForDate = async () => {
      try {
        const activeDate = workStatusDateFilter || getTodayFormattedDDMMYYYY();
        const storageKey = `@civil_action_plans_${activeDate}`;
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleaned = parsed.filter(
              p => !p.id?.toString().startsWith('mock_') &&
                   p.projectName !== '1363 Sector 3 Vasundhra Gzb' &&
                   p.projectName !== '201 Sector 11 Raj Nagar'
            );
            if (cleaned.length > 0) {
              setCivilSheetPlans(prev => {
                const planMap = new Map();
                cleaned.forEach(item => planMap.set(item.projectName?.toLowerCase()?.trim(), item));
                // Keep API projects and overwrite with saved fields
                return prev.map(p => {
                  const saved = planMap.get(p.projectName?.toLowerCase()?.trim());
                  return saved ? { ...p, ...saved } : p;
                });
              });
            }
          }
        }
      } catch (e) {
        console.log('Error loading saved civil sheet plans:', e);
      }
    };
    if (workStatusDateFilter) {
      loadSavedPlansForDate();
    }
  }, [workStatusDateFilter]);

  // --- Date Picker State & Handlers ---
  const [datePickerConfig, setDatePickerConfig] = useState({
    show: false,
    targetField: null,
    currentValue: new Date()
  });
  const [iosTempDate, setIosTempDate] = useState(new Date());

  const openDatePicker = (targetField, currentValueString) => {
    let parsedDate = new Date();
    if (currentValueString && typeof currentValueString === 'string') {
      const trimmed = currentValueString.trim();
      const direct = new Date(trimmed);
      if (!isNaN(direct.getTime()) && trimmed.includes('-') && trimmed.length >= 10 && trimmed.indexOf('-') === 4) {
        parsedDate = direct;
      } else {
        const parts = trimmed.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            const p0 = parseInt(parts[0], 10);
            const p1 = parseInt(parts[1], 10);
            const p2 = parseInt(parts[2], 10);
            if (p0 > 12) {
              parsedDate = new Date(p2, p1 - 1, p0);
            } else {
              parsedDate = new Date(p2, p0 - 1, p1);
            }
          } else if (parts[0].length === 4) {
            parsedDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          }
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

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setDatePickerConfig(prev => ({ ...prev, show: false }));
    }
    if (!selectedDate || (event && event.type === 'dismissed')) {
      if (Platform.OS === 'ios') setDatePickerConfig(prev => ({ ...prev, show: false }));
      return;
    }
    
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
      case 'cashFlowDateFilter': setCashFlowDateFilter(formattedStr); break;
      case 'workStatusDateFilter': {
        const d = String(selectedDate.getDate()).padStart(2, '0');
        const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const y = selectedDate.getFullYear();
        setWorkStatusDateFilter(`${d}-${m}-${y}`);
        break;
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
      await fetchAllData();
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
          try {
            await adminSitesApi.deleteProject(id);
            await fetchAllData();
            Alert.alert('Success', 'Project deleted successfully!');
          } catch (e) {
            Alert.alert('Error', 'Failed to delete project.');
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
      const formattedDate = `${dateParts[2]}-${dateParts[0]}-${dateParts[1]}`;
      
      const requestBody = {
        businessAssociate: selectedAssociate.id,
        date: formattedDate,
        openingBalance: parseFloat(cashFlowForm.openingBalance) || 0,
        entries: cashFlowForm.entries.map(e => ({
          receivedFrom: e.receivedFrom,
          receivedAmount: parseFloat(e.receivedAmount) || 0,
          type: e.type,
        })),
      };

      if (cashFlowForm.id) {
        await adminSitesApi.updateCashFlow(cashFlowForm.id, requestBody);
        Alert.alert('Success', 'Cash flow record updated successfully!');
      } else {
        await adminSitesApi.createCashFlow(requestBody);
        Alert.alert('Success', 'Cash flow record added successfully!');
      }
      await fetchAllData();
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
          try {
            await adminSitesApi.deleteCashFlow(id);
            await fetchAllData();
            Alert.alert('Success', 'Cash flow record deleted successfully!');
          } catch (e) {
            Alert.alert('Error', 'Failed to delete record.');
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
      await fetchAllData();
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
          try {
            await adminSitesApi.deleteExpense(id);
            await fetchAllData();
            if (currentView === 'daily_project_sheet') {
              fetchDailyProjectSheet(sheetDate, sheetAssociateFilter, sheetProjectFilter);
            }
            Alert.alert('Success', 'Expense deleted and cash flow updated!');
          } catch (e) {
            Alert.alert('Error', 'Failed to delete expense.');
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

  const handleAddWorkStatusSubmit = () => {
    if (!workStatusForm.project || !workStatusForm.actionPlan) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }
    setSubmitLoading(true);
    setTimeout(() => {
      setSubmitLoading(false);
      Alert.alert('Success', 'Work status added successfully!');
      setWorkStatusForm({
        project: '',
        actionPlan: '',
        notes: '',
        supervisor: 'Admin',
        stage: 'Slab',
      });
      setCurrentView('work_status');
    }, 400);
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

  // --- Dynamic View Title & Breadcrumbs ---
  const getViewConfig = () => {
    switch (currentView) {
      case 'all_projects':
        return { title: 'Projects', path: 'Home / Clients / Projects' };
      case 'add_project':
        return { title: 'Add Project', path: 'Home / Clients / Projects / Add Project' };
      case 'edit_project':
        return { title: editingProject?.name || 'Edit Project', path: `Home / Clients / Projects / ${editingProject?.name || 'Edit'}` };
      case 'tomorrow_clients':
        return { title: "Tomorrow's Clients Plan", path: 'Home / Clients / Tomorrow\'s Action Plan Clients' };
      case 'tomorrow_leads':
        return { title: "Tomorrow's Leads Plan", path: 'Home / Clients / Tomorrow\'s Action Plan Leads' };
      case 'add_cash_flow':
        return { title: 'Add Cash Flow', path: 'Home / Add Cash Flow' };
      case 'edit_cash_flow':
        return { title: 'Cash Flow Update', path: 'Home / Cash Flow Update' };
      case 'cash_flow':
        return { title: 'Cash Flow List', path: 'Home / Clients / Cash Flow' };
      case 'all_expenses':
        return { title: 'All Expenses', path: 'Home / Clients / All Expenses' };
      case 'daily_project_sheet':
        return { title: 'Daily Project Sheet', path: 'Home / Clients / Daily Project Expense Sheet' };
      case 'add_expenses':
        return { title: 'Add Expenses', path: 'Home / Add Expenses' };
      case 'work_status':
        return { title: 'Work Status', path: 'Home / Clients / Work Status' };
      case 'add_work_status':
        return { title: 'Add Work Status', path: 'Home / Add Work Status' };
      case 'client_payments':
        return { title: 'Client Payments', path: 'Home / Clients / Client Payments' };
      case 'add_client_payment':
        return { title: 'Add Client Payment', path: 'Home / Add Client Payment' };
      case 'edit_client_payment':
        return { title: 'Edit Client Payment', path: 'Home / Edit Client Payment' };
      default:
        return { title: 'Sites Management', path: 'Home / Sites Management' };
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

    return (
      <View style={styles.viewContainer}>
        {/* Unified Filter Card - Stacked Vertically for mobile spacing */}
        <View style={styles.filterCard}>
          <Text style={styles.cardHeaderTitle}>Filter Projects</Text>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.filterLabel}>Client</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={selectedClientFilter}
                onValueChange={(val) => setSelectedClientFilter(val)}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Select Client" value="" />
                {apiClients.map((c) => (
                  <Picker.Item key={c.id} label={c.name} value={c.name} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.filterLabel}>Project Status</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={selectedStatusFilter}
                onValueChange={(val) => setSelectedStatusFilter(val)}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Select Project Status" value="" />
                <Picker.Item label="Active" value="Active" />
                <Picker.Item label="Inactive" value="Inactive" />
              </Picker>
            </View>
          </View>
        </View>

        {/* Action Buttons & Table Section */}
        <View style={styles.tableCard}>
          {/* Refined Header: Stacks layout to prevent overlaps on mobile screens */}
          <View style={styles.tableCardHeader}>
            <Text style={styles.tableTitle}>Projects List</Text>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.tealButton}
                onPress={() => {
                  const headers = ['Project Name', 'Client Name', 'Status'];
                  const rows = filteredProjects.map(p => [p.name, p.client, p.status]);
                  exportToCsv('Projects_List.csv', headers, rows);
                }}
              >
                <MaterialIcons name="file-download" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.tealButtonText}>Export Data</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tealButton, { marginLeft: 8 }]} onPress={handleAddProject}>
                <MaterialIcons name="add" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.tealButtonText}>Add Project</Text>
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
              {filteredProjects.length > 0 ? (
                filteredProjects.map((p) => (
                  <View key={p.id} style={styles.tableRow}>
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
          
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Client <Text style={styles.required}>*</Text></Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={projectForm.client}
                onValueChange={(val) => setProjectForm({ ...projectForm, client: val })}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Select Client" value="" />
                {apiClients.map((c) => (
                  <Picker.Item key={c.id} label={c.name} value={c.name} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Project/Site Status <Text style={styles.required}>*</Text></Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={projectForm.status}
                onValueChange={(val) => setProjectForm({ ...projectForm, status: val })}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Active" value="Active" />
                <Picker.Item label="Inactive" value="Inactive" />
              </Picker>
            </View>
          </View>
          
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

          {/* Top Fields */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Business Associate <Text style={styles.required}>*</Text></Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={cashFlowForm.associate}
                onValueChange={(val) => handleAssociateChangeInCashFlow(val)}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Select Associate" value="" />
                {apiEmployees.map((a) => (
                  <Picker.Item key={a.id} label={a.name} value={a.name} />
                ))}
              </Picker>
            </View>
          </View>

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

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Type <Text style={styles.required}>*</Text></Text>
                <View style={styles.pickerBorder}>
                  <Picker
                    selectedValue={entry.type}
                    onValueChange={(val) => updateCashFlowEntry(entry.id, 'type', val)}
                    style={styles.picker}
                    dropdownIconColor="#009688"
                  >
                    <Picker.Item label="Select Type" value="" />
                    <Picker.Item label="Cash" value="Cash" />
                    <Picker.Item label="Credit" value="Credit" />
                    <Picker.Item label="Paytm" value="Paytm" />
                    <Picker.Item label="Google Pay" value="Google Pay" />
                    <Picker.Item label="PhonePay" value="PhonePay" />
                    <Picker.Item label="Online Transfer" value="Online Transfer" />
                    <Picker.Item label="Adjustment" value="Adjustment" />
                    <Picker.Item label="Product Upsell" value="Product Upsell" />
                  </Picker>
                </View>
              </View>
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
                  {cashFlowForm.id ? 'Update Cash Flow' : 'Submit'}
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
    };

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
          <View style={styles.fieldContainer}>
            <Text style={styles.filterLabel}>Business Associate</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={cashFlowAssociateFilter}
                onValueChange={(val) => setCashFlowAssociateFilter(val)}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="All Associates" value="" />
                {apiEmployees.map((e) => (
                  <Picker.Item key={e.id} label={e.name} value={e.name} />
                ))}
              </Picker>
            </View>
          </View>

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
                  onPress={() => setCashFlowDateFilter('')}
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
                {filteredCashFlows.length} record{filteredCashFlows.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.tealButton}
                onPress={() => {
                  const headers = ['Business Associate', 'Date', 'Opening Balance', 'Total Received', 'Total Expense', 'Received From', 'Closing Balance'];
                  const rows = filteredCashFlows.map(c => [c.associate, c.date, c.openingBal, c.totalRec, c.totalExp, c.from, c.closingBal]);
                  exportToCsv('CashFlow_Report.csv', headers, rows);
                }}
              >
                <MaterialIcons name="file-download" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.tealButtonText}>Export Report</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tealButton, { marginLeft: 8 }]}
                onPress={() => setCurrentView('add_cash_flow')}
              >
                <MaterialIcons name="add" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.tealButtonText}>Add Cash Flow</Text>
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
              {filteredCashFlows.length > 0 ? (
                filteredCashFlows.map((c) => {
                  const isNegative = c.closingBal.includes('-');
                  const isPositive = !isNegative && c.closingBal !== 'Rs. 0.00' && c.closingBal !== '0';
                  return (
                    <View key={c.id} style={styles.tableRow}>
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
      exportToCsv('Expenses_List.csv', headers, rows);
    };

    const resetExpenseFilters = () => {
      setSelectedAssociateFilter('');
      setSelectedClientFilter('');
      setSelectedProjectFilter('');
      setSelectedStatusFilter('');
      setSelectedCategoryFilter('');
      setSelectedPaymentTypeFilter('');
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
          <View style={styles.fieldContainer}>
            <Text style={styles.filterLabel}>Business Associate</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={selectedAssociateFilter}
                onValueChange={(val) => setSelectedAssociateFilter(val)}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="All Associates" value="" />
                {apiEmployees.map((a) => (
                  <Picker.Item key={a.id} label={a.name} value={a.name} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Filter 2 & 3: Client & Project */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={styles.filterLabel}>Client</Text>
              <View style={styles.pickerBorder}>
                <Picker
                  selectedValue={selectedClientFilter}
                  onValueChange={(val) => setSelectedClientFilter(val)}
                  style={styles.picker}
                  dropdownIconColor="#009688"
                >
                  <Picker.Item label="All Clients" value="" />
                  {apiClients.map((c) => (
                    <Picker.Item key={c.id} label={c.name} value={c.name} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={styles.filterLabel}>Project</Text>
              <View style={styles.pickerBorder}>
                <Picker
                  selectedValue={selectedProjectFilter}
                  onValueChange={(val) => setSelectedProjectFilter(val)}
                  style={styles.picker}
                  dropdownIconColor="#009688"
                >
                  <Picker.Item label="All Projects" value="" />
                  {apiProjects.map((p) => (
                    <Picker.Item key={p.id} label={p.name} value={p.name} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Filter 4 & 5: Project Status & Category */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={styles.filterLabel}>Project Status</Text>
              <View style={styles.pickerBorder}>
                <Picker
                  selectedValue={selectedStatusFilter}
                  onValueChange={(val) => setSelectedStatusFilter(val)}
                  style={styles.picker}
                  dropdownIconColor="#009688"
                >
                  <Picker.Item label="All Statuses" value="" />
                  <Picker.Item label="Active" value="Active" />
                  <Picker.Item label="Completed" value="Completed" />
                </Picker>
              </View>
            </View>

            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={styles.filterLabel}>Category</Text>
              <View style={styles.pickerBorder}>
                <Picker
                  selectedValue={selectedCategoryFilter}
                  onValueChange={(val) => setSelectedCategoryFilter(val)}
                  style={styles.picker}
                  dropdownIconColor="#009688"
                >
                  <Picker.Item label="All Categories" value="" />
                  {categoriesList.map((cat, idx) => (
                    <Picker.Item key={idx} label={cat} value={cat} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Filter 6: Payment Type */}
          <View style={styles.fieldContainer}>
            <Text style={styles.filterLabel}>Payment Type</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={selectedPaymentTypeFilter}
                onValueChange={(val) => setSelectedPaymentTypeFilter(val)}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="All Payment Types" value="" />
                <Picker.Item label="Cash" value="Cash" />
                <Picker.Item label="Credit" value="Credit" />
                <Picker.Item label="Paytm" value="Paytm" />
                <Picker.Item label="Google Pay" value="Google Pay" />
                <Picker.Item label="PhonePay" value="PhonePay" />
                <Picker.Item label="Online Transfer" value="Online Transfer" />
                <Picker.Item label="Adjustment" value="Adjustment" />
                <Picker.Item label="Product Upsell" value="Product Upsell" />
              </Picker>
            </View>
          </View>
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
            <Text style={styles.tableTitle}>Expenses List</Text>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.tealButton, { backgroundColor: '#0284c7', marginRight: 8 }]}
                onPress={() => setCurrentView('daily_project_sheet')}
              >
                <MaterialIcons name="table-chart" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.tealButtonText}>Daily Project Sheet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tealButton} onPress={handleExportExpenses}>
                <MaterialIcons name="file-download" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.tealButtonText}>Export Expenses</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tealButton, { marginLeft: 8 }]}
                onPress={() => setCurrentView('add_expenses')}
              >
                <MaterialIcons name="add" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.tealButtonText}>Add Expense</Text>
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
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((c) => (
                  <View key={c.id} style={styles.tableRow}>
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
      exportToCsv(`Daily_Project_Expense_Sheet_${sheetDate.replace(/\//g, '-')}.csv`, headers, rows);
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
            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={styles.filterLabel}>Business Associate</Text>
              <View style={styles.pickerBorder}>
                <Picker
                  selectedValue={sheetAssociateFilter}
                  onValueChange={(val) => setSheetAssociateFilter(val)}
                  style={styles.picker}
                  dropdownIconColor="#009688"
                >
                  <Picker.Item label="All Associates" value="" />
                  {apiEmployees.map((a) => (
                    <Picker.Item key={a.id} label={a.name} value={a.name} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={styles.filterLabel}>Project</Text>
              <View style={styles.pickerBorder}>
                <Picker
                  selectedValue={sheetProjectFilter}
                  onValueChange={(val) => setSheetProjectFilter(val)}
                  style={styles.picker}
                  dropdownIconColor="#009688"
                >
                  <Picker.Item label="All Projects" value="" />
                  {apiProjects.map((p) => (
                    <Picker.Item key={p.id} label={p.name} value={p.name} />
                  ))}
                </Picker>
              </View>
            </View>
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

          {/* CLIENT PICKER (Correctly bound to expensesForm.client) */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Client / Registered User</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={expensesForm.client}
                onValueChange={(val) => setExpensesForm({ ...expensesForm, client: val, project: '' })}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Select Client / User" value="" />
                {apiClients.map((c) => (
                  <Picker.Item
                    key={c.id}
                    label={`${c.name} (${c.clientType || 'Client'})`}
                    value={c.name}
                  />
                ))}
              </Picker>
            </View>
          </View>
          
          {/* PROJECT / SITE PICKER (Filtered by selected Client) */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Project / Site <Text style={styles.required}>*</Text></Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={expensesForm.project}
                onValueChange={(val) => {
                  const foundProj = apiProjects.find(p => p.name === val || p.id === val);
                  setExpensesForm({
                    ...expensesForm,
                    project: val,
                    client: foundProj?.client || expensesForm.client,
                  });
                }}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Select Project" value="" />
                {availableProjects.map((p) => (
                  <Picker.Item key={p.id} label={`${p.name} (${p.client})`} value={p.name} />
                ))}
              </Picker>
            </View>
          </View>

          {/* BUSINESS ASSOCIATE (EMPLOYEE) PICKER */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Business Associate (Employee) <Text style={styles.required}>*</Text></Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={expensesForm.associate}
                onValueChange={(val) => setExpensesForm({ ...expensesForm, associate: val })}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Select Business Associate" value="" />
                {apiEmployees.map((a) => (
                  <Picker.Item key={a.id} label={a.name} value={a.name} />
                ))}
              </Picker>
            </View>
          </View>

          {/* DYNAMIC CATEGORY PICKER */}
          <View style={styles.formField}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.formLabel}>Category <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(true)}>
                <Text style={{ color: '#009688', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>+ Add Custom</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={expensesForm.category}
                onValueChange={(val) => {
                  if (val === '__add_custom__') {
                    setShowCategoryModal(true);
                  } else {
                    setExpensesForm({ ...expensesForm, category: val });
                  }
                }}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                {categoriesList.map((cat, idx) => (
                  <Picker.Item key={idx} label={cat} value={cat} />
                ))}
                <Picker.Item label="+ Add Custom Category..." value="__add_custom__" color="#009688" />
              </Picker>
            </View>
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

            <View style={{ flex: 1 }}>
              <Text style={styles.formLabel}>Unit</Text>
              <View style={styles.pickerBorder}>
                <Picker
                  selectedValue={expensesForm.unit}
                  onValueChange={(val) => setExpensesForm({ ...expensesForm, unit: val })}
                  style={styles.picker}
                  dropdownIconColor="#009688"
                >
                  <Picker.Item label="Pcs (Pieces)" value="Pcs" />
                  <Picker.Item label="Kg (Kilograms)" value="Kg" />
                  <Picker.Item label="Bags / Bori" value="Bags" />
                  <Picker.Item label="Feet" value="Feet" />
                  <Picker.Item label="Trolley" value="Trolley" />
                  <Picker.Item label="Litre" value="Litre" />
                  <Picker.Item label="Days" value="Days" />
                  <Picker.Item label="Hours" value="Hours" />
                </Picker>
              </View>
            </View>
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
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Payment Type <Text style={styles.required}>*</Text></Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={expensesForm.paymentType}
                onValueChange={(val) => setExpensesForm({ ...expensesForm, paymentType: val })}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Cash" value="Cash" />
                <Picker.Item label="Credit" value="Credit" />
                <Picker.Item label="Paytm" value="Paytm" />
                <Picker.Item label="Google Pay" value="Google Pay" />
                <Picker.Item label="PhonePay" value="PhonePay" />
                <Picker.Item label="Online Transfer" value="Online Transfer" />
                <Picker.Item label="Adjustment" value="Adjustment" />
                <Picker.Item label="Product Upsell" value="Product Upsell" />
              </Picker>
            </View>
          </View>

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

  const handleExportCivilSheet = () => {
    const activeDate = workStatusDateFilter || getTodayFormattedDDMMYYYY();
    const headers = ['Project Name', 'Client', 'Action Plan for tomorrow', 'Manual Notes', 'Supervisor', 'Work Stage', 'Date'];
    const rows = filteredCivilPlans.map(p => [
      p.projectName || '',
      p.client || '',
      p.actionPlanTomorrow || '',
      p.manualNotes || '',
      p.supervisor || 'Admin',
      p.workStage || '',
      activeDate,
    ]);
    exportToCsv(`Civil_Action_Plan_${activeDate}.csv`, headers, rows);
  };

  const filteredCivilPlans = civilSheetPlans.filter(p => {
    const matchClient = !workStatusClientFilter || (p.client && p.client.toLowerCase().includes(workStatusClientFilter.toLowerCase()));
    const matchProject = !workStatusProjectFilter || (p.projectName && p.projectName.toLowerCase().includes(workStatusProjectFilter.toLowerCase()));
    return matchClient && matchProject;
  });

  const renderWorkStatus = () => {
    const activeDisplayDate = workStatusDateFilter || getTodayFormattedDDMMYYYY();

    return (
      <View style={styles.viewContainer}>
        {/* Top Horizontal Filter Bar (Business Associate, Client, Project, Date) */}
        <View style={styles.civilFilterCard}>
          <View style={styles.civilFilterTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="tune" size={18} color="#009688" style={{ marginRight: 6 }} />
              <Text style={styles.civilFilterCardTitle}>Filter Action Plan</Text>
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
            <View style={styles.civilFilterItem}>
              <Text style={styles.civilItemLabel}>Business Associate</Text>
              <View style={styles.civilPickerBorder}>
                <Picker
                  selectedValue={workStatusAssociateFilter}
                  onValueChange={(val) => setWorkStatusAssociateFilter(val)}
                  style={styles.civilPicker}
                  dropdownIconColor="#009688"
                >
                  <Picker.Item label="Select Associate" value="" />
                  {apiEmployees.map((a) => (
                    <Picker.Item key={a.id} label={a.name} value={a.name} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Client Dropdown */}
            <View style={styles.civilFilterItem}>
              <Text style={styles.civilItemLabel}>Client</Text>
              <View style={styles.civilPickerBorder}>
                <Picker
                  selectedValue={workStatusClientFilter}
                  onValueChange={(val) => setWorkStatusClientFilter(val)}
                  style={styles.civilPicker}
                  dropdownIconColor="#009688"
                >
                  <Picker.Item label="Select Client" value="" />
                  {apiClients.map((c) => (
                    <Picker.Item key={c.id} label={c.name} value={c.name} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Project Dropdown */}
            <View style={styles.civilFilterItem}>
              <Text style={styles.civilItemLabel}>Project</Text>
              <View style={styles.civilPickerBorder}>
                <Picker
                  selectedValue={workStatusProjectFilter}
                  onValueChange={(val) => setWorkStatusProjectFilter(val)}
                  style={styles.civilPicker}
                  dropdownIconColor="#009688"
                >
                  <Picker.Item label="Select Project" value="" />
                  {apiProjects.map((p) => (
                    <Picker.Item key={p.id} label={p.name} value={p.name} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Filter by Date Picker */}
            <View style={styles.civilFilterItem}>
              <Text style={styles.civilItemLabel}>Filter Date</Text>
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

        {/* Action Plan Civil Document Sheet Container */}
        <View style={styles.civilDocCard}>
          {/* Header Title */}
          <View style={styles.civilDocHeader}>
            <Text style={styles.civilDocTitle}>Action Plan</Text>
          </View>

          {/* Law of Good Work Quote Box */}
          <View style={styles.civilQuoteBox}>
            <Text style={styles.civilQuoteText}>
              The Law of Good Work- I Must Practice Civil Daily, My Time Is For Clients, I Must Catch All Instructions And Leads Moved Towards Me And Note Them Down.
            </Text>
          </View>

          {/* Tarai is MUST Notice Banner */}
          <View style={styles.civilTaraiBanner}>
            <Text style={styles.civilTaraiText}>Tarai is MUST at all sites.</Text>
          </View>

          {/* Date Row */}
          <View style={styles.civilDateRow}>
            <Text style={styles.civilDateRowText}>{activeDisplayDate}</Text>
          </View>

          {/* Civil Sheet Subheading */}
          <View style={styles.civilSheetTitleWrapper}>
            <Text style={styles.civilSheetTitle}>CIVIL SHEET</Text>
          </View>

          {/* Civil Sheet Table with Salmon Pink Header */}
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.civilTable}>
              {/* Table Header Row (#df9494) */}
              <View style={styles.civilTableHeaderRow}>
                <Text style={[styles.civilColHeader, { width: 190 }]}>Project Name</Text>
                <Text style={[styles.civilColHeader, { width: 250 }]}>Action Plan for tomorrow</Text>
                <Text style={[styles.civilColHeader, { width: 210 }]}>Manual Notes</Text>
                <Text style={[styles.civilColHeader, { width: 120 }]}>Supervisor</Text>
                <Text style={[styles.civilColHeader, { width: 140, borderRightWidth: 0 }]}>Work Stage</Text>
              </View>

              {/* Table Body Rows */}
              {filteredCivilPlans.length > 0 ? (
                filteredCivilPlans.map((item) => (
                  <View key={item.id} style={styles.civilTableRow}>
                    {/* Project Name */}
                    <View style={[styles.civilCellWrapper, { width: 190 }]}>
                      <Text style={styles.civilProjectNameText}>{item.projectName}</Text>
                      {item.client ? (
                        <Text style={styles.civilClientSubText}>{item.client}</Text>
                      ) : null}
                    </View>

                    {/* Action Plan for tomorrow */}
                    <View style={[styles.civilCellWrapper, { width: 250 }]}>
                      <TextInput
                        style={styles.civilInlineInput}
                        value={item.actionPlanTomorrow}
                        onChangeText={(text) => handleUpdateCivilPlan(item.id, 'actionPlanTomorrow', text)}
                        placeholder="Type tomorrow's plan..."
                        placeholderTextColor="#94a3b8"
                        multiline={true}
                      />
                    </View>

                    {/* Manual Notes */}
                    <View style={[styles.civilCellWrapper, { width: 200 }]}>
                      <TextInput
                        style={styles.civilInlineInput}
                        value={item.manualNotes}
                        onChangeText={(text) => handleUpdateCivilPlan(item.id, 'manualNotes', text)}
                        placeholder="Manual notes..."
                        placeholderTextColor="#94a3b8"
                        multiline={true}
                      />
                    </View>

                    {/* Supervisor */}
                    <View style={[styles.civilCellWrapper, { width: 120 }]}>
                      <TextInput
                        style={styles.civilInlineInput}
                        value={item.supervisor}
                        onChangeText={(text) => handleUpdateCivilPlan(item.id, 'supervisor', text)}
                        placeholder="Admin"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>

                    {/* Work Stage */}
                    <View style={[styles.civilCellWrapper, { width: 140, borderRightWidth: 0 }]}>
                      <TextInput
                        style={styles.civilInlineInput}
                        value={item.workStage}
                        onChangeText={(text) => handleUpdateCivilPlan(item.id, 'workStage', text)}
                        placeholder="e.g. Plaster, Slab"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>
                ))
              ) : (
                <View style={[styles.civilEmptyRow, { width: 880 }]}>
                  <Text style={styles.civilEmptyText}>No projects found matching the filter.</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Bottom Bar: Print Button (Green), Export CSV, Save Sheet */}
          <View style={styles.civilBottomBar}>
            <TouchableOpacity style={styles.civilPrintBtn} onPress={handlePrintCivilSheet} activeOpacity={0.8}>
              <MaterialIcons name="print" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.civilPrintBtnText}>Print</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.civilExportBtn} onPress={handleExportCivilSheet} activeOpacity={0.8}>
                <MaterialIcons name="file-download" size={16} color="#00796b" style={{ marginRight: 4 }} />
                <Text style={styles.civilExportBtnText}>Export CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.civilSaveBtn, savingCivilSheet && { opacity: 0.7 }]} 
                onPress={handleSaveCivilSheet} 
                disabled={savingCivilSheet}
                activeOpacity={0.8}
              >
                {savingCivilSheet ? (
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                ) : (
                  <MaterialIcons name="save" size={16} color="#fff" style={{ marginRight: 4 }} />
                )}
                <Text style={styles.civilSaveBtnText}>
                  {savingCivilSheet ? 'Saving...' : 'Save Sheet'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // 9. Add Work Status UI (Image 1)
  const renderAddWorkStatus = () => {
    return (
      <View style={styles.viewContainer}>
        <View style={styles.formCard}>
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Business Associate</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={workStatusForm.associate}
                onValueChange={(val) => setWorkStatusForm({ ...workStatusForm, associate: val })}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Select" value="" />
                {apiEmployees.map((a) => (
                  <Picker.Item key={a.id} label={a.name} value={a.name} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Client</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={workStatusForm.client}
                onValueChange={(val) => setWorkStatusForm({ ...workStatusForm, client: val })}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Select" value="" />
                {apiClients.map((c) => (
                  <Picker.Item key={c.id} label={c.name} value={c.name} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Project</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={workStatusForm.project}
                onValueChange={(val) => setWorkStatusForm({ ...workStatusForm, project: val })}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Select" value="" />
                {apiProjects.map((p) => (
                  <Picker.Item key={p.id} label={p.name} value={p.name} />
                ))}
              </Picker>
            </View>
          </View>

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
          <View style={{flex: 1, minWidth: 150}}>
            <Text style={styles.filterLabel}>Client</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={selectedClientFilter}
                onValueChange={(val) => setSelectedClientFilter(val)}
                style={styles.picker}
              >
                <Picker.Item label="Select Client" value="" />
                {apiClients.map((c) => (
                  <Picker.Item key={c.id} label={c.name} value={c.name} />
                ))}
              </Picker>
            </View>
          </View>
          <View style={{flex: 1, minWidth: 150}}>
            <Text style={styles.filterLabel}>Project</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={selectedProjectFilter}
                onValueChange={(val) => setSelectedProjectFilter(val)}
                style={styles.picker}
              >
                <Picker.Item label="Select Project" value="" />
                {apiProjects.map((p) => (
                  <Picker.Item key={p.id} label={p.name} value={p.name} />
                ))}
              </Picker>
            </View>
          </View>
          <View style={{flex: 1, minWidth: 150}}>
            <Text style={styles.filterLabel}>Payment Type</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={selectedPaymentTypeFilter}
                onValueChange={(val) => setSelectedPaymentTypeFilter(val)}
                style={styles.picker}
              >
                <Picker.Item label="Select Payment Type" value="" />
                <Picker.Item label="Cash" value="Cash" />
                <Picker.Item label="Credit" value="Credit" />
                <Picker.Item label="Paytm" value="Paytm" />
                <Picker.Item label="Googlepay" value="Googlepay" />
                <Picker.Item label="Phonepay" value="Phonepay" />
                <Picker.Item label="Online Transfer" value="Online Transfer" />
                <Picker.Item label="Adjustment" value="Adjustment" />
                <Picker.Item label="Product Upsell" value="Product Upsell" />
              </Picker>
            </View>
          </View>
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
              <TouchableOpacity style={[styles.tealButton, { marginLeft: 8 }]} onPress={() => Alert.alert('Export', 'Exporting whole data as CSV...')}>
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
              {list.map((c) => (
                <View key={c.id} style={styles.tableRow}>
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
          
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Client</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={paymentForm.client}
                onValueChange={(val) => setPaymentForm({ ...paymentForm, client: val })}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Select" value="" />
                {apiClients.map((c) => (
                  <Picker.Item key={c.id} label={c.name} value={c.name} />
                ))}
              </Picker>
            </View>
          </View>
          
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Project</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={paymentForm.project}
                onValueChange={(val) => setPaymentForm({ ...paymentForm, project: val })}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Select" value="" />
                {apiProjects.map((p) => (
                  <Picker.Item key={p.id} label={p.name} value={p.name} />
                ))}
              </Picker>
            </View>
          </View>

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

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Type</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={paymentForm.mode}
                onValueChange={(val) => setPaymentForm({ ...paymentForm, mode: val })}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Select" value="" />
                <Picker.Item label="Cash" value="Cash" />
                <Picker.Item label="Credit" value="Credit" />
                <Picker.Item label="Paytm" value="Paytm" />
                <Picker.Item label="Googlepay" value="Googlepay" />
                <Picker.Item label="Phonepay" value="Phonepay" />
                <Picker.Item label="Online Transfer" value="Online Transfer" />
                <Picker.Item label="Adjustment" value="Adjustment" />
                <Picker.Item label="Product Upsell" value="Product Upsell" />
              </Picker>
            </View>
          </View>

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
              onPress={fetchAllData}
              style={styles.iconButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
              disabled={apiLoading}
            >
              {apiLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="refresh" size={22} color="#fff" />
              )}
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
      <View style={styles.pathWrapper}>
        <Icon name="folder-open" size={16} color="#009688" style={{ marginRight: 6 }} />
        <Text style={styles.pathText}>{config.path}</Text>
      </View>

      {/* Main Content Body */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 40 }}
        refreshControl={
          <RefreshControl refreshing={apiLoading} onRefresh={fetchAllData} colors={['#009688']} />
        }
      >
        {renderContent()}
      </ScrollView>
      {/* Android Native Date Picker */}
      {Platform.OS === 'android' && datePickerConfig.show && (
        <DateTimePicker
          value={datePickerConfig.currentValue}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* iOS Bottom Sheet Date Picker Modal */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={datePickerConfig.show}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setDatePickerConfig(prev => ({ ...prev, show: false }))}
        >
          <TouchableWithoutFeedback onPress={() => setDatePickerConfig(prev => ({ ...prev, show: false }))}>
            <View style={styles.iosDatePickerOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={[styles.iosDatePickerSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                  {/* Drag Handle Indicator */}
                  <View style={styles.sheetHandle} />

                  {/* Header with Cancel and Done Buttons */}
                  <View style={styles.iosDatePickerHeader}>
                    <TouchableOpacity
                      onPress={() => setDatePickerConfig(prev => ({ ...prev, show: false }))}
                      style={styles.iosDatePickerCancelBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.iosDatePickerCancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <Text style={styles.iosDatePickerTitle}>Select Date</Text>

                    <TouchableOpacity
                      onPress={() => {
                        handleDateChange(null, iosTempDate);
                        setDatePickerConfig(prev => ({ ...prev, show: false }));
                      }}
                      style={styles.iosDatePickerDoneBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.iosDatePickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>

                  {/* iOS Spinner Wheel */}
                  <View style={styles.iosDatePickerBody}>
                    <DateTimePicker
                      value={iosTempDate}
                      mode="date"
                      display="spinner"
                      onChange={(event, date) => {
                        if (date) setIosTempDate(date);
                      }}
                      textColor="#0f172a"
                      themeVariant="light"
                      style={{ height: 216, width: '100%' }}
                    />
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
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
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    marginBottom: 20,
  },
  tableCardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
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
    backgroundColor: '#f8fafc',
    paddingVertical: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
  },
  tableColHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  tableCell: {
    fontSize: 14,
    color: '#334155',
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
  /* iOS DatePicker Modal Styles */
  iosDatePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  iosDatePickerSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  iosDatePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iosDatePickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  iosDatePickerCancelBtn: {
    padding: 6,
  },
  iosDatePickerCancelText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  iosDatePickerDoneBtn: {
    padding: 6,
  },
  iosDatePickerDoneText: {
    fontSize: 15,
    color: '#009688',
    fontWeight: '700',
  },
  iosDatePickerBody: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
});

export default SitesManagementScreen;
