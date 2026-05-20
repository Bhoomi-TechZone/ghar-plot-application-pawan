import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://gharplotbackend.gntechnology.de';

// Get authentication token
const getAuthToken = async () => {
  try {
    const adminToken = await AsyncStorage.getItem('adminToken');
    const employeeToken = await AsyncStorage.getItem('employeeToken');
    return adminToken || employeeToken;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Generic API call function
const apiCall = async (endpoint, options = {}) => {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.log('No authentication token found, using fallback data');
      return null;
    }

    const url = `${BASE_URL}${endpoint}`;
    console.log('Making API call to:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      console.log(`API call failed: ${response.status} - ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.log('API call error:', error.message);
    return null;
  }
};

// Reminders Service Functions
export const remindersService = {
  // Get reminders list
  getReminders: async (filters = {}) => {
    try {
      const queryString = new URLSearchParams({
        page: filters.page || 1,
        limit: filters.limit || 20,
        ...(filters.status && { status: filters.status }),
        ...(filters.assignmentType && { assignmentType: filters.assignmentType })
      }).toString();

      const endpoint = `/employee/reminders/list?${queryString}`;
      const data = await apiCall(endpoint);

      if (data && data.success) {
        return {
          success: true,
          reminders: data.data.reminders || [],
          pagination: data.data.pagination || {}
        };
      }
    } catch (error) {
      console.log('Error fetching reminders:', error.message);
    }

    // Return fallback data
    return {
      success: false,
      reminders: generateFallbackReminders(),
      pagination: { currentPage: 1, totalPages: 1, totalReminders: 3, limit: 20 }
    };
  },

  // Get reminder statistics
  getReminderStats: async () => {
    try {
      const data = await apiCall('/employee/reminders/stats');

      if (data && data.success) {
        return {
          success: true,
          stats: data.data
        };
      }
    } catch (error) {
      console.log('Error fetching reminder stats:', error.message);
    }

    // Return fallback stats
    return {
      success: false,
      stats: {
        total: 3,
        pending: 2,
        completed: 1,
        snoozed: 0,
        dismissed: 0,
        due: 2,
        overdue: 1
      }
    };
  },

  // Complete reminder
  completeReminder: async (reminderId, response = '') => {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const endpoint = `/employee/reminders/complete/${reminderId}`;
      const apiResponse = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response })
      });

      if (!apiResponse.ok) {
        throw new Error(`Failed to complete reminder: ${apiResponse.status}`);
      }

      const data = await apiResponse.json();
      return { success: true, data };

    } catch (error) {
      console.log('Error completing reminder:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Snooze reminder
  snoozeReminder: async (reminderId, snoozeMinutes = 30) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const endpoint = `/employee/reminders/snooze/${reminderId}`;
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ snoozeMinutes })
      });

      if (!response.ok) {
        throw new Error(`Failed to snooze reminder: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };

    } catch (error) {
      console.log('Error snoozing reminder:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Dismiss reminder
  dismissReminder: async (reminderId) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const endpoint = `/employee/reminders/dismiss/${reminderId}`;
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`Failed to dismiss reminder: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };

    } catch (error) {
      console.log('Error dismissing reminder:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Delete reminder
  deleteReminder: async (reminderId) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const endpoint = `/employee/reminders/delete/${reminderId}`;
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete reminder: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };

    } catch (error) {
      console.log('Error deleting reminder:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Create reminder
  createReminder: async (reminderData) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const endpoint = '/employee/reminders/create';
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reminderData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create reminder: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };

    } catch (error) {
      console.log('Error creating reminder:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Search reminders
  searchReminders: (searchQuery, reminders) => {
    if (!searchQuery.trim()) {
      return reminders;
    }

    const query = searchQuery.toLowerCase();
    return reminders.filter(reminder =>
      reminder.title.toLowerCase().includes(query) ||
      reminder.comment.toLowerCase().includes(query) ||
      reminder.assignmentId?.clientName?.toLowerCase().includes(query) ||
      reminder.status.toLowerCase().includes(query)
    );
  },

  // Filter reminders by status
  filterRemindersByStatus: (status, reminders) => {
    if (status === 'All Status' || !status) {
      return reminders;
    }

    const statusFilter = status.toLowerCase();
    return reminders.filter(reminder =>
      reminder.status.toLowerCase() === statusFilter
    );
  },

  // Get priority color
  getPriorityColor: (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  },

  // Get status color
  getStatusColor: (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'snoozed': return '#3b82f6';
      case 'dismissed': return '#6b7280';
      default: return '#9ca3af';
    }
  },

  // Format reminder date
  formatReminderDate: (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((date - now) / (1000 * 60 * 60));

    if (diffHours < -24) {
      return `Overdue by ${Math.abs(diffHours)} hours`;
    } else if (diffHours < 0) {
      return `Overdue by ${Math.abs(diffHours)} hours`;
    } else if (diffHours === 0) {
      return 'Due now';
    } else if (diffHours < 24) {
      return `Due in ${diffHours} hours`;
    } else {
      return `Due in ${Math.floor(diffHours / 24)} days`;
    }
  }
};

// Generate fallback reminder data for demo purposes
const generateFallbackReminders = () => [
  {
    _id: 'reminder_1',
    title: 'Follow up with John Doe',
    comment: 'Interested in 2BHK apartment viewing',
    reminderDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    status: 'pending',
    priority: 'high',
    assignmentId: {
      _id: 'assignment_1',
      clientName: 'John Doe',
      phone: '9876543210',
      email: 'john@example.com'
    },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    snoozeCount: 0
  },
  {
    _id: 'reminder_2',
    title: 'Call Jane Smith',
    comment: 'Discuss commercial property requirements',
    reminderDateTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago (overdue)
    status: 'pending',
    priority: 'medium',
    assignmentId: {
      _id: 'assignment_2',
      clientName: 'Jane Smith',
      phone: '8765432109',
      email: 'jane@example.com'
    },
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    snoozeCount: 1
  },
  {
    _id: 'reminder_3',
    title: 'Property documentation',
    comment: 'Complete property documentation for ABC Tower',
    reminderDateTime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    status: 'completed',
    priority: 'low',
    assignmentId: {
      _id: 'assignment_3',
      clientName: 'Mike Johnson',
      phone: '7654321098',
      email: 'mike@example.com'
    },
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    response: 'Documentation completed and sent to client',
    snoozeCount: 0
  }
];

export default remindersService;
