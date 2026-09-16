import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import CrossPlatformAlert from '../../utils/crossPlatformAlert';

const RoleManagementScreen = ({ navigation }) => {
  const [roles, setRoles] = useState([
    {
      id: '1',
      name: 'Admin',
      description: 'Full system access and management',
      permissions: ['read', 'write', 'delete', 'manage_users', 'manage_roles'],
      userCount: 2,
      color: '#ef4444',
    },
    {
      id: '2',
      name: 'Manager',
      description: 'Team management and oversight',
      permissions: ['read', 'write', 'manage_team', 'view_reports'],
      userCount: 5,
      color: '#3b82f6',
    },
    {
      id: '3',
      name: 'Agent',
      description: 'Property sales and customer management',
      permissions: ['read', 'write', 'manage_properties', 'manage_customers'],
      userCount: 15,
      color: '#10b981',
    },
    {
      id: '4',
      name: 'Viewer',
      description: 'Read-only access to system data',
      permissions: ['read'],
      userCount: 8,
      color: '#6b7280',
    },
  ]);

  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchText.toLowerCase()) ||
    role.description.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleRolePress = (role) => {
    setSelectedRole(role);
    setModalVisible(true);
  };

  const handleDeleteRole = (roleId) => {
    CrossPlatformAlert.alert(
      'Delete Role',
      'Are you sure you want to delete this role?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setRoles(roles.filter(role => role.id !== roleId));
          },
        },
      ]
    );
  };

  const renderRoleItem = ({ item }) => (
    <TouchableOpacity
      style={styles.roleCard}
      onPress={() => handleRolePress(item)}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.roleIndicator, { backgroundColor: item.color }]} />
        <View style={styles.roleInfo}>
          <Text style={styles.roleName}>{item.name}</Text>
          <Text style={styles.roleDescription}>{item.description}</Text>
        </View>
        <View style={styles.userCountBadge}>
          <Text style={styles.userCountText}>{item.userCount}</Text>
        </View>
      </View>
      
      <View style={styles.permissionsContainer}>
        <Text style={styles.permissionsLabel}>Permissions:</Text>
        <View style={styles.permissionsList}>
          {item.permissions.slice(0, 3).map((permission, index) => (
            <View key={index} style={styles.permissionBadge}>
              <Text style={styles.permissionText}>{permission}</Text>
            </View>
          ))}
          {item.permissions.length > 3 && (
            <View style={styles.permissionBadge}>
              <Text style={styles.permissionText}>+{item.permissions.length - 3}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="create" size={18} color="#3b82f6" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDeleteRole(item.id)}
        >
          <Icon name="trash" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const RoleDetailModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedRole?.name} Role</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <Text style={styles.modalDescription}>{selectedRole?.description}</Text>
            
            <Text style={styles.sectionTitle}>All Permissions:</Text>
            <View style={styles.allPermissionsList}>
              {selectedRole?.permissions.map((permission, index) => (
                <View key={index} style={styles.fullPermissionBadge}>
                  <Icon name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={styles.fullPermissionText}>{permission}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.modalStats}>
              <Text style={styles.statsText}>Users with this role: {selectedRole?.userCount}</Text>
            </View>
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.editRoleButton}>
              <Text style={styles.editRoleButtonText}>Edit Role</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Role Management</Text>
        <TouchableOpacity style={styles.addButton}>
          <Icon name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search roles..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{roles.length}</Text>
            <Text style={styles.statLabel}>Total Roles</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{roles.reduce((sum, role) => sum + role.userCount, 0)}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
        </View>

        <FlatList
          data={filteredRoles}
          renderItem={renderRoleItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>
      
      <RoleDetailModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  roleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleIndicator: {
    width: 8,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  userCountBadge: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  userCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  permissionsContainer: {
    marginBottom: 12,
  },
  permissionsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  permissionBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  permissionText: {
    fontSize: 12,
    color: '#1e40af',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  allPermissionsList: {
    marginBottom: 20,
  },
  fullPermissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fullPermissionText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  modalStats: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
  },
  statsText: {
    fontSize: 14,
    color: '#374151',
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  editRoleButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editRoleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default RoleManagementScreen;
