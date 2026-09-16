/**
 * PermissionProtectedScreen.js
 * 
 * A wrapper component that protects screens based on user permissions.
 * Similar to web's PermissionProtectedRoute but for React Native screens.
 * 
 * Usage:
 * <PermissionProtectedScreen requiredPermission={{ module: 'leads', action: 'read' }}>
 *   <LeadsScreen />
 * </PermissionProtectedScreen>
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { usePermissions } from '../context/PermissionContext';

// Access Denied Screen Component
const AccessDeniedScreen = ({ message, onGoBack }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="lock-closed" size={80} color="#EF4444" />
        </View>
        
        <Text style={styles.title}>Access Denied</Text>
        
        <Text style={styles.message}>
          {message || "You don't have permission to access this screen."}
        </Text>
        
        <Text style={styles.subMessage}>
          Please contact your administrator if you believe this is an error.
        </Text>
        
        {onGoBack && (
          <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
            <Icon name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

// Loading Screen Component
const LoadingScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    </SafeAreaView>
  );
};

/**
 * PermissionProtectedScreen Component
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Screen content to render if permission granted
 * @param {Object} props.requiredPermission - { module: string, action: string }
 * @param {Array<string>} props.allowedRoles - Array of role names allowed
 * @param {string} props.deniedMessage - Custom message for access denied
 * @param {Function} props.onAccessDenied - Optional callback when access is denied
 */
const PermissionProtectedScreen = ({
  children,
  requiredPermission,
  allowedRoles = [],
  deniedMessage,
  onAccessDenied,
}) => {
  const navigation = useNavigation();
  const { 
    isAuthenticated, 
    isAdmin, 
    loading, 
    hasPermission, 
    hasRole,
    employee,
  } = usePermissions();

  // Handle go back
  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Navigate to dashboard if can't go back
      navigation.navigate('DashboardTab');
    }
  };

  // Show loading while checking auth
  if (loading) {
    return <LoadingScreen />;
  }

  // Admin bypass - admins have full access
  if (isAdmin) {
    return <>{children}</>;
  }

  // Not authenticated - this should be handled by navigation
  // But adding as a safety check
  if (!isAuthenticated) {
    return (
      <AccessDeniedScreen 
        message="Please login to access this screen."
        onGoBack={() => navigation.navigate('EmployeeLogin')}
      />
    );
  }

  // Check role-based access if allowedRoles specified
  if (allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => hasRole(role));
    if (!hasAllowedRole) {
      if (onAccessDenied) onAccessDenied();
      return (
        <AccessDeniedScreen 
          message={deniedMessage || "You don't have the required role to access this screen."}
          onGoBack={handleGoBack}
        />
      );
    }
  }

  // Check permission-based access if requiredPermission specified
  if (requiredPermission) {
    const { module, action } = requiredPermission;
    if (!hasPermission(module, action)) {
      if (onAccessDenied) onAccessDenied();
      return (
        <AccessDeniedScreen 
          message={deniedMessage || `You don't have ${action} permission for ${module}.`}
          onGoBack={handleGoBack}
        />
      );
    }
  }

  // Permission granted - render children
  return <>{children}</>;
};

/**
 * withPermission HOC
 * 
 * Higher Order Component to wrap any screen with permission check
 * 
 * Usage:
 * export default withPermission(LeadsScreen, { module: 'leads', action: 'read' });
 */
export const withPermission = (WrappedComponent, requiredPermission, options = {}) => {
  return function PermissionWrapper(props) {
    return (
      <PermissionProtectedScreen
        requiredPermission={requiredPermission}
        allowedRoles={options.allowedRoles}
        deniedMessage={options.deniedMessage}
      >
        <WrappedComponent {...props} />
      </PermissionProtectedScreen>
    );
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  subMessage: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});

export { AccessDeniedScreen, LoadingScreen };
export default PermissionProtectedScreen;
