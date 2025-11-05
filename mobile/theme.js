import { DefaultTheme } from 'react-native-paper';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0b67ff',
    accent: '#00c2a8',
    background: '#f7f8fb',
    surface: '#ffffff',
    text: '#111827',
    placeholder: '#94a3b8',
    success: '#10b981',
    danger: '#ef4444'
  },
  roundness: 12,
  // small layout helpers for consistent spacing
  spacing: {
    xs: 6,
    sm: 12,
    md: 16,
    lg: 24
  }
};

export default theme;
