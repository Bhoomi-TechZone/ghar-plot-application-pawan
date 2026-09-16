/**
 * Web shim for react-native-linear-gradient
 * Renders a View with a CSS linear-gradient background.
 */

import React from 'react';
import { View } from 'react-native';

const LinearGradient = ({
  colors = ['#1E90FF', '#5DA9F6'],
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
  locations,
  style,
  children,
  ...rest
}) => {
  // Convert start/end {x,y} to CSS gradient direction
  const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);

  const stops = colors
    .map((color, i) => {
      const pct = locations
        ? `${locations[i] * 100}%`
        : `${Math.round((i / (colors.length - 1)) * 100)}%`;
      return `${color} ${pct}`;
    })
    .join(', ');

  const gradient = `linear-gradient(${angle}deg, ${stops})`;

  return (
    <View
      style={[style, { backgroundImage: gradient } ]}
      {...rest}
    >
      {children}
    </View>
  );
};

export default LinearGradient;
