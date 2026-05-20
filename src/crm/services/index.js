/**
 * CRM Services Index
 * Central export point for all CRM API services
 * Total: 118 Admin Panel APIs
 */

// Base API configuration
export { CRM_BASE_URL, OTP_BASE_URL, getCRMAuthHeaders, handleCRMResponse, buildQueryString } from './crmAPI';

// Authentication APIs (3)
export * from './crmAuthApi';

// User Management APIs (9)
export * from './crmUserManagementApi';

// Employee Management APIs (10)
export * from './crmEmployeeApi';

// User Assignment APIs (6)
export * from './crmAssignmentApi';

// Leads Management APIs (9)
export * from './crmLeadsApi';

// Property Management APIs (20)
export * from './crmPropertyApi';

// Enquiry Management APIs (3)
export * from './crmEnquiryApi';

// Reminder Management APIs (18)
export * from './crmReminderApi';

// Alert Management APIs (17)
export * from './crmAlertApi';

// Role Management APIs (8)
export * from './crmRoleApi';

// Dashboard & Analytics APIs (3)
export * from './crmDashboardApi';

// Service Management APIs (4)
export * from './crmServiceApi';

// Category Management APIs (4)
export * from './crmCategoryApi';

// USP Management APIs (5)
export * from './crmUSPApi';
