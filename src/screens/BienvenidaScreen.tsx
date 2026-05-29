import React, { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Button, Surface, Text, useTheme } from "react-native-paper";

import type { RootStackParamList } from "../types/types";
import { CONTENT_MAX_WIDTH, getFontSize, getLineHeight, getSpacing } from "../theme/layout";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Bienvenida">;

export default function BienvenidaScreen() {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 32);
  const bodySize = getFontSize(width, 16);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: "center",
          padding: spacing,
        },
        panel: {
          alignSelf: "center",
          width: "100%",
          maxWidth: CONTENT_MAX_WIDTH,
          borderRadius: 28,
          padding: spacing,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          gap: spacing,
        },
        eyebrow: {
          color: theme.colors.primary,
          fontSize: getFontSize(width, 13),
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 1,
        },
        title: {
          color: theme.colors.onSurface,
          fontSize: titleSize,
          fontWeight: "800",
        },
        body: {
          color: theme.colors.onSurfaceVariant,
          fontSize: bodySize,
          lineHeight: getLineHeight(bodySize),
        },
        section: {
          gap: 12,
        },
        secondaryButton: {
          borderColor: theme.colors.outline,
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
      titleSize,
      width,
    ]
  );

  return (
    <View style={styles.container}>
      <Surface style={styles.panel} elevation={1}>
        <View style={styles.section}>
          <Text style={styles.eyebrow}>Bienvenid@ a</Text>
          <Text style={styles.title}>MiViandita</Text>
          <Text style={styles.body}>
            Elegi que parte de la app queres usar. MiVianda contiene la gestion de tu vianda y MisGastos sirve para administrar tus gastos, tanto personales como los que necesites.
          </Text>
        </View>

        <View style={styles.section}>
          <Button
            mode="contained"
            onPress={() =>
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "MiVianda" }],
                })
              )
            }
          >
            Ir a MiVianda
          </Button>
          <Button
            mode="outlined"
            onPress={() =>
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "MisGastos", params: { screen: "Home" } }],
                })
              )
            }
            style={styles.secondaryButton}
          >
            Ir a MisGastos
          </Button>
        </View>
      </Surface>
    </View>
  );
}
