import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions, TouchableOpacity } from "react-native";
import { Button, Checkbox, List, Portal, Text, TextInput, useTheme } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Client, ClientEvent, Holiday, PaymentCycle } from "../../types/types";
import { STORAGE_KEYS } from "../../utils/storage";
import {
  getPaymentBalanceSummaryWithCycles,
  getBillingStatusFromCycles,
  formatBillingMessageFromCycles,
  synchronizeClientCycles,
} from "../../utils/billing";
import {
  getCalendarDayStates,
  summarizeCycles,
  groupCyclesByStatus,
  getAvailableDaysFromCycles,
} from "../../utils/cycle";
import { addMonths, buildMonthGrid, getMonthLabel, isBeforeToday } from "../../utils/calendar";
import { formatDateLong, getTodayString } from "../../utils/date";
import { CONTENT_MAX_WIDTH, getFontSize, getLineHeight, getSpacing } from "../../theme/layout";

import { miViandaDialogStyle } from "./miViandaShared";

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function CalendarioScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 24);
  const bodySize = getFontSize(width, 16);

  const [clientes, setClientes] = useState<Client[]>([]);
  const [feriados, setFeriados] = useState<Holiday[]>([]);
  const [eventos, setEventos] = useState<ClientEvent[]>([]);
  const [ciclos, setCiclos] = useState<PaymentCycle[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState("");
  const [expandedClientes, setExpandedClientes] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const today = getTodayString();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const [dataClientes, dataFeriados, dataEventos, dataCiclos] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.CLIENTES),
      AsyncStorage.getItem(STORAGE_KEYS.FERIADOS),
      AsyncStorage.getItem(STORAGE_KEYS.EVENTOS_CLIENTE),
      AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS),
    ]);

    setClientes(dataClientes ? (JSON.parse(dataClientes) as Client[]) : []);
    setFeriados(dataFeriados ? (JSON.parse(dataFeriados) as Holiday[]) : []);
    setEventos(dataEventos ? (JSON.parse(dataEventos) as ClientEvent[]) : []);
    setCiclos(dataCiclos ? (JSON.parse(dataCiclos) as PaymentCycle[]) : []);
  };

  const clientesFiltrados = useMemo(() => {
    const needle = busqueda.trim().toLowerCase();
    return clientes
      .filter((cliente) => (needle.length === 0 ? true : cliente.nombre.toLowerCase().includes(needle)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [busqueda, clientes]);

  const clienteSeleccionado = useMemo(
    () => clientes.find((c: Client) => c.id === clienteSeleccionadoId) ?? null,
    [clienteSeleccionadoId, clientes]
  );

  // Obtener pagos del cliente seleccionado
  const pagosCliente = useMemo(() => {
    if (!clienteSeleccionado) return [];
    return eventos
      .filter((ev) => ev.clienteId === clienteSeleccionado.id && ev.tipo === "pago")
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [clienteSeleccionado, eventos]);

  // Sincronizar ciclos con pagos: crear ciclos faltantes
  const ciclosCliente = useMemo(() => {
    if (!clienteSeleccionado) return [];

    const ciclosDelCliente = ciclos.filter((c) => c.clienteId === clienteSeleccionado.id);
    const ciclosSincronizados = synchronizeClientCycles(
      clienteSeleccionado.id,
      pagosCliente,
      ciclosDelCliente,
      feriados
    );

    return ciclosSincronizados;
  }, [clienteSeleccionado, pagosCliente, ciclos, feriados]);

  // Persistir ciclos actualizados a AsyncStorage
  useEffect(() => {
    const persistirCiclos = async () => {
      try {
        // Recombinar: otros clientes + ciclos actuales del cliente seleccionado
        const ciclosOtrosClientes = ciclos.filter((c) => c.clienteId !== clienteSeleccionado?.id);
        const todosCiclos = [...ciclosOtrosClientes, ...ciclosCliente];
        await AsyncStorage.setItem(STORAGE_KEYS.CICLOS_PAGOS, JSON.stringify(todosCiclos));
      } catch (err) {
        console.error("Error guardando ciclos:", err);
      }
    };

    if (ciclosCliente.length > 0 || ciclos.length > 0) {
      persistirCiclos();
    }
  }, [ciclosCliente, ciclos, clienteSeleccionado?.id]);

  // Resumen de ciclos
  const resumenCiclos = useMemo(() => {
    if (!clienteSeleccionado) return null;
    return getPaymentBalanceSummaryWithCycles(clienteSeleccionado.id, ciclosCliente, today);
  }, [clienteSeleccionado, ciclosCliente, today]);

  // Información agregada
  const statusCiclos = useMemo(() => {
    if (!clienteSeleccionado) return null;
    return getBillingStatusFromCycles(ciclosCliente, today);
  }, [clienteSeleccionado, ciclosCliente, today]);

  const mensajeBilling = useMemo(() => {
    if (!clienteSeleccionado || ciclosCliente.length === 0) return null;
    return formatBillingMessageFromCycles(ciclosCliente);
  }, [clienteSeleccionado, ciclosCliente]);

  // Mapa de días con sus estados
  const calendarDayStates = useMemo(() => {
    if (!resumenCiclos) return new Map();
    return getCalendarDayStates(ciclosCliente, today);
  }, [ciclosCliente, resumenCiclos, today]);

  // Información de ciclos agrupados
  const ciclosAgrupados = useMemo(() => {
    if (!resumenCiclos) return { completados: [], activos: [], futuros: [] };
    return groupCyclesByStatus(ciclosCliente, today);
  }, [ciclosCliente, resumenCiclos, today]);

  const diasDisponibles = useMemo(() => {
    return getAvailableDaysFromCycles(ciclosCliente, today);
  }, [ciclosCliente, today]);

  useEffect(() => {
    if (diasDisponibles.length === 0) return;
    const first = diasDisponibles[0];
    const [year, month] = first.split("-").map(Number);
    setCalendarYear(year);
    setCalendarMonth(month - 1);
  }, [clienteSeleccionado, diasDisponibles]);

  const diasDisponiblesSet = useMemo(() => new Set(diasDisponibles), [diasDisponibles]);
  const pagosSet = useMemo(() => new Set(pagosCliente.map((p) => p.fecha)), [pagosCliente]);

  const feriadosDelMes = useMemo(() => {
    return feriados.filter((f) => {
      const [year, month] = f.fecha.split("-").map(Number);
      return year === calendarYear && month === calendarMonth + 1;
    });
  }, [feriados, calendarYear, calendarMonth]);

  const feriadosSet = useMemo(() => new Set(feriadosDelMes.map((f) => f.fecha)), [feriadosDelMes]);

  const weeks = useMemo(() => buildMonthGrid(calendarYear, calendarMonth), [calendarYear, calendarMonth]);

  const changeMonth = (diff: number) => {
    const next = addMonths(calendarYear, calendarMonth, diff);
    setCalendarYear(next.year);
    setCalendarMonth(next.monthIndex);
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
          fontWeight: "700",
          color: theme.colors.onSurface,
        },
        subtitle: {
          marginTop: 6,
          fontSize: bodySize,
          lineHeight: getLineHeight(bodySize),
          color: theme.colors.onSurfaceVariant,
        },
        input: {
          marginTop: 12,
          backgroundColor: theme.colors.surface,
        },
        emptyText: {
          color: theme.colors.onSurfaceVariant,
          marginTop: 8,
        },
        selectedTag: {
          color: theme.colors.primary,
          fontWeight: "700",
          alignSelf: "center",
        },
        card: {
          marginTop: 16,
          padding: 14,
          borderRadius: 12,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
        },
        sectionTitle: {
          fontSize: getFontSize(width, 18),
          fontWeight: "700",
          marginTop: 12,
          marginBottom: 6,
        },
        helperText: {
          color: theme.colors.onSurfaceVariant,
          marginBottom: 6,
        },
        monthHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          gap: 8,
        },
        monthLabel: {
          fontWeight: "700",
          color: theme.colors.primary,
        },
        gridHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 6,
        },
        gridHeaderCell: {
          width: "14.2%",
          textAlign: "center",
          fontWeight: "700",
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
          fontSize: getFontSize(width, 14),
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
        // Nuevos estilos para estados de ciclos
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
          borderWidth: 3,
          shadowColor: "#166534",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.28,
          shadowRadius: 4,
          elevation: 3,
        },
        legend: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginTop: 10,
          flexWrap: "wrap",
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
        legendToday: {
          backgroundColor: "#dcfce7",
          borderColor: "#15803d",
          borderWidth: 3,
        },
        legendHoliday: {
          backgroundColor: "#ffe3e3",
          borderColor: "#f3b7b7",
        },
        legendWeekend: {
          backgroundColor: "#f5f2ff",
        },
        infoBox: {
          marginTop: 8,
          padding: 10,
          backgroundColor: "#f3f4f6",
          borderRadius: 8,
          borderLeftWidth: 4,
          borderLeftColor: theme.colors.primary,
        },
        infoText: {
          fontSize: bodySize,
          color: theme.colors.onSurface,
        },
      }),
    [bodySize, spacing, theme.colors.background, theme.colors.onSurface, theme.colors.onSurfaceVariant, theme.colors.outline, theme.colors.primary, theme.colors.surface, titleSize, width]
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Text style={styles.title}>Calendario de cobros</Text>
          <Text style={styles.subtitle}>
            Visualiza todos los ciclos de pago: pasados, actuales y futuros. Cada ciclo contiene 20 días hábiles.
          </Text>

          <TextInput
            label="Buscar cliente por nombre"
            value={busqueda}
            onChangeText={setBusqueda}
            style={styles.input}
          />

          <List.Accordion
            title={clienteSeleccionado ? `Cliente: ${clienteSeleccionado.nombre}` : "Seleccionar cliente"}
            expanded={expandedClientes}
            onPress={() => setExpandedClientes((prev) => !prev)}
          >
            {clientesFiltrados.length === 0 ? (
              <Text style={styles.emptyText}>No hay clientes que coincidan.</Text>
            ) : (
              clientesFiltrados.map((cliente) => (
                <List.Item
                  key={cliente.id}
                  title={cliente.nombre}
                  description={
                    ciclos.filter((c) => c.clienteId === cliente.id).length > 0
                      ? `${ciclos.filter((c) => c.clienteId === cliente.id).length} ciclo(s)`
                      : "Sin ciclos"
                  }
                  onPress={() => {
                    setClienteSeleccionadoId(cliente.id);
                    setExpandedClientes(false);
                  }}
                  right={() =>
                    clienteSeleccionado?.id === cliente.id ? <Text style={styles.selectedTag}>Seleccionado</Text> : null
                  }
                />
              ))
            )}
          </List.Accordion>

          {clienteSeleccionado && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{clienteSeleccionado.nombre}</Text>

              {ciclosCliente.length === 0 ? (
                <Text style={styles.helperText}>Sin ciclos. El calendario se habilita después del primer pago.</Text>
              ) : (
                <>
                  {resumenCiclos && (
                    <View style={styles.infoBox}>
                      <Text style={styles.infoText}>
                        📊 {ciclosAgrupados.activos.length} ciclo(s) activo(s) • {diasDisponibles.length} días disponibles
                      </Text>
                      {resumenCiclos.proximoVencimiento && (
                        <Text style={styles.infoText}>
                          ⏰ Próximo vencimiento: {formatDateLong(resumenCiclos.proximoVencimiento)}
                        </Text>
                      )}
                      {mensajeBilling && <Text style={styles.infoText}>ℹ️ {mensajeBilling}</Text>}
                    </View>
                  )}

                  <Text style={styles.helperText}>
                    Fin de semana y feriados no cuentan como día del ciclo. {diasDisponibles.length > 0 ? "Mostrando disponibilidad cumulative." : ""}
                  </Text>

                  <View style={styles.monthHeader}>
                    <Button mode="outlined" onPress={() => changeMonth(-1)} compact>
                      Anterior
                    </Button>
                    <Text style={styles.monthLabel}>{getMonthLabel(calendarYear, calendarMonth)}</Text>
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
                          const isPago = pagosSet.has(day.fecha);
                          const isToday = today === day.fecha;
                          const isHoliday = day.inMonth && feriadosSet.has(day.fecha);

                          // Determinar color según estado
                          let estado: 'disponible' | 'vencido' | 'consumido' | 'futuro' | 'none' = 'none';
                          if (dayState) {
                            estado = dayState.estado;
                          }

                          const isDisabled = !day.inMonth || estado === 'none' || isHoliday || day.isWeekend;

                          return (
                            <TouchableOpacity
                              key={day.fecha}
                              activeOpacity={0.85}
                              disabled={isDisabled}
                              style={[
                                styles.gridCell,
                                !day.inMonth && styles.gridCellOutside,
                                day.isWeekend && styles.gridCellWeekend,
                                isHoliday && styles.gridCellHoliday,
                                estado === 'disponible' && styles.gridCellDisponible,
                                estado === 'vencido' && styles.gridCellVencido,
                                estado === 'consumido' && styles.gridCellConsumo,
                                estado === 'futuro' && styles.gridCellFuturo,
                                isPago && styles.gridCellPago,
                                isToday && styles.gridCellToday,
                                isDisabled && { opacity: 0.55 },
                              ]}
                            >
                              <Text style={[styles.gridCellText, isToday && styles.gridCellTextToday]}>
                                {day.fecha.split("-")[2]}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>

                  <View style={styles.legend}>
                    <View style={[styles.legendItem, styles.legendDisponible]} />
                    <Text>Disponible</Text>

                    <View style={[styles.legendItem, styles.legendFuturo]} />
                    <Text>Futuro</Text>

                    <View style={[styles.legendItem, styles.legendConsumo]} />
                    <Text>Consumido</Text>

                    <View style={[styles.legendItem, styles.legendVencido]} />
                    <Text>Vencido</Text>

                    <View style={[styles.legendItem, styles.legendPago]} />
                    <Text>Pago</Text>

                    <View style={[styles.legendItem, styles.legendHoliday]} />
                    <Text>Feriado</Text>

                    <View style={[styles.legendItem, styles.legendWeekend]} />
                    <Text>Fin de semana</Text>
                  </View>

                  {ciclosCliente.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Ciclos ({ciclosCliente.length})</Text>
                      <Text style={styles.helperText}>
                        Activos: {ciclosAgrupados.activos.length} | Completados: {ciclosAgrupados.completados.length} | Futuros: {ciclosAgrupados.futuros.length}
                      </Text>
                      {ciclosAgrupados.activos.map((ciclo) => (
                        <View key={ciclo.id} style={{ marginVertical: 4 }}>
                          <Text style={{ fontWeight: "600" }}>
                            {formatDateLong(ciclo.fechaDesde)} → {formatDateLong(ciclo.fechaHasta)}
                          </Text>
                          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                            {ciclo.diasConsumidos}/{ciclo.diasHabiles.length} días
                          </Text>
                        </View>
                      ))}
                    </>
                  )}

                  {pagosCliente.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Pagos registrados</Text>
                      {pagosCliente.map((pago) => (
                        <Text key={pago.id}>- {formatDateLong(pago.fecha)}</Text>
                      ))}
                    </>
                  )}

                  {feriadosDelMes.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Feriados del mes</Text>
                      {feriadosDelMes.map((f) => (
                        <Text key={f.id}>
                          - {formatDateLong(f.fecha)}
                          {f.motivo ? ` (${f.motivo})` : ""}
                        </Text>
                      ))}
                    </>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
