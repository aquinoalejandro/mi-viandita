import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CommonActions, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Surface, Text, useTheme } from "react-native-paper";
import { ArrowRight, UtensilsCrossed, Wallet } from "lucide-react-native";

import type { RootStackParamList } from "../types/types";
import { CONTENT_MAX_WIDTH, getFontSize, getLineHeight, getSpacing } from "../theme/layout";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Bienvenida">;

export default function BienvenidaScreen() {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 30);
  const bodySize = getFontSize(width, 15);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        scroll: {
          flexGrow: 1,
          justifyContent: "center",
          padding: spacing,
        },
        panel: {
          alignSelf: "center",
          width: "100%",
          maxWidth: CONTENT_MAX_WIDTH,
          borderRadius: 28,
          padding: spacing + 4,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          gap: 20,
        },
        headerBlock: {
          gap: 6,
        },
        eyebrow: {
          color: theme.colors.primary,
          fontSize: getFontSize(width, 12),
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 1,
        },
        title: {
          color: theme.colors.onSurface,
          fontSize: titleSize,
          fontWeight: "800",
          letterSpacing: -0.5,
        },
        body: {
          color: theme.colors.onSurfaceVariant,
          fontSize: bodySize,
          lineHeight: getLineHeight(bodySize),
        },
        cardsList: {
          gap: 12,
        },
        moduleCardPrimary: {
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          padding: 16,
          borderRadius: 20,
          backgroundColor: theme.colors.primary,
        },
        moduleCardSecondary: {
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          padding: 16,
          borderRadius: 20,
          backgroundColor: theme.colors.surfaceVariant,
          borderWidth: 1,
          borderColor: theme.colors.outline,
        },
        iconBoxPrimary: {
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: "rgba(255, 255, 255, 0.16)",
          alignItems: "center",
          justifyContent: "center",
        },
        iconBoxSecondary: {
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: `${theme.colors.primary}15`,
          alignItems: "center",
          justifyContent: "center",
        },
        cardTextBlock: {
          flex: 1,
          gap: 2,
        },
        cardTitlePrimary: {
          color: "#ffffff",
          fontSize: getFontSize(width, 18),
          fontWeight: "800",
        },
        cardDescPrimary: {
          color: "rgba(255, 255, 255, 0.85)",
          fontSize: getFontSize(width, 13),
          lineHeight: getLineHeight(getFontSize(width, 13)),
        },
        cardTitleSecondary: {
          color: theme.colors.onSurface,
          fontSize: getFontSize(width, 18),
          fontWeight: "800",
        },
        cardDescSecondary: {
          color: theme.colors.onSurfaceVariant,
          fontSize: getFontSize(width, 13),
          lineHeight: getLineHeight(getFontSize(width, 13)),
        },
      }),
    [
      bodySize,
      spacing,
      theme.colors.background,
      theme.colors.onSurface,
      theme.colors.onSurfaceVariant,
      theme.colors.outline,
      theme.colors.primary,
      theme.colors.surface,
      theme.colors.surfaceVariant,
      titleSize,
      width,
    ]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Surface style={styles.panel} elevation={1}>
          <View style={styles.headerBlock}>
            <Text style={styles.eyebrow}>Bienvenido a</Text>
            <Text style={styles.title}>MiViandita</Text>
            <Text style={styles.body}>
              Elegí qué sección de la app querés abrir. Todo se guarda de forma segura en tu
              dispositivo.
            </Text>
          </View>

          <View style={styles.cardsList}>
            <Pressable
              style={({ pressed }) => [
                styles.moduleCardPrimary,
                pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
              ]}
              onPress={() =>
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: "MiVianda" }],
                  })
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Ir a MiVianda"
            >
              <View style={styles.iconBoxPrimary}>
                <UtensilsCrossed color="#ffffff" size={24} strokeWidth={2.2} />
              </View>
              <View style={styles.cardTextBlock}>
                <Text style={styles.cardTitlePrimary}>MiVianda</Text>
                <Text style={styles.cardDescPrimary}>
                  Clientes, ciclos de cobro de 20 días hábiles, calendario y feriados.
                </Text>
              </View>
              <ArrowRight color="#ffffff" size={20} strokeWidth={2.3} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.moduleCardSecondary,
                pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
              ]}
              onPress={() =>
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: "MisGastos", params: { screen: "Resumen" } }],
                  })
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Ir a MisGastos"
            >
              <View style={styles.iconBoxSecondary}>
                <Wallet color={theme.colors.primary} size={24} strokeWidth={2.2} />
              </View>
              <View style={styles.cardTextBlock}>
                <Text style={styles.cardTitleSecondary}>MisGastos</Text>
                <Text style={styles.cardDescSecondary}>
                  Categorías personalizadas, registro en pesos y análisis por período.
                </Text>
              </View>
              <ArrowRight color={theme.colors.primary} size={20} strokeWidth={2.3} />
            </Pressable>
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}
