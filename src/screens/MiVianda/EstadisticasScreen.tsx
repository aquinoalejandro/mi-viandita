import React, { useCallback, useMemo } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Surface, Text, useTheme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";

import { useStore } from "../../store/zustand";
import { palette } from "../../theme/appTheme";
import { CONTENT_MAX_WIDTH, getFontSize, getLineHeight, getSpacing } from "../../theme/layout";
import type { PaymentCycle } from "../../types/types";
import { getClientBillingSnapshot } from "../../utils/billing";
import { getTodayString } from "../../utils/date";

export default function EstadisticasScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 22);
  const bodySize = getFontSize(width, 15);

  const setUbi = useStore((state) => state.setUbi);
  const clientes = useStore((state) => state.miViandaClientes);
  const eventos = useStore((state) => state.miViandaEventos);
  const periodos = useStore((state) => state.miViandaPeriodos);
  const ciclos = useStore((state) => state.miViandaCiclos);
  const feriados = useStore((state) => state.miViandaFeriados);

  const today = getTodayString();

  useFocusEffect(
    useCallback(() => {
      setUbi("Configuracion");
    }, [setUbi])
  );

  const productionStats = useMemo(() => {
    const porTipo = new Map<string, number>();
    let totalViandasDia = 0;

    clientes.forEach((cliente) => {
      cliente.viandas.forEach((v) => {
        const qty = v.cantidad || 0;
        if (qty <= 0) return;
        totalViandasDia += qty;
        const label = v.tipo.trim() || "Sin tipo";
        porTipo.set(label, (porTipo.get(label) ?? 0) + qty);
      });
    });

    const desglose = Array.from(porTipo.entries())
      .map(([tipo, cantidad]) => ({ tipo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    return { totalViandasDia, desglose };
  }, [clientes]);

  const statusStats = useMemo(() => {
    const ciclosByClient = new Map<string, PaymentCycle[]>();
    ciclos.forEach((c) => {
      const arr = ciclosByClient.get(c.clienteId);
      if (arr) arr.push(c);
      else ciclosByClient.set(c.clienteId, [c]);
    });

    const counts = { alDia: 0, proximoCobro: 0, deuda: 0, sinPagos: 0 };
    clientes.forEach((c) => {
      const estado = getClientBillingSnapshot(
        c,
        ciclosByClient.get(c.id) ?? [],
        feriados,
        today
      ).status.estado;
      if (estado === "al-dia") counts.alDia += 1;
      else if (estado === "proximo-cobro") counts.proximoCobro += 1;
      else if (estado === "deuda") counts.deuda += 1;
      else counts.sinPagos += 1;
    });
    return counts;
  }, [ciclos, clientes, feriados, today]);

  const stats = useMemo(() => {
    const pagosPorMes: Record<string, number> = {};
    const periodosPorMes: Record<string, { pagado: number; impago: number }> = {};

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
          gap: 12,
        },
        title: {
          fontSize: titleSize,
          fontWeight: "800",
          color: theme.colors.onSurface,
        },
        subtitle: {
          fontSize: bodySize,
          lineHeight: getLineHeight(bodySize),
          color: theme.colors.onSurfaceVariant,
        },
        card: {
          padding: spacing,
          borderRadius: 16,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          gap: 10,
        },
        sectionTitle: {
          fontSize: getFontSize(width, 17),
          fontWeight: "700",
          color: theme.colors.onSurface,
        },
        kpiGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        },
        kpiBox: {
          flexGrow: 1,
          flexBasis: "46%",
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          backgroundColor: theme.colors.surfaceVariant,
          gap: 2,
        },
        kpiValue: {
          fontSize: 22,
          fontWeight: "800",
        },
        kpiLabel: {
          fontSize: 12,
          fontWeight: "600",
          color: theme.colors.onSurfaceVariant,
        },
        barRow: {
          gap: 4,
        },
        barHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
        },
        barTrack: {
          height: 7,
          borderRadius: 4,
          backgroundColor: theme.colors.outline,
          overflow: "hidden",
        },
        barFill: {
          height: "100%",
          borderRadius: 4,
          backgroundColor: theme.colors.primary,
        },
        emptyText: {
          color: theme.colors.onSurfaceVariant,
        },
        monthBlock: {
          paddingVertical: 6,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.outlineVariant,
          gap: 2,
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
      theme.colors.outlineVariant,
      theme.colors.primary,
      theme.colors.surface,
      theme.colors.surfaceVariant,
      titleSize,
      width,
    ]
  );

  const maxTipoCount = productionStats.desglose[0]?.cantidad || 1;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Estadísticas</Text>
          <Text style={styles.subtitle}>
            Resumen de producción diaria, estado de clientes e historial de pagos.
          </Text>

          <Surface style={styles.card} elevation={0}>
            <Text style={styles.sectionTitle}>Producción diaria</Text>
            <View
              style={[
                styles.kpiBox,
                { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              <Text style={[styles.kpiValue, { color: theme.colors.primary }]}>
                {productionStats.totalViandasDia}
              </Text>
              <Text style={styles.kpiLabel}>
                Viandas totales por día ({clientes.length}{" "}
                {clientes.length === 1 ? "cliente" : "clientes"})
              </Text>
            </View>

            {productionStats.desglose.length === 0 ? (
              <Text style={styles.emptyText}>No hay viandas asignadas todavía.</Text>
            ) : (
              productionStats.desglose.map((item) => {
                const pct = Math.round((item.cantidad / maxTipoCount) * 100);
                return (
                  <View key={item.tipo} style={styles.barRow}>
                    <View style={styles.barHeader}>
                      <Text style={{ fontWeight: "600" }}>{item.tipo}</Text>
                      <Text style={{ fontWeight: "700", color: theme.colors.primary }}>
                        {item.cantidad} / día
                      </Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%` }]} />
                    </View>
                  </View>
                );
              })
            )}
          </Surface>

          <Surface style={styles.card} elevation={0}>
            <Text style={styles.sectionTitle}>Estado de clientes</Text>
            <View style={styles.kpiGrid}>
              <View style={styles.kpiBox}>
                <Text style={[styles.kpiValue, { color: palette.success }]}>
                  {statusStats.alDia}
                </Text>
                <Text style={styles.kpiLabel}>Al día</Text>
              </View>
              <View style={styles.kpiBox}>
                <Text style={[styles.kpiValue, { color: palette.warning }]}>
                  {statusStats.proximoCobro}
                </Text>
                <Text style={styles.kpiLabel}>Próximo cobro</Text>
              </View>
              <View style={styles.kpiBox}>
                <Text style={[styles.kpiValue, { color: palette.danger }]}>
                  {statusStats.deuda}
                </Text>
                <Text style={styles.kpiLabel}>Con deuda</Text>
              </View>
              <View style={styles.kpiBox}>
                <Text style={[styles.kpiValue, { color: theme.colors.onSurfaceVariant }]}>
                  {statusStats.sinPagos}
                </Text>
                <Text style={styles.kpiLabel}>Sin pagos</Text>
              </View>
            </View>
          </Surface>

          <Surface style={styles.card} elevation={0}>
            <Text style={styles.sectionTitle}>Pagos por mes</Text>
            {stats.pagosList.length === 0 ? (
              <Text style={styles.emptyText}>No hay pagos registrados todavía.</Text>
            ) : (
              stats.pagosList.map(([mes, cantidad]) => (
                <Text key={mes}>
                  • {formatMes(mes)}: {cantidad} pago(s)
                </Text>
              ))
            )}

            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Períodos por mes</Text>
            {stats.periodosList.length === 0 ? (
              <Text style={styles.emptyText}>No hay períodos registrados todavía.</Text>
            ) : (
              stats.periodosList.map(([mes, valores]) => (
                <View key={mes} style={styles.monthBlock}>
                  <Text style={styles.monthTitle}>{formatMes(mes)}</Text>
                  <Text>
                    Pagados: {valores.pagado} • Proyectados impagos: {valores.impago}
                  </Text>
                </View>
              ))
            )}
          </Surface>
        </View>
      </ScrollView>
    </View>
  );
}
