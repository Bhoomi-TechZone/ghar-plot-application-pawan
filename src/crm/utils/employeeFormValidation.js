/**
 * Employee Form Validation Utilities
 * Centralized validation logic for employee forms
 */

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  const phoneDigits = phone.replace(/\D/g, '');
  return phoneDigits.length >= 10 && phoneDigits.length <= 11;
};

export const validatePassword = (password, minLength = 6) => {
  return password && password.length >= minLength;
};

export const validatePasswordMatch = (password, confirmPassword) => {
  return password === confirmPassword;
};

export const validateName = (name, minLength = 2) => {
  return name && name.trim().length >= minLength;
};

export const validateDepartment = (department) => {
  return department && department.trim().length > 0;
};

export const validateRole = (role) => {
  return role && role.length > 0;
};

export const sanitizePhoneNumber = (phone) => {
  return phone.replace(/[^\d+]/g, '');
};

export const sanitizeEmail = (email) => {
  return email.toLowerCase().trim();
};

export const formatPhoneNumber = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11) {
    return `+${cleaned.slice(0, 1)} ${cleaned.slice(1, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
};

export const validateEmployeeForm = (formData, isEditing = false) => {
  const errors = {};

  // Name validation
  if (!formData.name || !formData.name.trim()) {
    errors.name = 'Full name is required';
  } else if (!validateName(formData.name)) {
    errors.name = 'Name must be at least 2 characters';
  }

  // Email validation
  if (!formData.email || !formData.email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(formData.email)) {
    errors.email = 'Invalid email format';
  }

  // Phone validation
  if (!formData.phone || !formData.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!validatePhone(formData.phone)) {
    errors.phone = 'Phone must be 10-11 digits';
  }

  // Role validation
  if (!formData.role) {
    errors.role = 'Role is required';
  }

  // Department validation
  if (!formData.department || !formData.department.trim()) {
    errors.department = 'Department is required';
  }

  // Password validation
  if (!isEditing) {
    // New employee - password is required
    if (!formData.password || !formData.password.trim()) {
      errors.password = 'Password is required for new employees';
    } else if (!validatePassword(formData.password)) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword || !formData.confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm password';
    } else if (!validatePasswordMatch(formData.password, formData.confirmPassword)) {
      errors.confirmPassword = 'Passwords do not match';
    }
  } else {
    // Editing - password is optional
    if (formData.password && formData.password.trim()) {
      if (!validatePassword(formData.password)) {
        errors.password = 'Password must be at least 6 characters';
      }

      if (!formData.confirmPassword || !formData.confirmPassword.trim()) {
        errors.confirmPassword = 'Please confirm new password';
      } else if (!validatePasswordMatch(formData.password, formData.confirmPassword)) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const prepareEmployeeSubmitData = (formData, isEditing = false) => {
  const submitData = {
    name: formData.name.trim(),
    email: sanitizeEmail(formData.email),
    phone: sanitizePhoneNumber(formData.phone),
    role: formData.role,
    department: formData.department.trim(),
    giveAdminAccess: formData.giveAdminAccess || false,
  };

  // Add address only if it has any data
  if (
    formData.address &&
    (formData.address.street ||
      formData.address.city ||
      formData.address.state ||
      formData.address.zipCode ||
      formData.address.country)
  ) {
    submitData.address = {
      street: formData.address.street || '',
      city: formData.address.city || '',
      state: formData.address.state || '',
      zipCode: formData.address.zipCode || '',
      country: formData.address.country || 'India',
    };
  }

  // Handle password
  if (!isEditing) {
    // New employee - password is required
    submitData.password = formData.password;
  } else {
    // Editing - add password only if provided
    if (formData.password && formData.password.trim()) {
      submitData.password = formData.password;
    }
  }

  return submitData;
};

export const getFormErrorSummary = (errors) => {
  const errorMessages = Object.values(errors).filter(Boolean);
  if (errorMessages.length === 0) {
    return null;
  }
  return errorMessages.join('\n');
};
