import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Picker as NativePicker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PickerItem = (props) => null;

const AppDropdownPicker = (props) => {
  const {
    children,
    selectedValue,
    onValueChange,
    style,
    dropdownIconColor = '#009688',
    enabled = true,
    prompt,
    ...rest
  } = props;

  // On Android, continue using the native Picker which works 100% as expected
  if (Platform.OS === 'android') {
    return (
      <NativePicker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        style={style}
        dropdownIconColor={dropdownIconColor}
        enabled={enabled}
        prompt={prompt}
        {...rest}
      >
        {children}
      </NativePicker>
    );
  }

  // --- iOS Bottom Sheet Dropdown Implementation ---
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract items from children
  const items = useMemo(() => {
    const list = [];
    React.Children.forEach(children, (child, idx) => {
      if (React.isValidElement(child) && child.props) {
        list.push({
          key: child.key || `picker_item_${idx}`,
          label: child.props.label !== undefined ? String(child.props.label) : '',
          value: child.props.value,
          color: child.props.color,
          enabled: child.props.enabled !== false,
          index: idx,
        });
      }
    });
    return list;
  }, [children]);

  // Find currently selected item
  const selectedItem = useMemo(() => {
    if (selectedValue === undefined || selectedValue === null) return null;
    return items.find((item) => {
      if (item.value === selectedValue) return true;
      if (item.value !== '' && String(item.value) === String(selectedValue)) return true;
      return false;
    });
  }, [items, selectedValue]);

  // Determine display label and placeholder status
  const isSelectedValid = selectedItem && selectedItem.value !== '' && selectedItem.value !== undefined;
  const displayLabel = isSelectedValid
    ? selectedItem.label
    : (items[0]?.label || prompt || 'Select an option');
  const isPlaceholder = !isSelectedValid;

  // Title for sheet header
  const sheetTitle = prompt || (items[0]?.value === '' ? items[0].label : 'Select an Option');

  // Filter items if searching
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter((item) => item.label && item.label.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const handleOpen = () => {
    if (!enabled) return;
    setSearchQuery('');
    setModalVisible(true);
  };

  const handleClose = () => {
    setModalVisible(false);
    setSearchQuery('');
  };

  const handleSelect = (item) => {
    handleClose();
    if (onValueChange) {
      onValueChange(item.value, item.index);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={handleOpen}
        disabled={!enabled}
        activeOpacity={0.7}
        style={[styles.pickerTrigger, style, !enabled && styles.disabledTrigger]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.triggerText,
            isPlaceholder ? styles.placeholderText : styles.selectedText,
          ]}
        >
          {displayLabel}
        </Text>
        <MaterialIcons
          name="keyboard-arrow-down"
          size={22}
          color={enabled ? dropdownIconColor : '#94a3b8'}
          style={styles.chevronIcon}
        />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                {/* Drag Handle Indicator */}
                <View style={styles.dragHandle} />

                {/* Header */}
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle} numberOfLines={1}>
                    {sheetTitle}
                  </Text>
                  <TouchableOpacity
                    onPress={handleClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.closeBtn}
                  >
                    <MaterialIcons name="close" size={22} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Optional Search Input if items > 6 */}
                {items.length > 6 && (
                  <View style={styles.searchContainer}>
                    <MaterialIcons name="search" size={20} color="#94a3b8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search options..."
                      placeholderTextColor="#94a3b8"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoCapitalize="none"
                      clearButtonMode="while-editing"
                    />
                  </View>
                )}

                {/* Options List */}
                <FlatList
                  data={filteredItems}
                  keyExtractor={(item) => String(item.key || item.value || item.index)}
                  keyboardShouldPersistTaps="handled"
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }) => {
                    const isSelected = selectedItem?.value === item.value && item.value !== '';
                    const isItemPlaceholder = item.value === '';

                    return (
                      <TouchableOpacity
                        onPress={() => handleSelect(item)}
                        style={[
                          styles.optionRow,
                          isSelected && styles.selectedOptionRow,
                        ]}
                        activeOpacity={0.65}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            isItemPlaceholder && styles.optionPlaceholderText,
                            isSelected && styles.selectedOptionText,
                            item.color ? { color: item.color } : null,
                          ]}
                          numberOfLines={2}
                        >
                          {item.label}
                        </Text>
                        {isSelected ? (
                          <MaterialIcons name="check" size={20} color="#009688" />
                        ) : null}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No options found</Text>
                    </View>
                  }
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

AppDropdownPicker.Item = PickerItem;

const styles = StyleSheet.create({
  pickerTrigger: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  disabledTrigger: {
    opacity: 0.5,
  },
  triggerText: {
    flex: 1,
    fontSize: 13,
    paddingRight: 6,
  },
  placeholderText: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  selectedText: {
    color: '#1e293b',
    fontWeight: '600',
  },
  chevronIcon: {
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '75%',
    minHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    paddingVertical: 0,
  },
  list: {
    flexGrow: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 2,
  },
  selectedOptionRow: {
    backgroundColor: '#f0fdfa',
  },
  optionText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
  optionPlaceholderText: {
    color: '#94a3b8',
  },
  selectedOptionText: {
    color: '#009688',
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
});

export default AppDropdownPicker;
