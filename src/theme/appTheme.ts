import { MD3LightTheme } from "react-native-paper";

export const palette = {
  primary: "#1f4d45",
  primarySoft: "#d9ebe4",
  secondary: "#49776f",
  accent: "#f4b740",
  background: "#f6f7f8",
  surface: "#ffffff",
  text: "#1c1c1c",
  muted: "#5f6b69",
  border: "#d9e1de",
  success: "#2f855a",
  warning: "#d97706",
  danger: "#c0392b",
  info: "#2563eb",
};

export const appTheme = {
  ...MD3LightTheme,
  roundness: 14,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.primary,
    secondary: palette.secondary,
    tertiary: palette.accent,
    error: palette.danger,
    background: palette.background,
    surface: palette.surface,
    onSurface: palette.text,
    onSurfaceVariant: palette.muted,
    outline: palette.border,
    onPrimary: "#ffffff",
    onSecondary: "#ffffff",
    elevation: {
      level0: palette.surface,
      level1: palette.surface,
      level2: palette.surface,
      level3: palette.surface,
      level4: palette.surface,
      level5: palette.surface,
    },
  },
};
