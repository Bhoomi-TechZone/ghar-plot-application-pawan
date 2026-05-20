/**
 * Assignment Service
 * Re-exports from crmEnquiryApi for backward compatibility
 */

// Re-export assignment-related functions from the new integrated API
export {
  getAvailableEmployees,
  getAvailableRoles,
  assignEnquiriesToEmployee,
  unassignEnquiry
} from './crmEnquiryApi';

// Default export for backward compatibility
import { 
  getAvailableEmployees,
  getAvailableRoles,
  assignEnquiriesToEmployee,
  unassignEnquiry
} from './crmEnquiryApi';

export default {
  getAvailableEmployees,
  getAvailableRoles,
  assignEnquiriesToEmployee,
  unassignEnquiry
};