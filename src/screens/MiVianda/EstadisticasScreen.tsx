import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text, useTheme } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { ClientEvent, Period } from "../../types/types";
import { STORAGE_KEYS } from "../../utils/storage";
import { CONTENT_MAX_WIDTH, getFontSize, getLineHeight, getSpacing } from "../../theme/layout";

export default function EstadisticasScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 22);
  const bodySize = getFontSize(width, 16);

  const [eventos, setEventos] = useState<ClientEvent[]>([]);
  const [periodos, setPeriodos] = useState<Period[]>([]);

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
          fontSize: bodySize,
          lineHeight: getLineHeight(bodySize),
          color: theme.colors.onSurfaceVariant,
        },
        card: {
          marginTop: spacing,
          padding: spacing,
          borderRadius: 14,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          gap: 8,
        },
        sectionTitle: {
          fontSize: getFontSize(width, 18),
          fontWeight: "700",
          marginTop: 8,
          marginBottom: 4,
        },
        emptyText: {
          color: theme.colors.onSurfaceVariant,
        },
        monthBlock: {
          marginTop: 8,
          marginBottom: 4,
        },
        monthTitle: {
          fontWeight: "700",
        },
      }),
    [
      bodySize,
      spacing,
      theme.colors.background,
      theme.colors.onSurface,
      theme.colors.onSurfaceVariant,
      theme.colors.outline,
      theme.colors.surface,
      titleSize,
      width,
    ]
  );

  const loadEventos = useCallback(async () => {
    const [dataEventos, dataPeriodos] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.EVENTOS_CLIENTE),
      AsyncStorage.getItem(STORAGE_KEYS.PERIODOS),
    ]);
    setEventos(dataEventos ? (JSON.parse(dataEventos) as ClientEvent[]) : []);
    setPeriodos(dataPeriodos ? (JSON.parse(dataPeriodos) as Period[]) : []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEventos();
    }, [loadEventos])
  );

  const stats = useMemo(() => {
    const pagosPorMes: Record<string, number> = {};
    const periodosPorMes: Record<string, Record<string, number>> = {};

    eventos
      .filter((ev) => ev.tipo === "pago")
      .forEach((ev) => {
        const mes = ev.fecha.slice(0, 7);
        pagosPorMes[mes] = (pagosPorMes[mes] ?? 0) + 1;
      });

    periodos.forEach((periodo) => {
      const mes = periodo.inicio.slice(0, 7);
      if (!periodosPorMes[mes]) periodosPorMes[mes] = { pagado: 0, impago: 0 };
      periodosPorMes[mes][periodo.estado] = (periodosPorMes[mes][periodo.estado] ?? 0) + 1;
    });

    const pagosList = Object.entries(pagosPorMes).sort((a, b) => b[0].localeCompare(a[0]));
    const periodosList = Object.entries(periodosPorMes).sort((a, b) => b[0].localeCompare(a[0]));

    return { pagosList, periodosList };
  }, [eventos, periodos]);

  const formatMes = (key: string) => {
    const [year, month] = key.split("-").map(Number);
    const label = new Date(year, month - 1, 1).toLocaleDateString("es-AR", {
      month: "long",
      year: "numeric",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Text style={styles.title}>Estadísticas</Text>
          <Text style={styles.subtitle}>
            Resumen histórico de pagos y periodos para ver cómo avanza cada cliente.
          </Text>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pagos por mes</Text>
            {stats.pagosList.length === 0 ? (
              <Text style={styles.emptyText}>No hay pagos registrados todavía.</Text>
            ) : (
              stats.pagosList.map(([mes, cantidad]) => (
                <Text key={mes}>
                  {formatMes(mes)}: {cantidad} pago(s)
                </Text>
              ))
            )}

            <Text style={styles.sectionTitle}>Periodos por mes</Text>
            {stats.periodosList.length === 0 ? (
              <Text style={styles.emptyText}>No hay periodos registrados todavía.</Text>
            ) : (
              stats.periodosList.map(([mes, valores]) => (
                <View key={mes} style={styles.monthBlock}>
                  <Text style={styles.monthTitle}>{formatMes(mes)}</Text>
                  <Text>Pagados: {valores.pagado ?? 0}</Text>
                  <Text>Impagos: {valores.impago ?? 0}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
