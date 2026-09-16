/**
 * timezoneHelper.js
 * Utility functions for timezone conversion and formatting
 * Converts UTC dates from backend to Indian Standard Time (IST)
 */

/**
 * Convert UTC date to IST and format for display
 * @param {string|Date} utcDate - UTC date string or Date object
 * @returns {string} Formatted date string in IST (DD/MM/YYYY, HH:MM)
 */
export const formatToIST = (utcDate) => {
  if (!utcDate) return '';
  
  try {
    const date = new Date(utcDate);
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch (error) {
    console.error('Error formatting date to IST:', error);
    return '';
  }
};

/**
 * Convert UTC date to IST and return only date part
 * @param {string|Date} utcDate - UTC date string or Date object
 * @returns {string} Formatted date string in IST (DD/MM/YYYY)
 */
export const formatDateToIST = (utcDate) => {
  if (!utcDate) return '';
  
  try {
    const date = new Date(utcDate);
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting date to IST:', error);
    return '';
  }
};

/**
 * Convert UTC date to IST and return only time part
 * @param {string|Date} utcDate - UTC date string or Date object
 * @returns {string} Formatted time string in IST (HH:MM)
 */
export const formatTimeToIST = (utcDate) => {
  if (!utcDate) return '';
  
  try {
    const date = new Date(utcDate);
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch (error) {
    console.error('Error formatting time to IST:', error);
    return '';
  }
};

/**
 * Convert UTC date to IST and return formatted string with custom format
 * @param {string|Date} utcDate - UTC date string or Date object
 * @param {string} format - 'date' | 'time' | 'datetime' | 'full'
 * @returns {string} Formatted string in IST
 */
export const formatUTCToIST = (utcDate, format = 'datetime') => {
  if (!utcDate) return '';
  
  try {
    const date = new Date(utcDate);
    if (isNaN(date.getTime())) return '';
    
    switch (format) {
      case 'date':
        return formatDateToIST(utcDate);
      
      case 'time':
        return formatTimeToIST(utcDate);
      
      case 'datetime':
        return formatToIST(utcDate);
      
      case 'full':
        return date.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      
      default:
        return formatToIST(utcDate);
    }
  } catch (error) {
    console.error('Error formatting UTC to IST:', error);
    return '';
  }
};

/**
 * Get current IST date/time
 * @returns {Date} Current date in IST
 */
export const getCurrentIST = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
};

/**
 * Convert local date to UTC for backend
 * @param {Date} localDate - Local date object
 * @returns {string} ISO string in UTC
 */
export const convertLocalToUTC = (localDate) => {
  if (!localDate) return '';
  
  try {
    return new Date(localDate).toISOString();
  } catch (error) {
    console.error('Error converting local to UTC:', error);
    return '';
  }
};

/**
 * Format date and time separately for display
 * @param {string|Date} utcDate - UTC date string or Date object
 * @returns {object} Object with separate date and time strings
 */
export const formatDateTimeToIST = (utcDate) => {
  if (!utcDate) return { date: '', time: '' };
  
  try {
    const date = new Date(utcDate);
    if (isNaN(date.getTime())) return { date: '', time: '' };
    
    return {
      date: formatDateToIST(utcDate),
      time: formatTimeToIST(utcDate),
    };
  } catch (error) {
    console.error('Error formatting date/time to IST:', error);
    return { date: '', time: '' };
  }
};
