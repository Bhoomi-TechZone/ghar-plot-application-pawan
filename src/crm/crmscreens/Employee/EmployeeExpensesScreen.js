import React, { useState, useEffect } from 'react';
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
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as adminSitesApi from '../../services/adminSitesApi';

const { width } = Dimensions.get('window');

const EmployeeExpensesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const statusBarTop = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  // Active sub-tab: 'add_expense' or 'daily_sheet'
  const [activeTab, setActiveTab] = useState('add_expense');

  // Logged-in Employee info
  const [currentEmployee, setCurrentEmployee] = useState(null);

  // Date is strictly locked to today
  const getTodayDateString = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const todayDate = getTodayDateString();

  // Master Data
  const [projects, setProjects] = useState([]);
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
  const [loadingMaster, setLoadingMaster] = useState(true);

  // Custom Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Current Form Item State
  const [formItem, setFormItem] = useState({
    project: '',
    client: '',
    category: 'Keele',
    itemName: '',
    quantity: '1',
    unit: 'Pcs',
    unitPrice: '',
    amount: '',
    paidTo: '',
    paymentType: 'Cash',
    remarks: '',
  });

  // Multi-Item Draft Cart for today (allows queuing multiple items across projects)
  const [draftQueue, setDraftQueue] = useState([]);
  const [submittingBatch, setSubmittingBatch] = useState(false);

  // Daily Project Expense Sheet State
  const [sheetProjectFilter, setSheetProjectFilter] = useState('');
  const [dailySheetData, setDailySheetData] = useState([]);
  const [dailySheetLoading, setDailySheetLoading] = useState(false);
  const [dailySheetGrandTotal, setDailySheetGrandTotal] = useState(0);
  const [dailySheetTotalCount, setDailySheetTotalCount] = useState(0);

  // Load employee and initial data
  useEffect(() => {
    const initData = async () => {
      try {
        setLoadingMaster(true);
        const storedUser = await AsyncStorage.getItem('employee_user');
        if (storedUser) {
          const emp = JSON.parse(storedUser);
          setCurrentEmployee(emp);
        }

        const [projList, catList] = await Promise.all([
          adminSitesApi.getProjects(),
          adminSitesApi.getExpenseCategories(),
        ]);

        if (projList && Array.isArray(projList)) {
          setProjects(projList);
          if (projList.length > 0) {
            setFormItem(prev => ({
              ...prev,
              project: projList[0].name,
              client: projList[0].client || '',
            }));
          }
        }

        if (catList && Array.isArray(catList) && catList.length > 0) {
          setCategoriesList(catList);
        }
      } catch (err) {
        console.error('Error initializing employee expense screen:', err);
      } finally {
        setLoadingMaster(false);
      }
    };

    initData();
  }, []);

  // Fetch Daily Project Sheet for current employee and today
  const fetchTodayProjectSheet = async (projectFilter = sheetProjectFilter) => {
    if (!currentEmployee) return;
    setDailySheetLoading(true);
    try {
      const params = {
        date: todayDate,
        businessAssociate: currentEmployee._id || currentEmployee.id,
      };
      if (projectFilter) {
        params.project = projectFilter;
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
      console.error('Error loading today project sheet:', err);
      setDailySheetData([]);
    } finally {
      setDailySheetLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'daily_sheet' && currentEmployee) {
      fetchTodayProjectSheet(sheetProjectFilter);
    }
  }, [activeTab, currentEmployee, sheetProjectFilter]);

  // Handle Project Change in Form
  const handleProjectSelect = (projectName) => {
    const foundProj = projects.find(p => p.name === projectName);
    setFormItem(prev => ({
      ...prev,
      project: projectName,
      client: foundProj?.client || '',
    }));
  };

  // Add Custom Category
  const handleAddCustomCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Validation Error', 'Category name cannot be empty.');
      return;
    }
    try {
      await adminSitesApi.addExpenseCategory(newCategoryName.trim());
      const updatedCategories = await adminSitesApi.getExpenseCategories();
      setCategoriesList(updatedCategories);
      setFormItem(prev => ({ ...prev, category: newCategoryName.trim() }));
      setNewCategoryName('');
      setShowCategoryModal(false);
      Alert.alert('Success', 'Category added successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add category.');
    }
  };

  // Expense Auto-Calculate Total Price Handlers
  const handleQuantityChange = (val) => {
    const qty = parseFloat(val);
    const unitP = parseFloat(formItem.unitPrice);
    const newAmount = (!isNaN(qty) && !isNaN(unitP) && qty > 0 && unitP >= 0)
      ? (qty * unitP).toString()
      : formItem.amount;
    setFormItem(prev => ({
      ...prev,
      quantity: val,
      amount: (!isNaN(qty) && !isNaN(unitP) && qty > 0 && unitP >= 0) ? newAmount : prev.amount
    }));
  };

  const handleUnitPriceChange = (val) => {
    const unitP = parseFloat(val);
    const qty = parseFloat(formItem.quantity);
    const newAmount = (!isNaN(qty) && !isNaN(unitP) && qty > 0 && unitP >= 0)
      ? (qty * unitP).toString()
      : '';
    setFormItem(prev => ({
      ...prev,
      unitPrice: val,
      amount: (!isNaN(qty) && !isNaN(unitP) && qty > 0 && unitP >= 0) ? newAmount : prev.amount
    }));
  };

  const handleTotalAmountChange = (val) => {
    const amt = parseFloat(val);
    const qty = parseFloat(formItem.quantity);
    const newUnitPrice = (!isNaN(amt) && !isNaN(qty) && qty > 0)
      ? (amt / qty).toFixed(2)
      : formItem.unitPrice;
    setFormItem(prev => ({
      ...prev,
      amount: val,
      unitPrice: (!isNaN(amt) && !isNaN(qty) && qty > 0) ? newUnitPrice : prev.unitPrice
    }));
  };

  // Validate form item
  const validateFormItem = () => {
    if (!formItem.project) {
      Alert.alert('Validation Error', 'Please select a project/site.');
      return false;
    }
    if (!formItem.category) {
      Alert.alert('Validation Error', 'Please select an expense category.');
      return false;
    }
    const finalAmount = parseFloat(formItem.amount) || ((parseFloat(formItem.quantity) || 1) * (parseFloat(formItem.unitPrice) || 0));
    if (!finalAmount || finalAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter single item price or valid expense amount.');
      return false;
    }
    if (!formItem.paidTo.trim()) {
      Alert.alert('Validation Error', 'Please enter who the amount was paid to.');
      return false;
    }
    return true;
  };

  // Add current item to draft queue
  const handleAddToQueue = () => {
    if (!validateFormItem()) return;

    const parsedQty = parseFloat(formItem.quantity) || 1;
    const parsedUnitPrice = parseFloat(formItem.unitPrice) || 0;
    const finalAmount = (formItem.amount && !isNaN(parseFloat(formItem.amount)))
      ? parseFloat(formItem.amount)
      : (parsedQty * parsedUnitPrice);

    const queuedItem = {
      id: Date.now().toString(),
      project: formItem.project,
      client: formItem.client,
      category: formItem.category,
      itemName: formItem.itemName.trim(),
      quantity: formItem.quantity || '1',
      unit: formItem.unit || 'Pcs',
      unitPrice: parsedUnitPrice || (parsedQty > 0 ? (finalAmount / parsedQty) : 0),
      amount: finalAmount.toString(),
      paidTo: formItem.paidTo.trim(),
      paymentType: formItem.paymentType,
      remarks: formItem.remarks.trim(),
    };

    setDraftQueue(prev => [...prev, queuedItem]);

    // Reset item inputs while keeping current project selection
    setFormItem(prev => ({
      ...prev,
      itemName: '',
      quantity: '1',
      unit: 'Pcs',
      unitPrice: '',
      amount: '',
      paidTo: '',
      remarks: '',
    }));

    Alert.alert('Item Added to List', 'Expense item added to today\'s draft queue. You can add more items or submit all.');
  };

  // Remove item from draft queue
  const handleRemoveFromQueue = (id) => {
    setDraftQueue(prev => prev.filter(item => item.id !== id));
  };

  // Submit Single Item Directly
  const handleSubmitSingleItem = async () => {
    if (!validateFormItem()) return;
    if (!currentEmployee) {
      Alert.alert('Error', 'Employee account not found. Please log in again.');
      return;
    }

    const foundProj = projects.find(p => p.name === formItem.project);
    if (!foundProj) {
      Alert.alert('Error', 'Invalid project selected.');
      return;
    }

    const parsedQty = parseFloat(formItem.quantity) || 1;
    const parsedUnitPrice = parseFloat(formItem.unitPrice) || 0;
    const finalAmount = (formItem.amount && !isNaN(parseFloat(formItem.amount)))
      ? parseFloat(formItem.amount)
      : (parsedQty * parsedUnitPrice);

    try {
      setSubmittingBatch(true);
      await adminSitesApi.createExpense({
        project: foundProj.id || foundProj._id,
        client: foundProj.client || formItem.client,
        businessAssociate: currentEmployee._id || currentEmployee.id,
        category: formItem.category,
        itemName: formItem.itemName.trim(),
        quantity: parsedQty,
        unit: formItem.unit || 'Pcs',
        unitPrice: parsedUnitPrice || (parsedQty > 0 ? (finalAmount / parsedQty) : 0),
        amount: finalAmount,
        paidTo: formItem.paidTo.trim(),
        date: todayDate, // Strictly locked to today
        paymentType: formItem.paymentType,
        remarks: formItem.remarks.trim(),
      });

      // Clear fields
      setFormItem(prev => ({
        ...prev,
        itemName: '',
        quantity: '1',
        unit: 'Pcs',
        unitPrice: '',
        amount: '',
        paidTo: '',
        remarks: '',
      }));

      Alert.alert('Success', 'Expense logged successfully for today!', [
        { text: 'Add More', style: 'cancel' },
        { text: 'View Today\'s Sheet', onPress: () => setActiveTab('daily_sheet') },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit expense.');
    } finally {
      setSubmittingBatch(false);
    }
  };

  // Submit All Items in Draft Queue (Batch)
  const handleSubmitBatch = async () => {
    if (draftQueue.length === 0) {
      Alert.alert('List Empty', 'No items in today\'s draft queue to submit.');
      return;
    }
    if (!currentEmployee) {
      Alert.alert('Error', 'Employee account not found. Please log in again.');
      return;
    }

    try {
      setSubmittingBatch(true);
      const formattedItems = draftQueue.map(item => {
        const foundProj = projects.find(p => p.name === item.project);
        return {
          project: foundProj?.id || foundProj?._id || item.project,
          client: foundProj?.client || item.client,
          businessAssociate: currentEmployee._id || currentEmployee.id,
          category: item.category,
          itemName: item.itemName,
          quantity: parseFloat(item.quantity) || 1,
          unit: item.unit,
          unitPrice: parseFloat(item.unitPrice) || 0,
          amount: parseFloat(item.amount),
          paidTo: item.paidTo,
          date: todayDate, // Strictly locked to today
          paymentType: item.paymentType,
          remarks: item.remarks,
        };
      });

      await adminSitesApi.createBatchExpenses(formattedItems);
      setDraftQueue([]);
      Alert.alert('Success', `Successfully logged ${formattedItems.length} expenses for today!`, [
        { text: 'OK', onPress: () => setActiveTab('daily_sheet') },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit batch expenses.');
    } finally {
      setSubmittingBatch(false);
    }
  };

  // Delete an expense in Today's Sheet
  const handleDeleteTodayExpense = (id) => {
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminSitesApi.deleteExpense(id);
            fetchTodayProjectSheet();
            Alert.alert('Deleted', 'Expense record removed.');
          } catch (e) {
            Alert.alert('Error', 'Failed to delete expense.');
          }
        },
      },
    ]);
  };

  // Export Single Project Sheet to CSV
  const handleExportSingleProjectSheet = async (projectGroup) => {
    if (!projectGroup || !projectGroup.expenses || projectGroup.expenses.length === 0) {
      Alert.alert('Export', `No expenses logged for ${projectGroup.projectName} today.`);
      return;
    }
    const headers = [
      'Date',
      'Project',
      'Client',
      'Status',
      'Category',
      'Item Description',
      'Qty',
      'Unit',
      'Amount (Rs)',
      'Paid To',
      'Payment Type',
      'Associate',
      'Remarks',
    ];
    const rows = projectGroup.expenses.map((item) => [
      todayDate,
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
      todayDate,
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

    const headerLine = headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',');
    const bodyLines = rows.map(row =>
      row.map(val => `"${String(val !== undefined && val !== null ? val : '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headerLine, ...bodyLines].join('\n');

    try {
      const { Share } = require('react-native');
      const safeProjName = projectGroup.projectName.replace(/[^a-zA-Z0-9]/g, '_');
      await Share.share({
        title: `${safeProjName}_Today_Expenses_${todayDate.replace(/\//g, '-')}.csv`,
        message: csvContent,
      });
    } catch (e) {
      console.log('Share error:', e);
    }
  };

  // Export Today's Sheet to CSV
  const handleExportTodaySheet = async () => {
    if (!dailySheetData || dailySheetData.length === 0) {
      Alert.alert('Export', 'No expenses logged for today yet.');
      return;
    }
    const headers = [
      'Date',
      'Project',
      'Client',
      'Status',
      'Category',
      'Item Description',
      'Qty',
      'Unit',
      'Amount (Rs)',
      'Paid To',
      'Payment Type',
      'Associate',
      'Remarks',
    ];
    const rows = [];
    dailySheetData.forEach(p => {
      p.expenses.forEach(item => {
        rows.push([
          todayDate,
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
      rows.push([
        todayDate,
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
    rows.push([
      todayDate,
      '*** TODAY GRAND TOTAL ***',
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

    const headerLine = headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',');
    const bodyLines = rows.map(row =>
      row.map(val => `"${String(val !== undefined && val !== null ? val : '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headerLine, ...bodyLines].join('\n');

    try {
      const { Share } = require('react-native');
      await Share.share({
        title: `Today_Project_Expenses_${todayDate.replace(/\//g, '-')}.csv`,
        message: csvContent,
      });
    } catch (e) {
      console.log('Share error:', e);
    }
  };

  // Helper for Category Colors
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

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f766e" translucent={true} />

      {/* Header */}
      <View style={[styles.headerWrapper, { paddingTop: statusBarTop + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Site Expenses</Text>
            <Text style={styles.headerSubtitle}>
              {currentEmployee?.name ? `Associate: ${currentEmployee.name}` : 'Employee Panel'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('EmployeeHome')}
            style={styles.iconButton}
          >
            <Icon name="home" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Top Navigation Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'add_expense' && styles.tabButtonActive]}
            onPress={() => setActiveTab('add_expense')}
          >
            <MaterialIcons
              name="add-shopping-cart"
              size={18}
              color={activeTab === 'add_expense' ? '#0f766e' : '#ccfbf1'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === 'add_expense' && styles.tabTextActive]}>
              Log Expenses {draftQueue.length > 0 ? `(${draftQueue.length})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'daily_sheet' && styles.tabButtonActive]}
            onPress={() => setActiveTab('daily_sheet')}
          >
            <MaterialIcons
              name="table-chart"
              size={18}
              color={activeTab === 'daily_sheet' ? '#0f766e' : '#ccfbf1'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === 'daily_sheet' && styles.tabTextActive]}>
              Today's Project Sheet
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {/* TAB 1: ADD SITE EXPENSES */}
        {activeTab === 'add_expense' && (
          <View>
            {/* STRICT CURRENT DATE LOCK BANNER */}
            <View style={styles.dateLockBanner}>
              <View style={styles.dateLockIcon}>
                <MaterialIcons name="lock" size={22} color="#0f766e" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.dateLockTitle}>Date Locked to Current Day</Text>
                <Text style={styles.dateLockValue}>Today: {todayDate}</Text>
                <Text style={styles.dateLockHint}>All expenses submitted by employees are logged on today's date.</Text>
              </View>
            </View>

            {/* EXPENSE ENTRY FORM CARD */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add Site Expense Item</Text>

              {/* PROJECT PICKER */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Project / Site <Text style={styles.required}>*</Text></Text>
                <View style={styles.pickerBorder}>
                  <Picker
                    selectedValue={formItem.project}
                    onValueChange={(val) => handleProjectSelect(val)}
                    style={styles.picker}
                    dropdownIconColor="#0f766e"
                  >
                    <Picker.Item label="Select Project / Site" value="" />
                    {projects.map((p) => (
                      <Picker.Item key={p.id} label={`${p.name} (${p.client || 'Client'})`} value={p.name} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* CLIENT (AUTO-POPULATED FROM PROJECT) */}
              {formItem.client ? (
                <View style={styles.clientBadgeContainer}>
                  <MaterialIcons name="person" size={16} color="#0f766e" style={{ marginRight: 6 }} />
                  <Text style={styles.clientBadgeText}>
                    Mapped Client: <Text style={{ fontWeight: '700' }}>{formItem.client}</Text>
                  </Text>
                </View>
              ) : null}

              {/* CATEGORY PICKER */}
              <View style={styles.formField}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.formLabel}>Category <Text style={styles.required}>*</Text></Text>
                  <TouchableOpacity onPress={() => setShowCategoryModal(true)}>
                    <Text style={{ color: '#0f766e', fontSize: 13, fontWeight: '700', marginBottom: 4 }}>
                      + Add Custom
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.pickerBorder}>
                  <Picker
                    selectedValue={formItem.category}
                    onValueChange={(val) => {
                      if (val === '__add_custom__') {
                        setShowCategoryModal(true);
                      } else {
                        setFormItem({ ...formItem, category: val });
                      }
                    }}
                    style={styles.picker}
                    dropdownIconColor="#0f766e"
                  >
                    {categoriesList.map((cat, idx) => (
                      <Picker.Item key={idx} label={cat} value={cat} />
                    ))}
                    <Picker.Item label="+ Add Custom Category..." value="__add_custom__" color="#0f766e" />
                  </Picker>
                </View>
              </View>

              {/* ITEM DESCRIPTION */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Item Description / Specification</Text>
                <TextInput
                  style={styles.input}
                  value={formItem.itemName}
                  onChangeText={(val) => setFormItem({ ...formItem, itemName: val })}
                  placeholder="e.g. 10mm Sariya, 50 Bori Cement, Keele 2 inch"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* QUANTITY & UNIT SIDE BY SIDE */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Quantity <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={formItem.quantity}
                    onChangeText={handleQuantityChange}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Unit</Text>
                  <View style={styles.pickerBorder}>
                    <Picker
                      selectedValue={formItem.unit}
                      onValueChange={(val) => setFormItem({ ...formItem, unit: val })}
                      style={styles.picker}
                      dropdownIconColor="#0f766e"
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
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Price Per Item (₹) <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={formItem.unitPrice}
                    onChangeText={handleUnitPriceChange}
                    keyboardType="numeric"
                    placeholder="e.g. 250"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={[styles.formLabel, { marginBottom: 0 }]}>Total Price (₹) <Text style={styles.required}>*</Text></Text>
                    <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#166534' }}>AUTO</Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.input, { backgroundColor: '#f0fdf4', borderColor: '#86efac', fontWeight: '800', color: '#166534' }]}
                    value={formItem.amount}
                    onChangeText={handleTotalAmountChange}
                    keyboardType="numeric"
                    placeholder="Auto-calculated"
                    placeholderTextColor="#86efac"
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Paid To (Recipient) <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={formItem.paidTo}
                  onChangeText={(val) => setFormItem({ ...formItem, paidTo: val })}
                  placeholder="e.g. Gupta Hardware, Ramesh Contractor"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* PAYMENT TYPE */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Payment Type</Text>
                <View style={styles.pickerBorder}>
                  <Picker
                    selectedValue={formItem.paymentType}
                    onValueChange={(val) => setFormItem({ ...formItem, paymentType: val })}
                    style={styles.picker}
                    dropdownIconColor="#0f766e"
                  >
                    <Picker.Item label="Cash" value="Cash" />
                    <Picker.Item label="Google Pay" value="Google Pay" />
                    <Picker.Item label="PhonePay" value="PhonePay" />
                    <Picker.Item label="Paytm" value="Paytm" />
                    <Picker.Item label="Online Transfer" value="Online Transfer" />
                    <Picker.Item label="Credit" value="Credit" />
                  </Picker>
                </View>
              </View>

              {/* REMARKS */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Remarks / Site Notes</Text>
                <TextInput
                  style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                  value={formItem.remarks}
                  onChangeText={(val) => setFormItem({ ...formItem, remarks: val })}
                  placeholder="Optional site note or bill ref"
                  placeholderTextColor="#94a3b8"
                  multiline={true}
                />
              </View>

              {/* ACTION BUTTONS */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnSecondary, { flex: 1 }]}
                  onPress={handleAddToQueue}
                >
                  <MaterialIcons name="add" size={18} color="#0f766e" style={{ marginRight: 4 }} />
                  <Text style={styles.btnSecondaryText}>+ Add to Today's List</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
                  onPress={handleSubmitSingleItem}
                  disabled={submittingBatch}
                >
                  {submittingBatch ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="check" size={18} color="#fff" style={{ marginRight: 4 }} />
                      <Text style={styles.btnPrimaryText}>Save Item Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* TODAY'S DRAFT QUEUE (MULTI-PROJECT ITEMS QUEUE) */}
            {draftQueue.length > 0 && (
              <View style={[styles.card, { marginTop: 16, borderColor: '#0f766e', borderWidth: 1.5 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
                      Today's Pending List ({draftQueue.length})
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>
                      Ready to submit across multiple projects
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#ccfbf1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ color: '#0f766e', fontWeight: '800', fontSize: 14 }}>
                      ₹ {draftQueue.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                {draftQueue.map((item, idx) => (
                  <View
                    key={item.id || idx}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 10,
                      borderBottomWidth: idx === draftQueue.length - 1 ? 0 : 1,
                      borderBottomColor: '#f1f5f9',
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontWeight: '700', fontSize: 14, color: '#1e293b' }}>
                          {item.project}
                        </Text>
                        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category).bg, marginLeft: 8 }]}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: getCategoryColor(item.category).text }}>
                            {item.category}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {item.itemName || 'Material'} • {item.quantity} {item.unit} • Paid to: {item.paidTo} ({item.paymentType})
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontWeight: '800', fontSize: 14, color: '#0f766e' }}>
                        ₹ {Number(item.amount).toLocaleString('en-IN')}
                      </Text>
                      <TouchableOpacity onPress={() => handleRemoveFromQueue(item.id)}>
                        <MaterialIcons name="cancel" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, { marginTop: 14, backgroundColor: '#059669' }]}
                  onPress={handleSubmitBatch}
                  disabled={submittingBatch}
                >
                  {submittingBatch ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="cloud-upload" size={18} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.btnPrimaryText}>
                        Submit All {draftQueue.length} Items for Today
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* TAB 2: TODAY'S PROJECT EXPENSE SHEET (GROUPED BY PROJECT) */}
        {activeTab === 'daily_sheet' && (
          <View>
            {/* PROJECT SELECTOR DROPDOWN */}
            <View style={[styles.card, { marginBottom: 14 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="apartment" size={18} color="#0f766e" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>Select Project Sheet</Text>
                </View>
                {sheetProjectFilter ? (
                  <TouchableOpacity onPress={() => {
                    setSheetProjectFilter('');
                    fetchTodayProjectSheet('');
                  }}>
                    <Text style={{ color: '#0f766e', fontSize: 12, fontWeight: '700' }}>Show All</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.pickerBorder}>
                <Picker
                  selectedValue={sheetProjectFilter}
                  onValueChange={(val) => {
                    setSheetProjectFilter(val);
                    fetchTodayProjectSheet(val);
                  }}
                  style={styles.picker}
                  dropdownIconColor="#0f766e"
                >
                  <Picker.Item label="All Projects (Separate Sheets)" value="" />
                  {projects.map((p) => (
                    <Picker.Item key={p.id} label={`${p.name} (${p.client || 'Client'})`} value={p.name} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Grand Total Summary Banner */}
            <View style={styles.sheetBanner}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.sheetBannerSubtitle}>Today's Project Total Expense</Text>
                  <Text style={styles.sheetBannerTotal}>
                    ₹ {dailySheetGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={styles.sheetDatePill}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Today ({todayDate})</Text>
                  </View>
                  <Text style={{ color: '#ccfbf1', fontSize: 12, marginTop: 4 }}>
                    {dailySheetData.length} {dailySheetData.length === 1 ? 'Project' : 'Projects'} • {dailySheetTotalCount} Items
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Bar */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <TouchableOpacity
                style={[styles.btn, { flex: 1, backgroundColor: '#059669', justifyContent: 'center' }]}
                onPress={handleExportTodaySheet}
              >
                <MaterialIcons name="file-download" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.btnPrimaryText}>Export Today's Sheet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary, { flex: 1, justifyContent: 'center' }]}
                onPress={() => setActiveTab('add_expense')}
              >
                <MaterialIcons name="add" size={18} color="#0f766e" style={{ marginRight: 6 }} />
                <Text style={styles.btnSecondaryText}>+ Add More</Text>
              </TouchableOpacity>
            </View>

            {/* Project Expense Groups */}
            {dailySheetLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0f766e" />
                <Text style={{ marginTop: 12, color: '#64748b' }}>Loading today's project sheet...</Text>
              </View>
            ) : dailySheetData.length === 0 ? (
              <View style={[styles.card, { padding: 30, alignItems: 'center' }]}>
                <MaterialIcons name="assignment-late" size={48} color="#cbd5e1" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 12 }}>
                  No Expenses Logged Today
                </Text>
                <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
                  You haven't logged any project expenses for today yet.{'\n'}Switch to the "Log Expenses" tab to record materials or site costs.
                </Text>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, { marginTop: 16 }]}
                  onPress={() => setActiveTab('add_expense')}
                >
                  <Text style={styles.btnPrimaryText}>Log Today's Expense</Text>
                </TouchableOpacity>
              </View>
            ) : (
              dailySheetData.map((projectGroup, pIdx) => (
                <View key={projectGroup.projectId || pIdx} style={styles.projectSheetCard}>
                  {/* Project Group Header */}
                  <View style={styles.projectHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                        <MaterialIcons name="apartment" size={18} color="#0f766e" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
                          {projectGroup.projectName}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        Client: <Text style={{ fontWeight: '600', color: '#334155' }}>{projectGroup.clientName}</Text>
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                        Subtotal
                      </Text>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f766e' }}>
                        ₹ {projectGroup.projectSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                      Project Expense Sheet • Today
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
                          setFormItem(prev => ({
                            ...prev,
                            project: projectGroup.projectName,
                            client: projectGroup.clientName,
                          }));
                          setActiveTab('add_expense');
                        }}
                      >
                        <MaterialIcons name="add" size={14} color="#fff" style={{ marginRight: 2 }} />
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>+ Add Item</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Horizontal Scroll Table of items */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View>
                      {/* Table Header Row */}
                      <View style={styles.tableHeaderRow}>
                        <Text style={[styles.tableColHeader, { width: 35 }]}>#</Text>
                        <Text style={[styles.tableColHeader, { width: 95 }]}>Category</Text>
                        <Text style={[styles.tableColHeader, { width: 140 }]}>Item Description</Text>
                        <Text style={[styles.tableColHeader, { width: 85 }]}>Qty & Unit</Text>
                        <Text style={[styles.tableColHeader, { width: 95 }]}>Amount</Text>
                        <Text style={[styles.tableColHeader, { width: 110 }]}>Paid To</Text>
                        <Text style={[styles.tableColHeader, { width: 85 }]}>Type</Text>
                        <Text style={[styles.tableColHeader, { width: 60 }]}>Action</Text>
                      </View>

                      {/* Items */}
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
                                <Text style={{ fontSize: 11, fontWeight: '700', color: catStyle.text }}>
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
                              ₹ {Number(item.amount).toLocaleString('en-IN')}
                            </Text>
                            <Text style={[styles.tableCell, { width: 110 }]} numberOfLines={1}>
                              {item.paidTo || '—'}
                            </Text>
                            <Text style={[styles.tableCell, { width: 85 }]}>{item.paymentType}</Text>
                            <View style={{ width: 60, justifyContent: 'center', alignItems: 'center' }}>
                              <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => handleDeleteTodayExpense(item.id)}
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
        )}
      </ScrollView>

      {/* CUSTOM CATEGORY MODAL */}
      <Modal visible={showCategoryModal} transparent={true} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Category</Text>
            <Text style={styles.modalSubtitle}>Enter category name (e.g. Tiles, Paint, Plumbing)</Text>

            <TextInput
              style={styles.modalInput}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Category Name"
              placeholderTextColor="#94a3b8"
              autoFocus={true}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary, { flex: 1 }]}
                onPress={() => {
                  setShowCategoryModal(false);
                  setNewCategoryName('');
                }}
              >
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, { flex: 1 }]}
                onPress={handleAddCustomCategory}
              >
                <Text style={styles.btnPrimaryText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default EmployeeExpensesScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  headerWrapper: {
    backgroundColor: '#0f766e',
    paddingHorizontal: 16,
    paddingBottom: 10,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconButton: {
    padding: 6,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#ccfbf1',
    fontSize: 12,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    color: '#ccfbf1',
    fontWeight: '600',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#0f766e',
    fontWeight: '800',
  },
  container: {
    flex: 1,
  },
  dateLockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ccfbf1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  dateLockIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLockTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f766e',
    textTransform: 'uppercase',
  },
  dateLockValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#134e4a',
    marginTop: 2,
  },
  dateLockHint: {
    fontSize: 11,
    color: '#0f766e',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 14,
  },
  formField: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  required: {
    color: '#ef4444',
  },
  pickerBorder: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#0f172a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  clientBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    marginBottom: 14,
  },
  clientBadgeText: {
    fontSize: 12,
    color: '#0f766e',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  btnPrimary: {
    backgroundColor: '#0f766e',
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  btnSecondary: {
    backgroundColor: '#f0fdfa',
    borderWidth: 1.5,
    borderColor: '#0f766e',
  },
  btnSecondaryText: {
    color: '#0f766e',
    fontWeight: '700',
    fontSize: 13,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sheetBanner: {
    backgroundColor: '#0f766e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },
  sheetBannerSubtitle: {
    color: '#99f6e4',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sheetBannerTotal: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  sheetDatePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  projectSheetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  projectHeader: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  tableColHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    paddingHorizontal: 4,
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableCell: {
    fontSize: 12,
    color: '#334155',
    paddingHorizontal: 4,
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 14,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
});
