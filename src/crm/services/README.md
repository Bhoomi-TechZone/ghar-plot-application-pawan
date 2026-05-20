# CRM API Services Documentation

## Structure

All CRM APIs are organized in `src/crm/services/` directory:

```
src/crm/services/
├── crmApi.js                    # Base configuration & utilities
├── crmAuthApi.js                # Authentication APIs
├── crmUserManagementApi.js      # User management APIs
├── crmPropertyApi.js            # Property management APIs
├── crmLeadsApi.js               # Leads management APIs
├── crmEmployeeApi.js            # Employee management APIs
└── index.js                     # Central export point
```

---

## Base Configuration (`crmApi.js`)

### Base URL
```javascript
export const CRM_BASE_URL = 'https://abc.bhoomitechzone.us';
```

### Utilities
- `getCRMAuthHeaders()` - Returns auth headers with token
- `handleCRMResponse(response)` - Handles API responses
- `buildQueryString(params)` - Builds query string from object

---

## Authentication APIs (`crmAuthApi.js`)

### Methods

#### `adminLogin(email, password)`
Admin login endpoint
```javascript
import { adminLogin } from '@/crm/services/crmAuthApi';
const data = await adminLogin('admin@example.com', 'password');
```

#### `employeeLogin(email, password)`
Employee login endpoint

#### `getCRMToken()`
Get current authentication token

#### `crmLogout()`
Logout and clear tokens

#### `verifyToken()`
Verify if current token is valid

#### `refreshCRMToken(refreshToken)`
Refresh expired token

---

## User Management APIs (`crmUserManagementApi.js`)

### Methods

#### `getAllUsers(params)`
Get paginated list of users
```javascript
import { getAllUsers } from '@/crm/services/crmUserManagementApi';
const users = await getAllUsers({ page: 1, limit: 10, status: 'ACTIVE' });
```

#### `getUserById(userId)`
Get single user details

#### `createUser(userData)`
Create new user

#### `updateUser(userId, userData)`
Update user information

#### `deleteUser(userId)`
Soft delete user

#### `activateUser(userId)`
Activate user account

#### `deactivateUser(userId)`
Deactivate user account

#### `getUserStats()`
Get user statistics

---

## Property Management APIs (`crmPropertyApi.js`)

### Methods

#### `getAllProperties(params)`
Get paginated list of properties

#### `getPropertyById(propertyId)`
Get single property details

#### `createProperty(propertyData)`
Create new property

#### `updateProperty(propertyId, propertyData)`
Update property information

#### `deleteProperty(propertyId)`
Delete property

#### `approveProperty(propertyId)`
Approve pending property

#### `rejectProperty(propertyId, reason)`
Reject property with reason

#### `getPropertyStats()`
Get property statistics

---

## Leads Management APIs (`crmLeadsApi.js`)

### Methods

#### `getAllLeads(params)`
Get paginated list of leads

#### `getLeadById(leadId)`
Get single lead details

#### `createLead(leadData)`
Create new lead

#### `updateLead(leadId, leadData)`
Update lead information

#### `deleteLead(leadId)`
Delete lead

#### `assignLead(leadId, employeeId)`
Assign lead to employee

#### `updateLeadStatus(leadId, status)`
Update lead status

#### `addLeadNote(leadId, note)`
Add note to lead

#### `getLeadStats()`
Get lead statistics

---

## Employee Management APIs (`crmEmployeeApi.js`)

### Methods

#### `getAllEmployees(params)`
Get paginated list of employees

#### `getEmployeeById(employeeId)`
Get single employee details

#### `createEmployee(employeeData)`
Create new employee

#### `updateEmployee(employeeId, employeeData)`
Update employee information

#### `deleteEmployee(employeeId)`
Delete employee

#### `activateEmployee(employeeId)`
Activate employee account

#### `deactivateEmployee(employeeId)`
Deactivate employee account

#### `getEmployeeStats()`
Get employee statistics

#### `getEmployeePerformance(employeeId, params)`
Get employee performance metrics

---

## Usage Examples

### Basic Import
```javascript
// Import specific APIs
import { getAllUsers, activateUser } from '@/crm/services/crmUserManagementApi';
import { adminLogin } from '@/crm/services/crmAuthApi';

// Or import from index
import { getAllUsers, adminLogin } from '@/crm/services';
```

### Complete Example
```javascript
import { adminLogin, getAllUsers } from '@/crm/services';

// Login
const loginData = await adminLogin('admin@example.com', 'password');

// Fetch users
const usersResponse = await getAllUsers({
  page: 1,
  limit: 10,
  status: 'ACTIVE',
  search: 'john'
});

console.log(usersResponse.data); // Array of users
console.log(usersResponse.pagination); // Pagination info
```

---

## Error Handling

All APIs throw errors that should be caught:

```javascript
try {
  const users = await getAllUsers({ page: 1, limit: 10 });
} catch (error) {
  console.error('Error:', error.message);
  // Handle error appropriately
}
```

---

## Authentication

All APIs (except login) require authentication token:
- Token is automatically retrieved from AsyncStorage
- Stored as `crm_auth_token` (admin) or `employee_auth_token` (employee)
- Automatically included in request headers

---

## Response Format

Standard response format:
```javascript
{
  "success": true,
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10
  },
  "message": "Success"
}
```

---

## Migration from Old Services

### Before
```javascript
import { getAllUsers } from '../../../services/userManagementService';
```

### After
```javascript
import { getAllUsers } from '../../services/crmUserManagementApi';
// OR
import { getAllUsers } from '@/crm/services';
```

---

## Notes

- All APIs use `async/await` syntax
- Base URL is centralized in `crmApi.js`
- Authentication headers are automatically added
- Query parameters are automatically encoded
- All responses are parsed as JSON
