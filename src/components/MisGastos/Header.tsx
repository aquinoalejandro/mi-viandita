import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import { CommonActions, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { House, Wallet } from "lucide-react-native";
import type { RootStackParamList } from "../../types/types";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function Header() {
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const isSmallScreen = width < 360;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: theme.colors.primary,
          width: "100%",
          paddingHorizontal: isSmallScreen ? 16 : 22,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255, 255, 255, 0.12)",
        },
        content: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        brandRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        },
        iconBadge: {
          width: isSmallScreen ? 38 : 44,
          height: isSmallScreen ? 38 : 44,
          borderRadius: 12,
          backgroundColor: "rgba(255, 255, 255, 0.16)",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.22)",
        },
        titleBlock: {
          gap: 1,
        },
        eyebrow: {
          color: "rgba(255, 255, 255, 0.75)",
          fontSize: isSmallScreen ? 10 : 11,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 1,
        },
        title: {
          color: "#ffffff",
          fontSize: isSmallScreen ? 20 : 23,
          fontWeight: "800",
          letterSpacing: 0.3,
        },
        homeButton: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: "rgba(255, 255, 255, 0.14)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.24)",
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 7,
        },
        homeButtonLabel: {
          color: "#ffffff",
          fontSize: isSmallScreen ? 11 : 12,
          fontWeight: "700",
        },
      }),
    [isSmallScreen, theme.colors.primary]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.iconBadge}>
            <Wallet color="#ffffff" size={isSmallScreen ? 20 : 24} strokeWidth={2.2} />
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>MiViandita</Text>
            <Text style={styles.title}>MisGastos</Text>
          </View>
        </View>
        <Pressable
          onPress={() =>
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "Bienvenida" }],
              })
            )
          }
          style={styles.homeButton}
          accessibilityRole="button"
          accessibilityLabel="Volver a inicio"
        >
          <House color="#ffffff" size={15} strokeWidth={2.4} />
          <Text style={styles.homeButtonLabel}>Inicio</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
