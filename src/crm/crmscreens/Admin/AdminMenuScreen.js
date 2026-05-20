import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import TestAdminAuth from '../../../TEST_ADMIN_AUTH';

const AdminMenuScreen = ({ navigation }) => {
  const menuSections = [
    {
      title: 'MANAGEMENT',
      items: [
        { name: 'User Management', icon: 'people', route: 'Management', screen: 'UserManagement', color: '#3b82f6' },
        { name: 'User Assignments', icon: 'assignment', route: 'Management', screen: 'UserAssignments', color: '#3b82f6' },
        { name: 'Role Management', icon: 'security', route: 'Management', screen: 'RoleManagement', color: '#3b82f6' },
        { name: 'Employee Management', icon: 'badge', route: 'Management', screen: 'EmployeeManagement', color: '#3b82f6' },
        { name: 'Employee Reports', icon: 'analytics', route: 'Management', screen: 'EmployeeReports', color: '#3b82f6' },
        { name: 'Bad Attendant Alerts', icon: 'warning', route: 'Management', screen: 'BadAttendantAlerts', color: '#ef4444' },
        { name: 'Admin Reminders Control', icon: 'schedule', route: 'ReminderControl', screen: null, color: '#3b82f6' },
        { name: 'Reminder View Permissions', icon: 'visibility', route: 'ReminderPermission', screen: null, color: '#10b981' },
        { name: 'Popup Notifications', icon: 'notifications-active', route: 'AdminPopupSettings', screen: null, color: '#8b5cf6' },
        { name: 'Admin My Reminders', icon: 'alarm', route: 'AdminMyReminders', screen: null, color: '#6366f1' },
        { name: 'Property Listings', icon: 'list', route: 'Properties', screen: 'PropertyListings', color: '#3b82f6' },
        { name: 'Bought Property', icon: 'home-work', route: 'BoughtProperty', screen: null, color: '#28a745' },
        { name: 'Service Management', icon: 'room-service', route: 'ServiceManagement', screen: null, color: '#667eea' },
        { name: 'Enquiries', icon: 'contact-mail', route: 'Management', screen: 'Enquiries', color: '#3b82f6' },
      ]
    },
    {
      title: 'USP MANAGEMENT',
      items: [
        { name: 'Team\'s USP', icon: 'person-pin', route: 'USPEmployees', screen: null, color: '#10b981' },
      ]
    },
    {
      title: 'MY ASSIGNMENTS',
      items: [
        { name: 'All Leads', icon: 'trending-up', route: 'Operations', screen: 'AllLeads', color: '#3b82f6' },
        { name: 'My Reminders', icon: 'notifications', route: 'AdminMyReminders', screen: null, color: '#8b5cf6' },
        // { name: 'Follow-ups', icon: 'follow-the-signs', route: 'AdminFollowUps', screen: null, color: '#06b6d4' },
        { name: 'Alerts', icon: 'notification-important', route: 'Operations', screen: 'Alerts', color: '#ef4444' },
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { name: 'Reports & Complaints', icon: 'report-problem', route: 'Operations', screen: 'ReportsComplaints', color: '#ef4444' },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Settings', icon: 'settings', route: 'System', screen: 'SystemSettings', color: '#3b82f6' },
        { name: 'Security', icon: 'security', route: 'System', screen: 'Security', color: '#3b82f6' },
      ]
    }
  ];

  const renderMenuItem = (item) => (
    <TouchableOpacity
      key={item.name}
      style={styles.menuItem}
      onPress={() => {
        if (item.screen) {
          navigation.navigate(item.route, { screen: item.screen });
        } else {
          navigation.navigate(item.route);
        }
      }}
    >
      <View style={styles.menuItemLeft}>
        <MaterialIcons name={item.icon} size={20} color={item.color} />
        <Text style={[styles.menuItemText, { color: item.color === '#ef4444' ? '#ef4444' : '#333' }]}>
          {item.name}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3b82f6" />

      {/* Header */}
      <LinearGradient
        colors={["#3b82f6", "#1e40af"]}
        style={styles.headerWrapper}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Admin Panel</Text>

          <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
            <Icon name="home" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Test Authentication Button - Remove after debugging */}
      <TestAdminAuth />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map(renderMenuItem)}
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutContainer}
          onPress={() => {
            // Handle logout - you can implement this
            console.log('Logout pressed');
          }}
        >
          <View style={styles.logoutButton}>
            <MaterialIcons name="logout" size={20} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>v2.1.0 © 2025 GharPlot</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerWrapper: {
    padding: 18,
    paddingBottom: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  menuItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 14,
    marginLeft: 12,
    fontWeight: '500',
  },
  logoutContainer: {
    margin: 16,
    marginTop: 24,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
  },
});

export default AdminMenuScreen;