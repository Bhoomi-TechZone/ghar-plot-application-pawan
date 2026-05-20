/**
 * Web shim for @react-native-community/datetimepicker
 * Wraps native HTML <input type="date"> / <input type="time">.
 */

import React from 'react';

const DateTimePicker = ({
  value,
  mode = 'date',
  onChange,
  minimumDate,
  maximumDate,
  disabled = false,
  display,
  ...rest
}) => {
  const toInputValue = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (mode === 'time') {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    // date or datetime
    return d.toISOString().split('T')[0];
  };

  const handleChange = (e) => {
    if (!onChange) return;
    const raw = e.target.value;
    let date;
    if (mode === 'time') {
      const [hh, mm] = raw.split(':');
      date = new Date(value || Date.now());
      date.setHours(Number(hh), Number(mm), 0, 0);
    } else {
      date = new Date(raw);
    }
    onChange({ type: 'set', nativeEvent: { timestamp: date.getTime() } }, date);
  };

  const inputType = mode === 'time' ? 'time' : 'date';
  const min = minimumDate ? toInputValue(minimumDate) : undefined;
  const max = maximumDate ? toInputValue(maximumDate) : undefined;

  return (
    <input
      type={inputType}
      value={toInputValue(value)}
      min={min}
      max={max}
      disabled={disabled}
      onChange={handleChange}
      style={{ fontSize: 16, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
    />
  );
};

export default DateTimePicker;
