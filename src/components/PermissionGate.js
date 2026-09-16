/**
 * PermissionGate.js
 * 
 * A component for conditional rendering based on permissions.
 * Use this to show/hide buttons, sections, or any UI element based on permissions.
 * 
 * Usage Examples:
 * 
 * 1. Hide a button if no create permission:
 * <PermissionGate module="leads" action="create">
 *   <TouchableOpacity onPress={handleAddLead}>
 *     <Text>Add Lead</Text>
 *   </TouchableOpacity>
 * </PermissionGate>
 * 
 * 2. Show fallback content:
 * <PermissionGate 
 *   module="leads" 
 *   action="delete"
 *   fallback={<Text>You cannot delete leads</Text>}
 * >
 *   <DeleteButton />
 * </PermissionGate>
 * 
 * 3. Check multiple permissions (any):
 * <PermissionGate 
 *   permissions={[
 *     { module: 'leads', action: 'update' },
 *     { module: 'leads', action: 'delete' },
 *   ]}
 *   requireAll={false}
 * >
 *   <EditDeleteButtons />
 * </PermissionGate>
 */

import React from 'react';
import { usePermissions } from '../context/PermissionContext';

/**
 * PermissionGate Component
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render if permission granted
 * @param {string} props.module - Module name for single permission check
 * @param {string} props.action - Action type for single permission check (default: 'read')
 * @param {Array<{module: string, action: string}>} props.permissions - Multiple permissions to check
 * @param {boolean} props.requireAll - If true, all permissions required; if false, any one is enough
 * @param {React.ReactNode} props.fallback - Content to render if permission denied
 * @param {Array<string>} props.allowedRoles - Array of allowed role names
 */
const PermissionGate = ({
  children,
  module,
  action = 'read',
  permissions = [],
  requireAll = false,
  fallback = null,
  allowedRoles = [],
}) => {
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions, 
    hasRole,
    isAdmin,
  } = usePermissions();

  // Admin has full access
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check role-based access if allowedRoles specified
  if (allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => hasRole(role));
    if (!hasAllowedRole) {
      return <>{fallback}</>;
    }
  }

  // If multiple permissions provided
  if (permissions.length > 0) {
    const hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
    
    return hasAccess ? <>{children}</> : <>{fallback}</>;
  }

  // Single permission check
  if (module) {
    const hasAccess = hasPermission(module, action);
    return hasAccess ? <>{children}</> : <>{fallback}</>;
  }

  // No permission requirements - render children
  return <>{children}</>;
};

/**
 * useCanAccess Hook
 * 
 * A hook to check permission access imperatively
 * 
 * Usage:
 * const canCreateLead = useCanAccess('leads', 'create');
 * const canEditOrDelete = useCanAccess(['leads:update', 'leads:delete'], { any: true });
 */
export const useCanAccess = (module, action = 'read') => {
  const { hasPermission, isAdmin } = usePermissions();
  
  if (isAdmin) return true;
  return hasPermission(module, action);
};

/**
 * usePermissionCheck Hook
 * 
 * A hook that returns multiple permission checks at once
 * 
 * Usage:
 * const { canRead, canCreate, canUpdate, canDelete } = usePermissionCheck('leads');
 */
export const usePermissionCheck = (module) => {
  const { hasPermission, isAdmin } = usePermissions();
  
  if (isAdmin) {
    return {
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canAssign: true,
    };
  }
  
  return {
    canRead: hasPermission(module, 'read'),
    canCreate: hasPermission(module, 'create'),
    canUpdate: hasPermission(module, 'update'),
    canDelete: hasPermission(module, 'delete'),
    canAssign: hasPermission(module, 'assign'),
  };
};

export default PermissionGate;
