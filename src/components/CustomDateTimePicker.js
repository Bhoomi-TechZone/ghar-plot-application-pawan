import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const getSafeDate = (val) => {
  if (!val) return new Date();
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  const parsed = new Date(val);
  return !isNaN(parsed.getTime()) ? parsed : new Date();
};

const CustomDateTimePicker = ({
  value,
  mode = 'date',
  display,
  onChange,
  onClose,
  title,
  textColor = '#0F172A',
  themeVariant = 'light',
  minimumDate,
  maximumDate,
  is24Hour = false,
  minuteInterval,
  ...rest
}) => {
  // Always declare hooks unconditionally
  const [selectedDate, setSelectedDate] = useState(() => getSafeDate(value));

  useEffect(() => {
    setSelectedDate(getSafeDate(value));
  }, [value]);

  // If not iOS, render standard native DateTimePicker (Android already shows native dialog)
  if (Platform.OS !== 'ios') {
    return (
      <DateTimePicker
        value={value instanceof Date && !isNaN(value.getTime()) ? value : new Date()}
        mode={mode}
        display={display || 'default'}
        onChange={onChange}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        is24Hour={is24Hour}
        minuteInterval={minuteInterval}
        {...rest}
      />
    );
  }

  const handlePickerChange = (event, date) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleCancel = () => {
    if (onChange) {
      onChange({ type: 'dismissed' }, undefined);
    }
    if (onClose) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (onChange) {
      onChange({ type: 'set' }, selectedDate);
    }
    if (onClose) {
      onClose();
    }
  };

  const modalTitle =
    title ||
    (mode === 'time'
      ? 'Select Time'
      : mode === 'datetime'
      ? 'Select Date & Time'
      : 'Select Date');

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={true}
      onRequestClose={handleCancel}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>{modalTitle}</Text>
              </View>

              {/* Picker Body */}
              <View style={styles.pickerWrapper}>
                <DateTimePicker
                  value={selectedDate}
                  mode={mode}
                  display={display || 'spinner'}
                  onChange={handlePickerChange}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  is24Hour={is24Hour}
                  minuteInterval={minuteInterval}
                  textColor={textColor}
                  themeVariant={themeVariant}
                  style={styles.picker}
                  {...rest}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.confirmBtn]}
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  pickerWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  picker: {
    height: 180,
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmBtn: {
    backgroundColor: '#0D47A1',
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default CustomDateTimePicker;
