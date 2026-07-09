import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import * as adminSitesApi from '../../services/adminSitesApi';

const { width } = Dimensions.get('window');

const SitesManagementScreen = ({ route, navigation }) => {
  const { viewType: initialViewType } = route.params || { viewType: 'all_projects' };
  const [currentView, setCurrentView] = useState(initialViewType);

  React.useEffect(() => {
    if (route.params?.viewType) {
      setCurrentView(route.params.viewType);
    }
  }, [route.params?.viewType]);

  // --- API Data States ---
  const [apiClients, setApiClients] = useState([]);
  const [apiProjects, setApiProjects] = useState([]);
  const [apiCashFlows, setApiCashFlows] = useState([]);
  const [apiEmployees, setApiEmployees] = useState([]);
  const [apiLoading, setApiLoading] = useState(true);

  // --- Fetch API data on mount ---
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setApiLoading(true);
    try {
      const [clientsData, projectsData, cashFlowsData, employeesData] = await Promise.all([
        adminSitesApi.getClients(),
        adminSitesApi.getProjects(),
        adminSitesApi.getCashFlows(),
        adminSitesApi.getEmployees(),
      ]);

      // Map clients from API
      const mappedClients = clientsData.map(c => ({
        id: c._id,
        name: c.name,
        contactNumber: c.contactNumber,
        comments: c.comments,
        source: c.source,
        clientType: c.clientType,
        status: c.status,
        assignedTo: c.assignedTo,
        propertySellerType: c.propertySellerType,
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
        associate: cf.businessAssociate?.name || '',
        associateId: cf.businessAssociate?._id || '',
        openingBal: `Rs. ${(cf.openingBalance || 0).toFixed(2)}`,
        totalRec: `Rs. ${(cf.totalReceived || 0).toFixed(2)}`,
        totalExp: 'Rs. 0.00',
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
    date: '06/12/2026',
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
    project: '',
    associate: '',
    date: '06/12/2026',
    category: 'Materials',
    amount: '',
    paidTo: '',
    remarks: '',
  });

  // Add Work Status Form State
  const [workStatusForm, setWorkStatusForm] = useState({
    associate: '',
    client: '',
    project: '',
    date: '06/12/2026',
    todayStatus: '',
    tomorrowPlan: '',
    dayAfterTomorrowPlan: '',
  });

  // Add Client Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    client: '',
    project: '',
    date: '06/12/2026',
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
  const [selectedDateFilter, setSelectedDateFilter] = useState('06/12/2026');
  const [selectedEndDateFilter, setSelectedEndDateFilter] = useState('06/12/2026');
  const [selectedPaymentTypeFilter, setSelectedPaymentTypeFilter] = useState('');

  // --- Date Picker State & Handlers ---
  const [datePickerConfig, setDatePickerConfig] = useState({
    show: false,
    targetField: null,
    currentValue: new Date()
  });

  const openDatePicker = (targetField, currentValueString) => {
    let parsedDate = new Date();
    if (currentValueString) {
      const parts = currentValueString.split(/[-/]/);
      if (parts.length === 3) {
        parsedDate = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
      }
      if (isNaN(parsedDate.getTime())) parsedDate = new Date();
    }
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
    if (!selectedDate) {
      if (Platform.OS === 'ios') setDatePickerConfig(prev => ({ ...prev, show: false }));
      return;
    }
    
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const year = selectedDate.getFullYear();
    const formattedStr = `${month}/${day}/${year}`;

    switch (datePickerConfig.targetField) {
      case 'cashFlowForm.date': setCashFlowForm(prev => ({...prev, date: formattedStr})); break;
      case 'expensesForm.date': setExpensesForm(prev => ({...prev, date: formattedStr})); break;
      case 'workStatusForm.date': setWorkStatusForm(prev => ({...prev, date: formattedStr})); break;
      case 'paymentForm.date': setPaymentForm(prev => ({...prev, date: formattedStr})); break;
      case 'selectedDateFilterWorkStatus': setSelectedDateFilter(formattedStr); break;
      case 'selectedEndDateFilterWorkStatus': setSelectedEndDateFilter(formattedStr); break;
      case 'selectedDateFilterClientPayments': setSelectedDateFilter(formattedStr); break;
    }
  };

  // --- Handlers ---
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
    if (editingProject) {
      setApiProjects(apiProjects.map(p => p.id === editingProject.id ? { ...p, ...projectForm } : p));
      Alert.alert('Success', 'Project updated successfully!');
    } else {
      try {
        // Find client ID from apiClients
        const selectedClient = apiClients.find(c => c.name === projectForm.client);
        const requestBody = {
          projectName: projectForm.name,
          client: selectedClient?.id || projectForm.client,
          status: projectForm.status,
        };
        await adminSitesApi.createProject(requestBody);
        // Refresh data
        await fetchAllData();
        Alert.alert('Success', 'Project added successfully!');
      } catch (error) {
        Alert.alert('Error', 'Failed to add project. Please try again.');
        return;
      }
    }
    setCurrentView('all_projects');
  };

  const handleDeleteProject = (id) => {
    Alert.alert('Delete Project', 'Are you sure you want to delete this project?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setApiProjects(apiProjects.filter((p) => p.id !== id));
          Alert.alert('Success', 'Project deleted successfully!');
        },
      },
    ]);
  };

  const handleAddCashFlowSubmit = async () => {
    if (!cashFlowForm.associate || cashFlowForm.entries.some(e => !e.receivedFrom || !e.receivedAmount || !e.type)) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }
    try {
      // Parse date from MM/DD/YYYY to YYYY-MM-DD
      const dateParts = cashFlowForm.date.split('/');
      const formattedDate = `${dateParts[2]}-${dateParts[0]}-${dateParts[1]}`;
      
      const requestBody = {
        businessAssociate: cashFlowForm.associate,
        date: formattedDate,
        openingBalance: parseFloat(cashFlowForm.openingBalance) || 0,
        entries: cashFlowForm.entries.map(e => ({
          receivedFrom: e.receivedFrom,
          receivedAmount: parseFloat(e.receivedAmount) || 0,
          type: e.type,
        })),
      };
      await adminSitesApi.createCashFlow(requestBody);
      // Refresh data
      await fetchAllData();
      Alert.alert('Success', 'Cash flow record added successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add cash flow. Please try again.');
      return;
    }
    // Reset form
    setCashFlowForm({
      id: null,
      associate: '',
      date: '06/12/2026',
      openingBalance: '0',
      entries: [{ id: Date.now().toString(), receivedFrom: '', receivedAmount: '', type: '' }]
    });
    if (cashFlowForm.id) {
      setCurrentView('cash_flow');
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
      openingBalance: c.openingBal.replace('₹', '').replace(',', ''),
      entries: [{ id: Date.now().toString(), receivedFrom: c.from, receivedAmount: c.amount.replace('₹', '').replace(',', ''), type: c.type }]
    });
    setCurrentView('edit_cash_flow');
  };

  const handleDeleteCashFlow = (id) => {
    Alert.alert('Delete', 'Are you sure you want to delete this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Deleted') }
    ]);
  };

  const handleAddExpensesSubmit = () => {
    if (!expensesForm.project || !expensesForm.associate || !expensesForm.amount || !expensesForm.paidTo) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }
    Alert.alert('Success', 'Expense record added successfully! (API integration later)');
    setExpensesForm({
      project: '',
      associate: '',
      date: '06/12/2026',
      category: 'Materials',
      amount: '',
      paidTo: '',
      remarks: '',
    });
  };

  const handleAddWorkStatusSubmit = () => {
    if (!workStatusForm.project || !workStatusForm.actionPlan) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }
    Alert.alert('Success', 'Work status added successfully! (API integration later)');
    setWorkStatusForm({
      project: '',
      actionPlan: '',
      notes: '',
      supervisor: 'Admin',
      stage: 'Slab',
    });
  };

  const handleAddPaymentSubmit = () => {
    if (!paymentForm.client || !paymentForm.project || !paymentForm.amount) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }
    Alert.alert('Success', editingPayment ? 'Client payment updated successfully!' : 'Client payment added successfully! (API integration later)');
    setEditingPayment(null);
    setPaymentForm({
      client: '',
      project: '',
      date: '06/12/2026',
      amount: '',
      mode: 'UPI',
      reference: '',
      remarks: '',
    });
    setCurrentView('client_payments');
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
              <TouchableOpacity style={styles.tealButton} onPress={() => Alert.alert('Export', 'Exporting whole data as CSV...')}>
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
                <Picker.Item label="Complete" value="Complete" />
              </Picker>
            </View>
          </View>
          
          <View style={[styles.formFooter, { justifyContent: 'flex-end' }]}>
            <TouchableOpacity style={styles.solidTealButton} onPress={handleSaveProject}>
              <Text style={styles.solidTealButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // 2. Tomorrow's Action Plan Clients UI
  const renderTomorrowClients = () => {
    const plans = [
      { id: '1', client: 'P S Bisht', plan: 'Verify layout for ground floor brickwork.', note: 'Tarai is mandatory.', supervisor: 'Admin', date: '06/12/2026' },
      { id: '2', client: 'Harsh Gupta', plan: 'Complete plinth beam concrete checklist.', note: 'Align with associate architect.', supervisor: 'Admin', date: '06/12/2026' },
    ];
    return (
      <View style={styles.viewContainer}>
        <View style={styles.tableCard}>
          <View style={styles.tableCardHeader}>
            <Text style={styles.tableTitle}>Clients Action Plan</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.tableContainer}>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableColHeader, { width: 130 }]}>Client Name</Text>
                <Text style={[styles.tableColHeader, { width: 200 }]}>Action Plan for Tomorrow</Text>
                <Text style={[styles.tableColHeader, { width: 140 }]}>Manual Notes</Text>
                <Text style={[styles.tableColHeader, { width: 90 }]}>Supervisor</Text>
                <Text style={[styles.tableColHeader, { width: 100 }]}>Target Date</Text>
              </View>
              {plans.map((p) => (
                <View key={p.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: 130 }]}>{p.client}</Text>
                  <Text style={[styles.tableCell, { width: 200 }]} numberOfLines={3}>{p.plan}</Text>
                  <Text style={[styles.tableCell, { width: 140 }]} numberOfLines={2}>{p.note}</Text>
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
                onValueChange={(val) => setCashFlowForm({ ...cashFlowForm, associate: val })}
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
              <Text style={styles.formLabel}>Opening Balance</Text>
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

            <TouchableOpacity style={styles.solidTealButton} onPress={handleAddCashFlowSubmit}>
              <Text style={styles.solidTealButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // 5. Cash Flow Listing UI
  const renderCashFlowList = () => {
    const list = apiCashFlows.length > 0 ? apiCashFlows : [
      { id: '1', date: '15-06-2026', associate: 'AkshayPawar', openingBal: 'Rs. -42331.00', totalRec: 'Rs. 0.00', totalExp: 'Rs. 0.00', from: '', closingBal: 'Rs. -42331.00', amount: '0', type: 'Bank' },
      { id: '2', date: '15-06-2026', associate: 'VishalPrasad', openingBal: 'Rs. 0.00', totalRec: 'Rs. 0.00', totalExp: 'Rs. 0.00', from: '', closingBal: 'Rs. 0.00', amount: '0', type: 'Bank' },
      { id: '3', date: '15-06-2026', associate: 'AslamKhan', openingBal: 'Rs. 868.00', totalRec: 'Rs. 0.00', totalExp: 'Rs. 0.00', from: '', closingBal: 'Rs. 868.00', amount: '0', type: 'Bank' },
      { id: '4', date: '15-06-2026', associate: 'ManvendraChauhan', openingBal: 'Rs. 15.00', totalRec: 'Rs. 0.00', totalExp: 'Rs. 0.00', from: '', closingBal: 'Rs. 15.00', amount: '0', type: 'Bank' },
    ];
    return (
      <View style={styles.viewContainer}>
        <View style={styles.tableCard}>
          <View style={styles.tableCardHeader}>
            <Text style={styles.tableTitle}>Cash Flow Report</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.tableContainer}>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableColHeader, { width: 140 }]}>Business Associate</Text>
                <Text style={[styles.tableColHeader, { width: 90 }]}>Date</Text>
                <Text style={[styles.tableColHeader, { width: 110 }]}>Opening Balance</Text>
                <Text style={[styles.tableColHeader, { width: 100 }]}>Total Received</Text>
                <Text style={[styles.tableColHeader, { width: 100 }]}>Total Expense</Text>
                <Text style={[styles.tableColHeader, { width: 130 }]}>Received From</Text>
                <Text style={[styles.tableColHeader, { width: 110 }]}>Closing Balance</Text>
                <Text style={[styles.tableColHeader, { width: 90, textAlign: 'center' }]}>Action</Text>
              </View>
              {list.map((c) => {
                const isNegative = c.closingBal.includes('-');
                const isPositive = !isNegative && c.closingBal !== 'Rs. 0.00';
                return (
                  <View key={c.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: 140 }]}>{c.associate}</Text>
                    <Text style={[styles.tableCell, { width: 90 }]}>{c.date}</Text>
                    <Text style={[styles.tableCell, { width: 110 }]}>{c.openingBal}</Text>
                    <Text style={[styles.tableCell, { width: 100 }]}>{c.totalRec}</Text>
                    <Text style={[styles.tableCell, { width: 100 }]}>{c.totalExp}</Text>
                    <Text style={[styles.tableCell, { width: 130 }]}>{c.from}</Text>
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
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  // 6. All Expenses Listing UI
  const renderExpensesList = () => {
    const list = [
      { id: '1', date: '06/11/2026', project: '201 Sector 11 Raj Nagar', category: 'Materials', amount: '₹45,000', paidTo: 'Cements Supplier Ltd', type: 'Bank' },
      { id: '2', date: '06/10/2026', project: '1363 Sector 3 Vasundhra Gzb', category: 'Labor', amount: '₹15,000', paidTo: 'Contractor Ramesh', type: 'Cash' },
    ];
    return (
      <View style={styles.viewContainer}>
        <View style={styles.tableCard}>
          <View style={styles.tableCardHeader}>
            <Text style={styles.tableTitle}>Expenses List</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.tableContainer}>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableColHeader, { width: 100 }]}>Date</Text>
                <Text style={[styles.tableColHeader, { width: 170 }]}>Project</Text>
                <Text style={[styles.tableColHeader, { width: 110 }]}>Category</Text>
                <Text style={[styles.tableColHeader, { width: 110 }]}>Amount</Text>
                <Text style={[styles.tableColHeader, { width: 150 }]}>Paid To</Text>
                <Text style={[styles.tableColHeader, { width: 80 }]}>Type</Text>
              </View>
              {list.map((c) => (
                <View key={c.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: 100 }]}>{c.date}</Text>
                  <Text style={[styles.tableCell, { width: 170 }]}>{c.project}</Text>
                  <Text style={[styles.tableCell, { width: 110 }]}>{c.category}</Text>
                  <Text style={[styles.tableCell, { width: 110 }]}>{c.amount}</Text>
                  <Text style={[styles.tableCell, { width: 150 }]}>{c.paidTo}</Text>
                  <Text style={[styles.tableCell, { width: 80 }]}>{c.type}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  // 7. Add Expenses Form UI
  const renderAddExpenses = () => {
    return (
      <View style={styles.viewContainer}>
        <View style={styles.formCard}>
          <Text style={styles.formSectionTitle}>Expense Details</Text>

          // CLIENT PICKER
          <View style={styles.formField}>
            <Text style={styles.formLabel}> Client <Text style={styles.required}>*</Text></Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={expensesForm.project}
                onValueChange={(val) => setExpensesForm({ ...expensesForm, project: val })}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Select Project" value="" />
                {projects.map((p) => (
                  <Picker.Item key={p.id} label={p.name} value={p.name} />
                ))}
              </Picker>
            </View>
          </View>
         
          // PROJECT & ASSOCIATE PICKERS SIDE BY SIDE
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Project / Site <Text style={styles.required}>*</Text></Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={expensesForm.project}
                onValueChange={(val) => setExpensesForm({ ...expensesForm, project: val })}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Select Project" value="" />
                {projects.map((p) => (
                  <Picker.Item key={p.id} label={p.name} value={p.name} />
                ))}
              </Picker>
            </View>
          </View>

          // ASSOCIATE PICKER

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Business Associate <Text style={styles.required}>*</Text></Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={expensesForm.associate}
                onValueChange={(val) => setExpensesForm({ ...expensesForm, associate: val })}
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

          // cate
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Category <Text style={styles.required}>*</Text></Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={expensesForm.category}
                onValueChange={(val) => setExpensesForm({ ...expensesForm, category: val })}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Materials" value="Materials" />
                <Picker.Item label="Labor" value="Labor" />
                <Picker.Item label="Equipment" value="Equipment" />
                <Picker.Item label="Utility" value="Utility" />
                <Picker.Item label="Others" value="Others" />
              </Picker>
            </View>
          </View>

          // Quantity & Unit Fields Side by Side

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Quantity <Text style={styles.required}>*</Text></Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={expensesForm.project}
                onValueChange={(val) => setExpensesForm({ ...expensesForm, project: val })}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Select Project" value="" />
                {projects.map((p) => (
                  <Picker.Item key={p.id} label={p.name} value={p.name} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Amount (₹) <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.formInput}
              value={expensesForm.amount}
              onChangeText={(val) => setExpensesForm({ ...expensesForm, amount: val })}
              placeholder="Enter amount"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Paid To <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.formInput}
              value={expensesForm.paidTo}
              onChangeText={(val) => setExpensesForm({ ...expensesForm, paidTo: val })}
              placeholder="Enter recipient"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Date <Text style={styles.required}>*</Text></Text>
            <View style={styles.dateInputWrapper}>
              <TextInput
                style={styles.dateInput}
                value={expensesForm.date}
                onChangeText={(val) => setExpensesForm({ ...expensesForm, date: val })}
                placeholder="mm/dd/yyyy"
                placeholderTextColor="#94a3b8"
              />
              <MaterialIcons name="event" size={20} color="#009688" style={styles.dateIcon} />
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

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Remarks</Text>
            <TextInput
              style={[styles.formInput, styles.multilineInput]}
              value={expensesForm.remarks}
              onChangeText={(val) => setExpensesForm({ ...expensesForm, remarks: val })}
              placeholder="Any comments or descriptions"
              multiline={true}
              numberOfLines={3}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={[styles.formFooter, { justifyContent: 'flex-end' }]}>
            <TouchableOpacity style={styles.solidTealButton} onPress={handleAddExpensesSubmit}>
              <Text style={styles.solidTealButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // 8. Work Status UI (Image 2)
  const renderWorkStatus = () => {
    const statusList = [
      { id: '1', name: '76 77 Mansarovar Park Lal Kaun', client: 'Abhishek Builder', date: '15-06-2026', today: '', tomorrow: '', dayAfterTomorrow: '', addedBy: 'Admin' },
      { id: '2', name: 'Side Wall Plaster Repair', client: 'Alok Jain', date: '15-06-2026', today: '', tomorrow: '', dayAfterTomorrow: '', addedBy: 'Admin' },
      { id: '3', name: 'Investor 1', client: 'Ashish Kaushik', date: '15-06-2026', today: '', tomorrow: '', dayAfterTomorrow: '', addedBy: 'Admin' },
      { id: '4', name: 'Nandgram House', client: 'Ashutosh Yadav', date: '15-06-2026', today: '', tomorrow: '', dayAfterTomorrow: '', addedBy: 'Admin' },
    ];
    return (
      <View style={styles.viewContainer}>
        {/* Refined Filters */}
        <View style={styles.filterCard}>
          <View style={styles.formField}>
            <Text style={styles.filterLabel}>Business Associate</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={selectedAssociateFilter}
                onValueChange={(val) => setSelectedAssociateFilter(val)}
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

          <View style={styles.formField}>
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

          <View style={styles.formField}>
            <Text style={styles.filterLabel}>Project</Text>
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={selectedProjectFilter}
                onValueChange={(val) => setSelectedProjectFilter(val)}
                style={styles.picker}
                dropdownIconColor="#009688"
              >
                <Picker.Item label="Select Project" value="" />
                {apiProjects.map((p) => (
                  <Picker.Item key={p.id} label={p.name} value={p.name} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.formField}>
            <Text style={styles.filterLabel}>From Date</Text>
            <TouchableOpacity onPress={() => openDatePicker('selectedDateFilterWorkStatus', selectedDateFilter)}>
              <View style={styles.dateInputWrapper} pointerEvents="none">
                <TextInput
                  style={styles.dateInput}
                  value={selectedDateFilter}
                  placeholder="mm/dd/yyyy"
                  placeholderTextColor="#94a3b8"
                  editable={false}
                />
                <MaterialIcons name="event" size={20} color="#009688" style={styles.dateIcon} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.formField}>
            <Text style={styles.filterLabel}>End Date</Text>
            <TouchableOpacity onPress={() => openDatePicker('selectedEndDateFilterWorkStatus', selectedEndDateFilter)}>
              <View style={styles.dateInputWrapper} pointerEvents="none">
                <TextInput
                  style={styles.dateInput}
                  value={selectedEndDateFilter}
                  placeholder="mm/dd/yyyy"
                  placeholderTextColor="#94a3b8"
                  editable={false}
                />
                <MaterialIcons name="event" size={20} color="#009688" style={styles.dateIcon} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Table - Work Status */}
        <View style={styles.tableCard}>
          <View style={styles.tableCardHeader}>
            <Text style={styles.tableTitle}>Work Status</Text>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.tealButton} onPress={() => setCurrentView('add_work_status')}>
                <Text style={styles.tealButtonText}>Add Work Status</Text>
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
                <Text style={[styles.tableColHeader, { width: 90 }]}>Date</Text>
                <Text style={[styles.tableColHeader, { width: 110 }]}>Today</Text>
                <Text style={[styles.tableColHeader, { width: 110 }]}>Tomorrow</Text>
                <Text style={[styles.tableColHeader, { width: 130 }]}>Day After Tomorrow</Text>
                <Text style={[styles.tableColHeader, { width: 80 }]}>Added By</Text>
                <Text style={[styles.tableColHeader, { width: 90, textAlign: 'center' }]}>Action</Text>
              </View>
              {statusList.map((s) => (
                <View key={s.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: 170 }]}>{s.name}</Text>
                  <Text style={[styles.tableCell, { width: 130 }]}>{s.client}</Text>
                  <Text style={[styles.tableCell, { width: 90 }]}>{s.date}</Text>
                  <Text style={[styles.tableCell, { width: 110 }]}>{s.today}</Text>
                  <Text style={[styles.tableCell, { width: 110 }]}>{s.tomorrow}</Text>
                  <Text style={[styles.tableCell, { width: 130 }]}>{s.dayAfterTomorrow}</Text>
                  <Text style={[styles.tableCell, { width: 80 }]}>{s.addedBy}</Text>
                  <View style={[styles.actionCell, { width: 90 }]}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => Alert.alert('Edit', 'Edit work status')}>
                      <MaterialIcons name="edit" size={14} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => Alert.alert('Delete', 'Delete work status')}>
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
            <TouchableOpacity style={styles.solidTealButton} onPress={() => { Alert.alert('Success', 'Work status added successfully!'); setCurrentView('work_status'); }}>
              <Text style={styles.solidTealButtonText}>Submit</Text>
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
            <TouchableOpacity style={styles.solidTealButton} onPress={handleAddPaymentSubmit}>
              <Text style={styles.solidTealButtonText}>{editingPayment ? 'Update' : 'Submit'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // --- Main Render Dispatcher ---
  const renderContent = () => {
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#009688" />

      {/* Modern Teal Header */}
      <View style={styles.headerWrapper}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{config.title}</Text>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('AdminMainTabs', { screen: 'Dashboard' })} style={styles.iconButton}>
            <Icon name="home" size={24} color="#fff" />
          </TouchableOpacity>
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
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {renderContent()}
      </ScrollView>
      {datePickerConfig.show && (
        <DateTimePicker
          value={datePickerConfig.currentValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
    </SafeAreaView>
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
    paddingVertical: 14,
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
});

export default SitesManagementScreen;
