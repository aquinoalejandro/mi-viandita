import { CalendarDays, ReceiptText, Settings, Users } from "lucide-react-native";
import React, { useMemo } from "react";
import { View, TouchableOpacity, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme, Text } from "react-native-paper";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../types/types";
import { useStore } from "../../store/zustand";

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
          paddingHorizontal: isSmallScreen ? 8 : 14,
          paddingTop: isSmallScreen ? 6 : 8,
          paddingBottom: bottomPadding,
          borderTopWidth: 1,
          borderTopColor: "rgba(255, 255, 255, 0.12)",
        },
        screenSel: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          minHeight: isSmallScreen ? 56 : 64,
          gap: 6,
        },
        button: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 7,
          borderRadius: 14,
        },
        buttonActive: {
          backgroundColor: "rgba(255, 255, 255, 0.18)",
        },
        label: {
          marginTop: 3,
          fontSize: isSmallScreen ? 10 : 11,
          color: "rgba(255, 255, 255, 0.72)",
          fontWeight: "600",
        },
        labelActive: {
          color: "#ffffff",
          fontWeight: "800",
        },
      }),
    [bottomPadding, isSmallScreen, theme.colors.primary]
  );

  const items = [
    { key: "Clientes", label: "Clientes", icon: Users },
    { key: "Cobros", label: "Cobros", icon: ReceiptText },
    { key: "Calendario", label: "Calendario", icon: CalendarDays },
    { key: "Configuracion", label: "Ajustes", icon: Settings },
  ] as const;

  return (
    <View style={styles.container}>
      <View style={styles.screenSel}>
        {items.map((item) => {
          const active = ubicacion === item.key;
          const Icon = item.icon;
          const iconColor = active ? "#ffffff" : "rgba(255, 255, 255, 0.65)";
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.button, active && styles.buttonActive]}
              onPress={() => {
                setUbi(item.key);
                navigation.navigate("MiVianda", { screen: item.key });
              }}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              activeOpacity={0.75}
            >
              <Icon color={iconColor} size={isSmallScreen ? 22 : 24} strokeWidth={active ? 2.5 : 2} />
              <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
