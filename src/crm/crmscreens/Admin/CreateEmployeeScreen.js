import React, { useCallback } from 'react';
import {
  View,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EmployeeFormFlatList from '../../components/EmployeeFormFlatList';
import {
  createEmployee,
  updateEmployee,
} from '../../services/crmEmployeeManagementApi';
import { getAllRoles } from '../../services/crmRoleApi';

const CreateEmployeeScreen = ({ navigation, route }) => {
  const [roles, setRoles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const isEditing = route.params?.isEditing || false;
  const employee = route.params?.employee || null;

  // Load roles on screen focus
  useFocusEffect(
    useCallback(() => {
      loadRoles();
    }, [])
  );

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await getAllRoles();
      if (response && response.success && response.data) {
        const activeRoles = response.data.filter(role => role.isActive);
        setRoles(activeRoles);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      setSubmitting(true);

      if (isEditing && employee) {
        // Update employee
        const response = await updateEmployee(employee.id, formData);
        if (response.success) {
          // Trigger refresh in parent screen before going back
          if (route.params?.onRefresh) {
            await route.params.onRefresh();
          }
          navigation.goBack();
        } else {
          alert(response.message || 'Error updating employee');
        }
      } else {
        // Create employee
        const response = await createEmployee(formData);
        if (response.success) {
          // Trigger refresh in parent screen before going back
          if (route.params?.onRefresh) {
            await route.params.onRefresh();
          }
          navigation.goBack();
        } else {
          alert(response.message || 'Error creating employee');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <EmployeeFormFlatList
        isEditing={isEditing}
        initialData={employee}
        roles={roles}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitting={submitting}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CreateEmployeeScreen;
