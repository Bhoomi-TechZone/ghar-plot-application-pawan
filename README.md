# 🏘️ Gharplot - Real Estate CRM Application

![Version](https://img.shields.io/badge/version-0.0.2-blue.svg)
![React Native](https://img.shields.io/badge/React%20Native-0.82.1-61DAFB.svg)
![Android](https://img.shields.io/badge/Android-24%2B-3DDC84.svg)

Complete real estate management and CRM solution built with React Native for Android devices.

## 📱 Overview

Gharplot is a comprehensive real estate CRM application designed for managing properties, leads, employees, and customer relationships. The application features separate interfaces for Admin and Employee users with role-based access control, real-time notifications, and extensive property management capabilities.

## ✨ Key Features

### 🔐 Admin Features
- **Dashboard & Analytics**: Real-time statistics and insights
- **Employee Management**: Complete employee lifecycle management
- **Reminder Control System**: Monitor and control employee reminders
  - Toggle individual employee reminder notifications
  - View all due and overdue reminders
  - Complete visibility into employee activities
- **Popup Notification Settings**: 
  - Configure admin's own reminder popups
  - Control employee reminder notifications
  - Manage due and overdue reminder alerts
  - Bulk enable/disable options
- **Permission Management**: Individual permission control (canViewReminders)
- **Lead Management**: Track and assign leads to employees
- **Property Management**: Comprehensive property listing and management
- **CRM Dashboard**: Complete customer relationship management tools
- **Bought Property Tracking**: Manage sold properties and transactions
- **FCM Push Notifications**: Real-time Firebase Cloud Messaging integration

### 👥 Employee Features
- **Personal Dashboard**: Employee-specific statistics and tasks
- **Lead Assignment**: View and manage assigned leads
- **Reminder System**: Personal reminder management with notifications
- **Property Listings**: Access to property database
- **Client Management**: Manage customer interactions
- **Task Tracking**: Daily task management and completion

### 🔔 Notification System
- **Firebase Cloud Messaging (FCM)**: Push notifications for real-time updates
- **Notifee Integration**: Local notification scheduling and management
- **Background Notifications**: Receive notifications even when app is closed
- **Popup Reminders**: Configurable popup alerts for due/overdue tasks
- **Auto-login**: Secure credential storage with automatic authentication

## 🛠️ Technology Stack

### Frontend
- **React Native**: 0.82.1
- **React Navigation**: 7.x (Stack, Drawer, Bottom Tabs)
- **React Native Paper**: UI component library
- **React Native Vector Icons**: Ionicons icon set
- **Animated API**: Smooth animations and transitions

### Backend Integration
- **API Base URL**: `https://gharplotbackend.gntechnology.de`
- **Authentication**: Bearer token (JWT)
- **Storage**: AsyncStorage for local data persistence

### Notifications
- **@react-native-firebase/app**: 23.5.0
- **@react-native-firebase/messaging**: 23.5.0
- **@notifee/react-native**: 9.1.8

### Development Tools
- **Gradle**: 8.14.3
- **Android SDK**: 36 (targetSdk), 24 (minSdk)
- **Node.js**: Required for Metro bundler
- **Java**: JDK 11 or higher

## 📋 Prerequisites

Before running the application, ensure you have:

- Node.js (v14 or higher)
- Java JDK (v11 or higher)
- Android Studio with Android SDK
- Android device or emulator (Android 7.0+, API level 24+)
- USB debugging enabled (for physical device)

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ghar-plot-application-new-main
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Firebase
- Place your `google-services.json` in `android/app/` directory
- Ensure Firebase project is properly configured for FCM

### 4. Build Configuration
The app is configured for multiple architectures:
- arm64-v8a (64-bit ARM)
- armeabi-v7a (32-bit ARM)
- x86 (Intel 32-bit)
- x86_64 (Intel 64-bit)

## 🎯 Running the Application

### Debug Mode (Development)

#### Start Metro Bundler
```bash
npm start
```

#### Run on Android Device/Emulator
```bash
npm run android
```

Or using React Native CLI:
```bash
npx react-native run-android
```

### Release Mode (Production)

#### Build Release APK
```bash
cd android
./gradlew assembleRelease
```

Release APK will be generated at:
```
android/app/build/outputs/apk/release/app-release.apk
```

#### Install Release APK on Device
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

## 📂 Project Structure

```
ghar-plot-application-new-main/
├── android/                      # Android native code
│   ├── app/
│   │   ├── build.gradle         # App-level Gradle config
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       └── java/            # Native Java code
│   └── build.gradle             # Project-level Gradle config
├── src/
│   ├── crm/
│   │   ├── crmscreens/
│   │   │   ├── Admin/          # Admin screens
│   │   │   │   ├── AdminLogin.js
│   │   │   │   ├── AdminMenuScreen.js
│   │   │   │   ├── AdminReminderControlScreen.js (1369 lines)
│   │   │   │   ├── AdminPopupSettings.js (541 lines)
│   │   │   │   ├── ReminderPermissionScreen.js
│   │   │   │   └── ...
│   │   │   ├── CRM/            # CRM screens
│   │   │   └── Employee/       # Employee screens
│   │   ├── navigation/
│   │   │   ├── AdminNavigator.js
│   │   │   └── EmployeeNavigator.js
│   │   └── services/           # API services
│   └── utils/
│       └── fcmService.js       # FCM token management
├── App.js                       # Root component
├── app.json                     # App metadata
├── package.json                 # Dependencies
└── README.md                    # This file
```

## 🔑 Key Screens & Components

### Admin Screens

#### 1. AdminLogin.js
- Email/password authentication
- Auto-login with saved credentials
- FCM token registration on login
- Animated UI with smooth transitions

#### 2. AdminReminderControlScreen.js (1369 lines)
- **3 Main Tabs**:
  - **Overview**: Dashboard statistics and summary
  - **Employees**: List of employees with reminder controls
  - **Due Reminders**: Grouped by employee
- Toggle `adminReminderPopupEnabled` per employee
- Search and filter functionality
- Real-time stats updates

#### 3. AdminPopupSettings.js (541 lines)
- **4 Popup Toggle Settings**:
  - Admin's own reminders popup
  - Employee reminders popup
  - Due reminders popup
  - Overdue reminders popup
- "Enable All Notifications" bulk action
- Local storage with AsyncStorage
- Backend API integration
- Status summary display

#### 4. ReminderPermissionScreen.js
- Individual permission management (NOT role-based)
- Toggle `canViewReminders` per employee
- Search functionality
- Real-time updates

#### 5. AdminMenuScreen.js
- Navigation hub for all admin features
- Categorized menu items:
  - Management (Dashboard, Employees, Leads)
  - Settings (Popup Notifications, Permissions)
  - Reports and Analytics

### Employee Screens
- EmployeeLogin.js
- EmployeeDashboard.js
- EmployeeLeads.js
- EmployeeReminders.js
- EmployeeProfile.js

## 🔌 API Endpoints

### Base URL
```
https://gharplotbackend.gntechnology.de
```

### Authentication
```http
POST /admin/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password",
  "fcmToken": "firebase_token"
}
```

### Admin Reminder APIs
```http
# Get reminder statistics
GET /admin/reminders/stats
Authorization: Bearer {adminToken}

# Get all due reminders
GET /admin/reminders/due-all
Authorization: Bearer {adminToken}

# Get employees list
GET /admin/employees
Authorization: Bearer {adminToken}

# Update employee reminder popup (RECOMMENDED - Dedicated endpoint)
# This endpoint should be implemented on backend for better performance
PUT /admin/employees/:employeeId/reminder-popup
Content-Type: application/json
Authorization: Bearer {adminToken}

{
  "adminReminderPopupEnabled": true
}

# Update employee reminder popup (FALLBACK - General endpoint)
# App will use this if dedicated endpoint is not available
PUT /admin/employees/:employeeId
Content-Type: application/json
Authorization: Bearer {adminToken}

{
  "adminReminderPopupEnabled": true
}
```

### Popup Settings APIs
```http
# Get admin popup settings
GET /admin/popup-settings
Authorization: Bearer {adminToken}

# Update popup settings
PUT /admin/popup-settings
Content-Type: application/json
Authorization: Bearer {adminToken}

{
  "adminOwnRemindersPopup": true,
  "employeeRemindersPopup": true,
  "dueRemindersPopup": true,
  "overdueRemindersPopup": true
}

# Enable all employee popups
POST /admin/reminders/enable-all-popups
Authorization: Bearer {adminToken}
```

### Permission Management APIs
```http
# Update individual permission
PUT /admin/employees/:employeeId/reminder-permission
Content-Type: application/json
Authorization: Bearer {adminToken}

{
  "canViewReminders": true
}
```

## 📱 Device Testing

### Connect USB Device
```bash
# Check connected devices
adb devices

# Expected output:
# List of devices attached
# 257c435d7d7c    device
```

### Reload App on Device
```bash
# Reload app (press R twice)
adb shell input keyevent KEYCODE_R
adb shell input keyevent KEYCODE_R
```

### View Device Logs
```bash
# View all logs
adb logcat

# Filter React Native logs
adb logcat | grep "ReactNative"

# Filter specific tag
adb logcat -s "CRM"
```

## 🔧 Troubleshooting

### Build Issues

**Problem**: Gradle build fails
```bash
# Clean build
cd android
./gradlew clean
cd ..
npm run android
```

**Problem**: Metro bundler port conflict
```bash
# Kill process on port 8081
npx react-native start --reset-cache
```

**Problem**: App not installing on device
```bash
# Uninstall existing app
adb uninstall com.bhoomitechzone.gharplot

# Reinstall
npm run android
```

### Runtime Issues

**Problem**: Notifications not working
- Check Firebase configuration (`google-services.json`)
- Verify FCM token registration
- Check device notification permissions
- Ensure background restrictions are disabled

**Problem**: API connection errors
- Verify backend URL: `https://gharplotbackend.gntechnology.de`
- Check device internet connection
- Verify Bearer token in AsyncStorage
- Check API endpoint availability

**Problem**: Auto-login not working
- Clear AsyncStorage: Settings → Apps → Gharplot → Clear Data
- Re-login to save credentials
- Check `admin_token` in AsyncStorage

## 📊 Build Statistics

- **Build Time**: ~2m 8s (average)
- **APK Size**: ~50-60 MB (release)
- **Gradle Tasks**: 625 actionable tasks
- **Architectures**: 4 (arm64-v8a, armeabi-v7a, x86, x86_64)

## 🔐 Security

- JWT Bearer token authentication
- Secure credential storage with AsyncStorage
- HTTPS-only API communication
- FCM token encryption
- Auto-logout on token expiry
- Secure password handling (never logged)

## 📝 Recent Updates (February 2026)

### ✅ Completed Features
1. **AdminReminderControlScreen**: Complete employee reminder management with 3 tabs
2. **AdminPopupSettings**: 4-toggle popup notification control system
3. **ReminderPermissionScreen**: Individual permission management
4. **Error Fixes**: Resolved 7 compilation errors
   - Removed unused imports
   - Fixed useEffect dependencies
   - Removed duplicate variable declarations
5. **Syntax Fixes**: Fixed AdminPopupSettings.js (lines 175-220)
6. **Backend Migration**: Updated from abc.bhoomitechzone.us to gharcrmback.bhoomi.cloud
7. **FCM Integration**: Complete Firebase Cloud Messaging setup
8. **Auto-login**: Implemented saved credentials feature

### 🎨 UI/UX Improvements
- Smooth animations on login screen
- Card-based layouts for settings
- Search functionality across screens
- Real-time status updates
- Color-coded status indicators
- Responsive design for various screen sizes

### 🔧 Bug Fixes (February 7, 2026)
1. **Popup Toggle Warning Fix**: 
   - Removed false-positive "setting may not have saved" warning
   - Implemented dual-endpoint approach (dedicated + fallback)
   - Added offline mode support with AsyncStorage backup
   - Optimistic UI updates for better user experience
   - Enhanced error messages with actionable information

## 🏗️ Backend Requirements

### Priority Endpoints (Required for Full Functionality)

#### 1. Employee Reminder Popup Toggle (RECOMMENDED)
```javascript
PUT /admin/employees/:employeeId/reminder-popup
Authorization: Bearer {adminToken}
Content-Type: application/json

Request Body:
{
  "adminReminderPopupEnabled": true
}

Success Response (200):
{
  "success": true,
  "message": "Employee reminder popup updated",
  "employee": {
    "_id": "employeeId",
    "adminReminderPopupEnabled": true
  }
}

Error Response (400/404):
{
  "success": false,
  "message": "Error message"
}
```

**Why This Endpoint?**
- Faster than fetching + updating entire employee object
- Cleaner separation of concerns
- Better performance for mobile apps
- Current implementation uses fallback to general PUT /admin/employees/:id

#### 2. Admin Popup Settings
```javascript
GET /admin/popup-settings
Authorization: Bearer {adminToken}

Success Response:
{
  "success": true,
  "settings": {
    "adminOwnRemindersPopup": true,
    "employeeRemindersPopup": true,
    "dueRemindersPopup": true,
    "overdueRemindersPopup": true
  }
}

PUT /admin/popup-settings
Content-Type: application/json
Authorization: Bearer {adminToken}

Request Body:
{
  "settings": {
    "adminOwnRemindersPopup": true,
    "employeeRemindersPopup": false,
    "dueRemindersPopup": true,
    "overdueRemindersPopup": true
  }
}
```

**Current Status**: App uses AsyncStorage fallback if endpoint not available

#### 3. Bulk Enable Employee Popups
```javascript
POST /admin/reminders/enable-all-popups
Authorization: Bearer {adminToken}

Success Response:
{
  "success": true,
  "message": "All employee popups enabled",
  "updatedCount": 25
}
```

**Current Status**: App shows "Partial Success" message if not available

### Database Schema Requirements

#### Employee Model
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  department: String,
  role: ObjectId (ref: 'Role'),
  adminReminderPopupEnabled: Boolean, // ⚠️ This field must be persisted
  // ... other fields
}
```

**Important**: Ensure `adminReminderPopupEnabled` field is:
- Actually saved to database (not just accepted in API)
- Returned in GET /admin/employees and GET /admin/employees/:id
- Can be updated via PUT requests
- Defaults to `false` for new employees

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is private and proprietary.

## 👥 Team

- **Bhoomi Techzone** - Development Team
- **Backend API**: gharcrmback.bhoomi.cloud

## 📞 Support

For issues, questions, or support:
- Email: support@bhoomitechzone.com
- API Issues: Check backend server status
- App Issues: View device logs with `adb logcat`

---

**Last Updated**: February 7, 2026  
**Version**: 0.0.2  
**Status**: ✅ Production Ready

Built with ❤️ by Bhoomi Techzone
