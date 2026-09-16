import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { openStore } from '../services/versionService';

const UpdateModal = ({ visible, forceUpdate, onUpdate, onLater }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={() => {
        if (!forceUpdate && onLater) onLater();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>New version available</Text>
          <Text style={styles.description}>
            A new version of the app is available. Please update to get the latest features and a better experience.
          </Text>
          
          <View style={styles.buttonContainer}>
            {!forceUpdate && (
              <TouchableOpacity style={styles.laterButton} onPress={onLater}>
                <Text style={styles.laterButtonText}>Later</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
               style={[styles.updateButton, forceUpdate && styles.fullWidthButton]} 
               onPress={onUpdate || (() => openStore())}
            >
              <Text style={styles.updateButtonText}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  laterButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  laterButtonText: {
    fontWeight: '600',
    color: '#4B5563',
    fontSize: 16,
  },
  updateButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    backgroundColor: '#1E90FF',
    alignItems: 'center',
  },
  fullWidthButton: {
    flex: 1,
    marginLeft: 0,
  },
  updateButtonText: {
    fontWeight: '600',
    color: '#FFF',
    fontSize: 16,
  },
});

export default UpdateModal;
