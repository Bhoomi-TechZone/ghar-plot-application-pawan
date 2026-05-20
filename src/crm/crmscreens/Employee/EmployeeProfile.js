import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from '@react-native-async-storage/async-storage';
import CrossPlatformAlert from '../../../utils/crossPlatformAlert';

const EmployeeProfile = ({ navigation }) => {
  const [employeeData, setEmployeeData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    employeeId: '',
    joiningDate: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    try {
      const token = await AsyncStorage.getItem('employeeToken');
      const employeeInfo = await AsyncStorage.getItem('employeeData');

      if (employeeInfo) {
        const parsedData = JSON.parse(employeeInfo);
        setEmployeeData({
          name: parsedData.name || 'Employee Name',
          email: parsedData.email || 'employee@company.com',
          phone: parsedData.phone || '+91 XXXXXXXXXX',
          department: parsedData.department || 'Sales',
          designation: parsedData.designation || 'Sales Executive',
          employeeId: parsedData.employeeId || 'EMP001',
          joiningDate: parsedData.joiningDate || '01/01/2023',
        });
      } else {
        // Set default data if no employee data found
        setEmployeeData({
          name: 'Employee Name',
          email: 'employee@company.com',
          phone: '+91 XXXXXXXXXX',
          department: 'Sales',
          designation: 'Sales Executive',
          employeeId: 'EMP001',
          joiningDate: '01/01/2023',
        });
      }
    } catch (error) {
      console.log('Error loading employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    CrossPlatformAlert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          onPress: async () => {
            try {
              // Clear all stored data
              await AsyncStorage.removeItem('employeeToken');
              await AsyncStorage.removeItem('employeeData');
              await AsyncStorage.removeItem('userRole');

              // Navigate back to EmployeeLogin screen by resetting the navigation stack
              navigation.getParent()?.reset({
                index: 0,
                routes: [{ name: 'EmployeeLogin' }],
              });
            } catch (error) {
              console.log('Error during logout:', error);
              CrossPlatformAlert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const ProfileItem = ({ icon, label, value, iconColor = "#3b82f6" }) => (
    <View style={styles.profileItem}>
      <View style={styles.profileItemIcon}>
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.profileItemContent}>
        <Text style={styles.profileItemLabel}>{label}</Text>
        <Text style={styles.profileItemValue}>{value}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#3b82f6" />
        <LinearGradient colors={["#3b82f6", "#1e40af"]} style={styles.headerWrapper}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="arrow-back" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <View style={{ width: 26 }} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3b82f6" />

      {/* Header */}
      <LinearGradient colors={["#3b82f6", "#1e40af"]} style={styles.headerWrapper}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 26 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={["#3b82f6", "#1e40af"]}
              style={styles.avatar}
            >
              <Icon name="person" size={60} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.employeeName}>{employeeData.name}</Text>
          <Text style={styles.employeeDesignation}>{employeeData.designation}</Text>
        </View>

        {/* Profile Details */}
        <View style={styles.profileDetails}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <ProfileItem
            icon="mail-outline"
            label="Email"
            value={employeeData.email}
            iconColor="#ef4444"
          />

          <ProfileItem
            icon="call-outline"
            label="Phone"
            value={employeeData.phone}
            iconColor="#10b981"
          />

          <ProfileItem
            icon="business-outline"
            label="Department"
            value={employeeData.department}
            iconColor="#f59e0b"
          />

          <ProfileItem
            icon="id-card-outline"
            label="Employee ID"
            value={employeeData.employeeId}
            iconColor="#8b5cf6"
          />

          <ProfileItem
            icon="calendar-outline"
            label="Joining Date"
            value={employeeData.joiningDate}
            iconColor="#06b6d4"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.editButton}>
            <LinearGradient
              colors={["#10b981", "#059669"]}
              style={styles.buttonGradient}
            >
              <Icon name="create-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Edit Profile</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LinearGradient
              colors={["#ef4444", "#dc2626"]}
              style={styles.buttonGradient}
            >
              <Icon name="log-out-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  headerWrapper: {
    paddingTop: 15,
    paddingBottom: 20,
    paddingHorizontal: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#64748b",
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: "#fff",
    paddingVertical: 30,
    alignItems: "center",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  employeeName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 5,
  },
  employeeDesignation: {
    fontSize: 16,
    color: "#64748b",
  },
  profileDetails: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 20,
  },
  profileItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  profileItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  profileItemContent: {
    flex: 1,
  },
  profileItemLabel: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 2,
  },
  profileItemValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  actionSection: {
    paddingHorizontal: 15,
    paddingBottom: 30,
  },
  editButton: {
    marginBottom: 15,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  logoutButton: {
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
});

export default EmployeeProfile;