import React from 'react';
import { Platform, Text } from 'react-native';

// Import icons conditionally - use dynamic import to avoid bundling issues
let IoniconsIcon = null;

// Platform-specific icon component
const Icon = ({ name, size = 24, color = '#000', style, ...props }) => {
  // For web, use text-based fallback icons
  if (Platform.OS === 'web') {
    const iconMap = {
      'home': '🏠',
      'search': '🔍',
      'person': '👤',
      'notifications': '🔔',
      'heart': '❤️',
      'heart-outline': '🤍',
      'arrow-back': '←',
      'arrow-forward': '→',
      'chevron-back': '‹',
      'chevron-forward': '›',
      'add': '+',
      'close': '×',
      'menu': '☰',
      'settings': '⚙️',
      'location': '📍',
      'camera': '📷',
      'image': '🖼️',
      'star': '⭐',
      'star-outline': '☆',
      'phone': '📱',
      'mail': '✉️',
      'lock-closed': '🔒',
      'eye': '👁️',
      'eye-off': '🙈',
      'send': '📤',
      'attach': '📎',
      'more-horizontal': '⋯',
      'more-vertical': '⋮',
      'checkmark': '✓',
      'time': '🕐',
      'calendar': '📅',
      'document': '📄',
      'folder': '📁',
      'trash': '🗑️',
      'edit': '✏️',
      'share': '↗️',
      'download': '⬇️',
      'refresh': '🔄',
      'play': '▶️',
      'pause': '⏸️',
      'stop': '⏹️'
    };

    const iconText = iconMap[name] || '?';
    
    return (
      <Text 
        style={[
          {
            fontSize: size,
            color,
            lineHeight: size,
            textAlign: 'center'
          },
          style
        ]}
        {...props}
      >
        {iconText}
      </Text>
    );
  }

  // For mobile platforms, try to use react-native-vector-icons with fallback
  try {
    if (!IoniconsIcon && Platform.OS !== 'web') {
      // Only load on mobile platforms
      IoniconsIcon = require('react-native-vector-icons/Ionicons').default;
    }
    if (IoniconsIcon) {
      return <IoniconsIcon name={name} size={size} color={color} style={style} {...props} />;
    }
  } catch (error) {
    console.warn('Failed to load react-native-vector-icons:', error);
  }
  
  // Fallback for both web and when icons fail to load
  return (
    <Text style={[{ fontSize: size, color }, style]} {...props}>
      ?
    </Text>
  );
};

export default Icon;