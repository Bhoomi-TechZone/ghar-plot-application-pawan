/**
 * CRM Enquiry Management API
 * Handles all enquiry related API calls
 */
import { CRM_BASE_URL, getCRMAuthHeaders, handleCRMResponse } from './crmAPI';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFCMToken } from '../../utils/fcmService';
import { showEmployeeNotificationPopup } from '../../services/EmployeePopupManager';

/**
 * Send scheduled FCM notification for reminder
 * Backend will schedule and send FCM notification at the specified time
 * This works even when app is killed/background!
 */
export const sendScheduledReminderNotification = async (reminderData) => {
  try {
    const headers = await getAuthHeaders();

    // Get FCM token for push notifications
    const fcmToken = await getFCMToken();

    if (!fcmToken) {
      console.warn('⚠️ No FCM token available for reminder notification');
    }

    // Extract date and time from scheduledDate
    const scheduledDate = new Date(reminderData.scheduledDate);
    const dateStr = scheduledDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const hours = String(scheduledDate.getHours()).padStart(2, '0');
    const minutes = String(scheduledDate.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`; // HH:MM

    // Map repeatType to repeatDaily boolean
    const repeatDaily = reminderData.repeatType === 'daily';

    // Backend API format: title, reason, date, time, repeatDaily, notificationType, fcmToken
    const notificationPayload = {
      title: `📌 Reminder: ${reminderData.clientName}`,
      reason: reminderData.message || `Follow up with ${reminderData.clientName}`,
      date: dateStr,
      time: timeStr,
      repeatDaily: repeatDaily,
      notificationType: 'reminder',
      fcmToken: fcmToken,
      // Additional data for handling
      data: {
        reminderId: reminderData.id,
        clientName: reminderData.clientName,
        clientEmail: reminderData.email,
        clientPhone: reminderData.phone,
        enquiryId: reminderData.enquiryId,
        repeatType: reminderData.repeatType || 'none',
      }
    };

    console.log('📤 Sending scheduled reminder to backend for FCM:', notificationPayload);

    // Use the same endpoint as alerts
    const response = await fetch(`${CRM_BASE_URL}/api/alert/schedule-notification`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(notificationPayload),
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (response.ok || data.success) {
        console.log('✅ Scheduled reminder notification sent to backend successfully');
        return { success: true, data };
      } else {
        console.warn('⚠️ Backend returned error:', data.message);
        return { success: false, error: data.message || 'Failed to send notification' };
      }
    } else {
      const errorText = await response.text();
      console.warn('⚠️ Backend returned non-JSON response:', errorText.substring(0, 100));
      return { success: false, error: 'Backend endpoint not available' };
    }
  } catch (error) {
    console.warn('⚠️ Error sending scheduled reminder notification:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send FCM notification for new enquiry to backend
 * Backend will handle sending notification to relevant users
 */
const sendEnquiryNotification = async (enquiryData) => {
  try {
    const headers = await getAuthHeaders();

    const notificationPayload = {
      type: 'enquiry',
      title: 'New Enquiry Created',
      message: `New enquiry from ${enquiryData.clientName || 'Unknown Client'}`,
      data: {
        clientName: enquiryData.clientName,
        contactNumber: enquiryData.contactNumber,
        ClientCode: enquiryData.ClientCode,
        s_No: enquiryData.s_No,
        notificationType: 'enquiry_created'
      }
    };

    const response = await fetch(`${CRM_BASE_URL}/api/notification/send`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(notificationPayload),
    });

    if (response.ok) {
      console.log('✅ Enquiry notification sent successfully');
    } else {
      console.warn('⚠️ Failed to send enquiry notification:', response.status);
    }
  } catch (error) {
    console.warn('⚠️ Error sending enquiry notification:', error.message);
    // Don't throw error - notification is secondary to enquiry creation
  }
};

// Get Auth Token with priority order
const getToken = async () => {
  const adminToken = await AsyncStorage.getItem('adminToken');
  const adminToken2 = await AsyncStorage.getItem('admin_token');
  const employeeToken = await AsyncStorage.getItem('employeeToken');
  const employeeToken2 = await AsyncStorage.getItem('employee_token');
  const employeeAuthToken = await AsyncStorage.getItem('employee_auth_token');
  const crmToken = await AsyncStorage.getItem('crm_auth_token');
  const genericToken = await AsyncStorage.getItem('token');

  return adminToken || adminToken2 || employeeToken || employeeToken2 || employeeAuthToken || crmToken || genericToken;
};

// Common Headers
const getAuthHeaders = async () => {
  const token = await getToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Get all manual enquiries
 */
export const getAllEnquiries = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/inquiry/all`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    const data = await handleCRMResponse(response);
    return {
      success: true,
      data: data.data || data,
      message: data.message || 'Manual enquiries fetched successfully'
    };
  } catch (error) {
    console.error('Error fetching manual enquiries:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch manual enquiries',
      data: []
    };
  }
};

/**
 * Get client/user enquiries
 */
export const getUserEnquiries = async () => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/api/inquiry/get-enquiries`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    const data = await handleCRMResponse(response);
    return {
      success: true,
      data: data.data || data,
      message: data.message || 'Enquiries fetched successfully'
    };
  } catch (error) {
    console.error('Error fetching user enquiries:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch user enquiries',
      data: []
    };
  }
};

/**
 * Fetch both client and manual enquiries in parallel
 */
export const getAllEnquiriesMerged = async () => {
  try {
    const [userResponse, manualResponse] = await Promise.allSettled([
      getUserEnquiries(),
      getAllEnquiries()
    ]);

    let mergedData = [];
    let stats = { total: 0, client: 0, manual: 0 };

    // Process user/client enquiries
    if (userResponse.status === 'fulfilled' && userResponse.value?.success) {
      const clientEnquiries = (userResponse.value.data || []).map(enquiry => {
        // Safely extract data from nested objects
        const buyerData = enquiry.buyerId || {};
        const propertyData = enquiry.propertyId || {};
        const assignmentData = enquiry.assignment || null;

        return {
          _id: enquiry._id,
          source: 'client',
          enquiryType: 'Inquiry',
          clientName: buyerData.fullName || enquiry.fullName || 'N/A',
          email: buyerData.email || enquiry.email || 'N/A',
          contactNumber: buyerData.phone || enquiry.contactNumber || 'N/A',
          propertyType: propertyData.propertyType || 'N/A',
          propertyLocation: propertyData.propertyLocation || 'N/A',
          price: propertyData.price || 'N/A',
          status: enquiry.status || 'new',
          createdAt: enquiry.createdAt,
          assignment: assignmentData ? {
            _id: assignmentData._id,
            employeeId: assignmentData.employeeId || null,
            assignedAt: assignmentData.assignedAt
          } : null,
          // Only include essential flat properties
          propertyId: enquiry.propertyId?._id || null,
          buyerId: enquiry.buyerId?._id || null,
          ownerId: enquiry.ownerId?._id || null,
          comments: enquiry.comments || [], // Add comments array
          majorComments: enquiry.majorComments || '', // Add majorComments
        };
      });
      mergedData = [...mergedData, ...clientEnquiries];
      stats.client = clientEnquiries.length;
    }

    // Process manual enquiries
    if (manualResponse.status === 'fulfilled' && manualResponse.value?.success) {
      const manualEnquiries = (manualResponse.value.data || []).map(enquiry => ({
        _id: enquiry._id,
        source: 'manual',
        enquiryType: 'ManualInquiry',
        clientName: enquiry.clientName || 'N/A',
        email: enquiry.email || 'N/A',
        contactNumber: enquiry.contactNumber || 'N/A',
        propertyType: enquiry.productType || enquiry.propertyType || 'N/A',
        propertyLocation: enquiry.location || 'N/A',
        price: 'N/A',
        status: enquiry.caseStatus || enquiry.status || 'new',
        createdAt: enquiry.createdAt,
        assignment: enquiry.assignment || null,
        // Manual enquiry specific fields
        s_No: enquiry.s_No,
        ClientCode: enquiry.ClientCode,
        ProjectCode: enquiry.ProjectCode,
        caseStatus: enquiry.caseStatus,
        source_detail: enquiry.source,
        majorComments: enquiry.majorComments,
        comments: enquiry.comments || [], // Add comments array
        address: enquiry.address,
        weekOrActionTaken: enquiry.weekOrActionTaken,
        actionPlan: enquiry.actionPlan,
        referenceBy: enquiry.referenceBy
      }));
      mergedData = [...mergedData, ...manualEnquiries];
      stats.manual = manualEnquiries.length;
    }

    stats.total = mergedData.length;

    return {
      success: true,
      data: mergedData,
      stats: stats
    };
  } catch (error) {
    console.error('Error fetching merged enquiries:', error);
    return {
      success: false,
      message: 'Failed to fetch enquiries',
      data: [],
      stats: { total: 0, client: 0, manual: 0 }
    };
  }
};

/**
 * Add manual enquiry
 */
export const addManualEnquiry = async (enquiryData) => {
  try {
    console.log('🚀 Starting manual enquiry creation...');
    console.log('📝 Form data:', JSON.stringify(enquiryData, null, 2));

    const headers = await getAuthHeaders();
    console.log('🔐 Auth headers:', JSON.stringify(headers, null, 2));

    const url = `${CRM_BASE_URL}/api/inquiry/create`;
    console.log('🌐 API URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(enquiryData),
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response statusText:', response.statusText);

    // Get response text first to see what we're getting
    const responseText = await response.text();
    console.log('📡 Response body:', responseText);

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Response was:', responseText.substring(0, 200));
      return {
        success: false,
        message: 'Server returned invalid response. Please check backend server.',
        data: null
      };
    }

    // Check if request was successful
    if (!response.ok) {
      console.error('❌ HTTP error:', response.status, data);
      return {
        success: false,
        message: data.message || data.error || `Server error: ${response.status}`,
        data: null
      };
    }

    console.log('✅ API Response data:', JSON.stringify(data, null, 2));

    // Send FCM notification after successful enquiry creation
    if (data.success !== false) {
      try {
        console.log('📤 Sending FCM notification for new enquiry...');
        await sendEnquiryNotification(enquiryData);
      } catch (notifError) {
        console.warn('⚠️ Failed to send enquiry notification:', notifError);
        // Don't fail the enquiry creation if notification fails
      }
    }

    return {
      success: data.success !== false, // Consider success if not explicitly false
      data: data.data || data,
      message: data.message || 'Enquiry created successfully'
    };
  } catch (error) {
    console.error('❌ Error adding manual enquiry:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    return {
      success: false,
      message: error.message || 'Failed to create manual inquiry',
      data: null
    };
  }
};

/**
 * Get available employees for assignment
 */
export const getAvailableEmployees = async () => {
  try {
    const adminToken = await AsyncStorage.getItem('adminToken');
    const response = await fetch(`${CRM_BASE_URL}/admin/leads/available-employees`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
    });

    const data = await handleCRMResponse(response);
    return {
      success: true,
      data: data.data || data,
      message: data.message || 'Employees fetched successfully'
    };
  } catch (error) {
    console.error('Error fetching available employees:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch available employees',
      data: []
    };
  }
};

/**
 * Get available roles for auto assignment
 */
export const getAvailableRoles = async () => {
  try {
    // Try multiple token keys for compatibility
    let adminToken = await AsyncStorage.getItem('adminToken');
    if (!adminToken) adminToken = await AsyncStorage.getItem('admin_token');
    if (!adminToken) adminToken = await AsyncStorage.getItem('crm_auth_token');
    if (!adminToken) adminToken = await AsyncStorage.getItem('token');

    if (!adminToken) {
      console.warn('No admin token found for getAvailableRoles');
      return { success: false, data: [], message: 'No admin token available' };
    }

    const response = await fetch(`${CRM_BASE_URL}/admin/roles`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
    });

    return await handleCRMResponse(response);
  } catch (error) {
    console.error('Error fetching available roles:', error);
    return { success: false, data: [], message: error.message || 'Failed to fetch roles' };
  }
};

/**
 * Assign enquiries to employee
 */
export const assignEnquiriesToEmployee = async (assignmentData) => {
  try {
    const adminToken = await AsyncStorage.getItem('adminToken');
    const response = await fetch(`${CRM_BASE_URL}/admin/leads/assign`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(assignmentData),
    });

    const data = await handleCRMResponse(response);
    return {
      success: true,
      data: data.data || data,
      message: data.message || 'Enquiries assigned successfully'
    };
  } catch (error) {
    console.error('Error assigning enquiries:', error);
    return {
      success: false,
      message: error.message || 'Failed to assign enquiries',
      data: null
    };
  }
};

/**
 * Unassign enquiry from employee
 */
export const unassignEnquiry = async (enquiryId, enquiryType) => {
  try {
    console.log('🔄 Unassigning enquiry:', enquiryId);

    const adminToken = await AsyncStorage.getItem('adminToken');

    // Try the new format first with enquiryIds array
    const response = await fetch(`${CRM_BASE_URL}/admin/leads/unassign`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        enquiryIds: [enquiryId], // Send as array
        enquiryType
      }),
    });

    const data = await handleCRMResponse(response);
    console.log('✅ Unassign response:', data);

    return data;
  } catch (error) {
    console.error('❌ Error unassigning enquiry:', error);
    throw error;
  }
};

/**
 * Create reminder for enquiry
 */
export const createReminder = async (reminderData) => {
  try {
    // Transform data to match new API format
    const transformedData = {
      title: reminderData.title || `Follow up with ${reminderData.clientName || reminderData.name}`,
      clientName: reminderData.clientName || reminderData.name,
      email: reminderData.email,
      phone: reminderData.phone,
      location: reminderData.location,
      reminderDateTime: reminderData.reminderDateTime || reminderData.scheduledDate,
      note: reminderData.note || reminderData.comment || reminderData.message,
      isRepeating: reminderData.isRepeating || (reminderData.repeatType && reminderData.repeatType !== 'none') || false
    };

    const response = await fetch(`${CRM_BASE_URL}/api/reminder/create`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(transformedData),
    });

    const data = await response.json();

    // ✅ Admin notification is already sent by the backend /api/reminder/create route
    // via sendAdminReminderNotification(). Do NOT call sendReminderToAdmin() here —
    // that would trigger a second FCM to admin causing duplicate notifications.
    if (data.success !== false) {
      console.log('✅ Reminder created — admin notified by backend automatically');
    }

    return {
      success: data.success !== false,
      message: data.message || 'Reminder created successfully',
      data: data.data || data
    };
  } catch (error) {
    console.error('Error creating reminder:', error);
    return {
      success: false,
      message: error.message || 'Failed to create reminder',
      data: null
    };
  }
};

/**
 * Get current employee profile to check popupEnabled
 */
const getCurrentEmployeeProfile = async () => {
  try {
    // Try employee-specific endpoint first
    const empResponse = await fetch(`${CRM_BASE_URL}/employee/profile`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    if (empResponse.ok) {
      const empData = await empResponse.json();
      if (empData.success) {
        console.log('✅ Got employee profile:', empData.data);
        return empData.data || empData;
      }
    }

    // Fallback: try general employee endpoint
    const empResponse2 = await fetch(`${CRM_BASE_URL}/employee/me`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    if (empResponse2.ok) {
      const empData2 = await empResponse2.json();
      if (empData2.success) {
        console.log('✅ Got employee profile from /me:', empData2.data);
        return empData2.data || empData2;
      }
    }

    // Last fallback: try admin endpoint (might work if employee has some admin access)
    const adminResponse = await fetch(`${CRM_BASE_URL}/admin/employees/me`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    if (adminResponse.ok) {
      const adminData = await adminResponse.json();
      if (adminData.success) {
        console.log('✅ Got employee profile from admin endpoint:', adminData.data);
        return adminData.data || adminData;
      }
    }

    console.warn('⚠️ Could not fetch employee profile from any endpoint');
    return null;
  } catch (error) {
    console.error('❌ Error fetching employee profile:', error);
    return null;
  }
};

/**
 * Send reminder notification to admin when employee has popupEnabled
 * Also sends to employees with giveAdminAccess=true and adminReminderPopupEnabled=true
 */
const sendReminderToAdmin = async (reminderData) => {
  try {
    console.log('📤 Sending admin reminder notification for employee reminder:', reminderData);

    // Get employee profile to include name
    const employeeProfile = await getCurrentEmployeeProfile();
    const employeeName = employeeProfile?.name || 'Employee';
    const employeeId = employeeProfile?._id || employeeProfile?.id || '';

    // Use the /admin/notifications endpoint with createAdminNotification API
    // This endpoint is specifically designed for sending FCM notifications to admin
    const notificationPayload = {
      title: `📋 ${employeeName} - Reminder: ${reminderData.clientName || 'Client'}`,
      message: `${employeeName} set reminder: ${reminderData.title || 'Follow up'}`,
      scheduledDate: reminderData.reminderDateTime || reminderData.scheduledDate,
      clientName: reminderData.clientName,
      phone: reminderData.phone,
      email: reminderData.email,
      enquiryId: reminderData.enquiryId,
      reminderTitle: reminderData.title,
      reminderNote: reminderData.note || reminderData.message,
      notificationType: 'employee_reminder_to_admin',
      repeatType: reminderData.repeatType || 'none',
      employeeName: employeeName,
      employeeId: employeeId,
      // Add FCM payload for push notification delivery
      fcmPayload: {
        notification: {
          title: `📋 ${employeeName} - Reminder`,
          body: `Client: ${reminderData.clientName || 'Client'} | ${reminderData.title || 'Follow up'}`,
        },
        data: {
          type: 'employee_reminder_to_admin',
          employeeName: employeeName,
          employeeId: String(employeeId),
          enquiryId: String(reminderData.enquiryId || ''),
          clientName: reminderData.clientName || '',
          reminderTitle: reminderData.title || '',
          reminderNote: reminderData.note || reminderData.message || '',
        },
      },
    };

    console.log('📤 Admin notification payload:', notificationPayload);

    // Use the dedicated /admin/notifications endpoint for admin FCM notifications
    const response = await fetch(`${CRM_BASE_URL}/admin/notifications`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(notificationPayload),
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    let adminResult = { success: false };
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (response.ok || data.success) {
        console.log('✅ Admin reminder notification sent successfully via /admin/notifications endpoint');
        adminResult = { success: true, data };

        // 🔥 DIRECT POPUP: Backend /admin/notifications only STORES notification, does NOT send FCM push.
        // So we trigger the popup directly on this device to show it immediately.
        try {
          console.log('🔔 Triggering local popup directly (backend does not send FCM)...');
          showEmployeeNotificationPopup({
            type: 'reminder',
            employeeName: employeeName,
            title: reminderData.title || 'Reminder',
            clientName: reminderData.clientName || 'Client',
          });
          console.log('✅ Local popup triggered successfully');
        } catch (popupErr) {
          console.warn('⚠️ Could not show local popup:', popupErr);
        }
      } else {
        console.warn('⚠️ Backend returned error for admin notification:', data.message);
        adminResult = { success: false, error: data.message || 'Failed to send admin notification' };
      }
    } else {
      const errorText = await response.text();
      console.warn('⚠️ Backend returned non-JSON response for admin notification:', errorText.substring(0, 100));
      adminResult = { success: false, error: 'Backend endpoint not available' };
    }

    // 🔥 REMOVED redundant loop: backend /admin/notifications ALREADY notifies sub-admins
    /*
    try {
      await sendReminderToAdminAccessEmployees(notificationPayload, employeeId);
    } catch (empError) {
      console.warn('⚠️ Error sending to admin-access employees:', empError);
    }
    */

    return adminResult;
  } catch (error) {
    console.warn('⚠️ Error sending admin notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send reminder notification to all employees who have giveAdminAccess=true and adminReminderPopupEnabled=true
 * This ensures employees with admin access also see the reminder popup
 */
const sendReminderToAdminAccessEmployees = async (notificationPayload, senderEmployeeId) => {
  try {
    console.log('📤 Sending reminder to admin-access employees...');

    const headers = await getAuthHeaders();

    // Fetch all employees to find those with giveAdminAccess=true
    // Try admin endpoint first, then employee endpoint
    let employees = [];

    try {
      const adminToken = await AsyncStorage.getItem('adminToken');
      const adminToken2 = await AsyncStorage.getItem('admin_token');
      const crmAdminToken = await AsyncStorage.getItem('crm_admin_token');

      const apiPath = (adminToken || adminToken2 || crmAdminToken) ? '/admin/employees' : '/api/employees';
      const empResponse = await fetch(`${CRM_BASE_URL}${apiPath}?limit=100`, {
        method: 'GET',
        headers,
      });

      if (empResponse.ok) {
        const empData = await empResponse.json();
        employees = empData.data || empData.employees || [];
      }
    } catch (fetchErr) {
      console.warn('⚠️ Could not fetch employees list:', fetchErr);
      return;
    }

    // Filter sub-admins who:
    //  1. have giveAdminAccess=true
    //  2. have the SENDER employee in their managedEmployees list
    //  3. have a valid FCM token
    //  4. are not the sender themselves
    const senderIdStr = senderEmployeeId ? String(senderEmployeeId) : null;
    const adminAccessEmployees = employees.filter(emp => {
      if (!emp.giveAdminAccess) return false;
      if (!emp.fcmToken || emp.fcmToken.length <= 10) return false;
      if (String(emp._id) === senderIdStr) return false;
      // KEY FIX: only notify sub-admins who have this employee in their managed list
      const managed = emp.managedEmployees || [];
      const managesThisEmployee = senderIdStr && managed.some(
        id => String(id) === senderIdStr
      );
      return managesThisEmployee;
    });

    console.log(`👥 Found ${adminAccessEmployees.length} managing sub-admin(s) to notify for employee ${senderIdStr}:`,
      adminAccessEmployees.map(e => e.name));

    if (adminAccessEmployees.length === 0) {
      console.log('ℹ️ No admin-access employees to notify');
      return;
    }

    // Send notification to each admin-access employee via /admin/notifications with their FCM token
    for (const emp of adminAccessEmployees) {
      try {
        console.log(`📤 Sending notification to employee: ${emp.name} (${emp._id})`);

        const empNotificationPayload = {
          ...notificationPayload,
          targetEmployeeId: emp._id,
          targetFcmToken: emp.fcmToken,
          sendToEmployee: true,
        };

        const empResponse = await fetch(`${CRM_BASE_URL}/admin/notifications`, {
          method: 'POST',
          headers,
          body: JSON.stringify(empNotificationPayload),
        });

        if (empResponse.ok) {
          console.log(`✅ Notification sent to ${emp.name}`);
        } else {
          console.warn(`⚠️ Failed to send notification to ${emp.name}`);
        }
      } catch (sendErr) {
        console.warn(`⚠️ Error sending to ${emp.name}:`, sendErr);
      }
    }

    console.log('📤 Finished sending to admin-access employees');
  } catch (error) {
    console.warn('⚠️ Error in sendReminderToAdminAccessEmployees:', error);
  }
};

/**
 * Send alert notification to admin when employee has popupEnabled
 * This is exported so it can be used from CreateAlertScreen
 */
export const sendAlertToAdmin = async (alertData) => {
  try {
    const notificationType = alertData.notificationType || 'employee_alert_to_admin';
    console.log(`📤 Sending admin alert notification (${notificationType}) for employee alert:`, alertData);

    // First check if employee has popup access enabled
    const employeeProfile = await getCurrentEmployeeProfile();

    if (!employeeProfile) {
      console.warn('⚠️ Could not fetch employee profile, skipping admin notification');
      return { success: false, error: 'Could not fetch employee profile' };
    }

    const employeeName = employeeProfile.name || 'Employee';
    const employeeId = employeeProfile._id || employeeProfile.id || '';

    // Check both possible field names - backend uses adminReminderPopupEnabled
    const isPopupEnabled =
      employeeProfile.adminReminderPopupEnabled === true ||
      employeeProfile.popupEnabled === true ||
      employeeProfile.adminPopupEnabled === true;

    console.log('👤 Employee popup status:', {
      name: employeeName,
      adminReminderPopupEnabled: employeeProfile.adminReminderPopupEnabled,
      popupEnabled: employeeProfile.popupEnabled,
      isPopupEnabled: isPopupEnabled
    });

    if (!isPopupEnabled) {
      console.log('🚫 Employee popup access not enabled, skipping admin notification');
      return { success: false, error: 'Popup access not enabled' };
    }

    console.log('🔔 Employee has popup access enabled, sending notification to admin...');

    // Use the /admin/notifications endpoint for admin FCM notifications
    const notificationPayload = {
      title: `🔔 ${employeeName} - Alert: ${alertData.title || 'Alert'}`,
      message: `${employeeName} created alert: ${alertData.reason || alertData.title || 'New alert'}`,
      scheduledDate: alertData.date,
      scheduledTime: alertData.time,
      alertTitle: alertData.title,
      alertReason: alertData.reason,
      notificationType: notificationType,
      repeatFrequency: alertData.repeatFrequency || 'none',
      employeeName: employeeName,
      employeeId: employeeId,
      // Add FCM payload for push notification delivery
      fcmPayload: {
        notification: {
          title: `🔔 ${employeeName} - Alert`,
          body: `${alertData.title || 'Alert'} | ${alertData.reason || 'New alert'}`,
        },
        data: {
          type: notificationType,
          employeeName: employeeName,
          employeeId: String(employeeId),
          alertTitle: alertData.title || '',
          alertReason: alertData.reason || '',
          scheduledDate: alertData.date || '',
          scheduledTime: alertData.time || '',
        },
      },
    };

    console.log('📤 Admin alert notification payload:', notificationPayload);

    const response = await fetch(`${CRM_BASE_URL}/admin/notifications`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(notificationPayload),
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    let adminResult = { success: false };
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (response.ok || data.success) {
        console.log('✅ Admin alert notification sent successfully');
        adminResult = { success: true, data };

        // 🔥 DIRECT POPUP: Backend /admin/notifications only STORES notification, does NOT send FCM push.
        // So we trigger the popup directly on this device to show it immediately.
        try {
          console.log('🔔 Triggering local popup directly (backend does not send FCM)...');
          
          // Determine if it should be Indigo (reminder) or Red (alert)
          const isReminder = 
            notificationType.toLowerCase().includes('reminder') || 
            (alertData.title && (alertData.title.toLowerCase().includes('reminder') || alertData.title.includes('रिमाइंडर'))) ||
            (alertData.reason && (alertData.reason.toLowerCase().includes('reminder') || alertData.reason.includes('रिमाइंडर')));

          showEmployeeNotificationPopup({
            type: isReminder ? 'reminder' : 'alert',
            employeeName: employeeName,
            title: alertData.title || (isReminder ? 'Reminder' : 'Alert'),
            reason: alertData.reason || (isReminder ? 'New Reminder' : 'New Alert'),
          });
          console.log(`✅ Local ${isReminder ? 'reminder' : 'alert'} popup triggered successfully`);
        } catch (popupErr) {
          console.warn('⚠️ Could not show local alert popup:', popupErr);
        }
      } else {
        console.warn('⚠️ Backend returned error for admin alert notification:', data.message);
        adminResult = { success: false, error: data.message || 'Failed to send admin notification' };
      }
    } else {
      const errorText = await response.text();
      console.warn('⚠️ Backend returned non-JSON response for admin alert notification:', errorText.substring(0, 100));
      adminResult = { success: false, error: 'Backend endpoint not available' };
    }

    // 🔥 REMOVED redundant loop: backend /admin/notifications ALREADY notifies sub-admins
    /*
    try {
      await sendReminderToAdminAccessEmployees(notificationPayload, employeeId);
    } catch (empError) {
      console.warn('⚠️ Error sending alert to admin-access employees:', empError);
    }
    */

    return adminResult;
  } catch (error) {
    console.warn('⚠️ Error sending admin alert notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create reminder from lead/enquiry with all details
 */
export const createReminderFromLead = async (reminderData) => {
  try {
    const response = await fetch(`${CRM_BASE_URL}/employee/reminders/create-from-lead`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(reminderData),
    });

    const data = await response.json();
    return {
      success: data.success !== false,
      message: data.message || 'Reminder created from lead successfully',
      data: data.data || data
    };
  } catch (error) {
    console.error('Error creating reminder from lead:', error);
    return {
      success: false,
      message: error.message || 'Failed to create reminder from lead',
      data: null
    };
  }
};

/**
 * Create follow-up for enquiry
 * Endpoint matching web: /employee/follow-ups/create
 */
export const createFollowUp = async (followUpData) => {
  try {
    console.log('📤 Creating follow-up with data:', followUpData);

    // Use the simpler createFollowUpFromLead endpoint instead
    const response = await fetch(`${CRM_BASE_URL}/api/follow-ups/create-from-lead`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(followUpData),
    });

    const data = await response.json();
    console.log('📥 Follow-up response:', data);
    console.log('📥 Response status:', response.status);
    console.log('📥 Response success:', data.success);

    return {
      success: data.success !== false,
      message: data.message || 'Follow-up created successfully',
      data: data.data || data
    };
  } catch (error) {
    console.error('Error creating follow-up:', error);
    return {
      success: false,
      message: error.message || 'Failed to create follow-up',
      data: null
    };
  }
};

/**
 * Get reminders for a specific enquiry by client info
 */
export const getEnquiryReminders = async (enquiry) => {
  try {
    const headers = await getAuthHeaders();

    // Try multiple approaches to find reminders
    let reminders = [];

    const enquiryId = enquiry._id || enquiry;
    const clientName = typeof enquiry === 'object' ? enquiry.clientName : null;
    const phone = typeof enquiry === 'object' ? enquiry.contactNumber : null;

    console.log('🔍 ===== SEARCHING REMINDERS =====');
    console.log('🔍 Enquiry ID:', enquiryId);
    console.log('🔍 Client Name:', clientName);
    console.log('🔍 Phone:', phone);

    // Try admin endpoint first (for admin users)
    console.log('🔍 Trying admin reminders endpoint...');
    let response = await fetch(`${CRM_BASE_URL}/admin/reminders/due-all`, {
      method: 'GET',
      headers,
      timeout: 15000
    });

    let contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      let data = await response.json();
      console.log('📊 Admin API Response:', data.success, 'Total reminders:', data.data?.length || 0);

      if (data.success && data.data && data.data.length > 0) {
        // Filter by client name or phone
        reminders = data.data.filter(reminder => {
          const matchName = clientName && reminder.clientName === clientName;
          const matchPhone = phone && reminder.phone === phone;
          const matchContact = phone && reminder.contactNumber === phone;

          if (matchName || matchPhone || matchContact) {
            console.log('✓ Match found:', {
              clientName: reminder.clientName,
              phone: reminder.phone,
              contactNumber: reminder.contactNumber,
              note: reminder.note
            });
          }

          return matchName || matchPhone || matchContact;
        });

        console.log('✅ Filtered admin reminders:', reminders.length);

        if (reminders.length > 0) {
          reminders.forEach((r, i) => {
            console.log(`  Reminder ${i + 1}:`, {
              date: r.reminderDateTime,
              note: r.note,
              comment: r.comment,
              status: r.status
            });
          });

          return {
            success: true,
            data: reminders,
            message: 'Reminders fetched successfully'
          };
        }
      }
    }

    // Fallback: Try employee endpoint
    console.log('🔍 Trying employee reminders endpoint...');
    response = await fetch(`${CRM_BASE_URL}/employee/reminders`, {
      method: 'GET',
      headers,
      timeout: 10000
    });

    contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      let data = await response.json();
      console.log('📊 Employee API Response:', data.success, 'Total reminders:', data.data?.length || 0);

      if (data.success && data.data && data.data.length > 0) {
        // Filter reminders by client name or phone
        reminders = data.data.filter(reminder => {
          const matchName = clientName && reminder.clientName === clientName;
          const matchPhone = phone && (reminder.phone === phone || reminder.contactNumber === phone);

          if (matchName || matchPhone) {
            console.log('✓ Match found in employee API:', {
              clientName: reminder.clientName,
              phone: reminder.phone,
              note: reminder.note
            });
          }

          return matchName || matchPhone;
        });

        console.log('✅ Filtered employee reminders:', reminders.length);

        if (reminders.length > 0) {
          reminders.forEach((r, i) => {
            console.log(`  Reminder ${i + 1}:`, {
              date: r.reminderDateTime,
              note: r.note,
              status: r.status
            });
          });

          return {
            success: true,
            data: reminders,
            message: 'Reminders fetched successfully'
          };
        }
      }
    }

    console.log('⚠️ No reminders found in any endpoint');
    console.log('===== END SEARCHING REMINDERS =====');
    return {
      success: true,
      data: [],
      message: 'No reminders found'
    };
  } catch (error) {
    console.error('❌ Error fetching reminders:', error.message);
    return {
      success: true,
      data: [],
      message: 'Reminders not available'
    };
  }
};

/**
 * Get detailed enquiry by ID with populated reminders and followUps
 * @param {string} enquiryId - The enquiry ID
 * @param {string} source - 'client' or 'manual'
 * @returns {Promise<Object>} - Enquiry with full details
 */
export const getEnquiryDetails = async (enquiryId, source = 'manual') => {
  try {
    const headers = await getAuthHeaders();

    // Choose endpoint based on source
    const endpoint = source === 'client'
      ? `${CRM_BASE_URL}/api/enquiry/${enquiryId}?populate=reminders,followUps`
      : `${CRM_BASE_URL}/api/manual-enquiry/${enquiryId}?populate=reminders,followUps`;

    console.log('📋 Fetching enquiry details from:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
      timeout: 10000
    });

    // Check content type before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('⚠️ Server returned non-JSON response - endpoint may not be available');
      // Return basic success with empty data instead of throwing error
      return {
        success: true,
        data: null,
        message: 'Details not available'
      };
    }

    const data = await response.json();

    if (!response.ok) {
      console.warn('⚠️ Server returned error:', response.status);
      // Return success with null data instead of failing
      return {
        success: true,
        data: null,
        message: 'Details not available'
      };
    }

    console.log('✅ Enquiry details fetched successfully');
    return {
      success: true,
      data: data.data || data,
      message: 'Enquiry details fetched successfully'
    };
  } catch (error) {
    console.warn('⚠️ Could not fetch enquiry details:', error.message);

    // Return success with null data - don't show error to user
    return {
      success: true,
      data: null,
      message: 'Details not available'
    };
  }
};

export default {
  getAllEnquiries,
  getUserEnquiries,
  getAllEnquiriesMerged,
  addManualEnquiry,
  getAvailableEmployees,
  getAvailableRoles,
  assignEnquiriesToEmployee,
  unassignEnquiry,
  createReminder,
  createReminderFromLead,
  createFollowUp,
  getEnquiryDetails,
  getEnquiryReminders,
  sendScheduledReminderNotification,
};
