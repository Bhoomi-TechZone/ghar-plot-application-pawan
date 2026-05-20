import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Platform,
  StatusBar,
  Pressable,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAllRoles,
  deleteRole,
  getAllPermissions,
  createRole,
  updateRole,
} from '../../services/crmRoleApi';
import { CRM_BASE_URL, getCRMAuthHeaders } from '../../services/crmAPI';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';



// Permissions to select from - matching backend modules
const PERMISSIONS_LIST = [
  // DASHBOARD
  { id: 'DASHBOARD_VIEW', label: 'View Dashboard', icon: 'stats-chart-outline', category: 'Dashboard', module: 'dashboard', action: 'read' },
  { id: 'DASHBOARD_CREATE', label: 'Create Dashboard', icon: 'add-circle-outline', category: 'Dashboard', module: 'dashboard', action: 'create' },
  { id: 'DASHBOARD_EDIT', label: 'Edit Dashboard', icon: 'create-outline', category: 'Dashboard', module: 'dashboard', action: 'update' },
  { id: 'DASHBOARD_DELETE', label: 'Delete Dashboard', icon: 'trash-outline', category: 'Dashboard', module: 'dashboard', action: 'delete' },
  
  // PROPERTIES
  { id: 'PROPERTY_VIEW', label: 'View Properties', icon: 'eye-outline', category: 'Properties', module: 'properties', action: 'read' },
  { id: 'PROPERTY_CREATE', label: 'Create Properties', icon: 'add-circle-outline', category: 'Properties', module: 'properties', action: 'create' },
  { id: 'PROPERTY_EDIT', label: 'Edit Properties', icon: 'create-outline', category: 'Properties', module: 'properties', action: 'update' },
  { id: 'PROPERTY_DELETE', label: 'Delete Properties', icon: 'trash-outline', category: 'Properties', module: 'properties', action: 'delete' },
  
  // USERS
  { id: 'USER_VIEW', label: 'View Users', icon: 'people-outline', category: 'Users', module: 'users', action: 'read' },
  { id: 'USER_CREATE', label: 'Create Users', icon: 'add-circle-outline', category: 'Users', module: 'users', action: 'create' },
  { id: 'USER_EDIT', label: 'Edit Users', icon: 'create-outline', category: 'Users', module: 'users', action: 'update' },
  { id: 'USER_DELETE', label: 'Delete Users', icon: 'trash-outline', category: 'Users', module: 'users', action: 'delete' },
  
  // CATEGORIES
  { id: 'CATEGORY_VIEW', label: 'View Categories', icon: 'grid-outline', category: 'Categories', module: 'categories', action: 'read' },
  { id: 'CATEGORY_CREATE', label: 'Create Categories', icon: 'add-circle-outline', category: 'Categories', module: 'categories', action: 'create' },
  { id: 'CATEGORY_EDIT', label: 'Edit Categories', icon: 'create-outline', category: 'Categories', module: 'categories', action: 'update' },
  { id: 'CATEGORY_DELETE', label: 'Delete Categories', icon: 'trash-outline', category: 'Categories', module: 'categories', action: 'delete' },
  
  // RECENT
  { id: 'RECENT_VIEW', label: 'View Recent', icon: 'time-outline', category: 'Recent', module: 'recent', action: 'read' },
  { id: 'RECENT_EDIT', label: 'Edit Recent', icon: 'create-outline', category: 'Recent', module: 'recent', action: 'update' },
  { id: 'RECENT_DELETE', label: 'Delete Recent', icon: 'trash-outline', category: 'Recent', module: 'recent', action: 'delete' },
  
  // BOUGHT PROPERTY
  { id: 'BOUGHT_PROPERTY_VIEW', label: 'View Bought Property', icon: 'home-outline', category: 'Bought Property', module: 'bought-property', action: 'read' },
  { id: 'BOUGHT_PROPERTY_CREATE', label: 'Create Bought Property', icon: 'add-circle-outline', category: 'Bought Property', module: 'bought-property', action: 'create' },
  { id: 'BOUGHT_PROPERTY_EDIT', label: 'Edit Bought Property', icon: 'create-outline', category: 'Bought Property', module: 'bought-property', action: 'update' },
  { id: 'BOUGHT_PROPERTY_DELETE', label: 'Delete Bought Property', icon: 'trash-outline', category: 'Bought Property', module: 'bought-property', action: 'delete' },
  
  // SETTINGS
  { id: 'SETTINGS_VIEW', label: 'View Settings', icon: 'settings-outline', category: 'Settings', module: 'settings', action: 'read' },
  { id: 'SETTINGS_EDIT', label: 'Edit Settings', icon: 'create-outline', category: 'Settings', module: 'settings', action: 'update' },
  
  // SECURITY
  { id: 'SECURITY_VIEW', label: 'View Security', icon: 'shield-outline', category: 'Security', module: 'security', action: 'read' },
  { id: 'SECURITY_EDIT', label: 'Edit Security', icon: 'create-outline', category: 'Security', module: 'security', action: 'update' },
  
  // REPORTS & COMPLAINTS
  { id: 'REPORTS_COMPLAINTS_VIEW', label: 'View Reports/Complaints', icon: 'warning-outline', category: 'Reports & Complaints', module: 'reports-complaints', action: 'read' },
  { id: 'REPORTS_COMPLAINTS_CREATE', label: 'Create Reports/Complaints', icon: 'add-circle-outline', category: 'Reports & Complaints', module: 'reports-complaints', action: 'create' },
  { id: 'REPORTS_COMPLAINTS_EDIT', label: 'Edit Reports/Complaints', icon: 'create-outline', category: 'Reports & Complaints', module: 'reports-complaints', action: 'update' },
  { id: 'REPORTS_COMPLAINTS_DELETE', label: 'Delete Reports/Complaints', icon: 'trash-outline', category: 'Reports & Complaints', module: 'reports-complaints', action: 'delete' },
  
  // SERVICE MANAGEMENT
  { id: 'SERVICE_VIEW', label: 'View Services', icon: 'construct-outline', category: 'Service Management', module: 'service-management', action: 'read' },
  { id: 'SERVICE_CREATE', label: 'Create Services', icon: 'add-circle-outline', category: 'Service Management', module: 'service-management', action: 'create' },
  { id: 'SERVICE_EDIT', label: 'Edit Services', icon: 'create-outline', category: 'Service Management', module: 'service-management', action: 'update' },
  { id: 'SERVICE_DELETE', label: 'Delete Services', icon: 'trash-outline', category: 'Service Management', module: 'service-management', action: 'delete' },
  
  // ENQUIRIES
  { id: 'ENQUIRY_VIEW', label: 'View Enquiries', icon: 'mail-outline', category: 'Enquiries', module: 'enquiries', action: 'read' },
  { id: 'ENQUIRY_CREATE', label: 'Create Enquiries', icon: 'add-circle-outline', category: 'Enquiries', module: 'enquiries', action: 'create' },
  { id: 'ENQUIRY_EDIT', label: 'Edit Enquiries', icon: 'create-outline', category: 'Enquiries', module: 'enquiries', action: 'update' },
  { id: 'ENQUIRY_DELETE', label: 'Delete Enquiries', icon: 'trash-outline', category: 'Enquiries', module: 'enquiries', action: 'delete' },
  { id: 'ENQUIRY_ASSIGN', label: 'Assign Enquiries', icon: 'person-add-outline', category: 'Enquiries', module: 'enquiries', action: 'assign' },
  
  // ROLES
  { id: 'ROLE_VIEW', label: 'View Roles', icon: 'key-outline', category: 'Roles', module: 'roles', action: 'read' },
  { id: 'ROLE_CREATE', label: 'Create Roles', icon: 'add-circle-outline', category: 'Roles', module: 'roles', action: 'create' },
  { id: 'ROLE_EDIT', label: 'Edit Roles', icon: 'create-outline', category: 'Roles', module: 'roles', action: 'update' },
  { id: 'ROLE_DELETE', label: 'Delete Roles', icon: 'trash-outline', category: 'Roles', module: 'roles', action: 'delete' },
  
  // EMPLOYEES
  { id: 'EMPLOYEE_VIEW', label: 'View Employees', icon: 'people-outline', category: 'Employees', module: 'employees', action: 'read' },
  { id: 'EMPLOYEE_CREATE', label: 'Create Employees', icon: 'add-circle-outline', category: 'Employees', module: 'employees', action: 'create' },
  { id: 'EMPLOYEE_EDIT', label: 'Edit Employees', icon: 'create-outline', category: 'Employees', module: 'employees', action: 'update' },
  { id: 'EMPLOYEE_DELETE', label: 'Delete Employees', icon: 'trash-outline', category: 'Employees', module: 'employees', action: 'delete' },
  
  // EMPLOYEE REPORTS
  { id: 'EMPLOYEE_REPORT_VIEW', label: 'View Employee Reports', icon: 'document-text-outline', category: 'Employee Reports', module: 'employee_reports', action: 'read' },
  { id: 'EMPLOYEE_REPORT_CREATE', label: 'Create Employee Reports', icon: 'add-circle-outline', category: 'Employee Reports', module: 'employee_reports', action: 'create' },
  { id: 'EMPLOYEE_REPORT_EDIT', label: 'Edit Employee Reports', icon: 'create-outline', category: 'Employee Reports', module: 'employee_reports', action: 'update' },
  { id: 'EMPLOYEE_REPORT_DELETE', label: 'Delete Employee Reports', icon: 'trash-outline', category: 'Employee Reports', module: 'employee_reports', action: 'delete' },
  
  // REPORTS
  { id: 'REPORT_VIEW', label: 'View Reports', icon: 'analytics-outline', category: 'Reports', module: 'reports', action: 'read' },
  { id: 'REPORT_CREATE', label: 'Create Reports', icon: 'add-circle-outline', category: 'Reports', module: 'reports', action: 'create' },
  { id: 'REPORT_EDIT', label: 'Edit Reports', icon: 'create-outline', category: 'Reports', module: 'reports', action: 'update' },
  { id: 'REPORT_DELETE', label: 'Delete Reports', icon: 'trash-outline', category: 'Reports', module: 'reports', action: 'delete' },
];

const RoleManagementScreen = ({ navigation }) => {
  // Role Management List
  const [roles, setRoles] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [createEditModalVisible, setCreateEditModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const [permissions, setPermissions] = useState({ modules: [], actions: [] });
  const [submitting, setSubmitting] = useState(false);

  // Create/Edit Role Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [],
    employees: [],
  });

  const [formErrors, setFormErrors] = useState({});
  const [employees, setEmployees] = useState([]);

  /* ============ PERMISSION HELPERS ============ */

  const togglePermission = (permissionId) => {
    setFormData(prev => {
      const updated = [...prev.permissions];
      if (updated.includes(permissionId)) {
        updated.splice(updated.indexOf(permissionId), 1);
      } else {
        updated.push(permissionId);
      }
      return { ...prev, permissions: updated };
    });
  };

  const isPermissionSelected = (permissionId) => {
    return formData.permissions.includes(permissionId);
  };

  // Select all permissions
  const selectAllPermissions = () => {
    const allPermissionIds = PERMISSIONS_LIST.map(p => p.id);
    setFormData(prev => ({ ...prev, permissions: allPermissionIds }));
  };

  // Deselect all permissions
  const deselectAllPermissions = () => {
    setFormData(prev => ({ ...prev, permissions: [] }));
  };

  // Toggle all permissions
  const toggleAllPermissions = () => {
    const allPermissionIds = PERMISSIONS_LIST.map(p => p.id);
    const allSelected = allPermissionIds.every(id => formData.permissions.includes(id));
    if (allSelected) {
      deselectAllPermissions();
    } else {
      selectAllPermissions();
    }
  };

  // Check if all permissions are selected
  const areAllPermissionsSelected = () => {
    const allPermissionIds = PERMISSIONS_LIST.map(p => p.id);
    return allPermissionIds.every(id => formData.permissions.includes(id));
  };

  // Toggle all permissions in a category
  const toggleCategoryPermissions = (category) => {
    const categoryPerms = PERMISSIONS_LIST.filter(p => p.category === category);
    const categoryPermIds = categoryPerms.map(p => p.id);
    const allCategorySelected = categoryPermIds.every(id => formData.permissions.includes(id));
    
    setFormData(prev => {
      let updated = [...prev.permissions];
      if (allCategorySelected) {
        // Deselect all in category
        updated = updated.filter(id => !categoryPermIds.includes(id));
      } else {
        // Select all in category
        categoryPermIds.forEach(id => {
          if (!updated.includes(id)) {
            updated.push(id);
          }
        });
      }
      return { ...prev, permissions: updated };
    });
  };

  // Check if all permissions in a category are selected
  const areCategoryPermissionsSelected = (category) => {
    const categoryPerms = PERMISSIONS_LIST.filter(p => p.category === category);
    const categoryPermIds = categoryPerms.map(p => p.id);
    return categoryPermIds.every(id => formData.permissions.includes(id));
  };

  // Check if some (but not all) permissions in a category are selected
  const areSomeCategoryPermissionsSelected = (category) => {
    const categoryPerms = PERMISSIONS_LIST.filter(p => p.category === category);
    const categoryPermIds = categoryPerms.map(p => p.id);
    const selectedCount = categoryPermIds.filter(id => formData.permissions.includes(id)).length;
    return selectedCount > 0 && selectedCount < categoryPermIds.length;
  };

  /* ============ EMPLOYEE HELPERS ============ */

  const toggleEmployeeAssignment = (employeeId) => {
    setFormData(prev => {
      const updated = [...prev.employees];
      if (updated.includes(employeeId)) {
        updated.splice(updated.indexOf(employeeId), 1);
      } else {
        updated.push(employeeId);
      }
      return { ...prev, employees: updated };
    });
  };

  const isEmployeeAssigned = (employeeId) => {
    return formData.employees.includes(employeeId);
  };

  const getAssignedEmployeeCount = () => {
    return formData.employees.length;
  };

  /* ============ FORM VALIDATION ============ */

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Role name is required';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }

    if (formData.permissions.length === 0) {
      errors.permissions = 'Select at least one permission';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ============ API & DATA LOADING ============ */

  // Convert backend permissions format to UI permission IDs
  const convertBackendToUIPermissions = (backendPermissions) => {
    if (!Array.isArray(backendPermissions)) return [];
    
    const uiPermissions = [];
    
    backendPermissions.forEach(perm => {
      // Handle object format: { module: 'dashboard', actions: ['read', 'update'] }
      if (perm && typeof perm === 'object' && perm.module && Array.isArray(perm.actions)) {
        perm.actions.forEach(action => {
          // Find matching permission in PERMISSIONS_LIST
          const matchingPerm = PERMISSIONS_LIST.find(
            p => p.module === perm.module && p.action === action
          );
          if (matchingPerm && !uiPermissions.includes(matchingPerm.id)) {
            uiPermissions.push(matchingPerm.id);
          }
        });
      }
      // Handle string format (old): 'LEAD_VIEW'
      else if (typeof perm === 'string') {
        if (!uiPermissions.includes(perm)) {
          uiPermissions.push(perm);
        }
      }
    });
    
    return uiPermissions;
  };

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading roles from API...');
      
      const res = await getAllRoles();
      console.log('Roles API response:', res);
      
      if (res?.success) {
        setRoles(
          res.data.map(r => {
            // Convert backend permissions to UI format
            const uiPermissions = convertBackendToUIPermissions(r.permissions);
            console.log(`Role "${r.name}" permissions:`, uiPermissions);

            return {
              id: r._id || r.id,
              name: r.name,
              description: r.description || '—',
              permissions: uiPermissions,
              userCount: r.employeeCount || 0,
              isActive: r.isActive,
            };
          })
        );
      } else {
        console.warn('API returned false success:', res);
        // Fallback with empty array if API fails
        setRoles([]);
      }
    } catch (e) {
      console.error('Error loading roles:', e);
      // Don't show alert, just log the error and use empty array
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPermissions = useCallback(async () => {
    try {
      const res = await getAllPermissions();
      if (res?.success) setPermissions(res.data);
    } catch {
      // Fallback to default permissions
      setPermissions({
        modules: [
          { value: 'dashboard', label: 'Dashboard' },
          { value: 'leads', label: 'Leads' },
          { value: 'employees', label: 'Employees' },
        ],
        actions: [
          { value: 'read', label: 'View' },
          { value: 'create', label: 'Create' },
          { value: 'update', label: 'Update' },
          { value: 'delete', label: 'Delete' },
        ],
      });
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      console.log('Loading employees from API...');
      console.log('API Base URL:', CRM_BASE_URL);
      
      // Check if user is admin - only admins can access /admin/employees endpoint
      const adminToken = await AsyncStorage.getItem('adminToken');
      const adminToken2 = await AsyncStorage.getItem('admin_token');
      
      if (!adminToken && !adminToken2) {
        // User is not an admin (probably an employee), skip loading employees
        console.log('⚠️ User is not admin, skipping employee list load (admin-only feature)');
        setEmployees([]);
        setLoadingEmployees(false);
        return;
      }
      
      // Get auth headers
      const headers = await getCRMAuthHeaders();
      
      const endpoint = `${CRM_BASE_URL}/admin/employees?page=1&limit=100`;
      console.log(`Fetching from: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      const responseText = await response.text();
      console.log(`Response status:`, response.status);
      console.log(`Response preview:`, responseText.substring(0, 300));

      if (!response.ok) {
        // Check if it's an inactive account error or unauthorized
        try {
          const errorData = JSON.parse(responseText);
          if (response.status === 401) {
            if (errorData.message?.includes('inactive')) {
              console.warn('Employee account inactive.');
              throw new Error('Employee account is inactive. Please contact admin to activate.');
            }
            // 401 Invalid token - user doesn't have admin access
            console.warn('⚠️ Not authorized to access employee list (admin-only)');
            setEmployees([]);
            return;
          }
        } catch (e) {
          // If 401 and parse fails, still skip silently
          if (response.status === 401) {
            console.warn('⚠️ Not authorized to access employee list');
            setEmployees([]);
            return;
          }
        }
        throw new Error(`API Error: ${response.status} - ${responseText.substring(0, 100)}`);
      }

      // Try to parse JSON
      let res;
      try {
        res = JSON.parse(responseText);
        console.log(`Successfully parsed JSON from API`, res);
      } catch (parseError) {
        throw new Error(`JSON Parse Error: ${parseError.message}`);
      }

      // Handle different response formats
      let employeeData = [];

      if (res?.success && Array.isArray(res.data)) {
        employeeData = res.data;
      } else if (Array.isArray(res?.data)) {
        employeeData = res.data;
      } else if (Array.isArray(res)) {
        employeeData = res;
      }

      // Map API response to our format
      const mappedEmployees = employeeData.map(emp => ({
        id: emp._id || emp.id,
        fullName: emp.fullName || emp.name || emp.firstName || 'Unknown',
        email: emp.email || emp.emailAddress || '',
      }));

      console.log('Mapped employees:', mappedEmployees);
      setEmployees(mappedEmployees);

      if (mappedEmployees.length === 0) {
        console.warn('No employees found in response');
      }
    } catch (error) {
      console.error('Failed to load employees:', error.message);
      console.error('Full error:', error);

      // Show alert only for critical errors (not for auth errors which are handled above)
      if (!error.message?.includes('401') && !error.message?.includes('Invalid token')) {
        CrossPlatformAlert.alert(
          'Employee Load Error',
          `Could not load employees:\n${error.message}\n\nPlease check:\n1. Employee account is ACTIVE\n2. Network connection`,
          [{ text: 'OK' }]
        );
      }
      
      // No fallback - show error and keep empty list
      console.log('Employee list remains empty due to error');
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
    loadPermissions();
    loadEmployees();
  }, [loadRoles, loadPermissions, loadEmployees]);

  // Set navigation header options
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={openCreateRoleModal} style={{ marginRight: 16 }}>
          <Icon name="add-circle" size={28} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  /* ============ FORM ACTIONS ============ */

  const openCreateRoleModal = () => {
    setSelectedRole(null);
    setFormData({
      name: '',
      description: '',
      permissions: [],
    });
    setFormErrors({});
    setCreateEditModalVisible(true);
  };

  const openEditModal = (role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || [],
    });
    setFormErrors({});
    setCreateEditModalVisible(true);
  };

  const handleSubmitRole = async () => {
    if (!validateForm()) return;

    Keyboard.dismiss();

    try {
      setSubmitting(true);

      // Convert simple permission IDs to backend format using PERMISSIONS_LIST
      const permissionsByModule = {};
      formData.permissions.forEach(permId => {
        const permInfo = PERMISSIONS_LIST.find(p => p.id === permId);
        if (permInfo) {
          if (!permissionsByModule[permInfo.module]) {
            permissionsByModule[permInfo.module] = [];
          }
          if (!permissionsByModule[permInfo.module].includes(permInfo.action)) {
            permissionsByModule[permInfo.module].push(permInfo.action);
          }
        }
      });

      // Create permissions array in backend format
      const permissions = Object.keys(permissionsByModule).map(module => ({
        module,
        actions: permissionsByModule[module]
      }));

      // Create payload in correct backend format
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || 'No description',
        permissions,
      };

      console.log('========== ROLE PAYLOAD ==========');
      console.log('Name:', payload.name);
      console.log('Description:', payload.description);
      console.log('Permissions:', JSON.stringify(permissions, null, 2));
      console.log('Full Payload:', JSON.stringify(payload, null, 2));
      console.log('==================================');

      // Call API to create or update role
      let response;
      if (selectedRole) {
        console.log('🔄 Updating role:', selectedRole.id);
        response = await updateRole(selectedRole.id, payload);
      } else {
        console.log('✨ Creating new role');
        response = await createRole(payload);
      }

      console.log('✅ API Response:', JSON.stringify(response, null, 2));

      CrossPlatformAlert.alert(
        'Success',
        `Role "${payload.name}" ${selectedRole ? 'updated' : 'created'} successfully!`,
        [{ text: 'OK' }]
      );

      setCreateEditModalVisible(false);
      await loadRoles();
    } catch (error) {
      console.error('❌ Error saving role:', error);
      console.error('Error message:', error.message);
      
      // Try to parse error response
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response body:', error.response.text?.());
      }
      
      CrossPlatformAlert.alert(
        'Error',
        `Failed to save role:\n${error.message}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = (role) => {
    CrossPlatformAlert.alert('Delete Role', `Delete "${role.name}"?`, [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRole(role.id);
            CrossPlatformAlert.alert('Success', 'Role deleted');
            loadRoles();
          } catch (error) {
            CrossPlatformAlert.alert('Error', 'Failed to delete role');
          }
        },
      },
    ]);
  };

  /* ============ RENDER COMPONENTS ============ */

  const renderRoleCard = ({ item }) => (
    <Pressable
      style={styles.roleCard}
      android_ripple={{ color: '#e5e7eb' }}
      onPress={() => {
        setSelectedRole(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.cardTop}>
        <View style={styles.roleIconContainer}>
          <Icon name="shield-checkmark" size={24} color="#2563eb" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.roleName}>{item.name}</Text>
          <Text style={styles.roleDesc} numberOfLines={1}>{item.description || 'No description'}</Text>
        </View>
      </View>

      <View style={styles.permissionTags}>
        {Array.isArray(item.permissions) && item.permissions.length > 0 ? (
          <>
            {item.permissions.slice(0, 4).map((perm, idx) => {
              const permInfo = PERMISSIONS_LIST.find(p => p.id === perm);
              return (
                <View key={idx} style={styles.permTagChip}>
                  <Icon name={permInfo?.icon || 'checkmark-circle'} size={12} color="#0369a1" />
                  <Text style={styles.permTagText}>
                    {permInfo?.label?.replace('View ', '').replace('Create ', '').replace('Edit ', '').replace('Delete ', '') || perm}
                  </Text>
                </View>
              );
            })}
            {item.permissions.length > 4 && (
              <View style={styles.permTagMore}>
                <Text style={styles.permTagMoreText}>+{item.permissions.length - 4}</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.noPermText}>No permissions assigned</Text>
        )}
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            openEditModal(item);
          }}
          style={styles.actionBtn}
        >
          <Icon name="create-outline" size={16} color="#2563eb" />
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteRole(item);
          }}
          style={[styles.actionBtn, styles.dangerBtn]}
        >
          <Icon name="trash-outline" size={16} color="#dc2626" />
          <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Delete</Text>
        </TouchableOpacity>

        <View style={styles.permCountBadge}>
          <Text style={styles.permCountText}>{item.permissions?.length || 0} permissions</Text>
        </View>
      </View>
    </Pressable>
  );

  const renderPermissionCheckbox = (permission) => (
    <TouchableOpacity
      key={permission.id}
      style={[
        styles.permissionRow,
        isPermissionSelected(permission.id) && styles.permissionRowActive,
      ]}
      onPress={() => togglePermission(permission.id)}
      activeOpacity={0.7}
    >
      <View style={styles.permIconBox}>
        <Icon name={permission.icon || 'checkmark-circle'} size={18} color={isPermissionSelected(permission.id) ? '#2563eb' : '#94a3b8'} />
      </View>
      <Text style={[
        styles.permissionLabel,
        isPermissionSelected(permission.id) && styles.permissionLabelActive,
      ]}>{permission.label}</Text>
      <View
        style={[
          styles.checkbox,
          isPermissionSelected(permission.id) && styles.checkboxActive,
        ]}
      >
        {isPermissionSelected(permission.id) && (
          <Icon name="checkmark" size={14} color="#fff" />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmployeeRow = (employee) => (
    <TouchableOpacity
      key={employee.id}
      style={[
        styles.employeeRow,
        isEmployeeAssigned(employee.id) && styles.employeeRowActive,
      ]}
      onPress={() => toggleEmployeeAssignment(employee.id)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.checkbox,
          isEmployeeAssigned(employee.id) && styles.checkboxActive,
        ]}
      >
        {isEmployeeAssigned(employee.id) && (
          <Icon name="checkmark" size={16} color="#fff" />
        )}
      </View>

      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>{employee.fullName}</Text>
        <Text style={styles.employeeEmail}>{employee.email}</Text>
      </View>

      <Icon
        name={isEmployeeAssigned(employee.id) ? 'checkmark-circle' : 'ellipse-outline'}
        size={20}
        color={isEmployeeAssigned(employee.id) ? '#10b981' : '#d1d5db'}
      />
    </TouchableOpacity>
  );

  /* ============ MAIN RENDER ============ */

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />

      {/* ===== SEARCH BAR ===== */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={18} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          placeholder="Search roles..."
          placeholderTextColor="#9ca3af"
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchInput}
        />
      </View>

      {/* ===== ROLES LIST ===== */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : roles.length === 0 ? (
        <View style={styles.centerContainer}>
          <Icon name="briefcase-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>No roles yet</Text>
          <Text style={styles.emptySubtext}>Create your first role by clicking +</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={openCreateRoleModal}
          >
            <Icon name="add" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}> Create Role</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={roles.filter((r) =>
            r.name.toLowerCase().includes(searchText.toLowerCase())
          )}
          renderItem={renderRoleCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadRoles} />
          }
        />
      )}

      {/* ===== ROLE DETAIL MODAL ===== */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSmall}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeBtn}
            >
              <Icon name="close" size={24} color="#1e293b" />
            </TouchableOpacity>

            <Icon name="briefcase" size={40} color="#2563eb" />
            <Text style={styles.modalTitle}>{selectedRole?.name}</Text>
            <Text style={styles.modalSub}>{selectedRole?.description}</Text>

            {selectedRole?.permissions && Array.isArray(selectedRole.permissions) && selectedRole.permissions.length > 0 && (
              <View style={styles.permissionsSection}>
                <Text style={styles.sectionLabel}>Permissions ({selectedRole.permissions.length})</Text>
                <View style={styles.permissionsList}>
                  {selectedRole.permissions.map((perm, idx) => {
                    const permInfo = PERMISSIONS_LIST.find(p => p.id === perm);
                    return (
                      <View key={idx} style={styles.permItemBadge}>
                        <Icon name={permInfo?.icon || 'checkmark-circle'} size={14} color="#2563eb" />
                        <Text style={styles.permItemText}>
                          {permInfo?.label || perm}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                setModalVisible(false);
                openEditModal(selectedRole);
              }}
            >
              <Icon name="create-outline" color="#fff" size={18} />
              <Text style={styles.primaryBtnText}> Edit Role</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== CREATE/EDIT ROLE MODAL ===== */}
      <Modal
        visible={createEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalLarge}>
            <TouchableOpacity
              onPress={() => setCreateEditModalVisible(false)}
              style={styles.closeBtn}
            >
              <Icon name="close" size={24} color="#1e293b" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>
              {selectedRole ? 'Edit Role' : 'Create New Role'}
            </Text>
            <Text style={styles.modalSub}>
              {selectedRole
                ? 'Update role details and assignments'
                : 'Set up permissions and assign to employees'}
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* ===== ROLE NAME INPUT ===== */}
              <View style={styles.formSection}>
                <Text style={styles.label}>
                  Role Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  placeholder="e.g., Senior Executive, Manager"
                  placeholderTextColor="#d1d5db"
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  style={[styles.input, formErrors.name && styles.inputError]}
                />
                {formErrors.name && (
                  <Text style={styles.errorText}>{formErrors.name}</Text>
                )}
              </View>

              {/* ===== DESCRIPTION INPUT ===== */}
              <View style={styles.formSection}>
                <Text style={styles.label}>
                  Description <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  placeholder="e.g., Manages team and approves reports"
                  placeholderTextColor="#d1d5db"
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  multiline
                  numberOfLines={3}
                  style={[styles.input, styles.textAreaInput, formErrors.description && styles.inputError]}
                />
                {formErrors.description && (
                  <Text style={styles.errorText}>{formErrors.description}</Text>
                )}
              </View>

              {/* ===== PERMISSIONS SECTION ===== */}
              <View style={styles.formSection}>
                <Text style={styles.label}>
                  Permissions <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.sectionDescription}>
                  Select what this role can do
                </Text>
                
                {/* Select All Button */}
                <TouchableOpacity
                  style={styles.selectAllContainer}
                  onPress={toggleAllPermissions}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.selectAllCheckbox,
                    areAllPermissionsSelected() && styles.selectAllCheckboxActive,
                  ]}>
                    {areAllPermissionsSelected() && (
                      <Icon name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.selectAllText}>
                    {areAllPermissionsSelected() ? 'Deselect All Permissions' : 'Select All Permissions'}
                  </Text>
                  <Text style={styles.selectAllCount}>
                    ({formData.permissions.length}/{PERMISSIONS_LIST.length})
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.permissionsCard}>
                  {/* Group permissions by category */}
                  {[
                    'Dashboard', 'Properties', 'Users', 'Categories', 'Recent',
                    'Bought Property', 'Settings', 'Security', 'Reports & Complaints',
                    'Service Management', 'Enquiries', 'Roles', 'Employees',
                    'Employee Reports', 'Reports'
                  ].map((category) => {
                    const categoryPerms = PERMISSIONS_LIST.filter(p => p.category === category);
                    if (categoryPerms.length === 0) return null;
                    
                    const allCategorySelected = areCategoryPermissionsSelected(category);
                    const someCategorySelected = areSomeCategoryPermissionsSelected(category);
                    
                    return (
                      <View key={category} style={styles.categoryContainer}>
                        {/* Category Header with Select All Checkbox */}
                        <TouchableOpacity
                          style={styles.permissionCategoryHeader}
                          onPress={() => toggleCategoryPermissions(category)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.categoryHeaderLeft}>
                            <View style={[
                              styles.categoryCheckbox,
                              allCategorySelected && styles.categoryCheckboxActive,
                              someCategorySelected && !allCategorySelected && styles.categoryCheckboxPartial,
                            ]}>
                              {allCategorySelected && (
                                <Icon name="checkmark" size={14} color="#fff" />
                              )}
                              {someCategorySelected && !allCategorySelected && (
                                <Icon name="remove" size={14} color="#fff" />
                              )}
                            </View>
                            <Text style={styles.permissionCategoryTitle}>{category}</Text>
                          </View>
                          <Text style={styles.permissionCategoryCount}>
                            {categoryPerms.filter(p => isPermissionSelected(p.id)).length}/{categoryPerms.length}
                          </Text>
                        </TouchableOpacity>
                        {categoryPerms.map((permission) =>
                          renderPermissionCheckbox(permission)
                        )}
                      </View>
                    );
                  })}
                </View>
                {formErrors.permissions && (
                  <Text style={styles.errorText}>{formErrors.permissions}</Text>
                )}
              </View>

              <View style={styles.formSection} />
            </ScrollView>

            {/* ===== ACTION BUTTONS ===== */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { flex: 1 }]}
                onPress={() => setCreateEditModalVisible(false)}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, marginLeft: 12 }]}
                onPress={handleSubmitRole}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Icon name="checkmark-circle" color="#fff" size={18} />
                    <Text style={styles.primaryBtnText}>
                      {selectedRole ? ' Update' : ' Create'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

/* ============ STYLES ============ */

const styles = StyleSheet.create({
  /* Container */
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  /* Header */
  header: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },

  /* Search Bar */
  searchContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#1e293b',
  },

  /* List */
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },

  /* Role Card */
  roleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  roleDesc: {
    color: '#64748b',
    fontSize: 13,
  },
  permissionTags: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    minHeight: 28,
  },
  permTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  permTagText: {
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '500',
  },
  permTagMore: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  permTagMoreText: {
    color: '#92400e',
    fontSize: 11,
    fontWeight: '700',
  },
  noPermText: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dangerBtn: {
    backgroundColor: '#fef2f2',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  permCountBadge: {
    marginLeft: 'auto',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  permCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803d',
  },

  /* Permission Category Section */
  categoryContainer: {
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  permissionCategoryHeader: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  categoryCheckboxActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryCheckboxPartial: {
    backgroundColor: '#60a5fa',
    borderColor: '#60a5fa',
  },
  permissionCategoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  permissionCategoryCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  
  /* Select All Permissions */
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  selectAllCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginRight: 12,
  },
  selectAllCheckboxActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  selectAllText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e40af',
    flex: 1,
  },
  selectAllCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },

  /* Modal Overlay & Base */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSmall: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    maxHeight: '60%',
  },
  modalLarge: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    height: '95%',
    flexDirection: 'column',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 8,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },

  /* Scroll Content */
  scrollContent: {
    paddingBottom: 16,
  },

  /* Form Section */
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  required: {
    color: '#dc2626',
  },
  sectionDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },

  /* Input Field */
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f9fafb',
  },
  textAreaInput: {
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 6,
    fontWeight: '500',
  },

  /* Permissions Card */
  permissionsCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  permissionRowActive: {
    backgroundColor: '#f0fdf4',
  },
  permIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  permissionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  permissionLabelActive: {
    color: '#0f172a',
    fontWeight: '600',
  },

  /* Checkbox */
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },

  /* Employees Card */
  employeeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  assignedBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  assignedBadgeText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
  },
  employeesCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  employeeRowActive: {
    backgroundColor: '#f0fdf4',
  },
  employeeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  employeeEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },

  /* Permissions Section (Detail Modal) */
  permissionsSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginVertical: 12,
    maxHeight: 200,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  permItemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  permItemText: {
    fontSize: 11,
    color: '#0369a1',
    fontWeight: '500',
  },
  permItem: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
    lineHeight: 18,
  },

  /* Buttons */
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 0,
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryBtn: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#4b5563',
    fontWeight: '700',
    fontSize: 14,
  },
  closeText: {
    textAlign: 'center',
    marginTop: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
});

export default RoleManagementScreen;
