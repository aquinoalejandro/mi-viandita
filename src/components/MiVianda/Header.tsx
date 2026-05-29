import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";

type HeaderProps = {
  onHomePress: () => void;
};

export default function Header({ onHomePress }: HeaderProps) {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const isSmallScreen = width < 360;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: theme.colors.primary,
          width: "100%",
          height: isSmallScreen ? 72 : 100,
          justifyContent: "center",
          paddingHorizontal: isSmallScreen ? 18 : 24,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.outline,
        },
        content: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          height: "100%",
        },
        titleBlock: {
          gap: 2,
        },
        eyebrow: {
          color: theme.colors.onPrimary,
          fontSize: isSmallScreen ? 12 : 13,
          fontWeight: "600",
          opacity: 0.75,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        },
        title: {
          color: theme.colors.onPrimary,
          fontSize: isSmallScreen ? 22 : 26,
          fontWeight: "700",
          letterSpacing: 0.2,
        },
        homeButton: {
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.28)",
          borderRadius: 999,
          paddingHorizontal: 14,
          paddingVertical: 8,
        },
        homeButtonLabel: {
          color: theme.colors.onPrimary,
          fontSize: isSmallScreen ? 12 : 13,
          fontWeight: "700",
        },
      }),
    [isSmallScreen, theme.colors.onPrimary, theme.colors.outline, theme.colors.primary]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>MiViandita</Text>
          <Text style={styles.title}>MiVianda</Text>
        </View>
        <Pressable onPress={onHomePress} style={styles.homeButton}>
          <Text style={styles.homeButtonLabel}>Inicio</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
