import { House, Receipt, Database } from "lucide-react-native";
import React, { useMemo } from "react";
import { View, TouchableOpacity, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, useTheme } from "react-native-paper";
import { useStore } from "../../store/zustand";

import { useNavigation } from "@react-navigation/native";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../types/types";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ScreenSelector() {
  const navigation = useNavigation<NavigationProp>();
  const { misGastosUbicacion, setMisGastosUbi } = useStore();

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const isSmallScreen = width < 360;
  const bottomPadding = Math.max(insets.bottom, isSmallScreen ? 8 : 10);


  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: theme.colors.primary,
          width: "100%",
          justifyContent: "center",
          paddingHorizontal: isSmallScreen ? 10 : 16,
          paddingTop: isSmallScreen ? 6 : 8,
          paddingBottom: bottomPadding,
          borderTopWidth: 1,
          borderTopColor: theme.colors.outline,
        },
        screenSel: {
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
          minHeight: isSmallScreen ? 58 : 66,
        },
        button: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 6,
          borderRadius: 12,
        },
        buttonActive: {
          backgroundColor: theme.colors.secondary,
        },
        label: {
          marginTop: 2,
          fontSize: isSmallScreen ? 11 : 12,
          color: theme.colors.onPrimary,
          fontWeight: "600",
        },
      }),
    [
      bottomPadding,
      isSmallScreen,
      theme.colors.onPrimary,
      theme.colors.outline,
      theme.colors.primary,
      theme.colors.secondary,
    ]
  );

  const items = [
    // El contenido en MisGastos renderiza "Resumen" para el botón "Inicio".
    { key: "Resumen", label: "Inicio", icon: House, screen: "Resumen" },
    { key: "Gastos", label: "Gastos", icon: Receipt, screen: "Gastos" },
    { key: "Respaldo", label: "Respaldo", icon: Database, screen: "Respaldo" },
  ] as const;

  return (
    <View style={styles.container}>
      <View style={styles.screenSel}>
        {items.map((item) => {
          const active = misGastosUbicacion === item.key;
          const Icon = item.icon;
          const iconColor = active ? theme.colors.onPrimary : "rgba(255,255,255,0.7)";
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.button, active && styles.buttonActive]}
              onPress={() => {
                // Navegación real dentro del stack de MisGastos
                // (App.tsx declara MisGastosStack con: Home, Resumen, Categorias, Gastos, Respaldo)
                // Cambiar de pantalla SIN reset del stack para que el overlay/animaciones no se remonte.
                setMisGastosUbi(item.key);

                // Navegar dentro del stack de MisGastos:
                // App.tsx renderiza MisGastos como stack propio (Home, Resumen, Categorias, Gastos, Respaldo)
                // En este selector, route params no son necesarios; solo activamos el screen.
                // Navegamos al módulo MisGastos y activamos el screen interno.
                navigation.navigate("MisGastos" as any, { screen: item.key } as any);


              }}


              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Icon color={iconColor} size={isSmallScreen ? 26 : 30} />
              <Text style={styles.label}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
