import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  Share,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as adminSitesApi from '../../services/adminSitesApi';

// --- Reusable Top Cyan Breadcrumb Banner matching Web CRM Screenshots ---
const CyanHeaderBar = ({ breadcrumbText }) => {
  return (
    <View style={styles.cyanTopBar}>
      <View style={styles.cyanLeft}>
        <Ionicons name="server-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
        <Ionicons name="home-outline" size={15} color="#ffffff" style={{ marginRight: 4 }} />
        <Text style={styles.cyanBreadcrumbText}>{breadcrumbText}</Text>
      </View>
      <View style={styles.cyanRight}>
        <View style={styles.bellWrapper}>
          <Ionicons name="notifications-outline" size={20} color="#ffffff" />
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>14</Text>
          </View>
        </View>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={16} color="#ffffff" />
        </View>
      </View>
    </View>
  );
};

// --- Reusable Dropdown Selector ---
const DropdownField = ({
  label,
  value,
  placeholder = 'Select',
  options = [],
  onSelect,
  containerStyle,
  required = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          label: opt.label || opt.name || String(opt.value ?? ''),
          value: opt.value !== undefined ? opt.value : (opt.id ?? opt.name),
        };
      }
      return { label: String(opt), value: opt };
    });
  }, [options]);

  const selected = normalizedOptions.find((o) => String(o.value) === String(value));
  const displayText = selected ? selected.label : (value ? String(value) : placeholder);

  const filtered = useMemo(() => {
    if (!search.trim()) return normalizedOptions;
    const q = search.toLowerCase();
    return normalizedOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [normalizedOptions, search]);

  return (
    <View style={[styles.fieldContainer, containerStyle]}>
      {label ? (
        <Text style={styles.fieldLabel}>
          {label} {required ? <Text style={styles.requiredStar}>*</Text> : null}
        </Text>
      ) : null}
      <TouchableOpacity
        style={styles.dropdownBtn}
        onPress={() => {
          setSearch('');
          setOpen(true);
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.dropdownBtnText, !value && styles.placeholderText]} numberOfLines={1}>
          {displayText}
        </Text>
        <MaterialIcons name="keyboard-arrow-down" size={20} color="#6b7280" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || 'Select Option'}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {normalizedOptions.length > 5 ? (
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search..."
                placeholderTextColor="#9ca3af"
                value={search}
                onChangeText={setSearch}
              />
            ) : null}

            <ScrollView style={{ maxHeight: 260 }}>
              {filtered.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.modalOption,
                    String(item.value) === String(value) && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      String(item.value) === String(value) && styles.modalOptionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {String(item.value) === String(value) && (
                    <Ionicons name="checkmark" size={18} color="#009688" />
                  )}
                </TouchableOpacity>
              ))}
              {filtered.length === 0 && (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#9ca3af', fontSize: 13 }}>No options found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const SiteIssuesAndToolsModule = ({
  currentView,
  setCurrentView,
  apiProjects = [],
  apiClients = [],
  apiEmployees = [],
  apiBusinessAssociates = [],
}) => {
  const [loading, setLoading] = useState(false);

  // --- Master State: Categories ---
  const [categoriesList, setCategoriesList] = useState([]);

  // --- Master State: Site Issues Data ---
  const [siteIssues, setSiteIssues] = useState([]);

  // --- Master State: Tools Records ---
  const [toolsData, setToolsData] = useState([]);

  // --- Form State: Add Site Issue ---
  const [issueForm, setIssueForm] = useState({
    ba: 'admin',
    client: '',
    project: '',
    category: '',
    date: '24-11-2026',
    report: '',
  });

  // --- Form State: Add Site Issue Category ---
  const [newCategoryName, setNewCategoryName] = useState('');

  // --- Form State: Add Tool ---
  const [addToolForm, setAddToolForm] = useState({
    ba: 'admin',
    date: '11/24/2026',
    tool: '',
    totalQty: '',
    usedQty: '',
    details: '',
  });

  // --- Form State: Verify Tool ---
  const [verifyToolForm, setVerifyToolForm] = useState({
    ba: 'admin',
    toolCode: '',
    agent: '',
    quantity: '',
  });

  // --- Filter States: Site Issues ---
  const [issueBaFilter, setIssueBaFilter] = useState('');
  const [issueClientFilter, setIssueClientFilter] = useState('');
  const [issueProjectFilter, setIssueProjectFilter] = useState('');
  const [issueCategoryFilter, setIssueCategoryFilter] = useState('');
  const [issueDateFilter, setIssueDateFilter] = useState('');

  // --- Filter States: Tools List ---
  const [toolBaFilter, setToolBaFilter] = useState('');
  const [toolDateFilter, setToolDateFilter] = useState('');
  const [toolNameFilter, setToolNameFilter] = useState('');

  // ==========================================
  // API LOADERS
  // ==========================================

  const loadCategories = useCallback(async () => {
    try {
      const data = await adminSitesApi.getSiteIssueCategories();
      if (Array.isArray(data) && data.length > 0) {
        setCategoriesList(data);
      }
    } catch (e) {
      console.warn('Failed to load categories:', e);
    }
  }, []);

  const loadSiteIssues = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (issueBaFilter) params.ba = issueBaFilter;
      if (issueClientFilter) params.client = issueClientFilter;
      if (issueProjectFilter) params.project = issueProjectFilter;
      if (issueCategoryFilter) params.category = issueCategoryFilter;
      if (issueDateFilter) params.date = issueDateFilter;

      const data = await adminSitesApi.getSiteIssues(params);
      if (Array.isArray(data)) {
        setSiteIssues(data);
      }
    } catch (e) {
      console.warn('Failed to load site issues:', e);
    } finally {
      setLoading(false);
    }
  }, [issueBaFilter, issueClientFilter, issueProjectFilter, issueCategoryFilter, issueDateFilter]);

  const loadSiteTools = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (toolBaFilter) params.ba = toolBaFilter;
      if (toolNameFilter) params.tool = toolNameFilter;
      if (toolDateFilter) params.date = toolDateFilter;

      const data = await adminSitesApi.getSiteTools(params);
      if (Array.isArray(data)) {
        setToolsData(data);
      }
    } catch (e) {
      console.warn('Failed to load tools:', e);
    } finally {
      setLoading(false);
    }
  }, [toolBaFilter, toolNameFilter, toolDateFilter]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (currentView === 'site_issues' || currentView === 'add_site_issues') {
      loadSiteIssues();
    }
    if (currentView === 'tools' || currentView === 'add_tool' || currentView === 'verify_tool') {
      loadSiteTools();
    }
  }, [currentView, loadSiteIssues, loadSiteTools]);

  // Available Category Names for dropdowns
  const categoryNames = useMemo(() => {
    if (categoriesList.length > 0) {
      return categoriesList.map((c) => (typeof c === 'object' ? c.name : c));
    }
    return [
      'Before Starting Site',
      'Brickwork',
      'Chokidari',
      'Column Reinforcement',
      'Concreting',
      'Curing',
      'Electricity',
      'Everytime',
      'Footing',
      'Lift',
      'Material',
      'Neatness',
      'Only Build Self Projects',
    ];
  }, [categoriesList]);

  // Standard Available Tools for Add Tool Dropdown
  const masterToolsList = useMemo(() => {
    const defaultList = [
      'Hammer Drill',
      'Concrete Vibrator',
      'Plate Compactor',
      'Cutter Machine',
      'Welding Machine',
      'Rotary Drill 26mm',
      'Survey Level & Tripod',
      'Angle Grinder 4 inch',
      'Shovel & Wheelbarrow',
      'Level Pipe & Plumb Bob',
      'Scaffolding Clamps',
      'Safety Helmets & Belts',
    ];
    toolsData.forEach((t) => {
      const name = t.toolName || t.tool;
      if (name && !defaultList.includes(name)) {
        defaultList.push(name);
      }
    });
    return defaultList;
  }, [toolsData]);

  // Options Computations
  const projectOptions = useMemo(() => {
    const list = apiProjects.map((p) => ({ label: p.name || p.title, value: p.name || p.title }));
    if (!list.some((p) => p.value === 'Zone Inspire Sites Issues')) {
      list.unshift({ label: 'Zone Inspire Sites Issues', value: 'Zone Inspire Sites Issues' });
    }
    return list;
  }, [apiProjects]);

  const clientOptions = useMemo(() => {
    const list = apiClients.map((c) => ({ label: c.name || c.fullName, value: c.name || c.fullName }));
    if (!list.some((c) => c.value === 'Inspire Decor and Builders')) {
      list.unshift({ label: 'Inspire Decor and Builders', value: 'Inspire Decor and Builders' });
    }
    return list;
  }, [apiClients]);

  const baOptions = useMemo(() => {
    const list = [
      { label: 'admin', value: 'admin' },
      { label: 'pawan', value: 'pawan' },
      { label: 'AslamKhan', value: 'AslamKhan' },
    ];
    apiEmployees.forEach((emp) => {
      const name = emp.name || emp.fullName;
      if (name && !list.some((b) => b.value === name)) {
        list.push({ label: name, value: name });
      }
    });
    return list;
  }, [apiEmployees]);

  const agentOptions = useMemo(() => {
    const list = [
      { label: 'pawan (Supervisor)', value: 'pawan' },
      { label: 'AslamKhan (Field Agent)', value: 'AslamKhan' },
      { label: 'Site Incharge - Zone Inspire', value: 'Site Incharge' },
    ];
    apiEmployees.forEach((emp) => {
      const name = emp.name || emp.fullName;
      if (name && !list.some((b) => b.value === name)) {
        list.push({ label: name, value: name });
      }
    });
    return list;
  }, [apiEmployees]);

  // Tools Dropdown for Verify Tool with unique ID
  const verifyToolDropdownOptions = useMemo(() => {
    return toolsData.map((t) => {
      const code = t.toolCode || t.id || 'TOOL';
      const name = t.toolName || t.tool || 'Tool';
      const closing = t.closingQty !== undefined ? t.closingQty : 0;
      return {
        label: `${name} [${code}] (Avail: ${closing})`,
        value: code,
        toolObj: t,
      };
    });
  }, [toolsData]);

  // Selected tool object in Verify Tool form
  const selectedToolForVerify = useMemo(() => {
    if (!verifyToolForm.toolCode) return null;
    return toolsData.find((t) => (t.toolCode || t.id) === verifyToolForm.toolCode) || null;
  }, [verifyToolForm.toolCode, toolsData]);

  const calculatedAvailableQty = useMemo(() => {
    if (!selectedToolForVerify) return 0;
    return selectedToolForVerify.closingQty !== undefined ? selectedToolForVerify.closingQty : 0;
  }, [selectedToolForVerify]);

  // ==========================================
  // HANDLERS (API CONNECTED)
  // ==========================================

  const handleAddSiteIssue = async () => {
    if (!issueForm.report.trim()) {
      Alert.alert('Required Field', 'Please enter the report/issue description.');
      return;
    }
    try {
      setLoading(true);
      await adminSitesApi.createSiteIssue({
        businessAssociate: issueForm.ba || 'admin',
        clientName: issueForm.client || 'Inspire Decor and Builders',
        projectName: issueForm.project || 'Zone Inspire Sites Issues',
        category: issueForm.category || categoryNames[0] || 'General',
        report: issueForm.report.trim(),
        dateStr: issueForm.date || '24-11-2026',
      });
      Alert.alert('Success', 'Site Issue added successfully!');
      setIssueForm({
        ba: 'admin',
        client: '',
        project: '',
        category: '',
        date: '24-11-2026',
        report: '',
      });
      setCurrentView('site_issues');
      loadSiteIssues();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create site issue');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSiteIssue = (item) => {
    const id = item._id || item.id;
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this site issue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await adminSitesApi.deleteSiteIssue(id);
            loadSiteIssues();
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to delete site issue');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Required Field', 'Please enter a Category Name.');
      return;
    }
    try {
      setLoading(true);
      await adminSitesApi.createSiteIssueCategory({ name: newCategoryName.trim() });
      Alert.alert('Success', `Category "${newCategoryName.trim()}" added successfully!`);
      setNewCategoryName('');
      setCurrentView('site_issue_category');
      loadCategories();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = (cat) => {
    const catName = typeof cat === 'object' ? cat.name : cat;
    const catId = typeof cat === 'object' ? (cat._id || cat.name) : cat;
    Alert.alert('Confirm Delete', `Delete category "${catName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await adminSitesApi.deleteSiteIssueCategory(catId);
            loadCategories();
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to delete category');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleAddToolSubmit = async () => {
    if (!addToolForm.ba || !addToolForm.tool || !addToolForm.totalQty) {
      Alert.alert('Validation Error', 'Please select Business Associate, Tool and enter Total Quantity.');
      return;
    }
    const total = parseInt(addToolForm.totalQty, 10) || 0;
    const used = parseInt(addToolForm.usedQty, 10) || 0;

    try {
      setLoading(true);
      const res = await adminSitesApi.createSiteTool({
        businessAssociate: addToolForm.ba,
        toolName: addToolForm.tool,
        totalQty: total,
        usedQty: used,
        dateStr: addToolForm.date || '11/24/2026',
        details: addToolForm.details || '',
      });
      const generatedCode = res?.data?.toolCode || 'Tool';
      Alert.alert('Success', `Tool added successfully with Unique ID: ${generatedCode}!`);
      setAddToolForm({
        ba: 'admin',
        date: '11/24/2026',
        tool: '',
        totalQty: '',
        usedQty: '',
        details: '',
      });
      setCurrentView('tools');
      loadSiteTools();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to add tool');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTool = (item) => {
    const id = item._id || item.id;
    Alert.alert('Confirm Delete', `Are you sure you want to delete tool ${item.toolName || item.tool}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await adminSitesApi.deleteSiteTool(id);
            loadSiteTools();
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to delete tool');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleVerifyToolSubmit = async () => {
    if (!verifyToolForm.toolCode) {
      Alert.alert('Validation Error', 'Please select a Tool.');
      return;
    }
    const transferQty = parseInt(verifyToolForm.quantity, 10) || 0;
    if (transferQty <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid Quantity greater than 0.');
      return;
    }
    if (transferQty > calculatedAvailableQty) {
      Alert.alert('Quantity Exceeded', `Requested ${transferQty} exceeds available quantity (${calculatedAvailableQty}).`);
      return;
    }

    try {
      setLoading(true);
      const res = await adminSitesApi.verifyToolTransfer({
        toolId: selectedToolForVerify?._id,
        toolCode: selectedToolForVerify?.toolCode,
        toolName: selectedToolForVerify?.toolName || selectedToolForVerify?.tool,
        businessAssociate: verifyToolForm.ba || selectedToolForVerify?.businessAssociate || 'admin',
        assignedAgent: verifyToolForm.agent || 'Assigned Agent',
        quantity: transferQty,
        remarks: 'Tool verified and assigned to site',
      });

      Alert.alert(
        'Tool Verified & Assigned',
        res.message || `${transferQty} units of ${selectedToolForVerify?.toolName} [${selectedToolForVerify?.toolCode}] assigned to ${verifyToolForm.agent}!`
      );

      setVerifyToolForm({
        ba: 'admin',
        toolCode: '',
        agent: '',
        quantity: '',
      });
      setCurrentView('tools');
      loadSiteTools();
    } catch (e) {
      Alert.alert('Error', e.message || 'Verification transfer failed');
    } finally {
      setLoading(false);
    }
  };

  // Export handlers (generates and shares formatted CSV data)
  const handleExportSiteIssues = async () => {
    try {
      const headers = ['Issue Code', 'Business Associate', 'Client Name', 'Project Name', 'Category', 'Report', 'Date'];
      const rows = siteIssues.map((item) => [
        item.issueCode || item._id || '',
        item.businessAssociate || item.ba || '',
        item.clientName || item.client || '',
        item.projectName || item.project || '',
        item.category || '',
        item.report || '',
        item.dateStr || item.date || '',
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
      await Share.share({
        title: 'Site Issues Export',
        message: csvContent,
      });
    } catch (e) {
      Alert.alert('Export Error', e.message);
    }
  };

  const handleExportTools = async () => {
    try {
      const headers = ['Tool Code', 'Tool Name', 'Business Associate', 'Total Qty', 'Used Qty', 'Transferred Qty', 'Closing Qty', 'Date', 'Details'];
      const rows = toolsData.map((item) => [
        item.toolCode || item._id || '',
        item.toolName || item.tool || '',
        item.businessAssociate || item.ba || '',
        item.totalQty || 0,
        item.usedQty || 0,
        item.transferredQty || 0,
        item.closingQty || 0,
        item.dateStr || item.date || '',
        item.details || '',
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
      await Share.share({
        title: 'Site Tools Export',
        message: csvContent,
      });
    } catch (e) {
      Alert.alert('Export Error', e.message);
    }
  };

  const handleExportCategories = async () => {
    try {
      const headers = ['Category Name'];
      const rows = categoryNames.map((name) => [name]);
      const csvContent = [headers.join(','), ...rows.map((r) => `"${r[0]}"`)].join('\n');
      await Share.share({
        title: 'Site Issue Categories Export',
        message: csvContent,
      });
    } catch (e) {
      Alert.alert('Export Error', e.message);
    }
  };

  // ==========================================
  // 1. SITE ISSUES LIST VIEW (media_1795517785240_200a56ea.jpg)
  // ==========================================
  const renderSiteIssues = () => (
    <View style={styles.viewRoot}>
      <CyanHeaderBar breadcrumbText="Home / Clients / Site Issues" />

      {/* Top Filter Card */}
      <View style={styles.cardContainer}>
        <View style={styles.filterRowResponsive}>
          <DropdownField
            label="Business Associate"
            value={issueBaFilter}
            placeholder="Select Business Associate"
            options={[{ label: 'Select Business Associate', value: '' }, ...baOptions]}
            onSelect={setIssueBaFilter}
            containerStyle={styles.filterItem}
          />
          <DropdownField
            label="Client"
            value={issueClientFilter}
            placeholder="Select Client"
            options={[{ label: 'Select Client', value: '' }, ...clientOptions]}
            onSelect={setIssueClientFilter}
            containerStyle={styles.filterItem}
          />
          <DropdownField
            label="Project"
            value={issueProjectFilter}
            placeholder="Select Project"
            options={[{ label: 'Select Project', value: '' }, ...projectOptions]}
            onSelect={setIssueProjectFilter}
            containerStyle={styles.filterItem}
          />
          <DropdownField
            label="Category"
            value={issueCategoryFilter}
            placeholder="Select"
            options={[{ label: 'Select', value: '' }, ...categoryNames.map((c) => ({ label: c, value: c }))]}
            onSelect={setIssueCategoryFilter}
            containerStyle={styles.filterItem}
          />
        </View>

        <View style={{ width: '48%', marginTop: 8 }}>
          <Text style={styles.fieldLabel}>Date</Text>
          <View style={styles.dateInputWrapper}>
            <TextInput
              style={styles.dateInput}
              placeholder="dd-mm-yyyy"
              placeholderTextColor="#9ca3af"
              value={issueDateFilter}
              onChangeText={setIssueDateFilter}
            />
            <MaterialIcons name="event" size={20} color="#6b7280" />
          </View>
        </View>
      </View>

      {/* Table Card */}
      <View style={[styles.cardContainer, { marginTop: 12 }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeaderTitle}>Site Issues</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.tealSolidBtn} onPress={handleExportSiteIssues}>
              <Text style={styles.btnTextWhite}>Export Whole Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tealSolidBtn} onPress={() => setCurrentView('add_site_issues')}>
              <Text style={styles.btnTextWhite}>Add Site Issues</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#00897b" />
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ marginTop: 12 }}>
            <View style={styles.tableBox}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thCell, { width: 100 }]}>Issue ID</Text>
                <Text style={[styles.thCell, { width: 140 }]}>Business Associate Name</Text>
                <Text style={[styles.thCell, { width: 140 }]}>Client Name</Text>
                <Text style={[styles.thCell, { width: 140 }]}>Project Name</Text>
                <Text style={[styles.thCell, { width: 120 }]}>Category</Text>
                <Text style={[styles.thCell, { width: 220 }]}>Report</Text>
                <Text style={[styles.thCell, { width: 90 }]}>Date</Text>
                <Text style={[styles.thCell, { width: 70, textAlign: 'center' }]}>Action</Text>
              </View>

              {siteIssues.map((item, idx) => (
                <View
                  key={item._id || item.id || idx}
                  style={[styles.tableDataRow, { backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }]}
                >
                  <Text style={[styles.tdCell, { width: 100, fontWeight: '700', color: '#0369a1' }]}>
                    {item.issueCode || 'SI-' + (idx + 1)}
                  </Text>
                  <Text style={[styles.tdCell, { width: 140 }]}>{item.businessAssociate || item.ba}</Text>
                  <Text style={[styles.tdCell, { width: 140 }]}>{item.clientName || item.client}</Text>
                  <Text style={[styles.tdCell, { width: 140 }]}>{item.projectName || item.project}</Text>
                  <Text style={[styles.tdCell, { width: 120 }]}>{item.category}</Text>
                  <Text style={[styles.tdCell, { width: 220 }]} numberOfLines={3}>{item.report}</Text>
                  <Text style={[styles.tdCell, { width: 90 }]}>{item.dateStr || item.date}</Text>
                  <View style={[styles.tdActionCell, { width: 70 }]}>
                    <TouchableOpacity
                      style={styles.redActionBtn}
                      onPress={() => handleDeleteSiteIssue(item)}
                    >
                      <MaterialIcons name="delete" size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {siteIssues.length === 0 && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8' }}>No site issues found</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );

  // ==========================================
  // 2. ADD SITE ISSUES FORM (media_1795517800433_5a91af3b.png)
  // ==========================================
  const renderAddSiteIssues = () => (
    <View style={styles.viewRoot}>
      <CyanHeaderBar breadcrumbText="Home / Clients / Add Site Issues" />

      <View style={styles.cardContainer}>
        <View style={styles.filterRowResponsive}>
          <DropdownField
            label="Business Associate"
            value={issueForm.ba}
            placeholder="Select"
            options={baOptions}
            onSelect={(val) => setIssueForm({ ...issueForm, ba: val })}
            containerStyle={styles.filterItem}
          />
          <DropdownField
            label="Client"
            value={issueForm.client}
            placeholder="Select"
            options={clientOptions}
            onSelect={(val) => setIssueForm({ ...issueForm, client: val })}
            containerStyle={styles.filterItem}
          />
          <DropdownField
            label="Project"
            value={issueForm.project}
            placeholder="Select"
            options={projectOptions}
            onSelect={(val) => setIssueForm({ ...issueForm, project: val })}
            containerStyle={styles.filterItem}
          />
        </View>

        <View style={[styles.filterRowResponsive, { marginTop: 12 }]}>
          <DropdownField
            label="Category"
            value={issueForm.category}
            placeholder="Select"
            options={categoryNames.map((c) => ({ label: c, value: c }))}
            onSelect={(val) => setIssueForm({ ...issueForm, category: val })}
            containerStyle={styles.filterItem}
          />
          <View style={styles.filterItem}>
            <Text style={styles.fieldLabel}>Date</Text>
            <View style={styles.dateInputWrapper}>
              <TextInput
                style={styles.dateInput}
                value={issueForm.date}
                onChangeText={(val) => setIssueForm({ ...issueForm, date: val })}
                placeholder="dd-mm-yyyy"
                placeholderTextColor="#9ca3af"
              />
              <MaterialIcons name="event" size={20} color="#6b7280" />
            </View>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={styles.fieldLabel}>Report</Text>
          <TextInput
            style={styles.largeTextArea}
            multiline
            numberOfLines={4}
            value={issueForm.report}
            onChangeText={(val) => setIssueForm({ ...issueForm, report: val })}
            placeholder="Enter issue details..."
          />
        </View>

        <View style={styles.formBottomRightBtnRow}>
          <TouchableOpacity style={styles.tealSubmitBtn} onPress={handleAddSiteIssue} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.btnTextWhite}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ==========================================
  // 3. ADD SITE ISSUE CATEGORY (media_1795517816838_b13edc7b.png)
  // ==========================================
  const renderAddSiteIssueCategory = () => (
    <View style={styles.viewRoot}>
      <CyanHeaderBar breadcrumbText="Home / Site Issues / Add Site Issue Category" />

      <View style={styles.cardContainer}>
        <View style={{ marginTop: 8 }}>
          <Text style={styles.fieldLabel}>Category Name</Text>
          <TextInput
            style={styles.textInputFull}
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            placeholder="Enter category name"
          />
        </View>

        <View style={styles.formBottomRightBtnRow}>
          <TouchableOpacity style={styles.tealSubmitBtn} onPress={handleAddCategory} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.btnTextWhite}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ==========================================
  // 4. SITE ISSUE CATEGORY LIST (media_1795517838474_ea20e186.png)
  // ==========================================
  const renderSiteIssueCategory = () => (
    <View style={styles.viewRoot}>
      <CyanHeaderBar breadcrumbText="Home / Site Issue Category" />

      <View style={styles.cardContainer}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeaderTitle}>Site Issue Category</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.tealSolidBtn}
              onPress={() => setCurrentView('add_site_issue_category')}
            >
              <Text style={styles.btnTextWhite}>Add Site Issue Category</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tealSolidBtn} onPress={handleExportCategories}>
              <Text style={styles.btnTextWhite}>Export Whole Data</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#00897b" />
          </View>
        ) : (
          <View style={[styles.tableBox, { marginTop: 14 }]}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.thCell, { flex: 1 }]}>Name</Text>
              <Text style={[styles.thCell, { width: 70, textAlign: 'center' }]}>Action</Text>
            </View>

            {categoriesList.map((cat, idx) => {
              const name = typeof cat === 'object' ? cat.name : cat;
              return (
                <View
                  key={idx}
                  style={[styles.tableDataRow, { backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }]}
                >
                  <Text style={[styles.tdCell, { flex: 1 }]}>{name}</Text>
                  <View style={[styles.tdActionCell, { width: 70 }]}>
                    <TouchableOpacity
                      style={styles.redActionBtn}
                      onPress={() => handleDeleteCategory(cat)}
                    >
                      <MaterialIcons name="delete" size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {categoriesList.length === 0 && (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: '#94a3b8' }}>No categories found</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );

  // ==========================================
  // 5. TOOLS LIST VIEW (media_1795518651640_c95a4c00.png)
  // ==========================================
  const renderTools = () => (
    <View style={styles.viewRoot}>
      <CyanHeaderBar breadcrumbText="Home / Business Associates / Tool" />

      {/* Top Filter Card */}
      <View style={styles.cardContainer}>
        <View style={styles.filterRowResponsive}>
          <DropdownField
            label="Business Associate"
            value={toolBaFilter}
            placeholder="Select Business Associate"
            options={[{ label: 'Select Business Associate', value: '' }, ...baOptions]}
            onSelect={setToolBaFilter}
            containerStyle={styles.filterItem}
          />
          <View style={styles.filterItem}>
            <Text style={styles.fieldLabel}>Date</Text>
            <View style={styles.dateInputWrapper}>
              <TextInput
                style={styles.dateInput}
                placeholder="dd-mm-yyyy"
                placeholderTextColor="#9ca3af"
                value={toolDateFilter}
                onChangeText={setToolDateFilter}
              />
              <MaterialIcons name="event" size={20} color="#6b7280" />
            </View>
          </View>
          <DropdownField
            label="Tool"
            value={toolNameFilter}
            placeholder="Select Tool"
            options={[{ label: 'Select Tool', value: '' }, ...masterToolsList.map((t) => ({ label: t, value: t }))]}
            onSelect={setToolNameFilter}
            containerStyle={styles.filterItem}
          />
        </View>
      </View>

      {/* Tools Table Card */}
      <View style={[styles.cardContainer, { marginTop: 12 }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeaderTitle}>Tools</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.tealSolidBtn} onPress={() => setCurrentView('add_tool')}>
              <Text style={styles.btnTextWhite}>Add Tool</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tealSolidBtn} onPress={() => setCurrentView('verify_tool')}>
              <Text style={styles.btnTextWhite}>Verify Tool</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tealSolidBtn} onPress={handleExportTools}>
              <Text style={styles.btnTextWhite}>Export Whole Data</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#00897b" />
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ marginTop: 12 }}>
            <View style={styles.tableBox}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thCell, { width: 110 }]}>Tool ID</Text>
                <Text style={[styles.thCell, { width: 160 }]}>Business Associate Name</Text>
                <Text style={[styles.thCell, { width: 140 }]}>Tool</Text>
                <Text style={[styles.thCell, { width: 85, textAlign: 'center' }]}>Total Qty</Text>
                <Text style={[styles.thCell, { width: 85, textAlign: 'center' }]}>Used Qty</Text>
                <Text style={[styles.thCell, { width: 110, textAlign: 'center' }]}>Transferred Qty</Text>
                <Text style={[styles.thCell, { width: 95, textAlign: 'center' }]}>Closing Qty</Text>
                <Text style={[styles.thCell, { width: 100 }]}>Date</Text>
                <Text style={[styles.thCell, { width: 180 }]}>Details</Text>
                <Text style={[styles.thCell, { width: 70, textAlign: 'center' }]}>Action</Text>
              </View>

              {toolsData.map((item, idx) => (
                <View
                  key={item._id || item.id || idx}
                  style={[styles.tableDataRow, { backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }]}
                >
                  <Text style={[styles.tdCell, { width: 110, fontWeight: '700', color: '#0284c7' }]}>
                    {item.toolCode || 'TOOL-' + (idx + 1001)}
                  </Text>
                  <Text style={[styles.tdCell, { width: 160 }]}>{item.businessAssociate || item.ba}</Text>
                  <Text style={[styles.tdCell, { width: 140, fontWeight: '600' }]}>{item.toolName || item.tool}</Text>
                  <Text style={[styles.tdCell, { width: 85, textAlign: 'center' }]}>{item.totalQty}</Text>
                  <Text style={[styles.tdCell, { width: 85, textAlign: 'center' }]}>{item.usedQty}</Text>
                  <Text style={[styles.tdCell, { width: 110, textAlign: 'center', color: '#6366f1' }]}>
                    {item.transferredQty || 0}
                  </Text>
                  <Text style={[styles.tdCell, { width: 95, textAlign: 'center', fontWeight: '700', color: '#0d9488' }]}>
                    {item.closingQty}
                  </Text>
                  <Text style={[styles.tdCell, { width: 100 }]}>{item.dateStr || item.date}</Text>
                  <Text style={[styles.tdCell, { width: 180 }]} numberOfLines={2}>{item.details}</Text>
                  <View style={[styles.tdActionCell, { width: 70 }]}>
                    <TouchableOpacity
                      style={styles.redActionBtn}
                      onPress={() => handleDeleteTool(item)}
                    >
                      <MaterialIcons name="delete" size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {toolsData.length === 0 && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8' }}>No tools data found</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* Bottom Left Button: Export Whole Data matching Screenshot */}
        <View style={{ marginTop: 14 }}>
          <TouchableOpacity
            style={[styles.tealSolidBtn, { alignSelf: 'flex-start' }]}
            onPress={handleExportTools}
          >
            <Text style={styles.btnTextWhite}>Export Whole Data</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ==========================================
  // 6. ADD TOOL FORM (media_1795518749732_3c870a89.png)
  // ==========================================
  const renderAddTool = () => (
    <View style={styles.viewRoot}>
      <CyanHeaderBar breadcrumbText="Home / Business Associates / Add Tool" />

      <View style={styles.cardContainer}>
        {/* Row 1: Business Associate, Date, Tool */}
        <View style={styles.filterRowResponsive}>
          <DropdownField
            label="Business Associate"
            value={addToolForm.ba}
            placeholder="Select"
            options={baOptions}
            onSelect={(val) => setAddToolForm({ ...addToolForm, ba: val })}
            containerStyle={styles.filterItem}
          />
          <View style={styles.filterItem}>
            <Text style={styles.fieldLabel}>Date</Text>
            <View style={styles.dateInputWrapper}>
              <TextInput
                style={styles.dateInput}
                value={addToolForm.date}
                onChangeText={(val) => setAddToolForm({ ...addToolForm, date: val })}
                placeholder="mm/dd/yyyy"
                placeholderTextColor="#9ca3af"
              />
              <MaterialIcons name="event" size={20} color="#6b7280" />
            </View>
          </View>
          <DropdownField
            label="Tool"
            value={addToolForm.tool}
            placeholder="Select"
            options={masterToolsList.map((t) => ({ label: t, value: t }))}
            onSelect={(val) => setAddToolForm({ ...addToolForm, tool: val })}
            containerStyle={styles.filterItem}
          />
        </View>

        {/* Row 2: Total Quantity, Used Quantity */}
        <View style={[styles.filterRowResponsive, { marginTop: 12 }]}>
          <View style={styles.filterItem}>
            <Text style={styles.fieldLabel}>Total Quantity</Text>
            <TextInput
              style={styles.textInputFull}
              value={addToolForm.totalQty}
              onChangeText={(val) => setAddToolForm({ ...addToolForm, totalQty: val })}
              placeholder="e.g. 10"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.filterItem}>
            <Text style={styles.fieldLabel}>Used Quantity</Text>
            <TextInput
              style={styles.textInputFull}
              value={addToolForm.usedQty}
              onChangeText={(val) => setAddToolForm({ ...addToolForm, usedQty: val })}
              placeholder="e.g. 2"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.filterItem} />
        </View>

        {/* Row 3: Details */}
        <View style={{ marginTop: 14 }}>
          <Text style={styles.fieldLabel}>Details</Text>
          <TextInput
            style={styles.largeTextArea}
            multiline
            numberOfLines={4}
            value={addToolForm.details}
            onChangeText={(val) => setAddToolForm({ ...addToolForm, details: val })}
            placeholder="Tool specifications, assigned site, or purpose..."
          />
        </View>

        {/* Bottom Right Submit Button */}
        <View style={styles.formBottomRightBtnRow}>
          <TouchableOpacity style={styles.tealSubmitBtn} onPress={handleAddToolSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.btnTextWhite}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ==========================================
  // 7. VERIFY TOOL FORM (media_1795518797118_cff7eb56.png)
  // ==========================================
  const renderVerifyTool = () => (
    <View style={styles.viewRoot}>
      <CyanHeaderBar breadcrumbText="Home / Tool / Verify Tool" />

      <View style={styles.cardContainer}>
        {/* Row 1: Business Associate, Tool, Available Qty: */}
        <View style={styles.filterRowResponsive}>
          <DropdownField
            label="Business Associate"
            value={verifyToolForm.ba}
            placeholder="Select"
            options={baOptions}
            onSelect={(val) => setVerifyToolForm({ ...verifyToolForm, ba: val })}
            containerStyle={styles.filterItem}
          />
          <DropdownField
            label="Tool (with Unique ID)"
            value={verifyToolForm.toolCode}
            placeholder="Select Added Tool"
            options={verifyToolDropdownOptions}
            onSelect={(val) => setVerifyToolForm({ ...verifyToolForm, toolCode: val })}
            containerStyle={styles.filterItem}
          />
          <View style={styles.filterItem}>
            <Text style={styles.fieldLabel}>Available Qty:</Text>
            <View style={styles.readOnlyBox}>
              <Text style={styles.readOnlyText}>{calculatedAvailableQty}</Text>
            </View>
          </View>
        </View>

        {/* Row 2: Agent, Quantity */}
        <View style={[styles.filterRowResponsive, { marginTop: 12 }]}>
          <DropdownField
            label="Agent / Site Incharge"
            value={verifyToolForm.agent}
            placeholder="Select Agent"
            options={agentOptions}
            onSelect={(val) => setVerifyToolForm({ ...verifyToolForm, agent: val })}
            containerStyle={styles.filterItem}
          />
          <View style={styles.filterItem}>
            <Text style={styles.fieldLabel}>Quantity to Transfer/Verify</Text>
            <TextInput
              style={styles.textInputFull}
              value={verifyToolForm.quantity}
              onChangeText={(val) => setVerifyToolForm({ ...verifyToolForm, quantity: val })}
              placeholder="e.g. 2"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.filterItem} />
        </View>

        {/* Bottom Right Submit Button */}
        <View style={styles.formBottomRightBtnRow}>
          <TouchableOpacity style={styles.tealSubmitBtn} onPress={handleVerifyToolSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.btnTextWhite}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Router switch
  switch (currentView) {
    case 'site_issues':
      return renderSiteIssues();
    case 'add_site_issues':
      return renderAddSiteIssues();
    case 'add_site_issue_category':
      return renderAddSiteIssueCategory();
    case 'site_issue_category':
      return renderSiteIssueCategory();
    case 'tools':
      return renderTools();
    case 'add_tool':
      return renderAddTool();
    case 'verify_tool':
      return renderVerifyTool();
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  viewRoot: {
    padding: 10,
    backgroundColor: '#f1f5f9',
    minHeight: '100%',
  },

  // Cyan Top Banner
  cyanTopBar: {
    backgroundColor: '#00a8cc',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cyanLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cyanBreadcrumbText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  cyanRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellWrapper: {
    position: 'relative',
    padding: 2,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#fbbf24',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  bellBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1e293b',
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Main Card
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },

  // Responsive Filter Row
  filterRowResponsive: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterItem: {
    flex: 1,
    minWidth: 140,
  },

  // Dropdown Field
  fieldContainer: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 5,
  },
  requiredStar: {
    color: '#ef4444',
  },
  dropdownBtn: {
    height: 38,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
  },
  dropdownBtnText: {
    fontSize: 12,
    color: '#1e293b',
    flex: 1,
  },
  placeholderText: {
    color: '#64748b',
  },

  // Date Input
  dateInputWrapper: {
    height: 38,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
  },
  dateInput: {
    fontSize: 12,
    color: '#1e293b',
    flex: 1,
    padding: 0,
  },

  // Generic Inputs
  textInputFull: {
    height: 38,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  largeTextArea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 10,
    fontSize: 12,
    color: '#1e293b',
    backgroundColor: '#ffffff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  readOnlyBox: {
    height: 38,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 10,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  readOnlyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d9488',
  },

  // Card Header with Title and Buttons
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Teal Solid Buttons (matching Web CRM)
  tealSolidBtn: {
    backgroundColor: '#00897b',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tealSubmitBtn: {
    backgroundColor: '#00897b',
    paddingVertical: 9,
    paddingHorizontal: 22,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnTextWhite: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Table Styles
  tableBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  thCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    paddingHorizontal: 6,
  },
  tableDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tdCell: {
    fontSize: 12,
    color: '#334155',
    paddingHorizontal: 6,
  },
  tdActionCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  greenActionBtn: {
    backgroundColor: '#10b981',
    width: 26,
    height: 26,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  redActionBtn: {
    backgroundColor: '#ef4444',
    width: 26,
    height: 26,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Form Bottom Row
  formBottomRightBtnRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  // Modal Dropdown
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalSearchInput: {
    height: 38,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#1e293b',
    marginBottom: 8,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  modalOptionSelected: {
    backgroundColor: '#f0fdfa',
  },
  modalOptionText: {
    fontSize: 13,
    color: '#334155',
  },
  modalOptionTextSelected: {
    color: '#00897b',
    fontWeight: '700',
  },
});

export default SiteIssuesAndToolsModule;
