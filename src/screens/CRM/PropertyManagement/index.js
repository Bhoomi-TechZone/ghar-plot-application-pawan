// Property Management Module
import PropertyDashboard from './PropertyDashboard';
import PropertyList from './PropertyList';
import PropertyAnalytics from './PropertyAnalytics';

// Re-export the existing screen for backward compatibility
export { default as PropertyManagementScreen } from '../../../crm/crmscreens/Admin/PropertyManagementScreen';

// Export new components
export { PropertyDashboard, PropertyList, PropertyAnalytics };

// Navigation configuration for easy integration
export const PropertyManagementRoutes = {
  PropertyDashboard: {
    name: 'PropertyDashboard',
    component: PropertyDashboard,
    options: {
      title: 'Property Overview',
      headerStyle: { backgroundColor: '#4F46E5' },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: { fontWeight: '600' },
    },
  },
  PropertyList: {
    name: 'PropertyList',
    component: PropertyList,
    options: {
      title: 'All Properties',
      headerStyle: { backgroundColor: '#4F46E5' },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: { fontWeight: '600' },
    },
  },
  PropertyAnalytics: {
    name: 'PropertyAnalytics',
    component: PropertyAnalytics,
    options: {
      title: 'Property Analytics',
      headerStyle: { backgroundColor: '#4F46E5' },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: { fontWeight: '600' },
    },
  },
};

// Helper function to register routes with navigation
export const registerPropertyManagementRoutes = (Stack) => {
  return Object.values(PropertyManagementRoutes).map((route) => (
    <Stack.Screen
      key={route.name}
      name={route.name}
      component={route.component}
      options={route.options}
    />
  ));
};