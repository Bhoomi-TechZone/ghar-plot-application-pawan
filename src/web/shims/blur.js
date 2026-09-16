/**
 * Web shim for @react-native-community/blur
 * Renders a View with CSS backdrop-filter blur.
 */

import React from 'react';
import { View } from 'react-native';

export const BlurView = ({ blurType = 'light', blurAmount = 10, style, children, ...rest }) => {
  const opacity = blurType === 'dark' ? 0.6 : 0.3;
  const bg = blurType === 'dark' ? `rgba(0,0,0,${opacity})` : `rgba(255,255,255,${opacity})`;

  return (
    <View
      style={[
        style,
        {
          // @ts-ignore — web-only CSS property
          backdropFilter: `blur(${blurAmount}px)`,
          WebkitBackdropFilter: `blur(${blurAmount}px)`,
          backgroundColor: bg,
        },
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

export const VibrancyView = BlurView;

export default BlurView;
