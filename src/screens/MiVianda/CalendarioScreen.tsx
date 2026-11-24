import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Button, List, Searchbar, Surface, Text, useTheme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";

import { useStore } from "../../store/zustand";
import { palette } from "../../theme/appTheme";
import { CONTENT_MAX_WIDTH, getFontSize, getLineHeight, getSpacing } from "../../theme/layout";
import type { Client, PaymentCycle } from "../../types/types";
import {
  formatBillingMessageFromCycles,
  getPaymentBalanceSummaryWithCycles,
} from "../../utils/billing";
import { addMonths, buildMonthGrid, getMonthLabel } from "../../utils/calendar";
import {
  getCalendarDayStates,
  getCoveredDaysFromToday,
  groupCyclesByStatus,
} from "../../utils/cycle";
import { formatDateLong, getTodayString } from "../../utils/date";

export default function CalendarioScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 24);
  const bodySize = getFontSize(width, 15);

  const setUbi = useStore((state) => state.setUbi);
  const clientes = useStore((state) => state.miViandaClientes);
  const feriados = useStore((state) => state.miViandaFeriados);
  const eventos = useStore((state) => state.miViandaEventos);
  const ciclos = useStore((state) => state.miViandaCiclos);

  const [busqueda, setBusqueda] = useState("");
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState("");
  const [expandedClientes, setExpandedClientes] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const today = getTodayString();

  useFocusEffect(
    useCallback(() => {
      setUbi("Calendario");
    }, [setUbi])
  );

  useEffect(() => {
    if (clienteSeleccionadoId && !clientes.some((c) => c.id === clienteSeleccionadoId)) {
      setClienteSeleccionadoId("");
      setSelectedDay(null);
    }
  }, [clienteSeleccionadoId, clientes]);

  const cyclesCountByClient = useMemo(() => {
    const map = new Map<string, number>();
    ciclos.forEach((c) => {
      map.set(c.clienteId, (map.get(c.clienteId) ?? 0) + 1);
    });
    return map;
  }, [ciclos]);

  const clientesFiltrados = useMemo(() => {
    const needle = busqueda.trim().toLowerCase();
    return clientes
      .filter((cliente) =>
        needle.length === 0 ? true : cliente.nombre.toLowerCase().includes(needle)
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [busqueda, clientes]);

  const clienteSeleccionado = useMemo(
    () => clientes.find((c: Client) => c.id === clienteSeleccionadoId) ?? null,
    [clienteSeleccionadoId, clientes]
  );

  const pagosCliente = useMemo(() => {
    if (!clienteSeleccionado) return [];
    return eventos
      .filter((ev) => ev.clienteId === clienteSeleccionado.id && ev.tipo === "pago")
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [clienteSeleccionado, eventos]);

  const ciclosCliente = useMemo<PaymentCycle[]>(() => {
    if (!clienteSeleccionado) return [];
    return ciclos
      .filter((c) => c.clienteId === clienteSeleccionado.id)
      .sort((a, b) => a.fechaDesde.localeCompare(b.fechaDesde));
  }, [ciclos, clienteSeleccionado]);

  const resumenCiclos = useMemo(() => {
    if (!clienteSeleccionado) return null;
    return getPaymentBalanceSummaryWithCycles(
      clienteSeleccionado.id,
      ciclosCliente,
      today,
      feriados
    );
  }, [clienteSeleccionado, ciclosCliente, feriados, today]);

  const mensajeBilling = useMemo(() => {
    if (!clienteSeleccionado || ciclosCliente.length === 0) return null;
    return formatBillingMessageFromCycles(ciclosCliente, today, feriados);
  }, [clienteSeleccionado, ciclosCliente, feriados, today]);

  const calendarDayStates = useMemo(() => {
    if (!clienteSeleccionado || ciclosCliente.length === 0) return new Map();
    return getCalendarDayStates(ciclosCliente, today, feriados);
  }, [ciclosCliente, clienteSeleccionado, feriados, today]);

  const ciclosAgrupados = useMemo(() => {
    if (!clienteSeleccionado || ciclosCliente.length === 0) {
      return { completados: [], activos: [], futuros: [] };
    }
    return groupCyclesByStatus(ciclosCliente, today);
  }, [ciclosCliente, clienteSeleccionado, today]);

  const diasCubiertosDesdeHoy = useMemo(
    () => getCoveredDaysFromToday(ciclosCliente, today),
    [ciclosCliente, today]
  );

  useEffect(() => {
    if (!clienteSeleccionado) return;
    setSelectedDay(null);
    if (diasCubiertosDesdeHoy.length > 0) {
      const first = diasCubiertosDesdeHoy[0];
      const [year, month] = first.split("-").map(Number);
      setCalendarYear(year);
      setCalendarMonth(month - 1);
      return;
    }
    const now = new Date();
    setCalendarYear(now.getFullYear());
    setCalendarMonth(now.getMonth());
  }, [clienteSeleccionado, diasCubiertosDesdeHoy]);

  const pagosByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    pagosCliente.forEach((p) => {
      const arr = map.get(p.fecha) ?? [];
      arr.push(p.detalle || "Pago registrado");
      map.set(p.fecha, arr);
    });
    return map;
  }, [pagosCliente]);

  const feriadosByDate = useMemo(() => {
    const map = new Map<string, string>();
    feriados.forEach((f) => map.set(f.fecha, f.motivo || "Feriado"));
    return map;
  }, [feriados]);

  const feriadosDelMes = useMemo(
    () =>
      feriados.filter((f) => {
        const [year, month] = f.fecha.split("-").map(Number);
        return year === calendarYear && month === calendarMonth + 1;
      }),
    [feriados, calendarYear, calendarMonth]
  );

  const weeks = useMemo(
    () => buildMonthGrid(calendarYear, calendarMonth),
    [calendarYear, calendarMonth]
  );

  const changeMonth = (diff: number) => {
    const next = addMonths(calendarYear, calendarMonth, diff);
    setCalendarYear(next.year);
    setCalendarMonth(next.monthIndex);
  };

  const jumpToToday = () => {
    const now = new Date();
    setCalendarYear(now.getFullYear());
    setCalendarMonth(now.getMonth());
    setSelectedDay(today);
  };

  const selectedDayDetails = useMemo(() => {
    if (!selectedDay) return null;
    const dayState = calendarDayStates.get(selectedDay);
    const pagosEnDia = pagosByDate.get(selectedDay) ?? [];
    const feriadoMotivo = feriadosByDate.get(selectedDay);
    const dayObj = new Date(`${selectedDay}T00:00:00`).getDay();
    const isWeekend = dayObj === 0 || dayObj === 6;

    const tags: string[] = [];
    if (selectedDay === today) tags.push("Hoy");
    if (isWeekend) tags.push("Fin de semana (no hábil)");
    if (feriadoMotivo) tags.push(`Feriado: ${feriadoMotivo}`);
    if (pagosEnDia.length > 0) tags.push(`Pago registrado (${pagosEnDia.join(", ")})`);

    if (dayState) {
      if (dayState.estado === "disponible") {
        tags.push(`Día disponible (día ${dayState.indicePorConsumir + 1} del ciclo)`);
      } else if (dayState.estado === "consumido") {
        tags.push(`Día consumido (día ${dayState.indicePorConsumir + 1} del ciclo)`);
      } else if (dayState.estado === "futuro") {
        tags.push(`Ciclo adelantado (día ${dayState.indicePorConsumir + 1})`);
      } else if (dayState.estado === "vencido") {
        tags.push("Día hábil vencido sin pago que lo cubra");
      }
    } else if (!isWeekend && !feriadoMotivo && pagosEnDia.length === 0) {
      tags.push("Día sin cobertura de ciclos");
    }

    return {
      fechaLabel: formatDateLong(selectedDay),
      tags,
    };
  }, [calendarDayStates, feriadosByDate, pagosByDate, selectedDay, today]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        scroll: {
          padding: spacing,
          paddingBottom: 140,
        },
        content: {
          width: "100%",
          maxWidth: CONTENT_MAX_WIDTH,
          alignSelf: "center",
          gap: 10,
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
        searchbar: {
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          backgroundColor: theme.colors.surface,
        },
        emptyText: {
          color: theme.colors.onSurfaceVariant,
          marginTop: 8,
        },
        card: {
          marginTop: 6,
          padding: 14,
          borderRadius: 16,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          gap: 10,
        },
        sectionTitle: {
          fontSize: getFontSize(width, 18),
          fontWeight: "700",
          color: theme.colors.onSurface,
        },
        helperText: {
          color: theme.colors.onSurfaceVariant,
          fontSize: getFontSize(width, 13),
        },
        monthHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 6,
        },
        monthLabel: {
          fontWeight: "700",
          fontSize: getFontSize(width, 15),
          color: theme.colors.primary,
          textAlign: "center",
          flex: 1,
        },
        gridHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
        },
        gridHeaderCell: {
          width: "14.2%",
          textAlign: "center",
          fontWeight: "700",
          fontSize: 12,
          color: theme.colors.primary,
        },
        grid: {
          gap: 6,
        },
        gridRow: {
          flexDirection: "row",
          justifyContent: "space-between",
        },
        gridCell: {
          width: "14.2%",
          aspectRatio: 1,
          borderRadius: 8,
          backgroundColor: theme.colors.surface,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: theme.colors.outline,
        },
        gridCellText: {
          color: theme.colors.onSurface,
          fontSize: getFontSize(width, 13),
          fontWeight: "600",
        },
        gridCellTextToday: {
          color: "#14532d",
          fontWeight: "800",
        },
        gridCellOutside: {
          backgroundColor: "#f0f0f0",
        },
        gridCellWeekend: {
          backgroundColor: "#f5f2ff",
        },
        gridCellHoliday: {
          backgroundColor: "#ffe3e3",
          borderColor: "#f3b7b7",
        },
        gridCellPago: {
          backgroundColor: "#dbeafe",
          borderColor: "#60a5fa",
        },
        gridCellDisponible: {
          backgroundColor: "#dcfce7",
          borderColor: "#22c55e",
        },
        gridCellVencido: {
          backgroundColor: "#d1d5db",
          borderColor: "#9ca3af",
        },
        gridCellConsumo: {
          backgroundColor: "#e0e7ff",
          borderColor: "#6366f1",
        },
        gridCellFuturo: {
          backgroundColor: "#fef3c7",
          borderColor: "#fcd34d",
        },
        gridCellToday: {
          borderColor: "#15803d",
          borderWidth: 2.5,
        },
        gridCellSelected: {
          borderColor: palette.primary,
          borderWidth: 2.5,
        },
        legend: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginTop: 4,
          flexWrap: "wrap",
        },
        legendEntry: {
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
        },
        legendItem: {
          width: 14,
          height: 14,
          borderRadius: 3,
          borderWidth: 1,
          borderColor: theme.colors.outline,
        },
        legendDisponible: {
          backgroundColor: "#dcfce7",
          borderColor: "#22c55e",
        },
        legendVencido: {
          backgroundColor: "#d1d5db",
          borderColor: "#9ca3af",
        },
        legendConsumo: {
          backgroundColor: "#e0e7ff",
          borderColor: "#6366f1",
        },
        legendFuturo: {
          backgroundColor: "#fef3c7",
          borderColor: "#fcd34d",
        },
        legendPago: {
          backgroundColor: "#dbeafe",
          borderColor: "#60a5fa",
        },
        legendHoliday: {
          backgroundColor: "#ffe3e3",
          borderColor: "#f3b7b7",
        },
        legendWeekend: {
          backgroundColor: "#f5f2ff",
        },
        infoBox: {
          padding: 12,
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: 12,
          borderLeftWidth: 4,
          borderLeftColor: theme.colors.primary,
          gap: 4,
        },
        infoText: {
          fontSize: getFontSize(width, 14),
          color: theme.colors.onSurface,
        },
        dayDetailBox: {
          padding: 12,
          borderRadius: 12,
          backgroundColor: theme.colors.primaryContainer,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          gap: 4,
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
      theme.colors.primaryContainer,
      theme.colors.surface,
      theme.colors.surfaceVariant,
      titleSize,
      width,
    ]
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Calendario de cobros</Text>
          <Text style={styles.subtitle}>
            Visualizá todos los ciclos de pago: pasados, actuales y futuros. Cada ciclo base
            contiene 20 días hábiles.
          </Text>

          <Searchbar
            placeholder="Buscar cliente por nombre..."
            value={busqueda}
            onChangeText={setBusqueda}
            style={styles.searchbar}
            elevation={0}
          />

          <List.Accordion
            title={
              clienteSeleccionado
                ? `Cliente: ${clienteSeleccionado.nombre}`
                : "Seleccionar cliente"
            }
            expanded={expandedClientes}
            onPress={() => setExpandedClientes((prev) => !prev)}
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.colors.outline,
            }}
          >
            {clientesFiltrados.length === 0 ? (
              <List.Item title="No hay clientes que coincidan." disabled />
            ) : (
              clientesFiltrados.map((cliente) => {
                const count = cyclesCountByClient.get(cliente.id) ?? 0;
                return (
                  <List.Item
                    key={cliente.id}
                    title={cliente.nombre}
                    description={count > 0 ? `${count} ciclo(s)` : "Sin ciclos"}
                    onPress={() => {
                      setClienteSeleccionadoId(cliente.id);
                      setExpandedClientes(false);
                    }}
                    right={(props) =>
                      clienteSeleccionado?.id === cliente.id ? (
                        <List.Icon {...props} icon="check" color={theme.colors.primary} />
                      ) : null
                    }
                  />
                );
              })
            )}
          </List.Accordion>

          {clienteSeleccionado && (
            <Surface style={styles.card} elevation={0}>
              <Text style={styles.sectionTitle}>{clienteSeleccionado.nombre}</Text>

              {ciclosCliente.length === 0 ? (
                <Text style={styles.helperText}>
                  Sin ciclos. El calendario se habilita después del primer pago.
                </Text>
              ) : (
                <>
                  {resumenCiclos && (
                    <View style={styles.infoBox}>
                      <Text style={styles.infoText}>
                        {ciclosAgrupados.activos.length} ciclo(s) activo(s) •{" "}
                        {resumenCiclos.diasDisponiblesTotal} día(s) hábiles disponibles
                      </Text>
                      {resumenCiclos.proximoVencimiento && (
                        <Text style={styles.infoText}>
                          Fin de cobertura: {formatDateLong(resumenCiclos.proximoVencimiento)}
                        </Text>
                      )}
                      {mensajeBilling && (
                        <Text style={[styles.infoText, { fontWeight: "700" }]}>
                          {mensajeBilling}
                        </Text>
                      )}
                    </View>
                  )}

                  <Text style={styles.helperText}>
                    Sábados, domingos y feriados no cuentan como días hábiles del ciclo. Tocá
                    cualquier día para ver su detalle.
                  </Text>

                  <View style={styles.monthHeader}>
                    <Button mode="outlined" onPress={() => changeMonth(-1)} compact>
                      Anterior
                    </Button>
                    <Text style={styles.monthLabel}>
                      {getMonthLabel(calendarYear, calendarMonth)}
                    </Text>
                    <Button mode="text" onPress={jumpToToday} compact>
                      Hoy
                    </Button>
                    <Button mode="outlined" onPress={() => changeMonth(1)} compact>
                      Siguiente
                    </Button>
                  </View>

                  <View style={styles.gridHeader}>
                    {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((label) => (
                      <Text key={label} style={styles.gridHeaderCell}>
                        {label}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.grid}>
                    {weeks.map((week, index) => (
                      <View key={`week-${index}`} style={styles.gridRow}>
                        {week.map((day) => {
                          const dayState = calendarDayStates.get(day.fecha);
                          const isPago = pagosByDate.has(day.fecha);
                          const isToday = today === day.fecha;
                          const isSelected = selectedDay === day.fecha;
                          const isHoliday = day.inMonth && feriadosByDate.has(day.fecha);
                          const estado = dayState?.estado ?? "none";

                          return (
                            <TouchableOpacity
                              key={day.fecha}
                              activeOpacity={0.8}
                              disabled={!day.inMonth}
                              onPress={() => setSelectedDay(day.fecha)}
                              style={[
                                styles.gridCell,
                                !day.inMonth && styles.gridCellOutside,
                                day.isWeekend && styles.gridCellWeekend,
                                estado === "disponible" && styles.gridCellDisponible,
                                estado === "consumido" && styles.gridCellConsumo,
                                estado === "futuro" && styles.gridCellFuturo,
                                estado === "vencido" && styles.gridCellVencido,
                                isPago && styles.gridCellPago,
                                isHoliday && styles.gridCellHoliday,
                                isToday && styles.gridCellToday,
                                isSelected && styles.gridCellSelected,
                                !day.inMonth && { opacity: 0.45 },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.gridCellText,
                                  isToday && styles.gridCellTextToday,
                                ]}
                              >
                                {day.fecha.split("-")[2]}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>

                  {selectedDayDetails && (
                    <View style={styles.dayDetailBox}>
                      <Text style={{ fontWeight: "700", color: theme.colors.primary }}>
                        {selectedDayDetails.fechaLabel}
                      </Text>
                      {selectedDayDetails.tags.map((tag, idx) => (
                        <Text key={`${tag}-${idx}`} style={{ fontSize: 13 }}>
                          • {tag}
                        </Text>
                      ))}
                    </View>
                  )}

                  <View style={styles.legend}>
                    <View style={styles.legendEntry}>
                      <View style={[styles.legendItem, styles.legendDisponible]} />
                      <Text>Disponible</Text>
                    </View>
                    <View style={styles.legendEntry}>
                      <View style={[styles.legendItem, styles.legendConsumo]} />
                      <Text>Consumido</Text>
                    </View>
                    <View style={styles.legendEntry}>
                      <View style={[styles.legendItem, styles.legendFuturo]} />
                      <Text>Futuro</Text>
                    </View>
                    <View style={styles.legendEntry}>
                      <View style={[styles.legendItem, styles.legendVencido]} />
                      <Text>Vencido</Text>
                    </View>
                    <View style={styles.legendEntry}>
                      <View style={[styles.legendItem, styles.legendPago]} />
                      <Text>Pago</Text>
                    </View>
                    <View style={styles.legendEntry}>
                      <View style={[styles.legendItem, styles.legendHoliday]} />
                      <Text>Feriado</Text>
                    </View>
                    <View style={styles.legendEntry}>
                      <View style={[styles.legendItem, styles.legendWeekend]} />
                      <Text>Fin de semana</Text>
                    </View>
                  </View>

                  <Text style={styles.sectionTitle}>Ciclos ({ciclosCliente.length})</Text>
                  <Text style={styles.helperText}>
                    Activos: {ciclosAgrupados.activos.length} | Completados:{" "}
                    {ciclosAgrupados.completados.length} | Futuros: {ciclosAgrupados.futuros.length}
                  </Text>
                  {ciclosCliente.map((ciclo) => {
                    const statusColor =
                      ciclo.estado === "activo"
                        ? "#15803d"
                        : ciclo.estado === "futuro"
                        ? "#b45309"
                        : "#6b7280";
                    const statusBg =
                      ciclo.estado === "activo"
                        ? "#dcfce7"
                        : ciclo.estado === "futuro"
                        ? "#fef3c7"
                        : "#f3f4f6";
                    const statusText =
                      ciclo.estado === "activo"
                        ? "Activo"
                        : ciclo.estado === "futuro"
                        ? "Futuro"
                        : "Completado";

                    return (
                      <View
                        key={ciclo.id}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          backgroundColor: theme.colors.surfaceVariant,
                          borderWidth: 1,
                          borderColor: theme.colors.outline,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Text style={{ fontWeight: "600", fontSize: 13, flex: 1 }}>
                            {formatDateLong(ciclo.fechaDesde)} → {formatDateLong(ciclo.fechaHasta)}
                          </Text>
                          <View
                            style={{
                              backgroundColor: statusBg,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: "700", color: statusColor }}>
                              {statusText}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.colors.onSurfaceVariant,
                            marginTop: 4,
                          }}
                        >
                          {ciclo.diasConsumidos} de {ciclo.diasHabiles.length} días consumidos
                        </Text>
                      </View>
                    );
                  })}

                  {pagosCliente.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Pagos registrados</Text>
                      {pagosCliente.map((pago) => (
                        <Text key={pago.id}>
                          • {formatDateLong(pago.fecha)}
                          {pago.detalle ? ` (${pago.detalle})` : ""}
                        </Text>
                      ))}
                    </>
                  )}

                  {feriadosDelMes.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Feriados del mes</Text>
                      {feriadosDelMes.map((f) => (
                        <Text key={f.id}>
                          • {formatDateLong(f.fecha)}
                          {f.motivo ? ` (${f.motivo})` : ""}
                        </Text>
                      ))}
                    </>
                  )}
                </>
              )}
            </Surface>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
