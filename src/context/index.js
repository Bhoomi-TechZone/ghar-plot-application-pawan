/**
 * Permission System - Index File
 * 
 * Export all permission-related components and hooks from a single location.
 * 
 * Usage:
 * import { 
 *   usePermissions, 
 *   PermissionGate, 
 *   PermissionProtectedScreen,
 *   MODULES,
 *   ACTIONS
 * } from '../context';
 */

// Permission Context and Provider
export {
  default as PermissionContext,
  PermissionProvider,
  usePermissions,
  MODULES,
  ACTIONS,
} from './PermissionContext';
