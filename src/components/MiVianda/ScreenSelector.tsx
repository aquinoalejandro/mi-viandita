import { House, ReceiptText, Box, CalendarDays } from "lucide-react-native";
import React, { useMemo } from "react";
import { View, TouchableOpacity, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MiViandaStackParamList, RootStackParamList } from "../../types/types";
import { useStore } from "../../store/zustand";
import { useTheme, Text } from "react-native-paper";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "MiVianda">;

export default function ScreenSelector() {
  const { ubicacion, setUbi } = useStore();
  const navigation = useNavigation<NavigationProp>();
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
    { key: "Clientes", label: "Clientes", icon: House },
    { key: "Cobros", label: "Cobros", icon: ReceiptText },
    { key: "Calendario", label: "Calendario", icon: CalendarDays },
    { key: "Configuracion", label: "Ajustes", icon: Box },
  ] as const;

  return (
    <View style={styles.container}>
      <View style={styles.screenSel}>
        {items.map((item) => {
          const active = ubicacion === item.key;
          const Icon = item.icon;
          const iconColor = active ? theme.colors.onPrimary : "rgba(255,255,255,0.7)";
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.button, active && styles.buttonActive]}
              onPress={() => {
                // Cambiar de screen dentro de MiVianda SIN reset para que el overlay/animaciones no se remonte.
                setUbi(item.key);
                navigation.navigate("MiVianda" as any, { screen: item.key } as any);

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
