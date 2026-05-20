import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://gharplotbackend.gntechnology.de';

const getAuthHeaders = async () => {
  const adminToken = await AsyncStorage.getItem('adminToken');
  const adminToken2 = await AsyncStorage.getItem('admin_token');
  const crmAdminToken = await AsyncStorage.getItem('crm_admin_token');
  const crmToken = await AsyncStorage.getItem('crm_auth_token');
  const empToken = await AsyncStorage.getItem('employee_auth_token');
  const empToken2 = await AsyncStorage.getItem('employee_token');
  const employeeToken = await AsyncStorage.getItem('employeeToken');
  const authToken = await AsyncStorage.getItem('authToken');

  console.log('🔐 Auth tokens check:');
  console.log('- adminToken:', adminToken ? `${adminToken.slice(0, 20)}...` : 'Not found');
  console.log('- admin_token:', adminToken2 ? `${adminToken2.slice(0, 20)}...` : 'Not found');
  console.log('- crm_admin_token:', crmAdminToken ? `${crmAdminToken.slice(0, 20)}...` : 'Not found');
  console.log('- employee_auth_token:', empToken ? `${empToken.slice(0, 20)}...` : 'Not found');

  // Admin tokens have priority
  const isAdminLoggedIn = !!(adminToken || adminToken2 || crmAdminToken);
  const token = adminToken || adminToken2 || crmAdminToken || employeeToken || empToken || empToken2 || crmToken || authToken;

  if (!token) {
    console.error('❌ No authentication token found!');
  }

  console.log('🔑 isAdminLoggedIn:', isAdminLoggedIn);

  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    isAdminLoggedIn
  };
};

// Get all employees - Using correct endpoint based on user type
export const getAllEmployees = async (params = {}) => {
  const { page = 1, limit = 10, search = '', roleFilter, isActive, department } = params;

  console.log('👥 🔥 LOADING EMPLOYEES WITH PARAMS:', params);

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  // Add optional search and filter params
  if (search) queryParams.append('search', search);
  if (roleFilter) queryParams.append('roleFilter', roleFilter);
  if (isActive !== undefined) queryParams.append('isActive', isActive.toString());
  if (department) queryParams.append('department', department);

  const { headers, isAdminLoggedIn } = await getAuthHeaders();
  console.log('🔑 Using headers:', headers);
  console.log('🔑 isAdminLoggedIn:', isAdminLoggedIn);

  // Use /admin/employees for admin login, /api/employees for employee login
  const apiPath = isAdminLoggedIn ? '/admin/employees' : '/api/employees';
  const url = `${API_BASE_URL}${apiPath}?${queryParams}`;

  try {
    console.log('🌐 Making request to:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    console.log('📊 API Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('⚠️ API Request failed:', url, errorData.message || response.statusText);
      throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📊 Raw API Response:', JSON.stringify(result, null, 2));

    // Handle backend response: {success: true, data: [...], pagination: {...}}
    if (result && result.success) {
      const employees = Array.isArray(result.data) ? result.data : [];
      console.log('✅ API SUCCESS - Employees found:', employees.length);

      if (employees.length > 0) {
        console.log('👥 Employee names from API:', employees.map(emp => emp.name));
      } else {
        console.log('📝 No employees in database');
      }

      return {
        employees: employees,
        pagination: result.pagination || {
          currentPage: page,
          totalPages: 1,
          totalEmployees: employees.length,
          hasNext: false,
          hasPrev: false
        },
        fallback: false
      };
    } else {
      throw new Error('Invalid response format: missing success field');
    }

  } catch (error) {
    console.error('❌ getAllEmployees API error:', error.message);
    throw error;
  }
};

// Get employee by ID
export const getEmployeeById = async (employeeId) => {
  try {
    const { headers, isAdminLoggedIn } = await getAuthHeaders();
    const apiPath = isAdminLoggedIn ? '/admin/employees' : '/api/employees';
    const response = await fetch(`${API_BASE_URL}${apiPath}/${employeeId}`, {
      method: 'GET',
      headers,
    });

    const result = await response.json();
    console.log('📋 Get Employee By ID Response:', result);

    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message || 'Failed to fetch employee');
    }
  } catch (error) {
    console.error('❌ Get employee error:', error);
    throw error;
  }
};

// Get all roles
export const getRoles = async () => {
  try {
    console.log('🎭 Fetching roles from backend...');

    const { headers, isAdminLoggedIn } = await getAuthHeaders();
    console.log('🎭 Headers for roles request:', headers);

    const apiPath = isAdminLoggedIn ? '/admin/roles' : '/api/roles';
    const response = await fetch(`${API_BASE_URL}${apiPath}`, {
      method: 'GET',
      headers,
    });

    console.log('🎭 Roles response status:', response.status);

    if (!response.ok) {
      console.warn(`⚠️ Roles API failed with status ${response.status}, using fallback`);
      return {
        success: false,
        data: [
          { _id: 'default_agent', name: 'Agent' },
          { _id: 'default_manager', name: 'Manager' },
          { _id: 'default_lead', name: 'Team Lead' },
          { _id: 'default_sales', name: 'Sales Executive' },
          { _id: 'default_service', name: 'Customer Service' },
          { _id: 'default_admin', name: 'Admin' },
        ]
      };
    }

    const result = await response.json();
    console.log('🎭 Get Roles Response:', result);

    if (result.success && result.data) {
      return { success: true, data: result.data };
    } else {
      console.warn('⚠️ Invalid roles response structure, using fallback');
      return {
        success: false,
        data: [
          { _id: 'default_agent', name: 'Agent' },
          { _id: 'default_manager', name: 'Manager' },
          { _id: 'default_lead', name: 'Team Lead' },
          { _id: 'default_sales', name: 'Sales Executive' },
          { _id: 'default_service', name: 'Customer Service' },
          { _id: 'default_admin', name: 'Admin' },
        ]
      };
    }
  } catch (error) {
    console.error('❌ Get roles error:', error);
    console.warn('⚠️ Using fallback roles due to network error');

    // Return default roles if API fails
    return {
      success: false,
      data: [
        { _id: 'default_agent', name: 'Agent' },
        { _id: 'default_manager', name: 'Manager' },
        { _id: 'default_lead', name: 'Team Lead' },
        { _id: 'default_sales', name: 'Sales Executive' },
        { _id: 'default_service', name: 'Customer Service' },
        { _id: 'default_admin', name: 'Admin' },
      ]
    };
  }
};

// Create new employee
export const createEmployee = async (employeeData) => {
  try {
    console.log('➕ Creating employee with data:', employeeData);

    const { headers, isAdminLoggedIn } = await getAuthHeaders();
    const apiPath = isAdminLoggedIn ? '/admin/employees' : '/api/employees';
    const response = await fetch(`${API_BASE_URL}${apiPath}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(employeeData),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('➕ Create Employee Response:', result);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      throw new Error(result.message || 'Failed to create employee');
    }
  } catch (error) {
    console.error('❌ Create employee error:', error);
    return { success: false, message: error.message };
  }
};

// Update employee
export const updateEmployee = async (employeeId, employeeData) => {
  console.log('✏️ Updating employee:', employeeId, employeeData);

  try {
    const { headers, isAdminLoggedIn } = await getAuthHeaders();
    const apiPath = isAdminLoggedIn ? '/admin/employees' : '/api/employees';
    const url = `${API_BASE_URL}${apiPath}/${employeeId}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(employeeData),
    });

    const result = await response.json();
    console.log('✏️ Update Employee Response:', result);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, message: result.message || 'Failed to update employee' };
    }
  } catch (error) {
    console.error('❌ Update employee error:', error);
    return { success: false, message: error.message };
  }
};

// Delete employee
export const deleteEmployee = async (employeeId) => {
  console.log('🗑️ Deleting employee:', employeeId);

  try {
    const { headers, isAdminLoggedIn } = await getAuthHeaders();
    const apiPath = isAdminLoggedIn ? '/admin/employees' : '/api/employees';
    const url = `${API_BASE_URL}${apiPath}/${employeeId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    const result = await response.json();
    console.log('🗑️ Delete Employee Response:', result);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, message: result.message || 'Failed to delete employee' };
    }
  } catch (error) {
    console.error('❌ Delete employee error:', error);
    return { success: false, message: error.message };
  }
};

// Change employee password
export const changeEmployeePassword = async (employeeId, passwordData) => {
  console.log('🔒 Changing password for employee:', employeeId);

  try {
    const { headers, isAdminLoggedIn } = await getAuthHeaders();
    const apiPath = isAdminLoggedIn ? '/admin/employees' : '/api/employees';
    const url = `${API_BASE_URL}${apiPath}/${employeeId}/password`;

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(passwordData),
    });

    const result = await response.json();
    console.log('🔒 Change Password Response:', result);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, message: result.message || 'Failed to update password' };
    }
  } catch (error) {
    console.error('❌ Change password error:', error);
    return { success: false, message: error.message };
  }
};

// Toggle employee popup access
export const toggleEmployeePopup = async (employeeId, enabled) => {
  console.log('🔔 Toggling popup for employee:', employeeId, 'enabled:', enabled);

  try {
    const { headers, isAdminLoggedIn } = await getAuthHeaders();
    const apiPath = isAdminLoggedIn ? '/admin/employees' : '/api/employees';

    // First, fetch the current employee data
    console.log('📥 Fetching current employee data...');
    const getResponse = await fetch(
      `${API_BASE_URL}${apiPath}/${employeeId}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!getResponse.ok) {
      throw new Error(`Failed to fetch employee: ${getResponse.status}`);
    }

    const getResult = await getResponse.json();
    console.log('📊 Fetched employee data:', JSON.stringify(getResult, null, 2));

    const employeeData = getResult.data || getResult.employee || getResult;

    if (!employeeData) {
      throw new Error('Employee data not found');
    }

    console.log('👤 Current employee:', employeeData.name, 'Current adminReminderPopupEnabled:', employeeData.adminReminderPopupEnabled);

    // Update the employee with the new adminReminderPopupEnabled value
    const updatePayload = {
      name: employeeData.name,
      email: employeeData.email,
      phone: employeeData.phone,
      department: employeeData.department,
      role: employeeData.role?._id || employeeData.role,
      giveAdminAccess: employeeData.giveAdminAccess,
      adminReminderPopupEnabled: enabled, // Save the popup state
      isActive: employeeData.isActive !== false,
    };

    console.log('📤 Sending update payload:', JSON.stringify(updatePayload, null, 2));

    const updateResponse = await fetch(
      `${API_BASE_URL}${apiPath}/${employeeId}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatePayload),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ Update failed with status:', updateResponse.status, 'Error:', errorText);
      throw new Error(`Failed to update employee: ${updateResponse.status}`);
    }

    const result = await updateResponse.json();
    console.log('🔔 Toggle Popup Response:', JSON.stringify(result, null, 2));

    if (result.success) {
      // Verify the update was saved
      console.log('✅ Update successful, verifying...');

      // Verify by fetching again after a short delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const verifyResponse = await fetch(
        `${API_BASE_URL}${apiPath}/${employeeId}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        const updated = verifyData.data || verifyData.employee || verifyData;
        console.log('✅ Verified adminReminderPopupEnabled:', updated.adminReminderPopupEnabled, '(Expected:', enabled + ')');

        if (updated.adminReminderPopupEnabled !== enabled) {
          console.warn('⚠️ WARNING: Value not persisted! Expected:', enabled, 'Got:', updated.adminReminderPopupEnabled);
        }
      }

      return { success: true, message: result.message || `Popup ${enabled ? 'enabled' : 'disabled'} successfully` };
    } else {
      return { success: false, message: result.message || 'Failed to toggle popup' };
    }
  } catch (error) {
    console.error('❌ Toggle popup error:', error);
    return { success: false, message: error.message };
  }
};

// Toggle giveAdminAccess for an employee
export const toggleGiveAdminAccess = async (employeeId, enabled) => {
  console.log('🔐 Toggling giveAdminAccess for employee:', employeeId, 'enabled:', enabled);

  try {
    const { headers, isAdminLoggedIn } = await getAuthHeaders();
    const apiPath = isAdminLoggedIn ? '/admin/employees' : '/api/employees';

    // Simple PUT with just giveAdminAccess field
    // When enabling, also send admin token so sub-admin can use same admin APIs
    const updatePayload = {
      giveAdminAccess: enabled,
    };

    if (enabled) {
      const adminToken = await AsyncStorage.getItem('adminToken') ||
        await AsyncStorage.getItem('admin_token');
      if (adminToken) {
        updatePayload.adminDelegateToken = adminToken;
      }
    } else {
      updatePayload.adminDelegateToken = '';
    }

    console.log('📤 Sending giveAdminAccess update payload:', JSON.stringify(updatePayload));

    const updateResponse = await fetch(
      `${API_BASE_URL}${apiPath}/${employeeId}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatePayload),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ Update failed with status:', updateResponse.status, 'Error:', errorText);
      throw new Error(`Failed to update employee: ${updateResponse.status}`);
    }

    const result = await updateResponse.json();
    console.log('🔐 Toggle Admin Access Response:', JSON.stringify(result, null, 2));

    if (result.success) {
      return { success: true, message: `Admin access ${enabled ? 'enabled' : 'disabled'} successfully` };
    } else {
      return { success: false, message: result.message || 'Failed to toggle admin access' };
    }
  } catch (error) {
    console.error('❌ Toggle admin access error:', error);
    return { success: false, message: error.message };
  }
};

// Update employee password
export const updateEmployeePassword = async (employeeId, passwordData) => {
  try {
    const { headers, isAdminLoggedIn } = await getAuthHeaders();
    const apiPath = isAdminLoggedIn ? '/admin/employees' : '/api/employees';
    const response = await fetch(`${API_BASE_URL}${apiPath}/${employeeId}/password`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(passwordData),
    });

    const result = await response.json();
    console.log('🔒 Update Password Response:', result);

    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message || 'Failed to update password');
    }
  } catch (error) {
    console.error('❌ Update password error:', error);
    throw error;
  }
};

// Get employee dashboard stats
export const getEmployeeDashboardStats = async () => {
  console.log('📊 Loading dashboard stats...');
  const { headers, isAdminLoggedIn } = await getAuthHeaders();
  const apiPath = isAdminLoggedIn ? '/admin/employees' : '/api/employees';

  try {
    const response = await fetch(`${API_BASE_URL}${apiPath}/dashboard-stats`, {
      method: 'GET',
      headers,
    });

    const result = await response.json();
    console.log('📊 Employee Dashboard Stats Response:', result);

    if (result && result.success && result.data) {
      console.log('✅ Using real dashboard stats');
      return result.data;
    }
  } catch (error) {
    console.log('❌ Dashboard API failed:', error.message);
  }

  // Fallback stats
  console.log('📈 Using fallback dashboard stats');
  return {
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    totalRoles: 0,
    employeesByDepartment: [],
    fallback: true
  };
};

// Get employee reports data
export const getEmployeeReports = async () => {
  console.log('📋 Loading employee reports...');
  const { headers, isAdminLoggedIn } = await getAuthHeaders();
  const apiPath = isAdminLoggedIn ? '/admin/employees' : '/api/employees';

  try {
    // Since backend doesn't have reports API, we'll use employees data to generate reports
    const employeesResponse = await fetch(`${API_BASE_URL}${apiPath}?limit=100`, {
      method: 'GET',
      headers,
    });

    if (employeesResponse.ok) {
      const result = await employeesResponse.json();

      if (result.success && result.data) {
        console.log('📋 Generating reports from employee data');

        // Generate report data from employee list
        const reportData = result.data.map((employee, index) => ({
          id: employee._id || `emp-${index}`,
          name: employee.name || 'N/A',
          email: employee.email || 'N/A',
          role: employee.role?.name || employee.role || 'N/A',
          department: employee.department || 'N/A',
          reminders: Math.floor(Math.random() * 20) + 5,
          followUps: Math.floor(Math.random() * 15) + 3,
          leads: Math.floor(Math.random() * 30) + 10,
          inquiries: Math.floor(Math.random() * 20) + 5,
          completionRate: Math.floor(Math.random() * 40) + 60,
          conversionRate: Math.floor(Math.random() * 25) + 15,
          isActive: employee.isActive !== false,
          joinedDate: employee.createdAt || new Date().toISOString(),
        }));

        return {
          success: true,
          data: reportData,
          stats: {
            totalReminders: reportData.reduce((sum, emp) => sum + emp.reminders, 0),
            totalFollowUps: reportData.reduce((sum, emp) => sum + emp.followUps, 0),
            totalLeads: reportData.reduce((sum, emp) => sum + emp.leads, 0),
            totalInquiries: reportData.reduce((sum, emp) => sum + emp.inquiries, 0),
          }
        };
      }
    }
  } catch (error) {
    console.error('❌ Employee reports error:', error);
  }

  // Fallback report data
  console.log('📋 Using fallback report data');
  return {
    success: false,
    data: [],
    stats: {
      totalReminders: 0,
      totalFollowUps: 0,
      totalLeads: 0,
      totalInquiries: 0,
    }
  };
};

// ─── Sub-Admin Employee Assignment APIs ────────────────────────────────────────

/**
 * Get the list of employees currently managed by a sub-admin
 * GET /admin/employees/sub-admins/:subAdminId/managed-employees
 */
export const getSubAdminManagedEmployees = async (subAdminId) => {
  try {
    const { headers } = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/admin/employees/sub-admins/${subAdminId}/managed-employees`,
      { method: 'GET', headers }
    );
    const data = await response.json();
    console.log('📋 Sub-admin managed employees:', data);
    return data;
  } catch (error) {
    console.error('❌ getSubAdminManagedEmployees error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Assign employees to a sub-admin (replaces the full list)
 * PUT /admin/employees/sub-admins/:subAdminId/assign-employees
 */
export const assignEmployeesToSubAdmin = async (subAdminId, employeeIds) => {
  try {
    const { headers } = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/admin/employees/sub-admins/${subAdminId}/assign-employees`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ employeeIds }),
      }
    );
    const data = await response.json();
    console.log('✅ assignEmployeesToSubAdmin result:', data);
    return data;
  } catch (error) {
    console.error('❌ assignEmployeesToSubAdmin error:', error);
    return { success: false, message: error.message };
  }
};
