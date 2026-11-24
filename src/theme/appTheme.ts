import { MD3LightTheme } from "react-native-paper";

const sharedSemanticColors = {
  surface: "#ffffff",
  text: "#1c1c1c",
  accent: "#f4b740",
  success: "#2f855a",
  warning: "#d97706",
  danger: "#c0392b",
  info: "#2563eb",
};

export const miViandaPalette = {
  primary: "#1b5e3c",
  primarySoft: "#dcf2e6",
  secondary: "#2e7d57",
  background: "#f5f8f6",
  surfaceVariant: "#eef5f0",
  muted: "#52665b",
  border: "#d3e2d9",
  borderSoft: "#e2ede6",
  ...sharedSemanticColors,
};

export const misGastosPalette = {
  primary: "#1d4f91",
  primarySoft: "#dbeafe",
  secondary: "#2f6bc4",
  background: "#f5f7fb",
  surfaceVariant: "#eef3fa",
  muted: "#526075",
  border: "#d4dfee",
  borderSoft: "#e3ebf5",
  ...sharedSemanticColors,
};

export type AppPalette = typeof miViandaPalette;

export const palette = miViandaPalette;

const createModuleTheme = (p: AppPalette, secondaryContainer: string) => ({
  ...MD3LightTheme,
  roundness: 14,
  colors: {
    ...MD3LightTheme.colors,
    primary: p.primary,
    primaryContainer: p.primarySoft,
    onPrimaryContainer: p.primary,
    secondary: p.secondary,
    secondaryContainer,
    onSecondaryContainer: p.primary,
    tertiary: p.accent,
    error: p.danger,
    onError: "#ffffff",
    errorContainer: "#fdecec",
    onErrorContainer: p.danger,
    background: p.background,
    surface: p.surface,
    surfaceVariant: p.surfaceVariant,
    onSurface: p.text,
    onSurfaceVariant: p.muted,
    outline: p.border,
    outlineVariant: p.borderSoft,
    onPrimary: "#ffffff",
    onSecondary: "#ffffff",
    elevation: {
      level0: p.surface,
      level1: p.surface,
      level2: p.surface,
      level3: p.surface,
      level4: p.surface,
      level5: p.surface,
    },
  },
});

export const miViandaTheme = createModuleTheme(miViandaPalette, "#e0f0e6");
export const misGastosTheme = createModuleTheme(misGastosPalette, "#e2ecfa");
export const appTheme = miViandaTheme;
