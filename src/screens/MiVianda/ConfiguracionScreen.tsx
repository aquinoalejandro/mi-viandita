import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { List, Text, useTheme } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { MiViandaStackParamList } from "../../types/types";
import { CONTENT_MAX_WIDTH, getFontSize, getLineHeight, getSpacing } from "../../theme/layout";

type NavigationProp = NativeStackNavigationProp<MiViandaStackParamList>;

export default function ConfiguracionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 24);
  const subtitleSize = getFontSize(width, 16);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        scroll: {
          padding: spacing,
          paddingBottom: 130,
        },
        content: {
          width: "100%",
          maxWidth: CONTENT_MAX_WIDTH,
          alignSelf: "center",
        },
        title: {
          fontSize: titleSize,
          fontWeight: "700",
          color: theme.colors.onSurface,
        },
        subtitle: {
          marginTop: 6,
          fontSize: subtitleSize,
          lineHeight: getLineHeight(subtitleSize),
          color: theme.colors.onSurfaceVariant,
        },
        card: {
          marginTop: spacing,
          borderRadius: 14,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          overflow: "hidden",
        },
        listItemTitle: {
          fontSize: getFontSize(width, 18),
          fontWeight: "600",
        },
        listItemDesc: {
          fontSize: getFontSize(width, 15),
          color: theme.colors.onSurfaceVariant,
        },
      }),
    [
      spacing,
      subtitleSize,
      theme.colors.background,
      theme.colors.onSurface,
      theme.colors.onSurfaceVariant,
      theme.colors.outline,
      theme.colors.surface,
      titleSize,
      width,
    ]
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Text style={styles.title}>Configuracion</Text>
          <Text style={styles.subtitle}>
            Organiza cada ajuste en su pantalla. Aca podes gestionar tipos de vianda, feriados,
            estadisticas y respaldo de la informacion.
          </Text>

          <View style={styles.card}>
            <List.Item
              title="Tipos de vianda"
              description="Crea, edita o elimina los tipos disponibles. Se usan al cargar clientes."
              left={(props) => <List.Icon {...props} icon="food" />}
              onPress={() => navigation.navigate("Tipos de vianda")}
              titleStyle={styles.listItemTitle}
              descriptionStyle={styles.listItemDesc}
            />
            <List.Item
              title="Feriados"
              description="Marca días inhábiles para que no cuenten como días hábiles del período."
              left={(props) => <List.Icon {...props} icon="calendar" />}
              onPress={() => navigation.navigate("Feriados")}
              titleStyle={styles.listItemTitle}
              descriptionStyle={styles.listItemDesc}
            />
            <List.Item
              title="Estadisticas"
              description="Revisa el resumen de pagos y periodos por mes."
              left={(props) => <List.Icon {...props} icon="chart-bar" />}
              onPress={() => navigation.navigate("Estadisticas")}
              titleStyle={styles.listItemTitle}
              descriptionStyle={styles.listItemDesc}
            />
            <List.Item
              title="Respaldo"
              description="Exporta o importa tus datos y gestiona un borrado total seguro."
              left={(props) => <List.Icon {...props} icon="cloud-upload" />}
              onPress={() => navigation.navigate("Respaldo")}
              titleStyle={styles.listItemTitle}
              descriptionStyle={styles.listItemDesc}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
