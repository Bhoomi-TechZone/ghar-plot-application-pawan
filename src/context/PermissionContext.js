/**
 * PermissionContext.js
 * Central permission management for employee role-based access control
 * 
 * This context provides:
 * - Employee authentication state
 * - Permission checking functions (hasPermission, hasAnyPermission, hasRole)
 * - Navigation filtering based on permissions
 * 
 * Usage:
 * 1. Wrap your app with PermissionProvider
 * 2. Use usePermissions() hook to access permission functions
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create the context
const PermissionContext = createContext(null);

// Custom hook to use permissions
export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

// Module names that match backend
export const MODULES = {
  DASHBOARD: 'dashboard',
  PROPERTIES: 'properties',
  USERS: 'users',
  CATEGORIES: 'categories',
  RECENT: 'recent',
  BOUGHT_PROPERTY: 'bought-property',
  SERVICE_MANAGEMENT: 'service-management',
  ENQUIRIES: 'enquiries',
  LEADS: 'leads',
  CLIENT_LEADS: 'client-leads',
  FOLLOW_UPS: 'follow-ups',
  REMINDERS: 'reminders',
  REPORTS_COMPLAINTS: 'reports-complaints',
  ROLES: 'roles',
  EMPLOYEES: 'employees',
  SETTINGS: 'settings',
  SECURITY: 'security',
  EMPLOYEE_REPORTS: 'employee_reports',
  REPORTS: 'reports',
  ALERTS: 'alerts',
};

// Action types
export const ACTIONS = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  ASSIGN: 'assign',
};

// Permission Provider Component
export const PermissionProvider = ({ children }) => {
  const [employee, setEmployee] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Check if user is authenticated and load permissions
  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      
      // Check for admin token first
      const adminToken = await AsyncStorage.getItem('adminToken') || 
                         await AsyncStorage.getItem('admin_token') ||
                         await AsyncStorage.getItem('crm_auth_token');
      
      if (adminToken) {
        setIsAdmin(true);
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }

      // Check for employee token
      const employeeToken = await AsyncStorage.getItem('employee_token') || 
                           await AsyncStorage.getItem('employeeToken') ||
                           await AsyncStorage.getItem('employee_auth_token');
      
      if (employeeToken) {
        // Get employee data
        const employeeDataStr = await AsyncStorage.getItem('employee_user');
        if (employeeDataStr) {
          const employeeData = JSON.parse(employeeDataStr);
          setEmployee(employeeData);
          
          // Extract permissions from role OR from separate storage
          let loadedPermissions = [];
          
          if (employeeData.role && employeeData.role.permissions) {
            loadedPermissions = employeeData.role.permissions;
          } else {
            // Try loading from separate permissions storage
            const permissionsStr = await AsyncStorage.getItem('employee_permissions');
            if (permissionsStr) {
              loadedPermissions = JSON.parse(permissionsStr);
            }
          }
          
          setPermissions(loadedPermissions);
          console.log('📋 Employee permissions loaded:', loadedPermissions);
          console.log('📋 Permissions count:', loadedPermissions.length);
          
          setIsAuthenticated(true);
          setIsAdmin(false);
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Login function - call this after successful login
  const login = async (employeeData, token) => {
    try {
      await AsyncStorage.setItem('employee_token', token);
      await AsyncStorage.setItem('employeeToken', token);
      await AsyncStorage.setItem('employee_user', JSON.stringify(employeeData));
      await AsyncStorage.setItem('userType', 'employee');
      
      setEmployee(employeeData);
      if (employeeData.role && employeeData.role.permissions) {
        setPermissions(employeeData.role.permissions);
      }
      setIsAuthenticated(true);
      setIsAdmin(false);
    } catch (error) {
      console.error('Error during login:', error);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'employee_token',
        'employeeToken',
        'employee_auth_token',
        'employee_user',
        'employee_profile',
        'employee_permissions',
        'adminToken',
        'admin_token',
        'crm_auth_token',
        'userType',
      ]);
      
      setEmployee(null);
      setPermissions([]);
      setIsAuthenticated(false);
      setIsAdmin(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  /**
   * Check if employee has permission for a specific module and action
   * @param {string} module - Module name (e.g., 'leads', 'reminders')
   * @param {string} action - Action type (e.g., 'read', 'create', 'update', 'delete')
   * @returns {boolean}
   */
  const hasPermission = useCallback((module, action = 'read') => {
    // Admin has all permissions
    if (isAdmin) {
      console.log(`🔓 hasPermission(${module}, ${action}): TRUE (Admin)`);
      return true;
    }

    // NOTE: giveAdminAccess flag is ignored - only actual role permissions matter
    // This ensures employees only see screens assigned in their role

    // Not authenticated
    if (!isAuthenticated || !permissions || !Array.isArray(permissions)) {
      console.log(`🔒 hasPermission(${module}, ${action}): FALSE (Not authenticated or no permissions)`);
      console.log(`   isAuthenticated: ${isAuthenticated}, permissions: ${JSON.stringify(permissions)}`);
      return false;
    }

    // Find module permission
    const modulePermission = permissions.find(perm => perm.module === module);
    
    // Check if action is included
    const hasAccess = modulePermission && 
           Array.isArray(modulePermission.actions) && 
           modulePermission.actions.includes(action);
    
    console.log(`${hasAccess ? '🔓' : '🔒'} hasPermission(${module}, ${action}): ${hasAccess ? 'TRUE' : 'FALSE'}`);
    if (!hasAccess && modulePermission) {
      console.log(`   Module found but action "${action}" not in [${modulePermission.actions?.join(', ')}]`);
    } else if (!modulePermission) {
      console.log(`   Module "${module}" not found in permissions`);
    }
    
    return hasAccess;
  }, [isAdmin, isAuthenticated, permissions, employee]);

  /**
   * Check if employee has ANY of the required permissions
   * @param {Array<{module: string, action: string}>} requiredPermissions 
   * @returns {boolean}
   */
  const hasAnyPermission = useCallback((requiredPermissions) => {
    if (!Array.isArray(requiredPermissions)) return false;
    
    return requiredPermissions.some(required => 
      hasPermission(required.module, required.action)
    );
  }, [hasPermission]);

  /**
   * Check if employee has ALL of the required permissions
   * @param {Array<{module: string, action: string}>} requiredPermissions 
   * @returns {boolean}
   */
  const hasAllPermissions = useCallback((requiredPermissions) => {
    if (!Array.isArray(requiredPermissions)) return false;
    
    return requiredPermissions.every(required => 
      hasPermission(required.module, required.action)
    );
  }, [hasPermission]);

  /**
   * Check if employee has a specific role
   * @param {string} roleName 
   * @returns {boolean}
   */
  const hasRole = useCallback((roleName) => {
    if (isAdmin) return true;
    return employee?.role?.name?.toLowerCase() === roleName.toLowerCase();
  }, [isAdmin, employee]);

  /**
   * Get accessible navigation items based on permissions
   * @returns {Array} Filtered navigation items
   */
  const getAccessibleNavItems = useCallback(() => {
    const navItems = [
      { 
        name: 'Dashboard', 
        route: 'DashboardTab',
        icon: 'speedometer-outline',
        requiredPermission: { module: MODULES.DASHBOARD, action: ACTIONS.READ }
      },
      { 
        name: 'Leads', 
        route: 'LeadsTab',
        icon: 'people-outline',
        requiredPermission: { module: MODULES.LEADS, action: ACTIONS.READ }
      },
      { 
        name: 'Reminders', 
        route: 'RemindersTab',
        icon: 'notifications-outline',
        requiredPermission: { module: MODULES.REMINDERS, action: ACTIONS.READ }
      },
      { 
        name: 'FollowUps', 
        route: 'FollowUpsTab',
        icon: 'calendar-outline',
        requiredPermission: { module: MODULES.FOLLOW_UPS, action: ACTIONS.READ }
      },
      { 
        name: 'Alerts', 
        route: 'AlertsTab',
        icon: 'warning-outline',
        requiredPermission: { module: MODULES.ALERTS, action: ACTIONS.READ }
      },
      { 
        name: 'Enquiries', 
        route: 'EnquiriesTab',
        icon: 'mail-outline',
        requiredPermission: { module: MODULES.ENQUIRIES, action: ACTIONS.READ }
      },
      { 
        name: 'Properties', 
        route: 'PropertiesTab',
        icon: 'home-outline',
        requiredPermission: { module: MODULES.PROPERTIES, action: ACTIONS.READ }
      },
      { 
        name: 'Employees', 
        route: 'EmployeesTab',
        icon: 'briefcase-outline',
        requiredPermission: { module: MODULES.EMPLOYEES, action: ACTIONS.READ }
      },
      { 
        name: 'Roles', 
        route: 'RolesTab',
        icon: 'key-outline',
        requiredPermission: { module: MODULES.ROLES, action: ACTIONS.READ }
      },
    ];

    return navItems.filter(item => 
      hasPermission(item.requiredPermission.module, item.requiredPermission.action)
    );
  }, [hasPermission]);

  /**
   * canAccess - Similar to web's canAccess function
   * Used in navigation/sidebar to show/hide menu items
   */
  const canAccess = useCallback((module, action = 'read') => {
    // Admin can see everything
    if (isAdmin) {
      return true;
    }
    
    // NOTE: giveAdminAccess flag is ignored - only actual role permissions matter
    
    // Not authenticated - hide everything
    if (!isAuthenticated || !employee) {
      return false;
    }
    
    // Check employee permissions from role
    return hasPermission(module, action);
  }, [isAdmin, isAuthenticated, employee, hasPermission]);

  // Refresh permissions from storage
  const refreshPermissions = async () => {
    await checkAuthStatus();
  };

  // Context value
  const value = {
    // State
    employee,
    permissions,
    loading,
    isAuthenticated,
    isAdmin,
    
    // Auth functions
    login,
    logout,
    refreshPermissions,
    checkAuthStatus,
    
    // Permission checking functions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    canAccess,
    
    // Navigation helpers
    getAccessibleNavItems,
    
    // Constants
    MODULES,
    ACTIONS,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export default PermissionContext;
