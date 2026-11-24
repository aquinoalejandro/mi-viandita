import React, { useCallback, useMemo } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Divider, List, Text, useTheme } from "react-native-paper";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useStore } from "../../store/zustand";
import type { MiViandaStackParamList } from "../../types/types";
import { CONTENT_MAX_WIDTH, getFontSize, getLineHeight, getSpacing } from "../../theme/layout";

type NavigationProp = NativeStackNavigationProp<MiViandaStackParamList>;

export default function ConfiguracionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 24);
  const subtitleSize = getFontSize(width, 15);

  const setUbi = useStore((state) => state.setUbi);
  const tiposCount = useStore((state) => state.miViandaTiposVianda.length);
  const feriadosCount = useStore((state) => state.miViandaFeriados.length);
  const clientesCount = useStore((state) => state.miViandaClientes.length);
  const pagosCount = useStore((state) => state.miViandaEventos.length);

  useFocusEffect(
    useCallback(() => {
      setUbi("Configuracion");
    }, [setUbi])
  );

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
          fontWeight: "800",
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
          borderRadius: 16,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          overflow: "hidden",
        },
        listItemTitle: {
          fontSize: getFontSize(width, 17),
          fontWeight: "700",
        },
        listItemDesc: {
          fontSize: getFontSize(width, 14),
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Configuración</Text>
          <Text style={styles.subtitle}>
            Organizá cada ajuste en su pantalla. Acá podés gestionar tipos de vianda, feriados,
            estadísticas y respaldo de la información.
          </Text>

          <View style={styles.card}>
            <List.Item
              title={`Tipos de vianda (${tiposCount})`}
              description="Creá, editá o eliminá los tipos disponibles. Se usan al cargar clientes."
              left={(props) => <List.Icon {...props} icon="food" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate("Tipos de vianda")}
              titleStyle={styles.listItemTitle}
              descriptionStyle={styles.listItemDesc}
            />
            <Divider />
            <List.Item
              title={`Feriados (${feriadosCount})`}
              description="Marcá días inhábiles para que no cuenten como días del ciclo."
              left={(props) => <List.Icon {...props} icon="calendar" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate("Feriados")}
              titleStyle={styles.listItemTitle}
              descriptionStyle={styles.listItemDesc}
            />
            <Divider />
            <List.Item
              title="Estadísticas"
              description={`Revisá producción diaria, ${clientesCount} clientes y ${pagosCount} pagos.`}
              left={(props) => <List.Icon {...props} icon="chart-bar" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate("Estadisticas")}
              titleStyle={styles.listItemTitle}
              descriptionStyle={styles.listItemDesc}
            />
            <Divider />
            <List.Item
              title="Respaldo"
              description="Exportá o importá tus datos y gestioná un borrado total seguro."
              left={(props) => <List.Icon {...props} icon="cloud-upload" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
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
