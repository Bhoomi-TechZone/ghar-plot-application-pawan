/**
 * Enquiry Service - Backend Integrated
 * Re-exports from crmEnquiryApi for backward compatibility
 */

// Re-export selected functions from the new integrated API
export {
  getUserEnquiries,
  getAllEnquiries,
  addManualEnquiry,
  addManualEnquiry as createManualEnquiry, // Backward compatibility alias
  getAvailableEmployees,
  getAvailableRoles,
  assignEnquiriesToEmployee,
  unassignEnquiry,
  createReminder,
  createFollowUp,
  getAllEnquiriesMerged
} from './crmEnquiryApi';

// Default export for backward compatibility
import crmEnquiryApi from './crmEnquiryApi';
export default crmEnquiryApi;
