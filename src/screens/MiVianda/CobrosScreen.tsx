import React, { useCallback, useMemo, useState } from "react";
import { Linking, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Contacts from "expo-contacts";
import {
  Button,
  Dialog,
  Divider,
  List,
  Modal,
  Portal,
  Snackbar,
  Text,
  useTheme,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Client, ClientEvent, Holiday, MiViandaStackParamList, Period } from "../../types/types";
import { STORAGE_KEYS } from "../../utils/storage";
import {
  formatBillingMessage,
  getBillingStatus,
  getComidasPorCiclo,
  getClientChargeTiming,
  getClientCycleDays,
  getClientCycleStart,
} from "../../utils/billing";
import { DatePickerModal, registerTranslation, es } from "react-native-paper-dates";
import {
  buildMealCalendar,
  countBusinessDaysBetween,
  getNextBusinessDay,
  isBusinessDay,
} from "../../utils/calendar";

import { formatDateLong, formatLocalDate, getTodayString } from "../../utils/date";
import { CONTENT_MAX_WIDTH, getFontSize, getLineHeight, getSpacing } from "../../theme/layout";
import { miViandaDialogStyle } from "./miViandaShared";

registerTranslation("es", es);

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export default function CobrosScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MiViandaStackParamList, "Cobros">>();
  const route = useRoute<RouteProp<MiViandaStackParamList, "Cobros">>();
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 24);
  const bodySize = getFontSize(width, 16);

  const [clientes, setClientes] = useState<Client[]>([]);
  const [eventos, setEventos] = useState<ClientEvent[]>([]);
  const [periodos, setPeriodos] = useState<Period[]>([]);
  const [feriados, setFeriados] = useState<Holiday[]>([]);
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState("");
  const [expandedClientes, setExpandedClientes] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: "" });
  const [fechaPago, setFechaPago] = useState("");
  const [openDatePago, setOpenDatePago] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<"nuevo-pago" | "editar-pago">(
    "nuevo-pago"
  );
  const [activeModal, setActiveModal] = useState<null | "viandas" | "pagos">(null);
  const [confirmPagoVisible, setConfirmPagoVisible] = useState(false);
  const [confirmPagoFecha, setConfirmPagoFecha] = useState<string | null>(null);
  const [confirmDeleteEventVisible, setConfirmDeleteEventVisible] = useState(false);
  const [eventoAEliminar, setEventoAEliminar] = useState<ClientEvent | null>(null);
  const [pagoEnEdicion, setPagoEnEdicion] = useState<ClientEvent | null>(null);
  const [fechaPagoEdicion, setFechaPagoEdicion] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const showMessage = (message: string) => {
    setSnackbar({ visible: true, message });
  };

  const copiarTexto = async (valor: string, etiqueta: string) => {
    await Clipboard.setStringAsync(valor);
    showMessage(`${etiqueta} copiado.`);
  };

  const llamarTelefono = async (telefono: string) => {
    const limpio = telefono.replace(/\s+/g, "");
    try {
      const puede = await Linking.canOpenURL(`tel:${limpio}`);
      if (!puede) {
        showMessage("No se pudo abrir el marcador.");
        return;
      }
      await Linking.openURL(`tel:${limpio}`);
    } catch (error) {
      showMessage("No se pudo iniciar la llamada.");
    }
  };

  const agendarContacto = async () => {
    if (!clienteSeleccionado) return;
    if (!clienteSeleccionado.telefono && !clienteSeleccionado.direccion) {
      showMessage("El cliente no tiene teléfono ni dirección cargados.");
      return;
    }

    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") {
      showMessage("Permiso de contactos denegado.");
      return;
    }

    const telefono = clienteSeleccionado.telefono?.trim();
    const direccion = clienteSeleccionado.direccion?.trim();

    await Contacts.addContactAsync({
      name: clienteSeleccionado.nombre,
      contactType: Contacts.ContactTypes.Person,
      phoneNumbers: telefono
        ? [
            {
              number: telefono,
              label: "móvil",
            },
          ]
        : undefined,
      addresses: direccion
        ? [
            {
              street: direccion,
              label: "casa",
            },
          ]
        : undefined,
    });

    showMessage("Contacto agregado.");
  };

  const loadData = async () => {
    const [dataClientes, dataEventos, dataPeriodos, dataFeriados] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.CLIENTES),
      AsyncStorage.getItem(STORAGE_KEYS.EVENTOS_CLIENTE),
      AsyncStorage.getItem(STORAGE_KEYS.PERIODOS),
      AsyncStorage.getItem(STORAGE_KEYS.FERIADOS),
    ]);

    const parsedClientes = dataClientes ? (JSON.parse(dataClientes) as Client[]) : [];
    const parsedEventos = dataEventos ? (JSON.parse(dataEventos) as ClientEvent[]) : [];
    let parsedPeriodos = dataPeriodos ? (JSON.parse(dataPeriodos) as Period[]) : [];
    const parsedFeriados = dataFeriados ? (JSON.parse(dataFeriados) as Holiday[]) : [];

    if (parsedPeriodos.length === 0 && parsedEventos.length > 0) {
      const pagosOrdenados = parsedEventos
        .filter((ev) => ev.tipo === "pago")
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      const ultimoPago = pagosOrdenados[pagosOrdenados.length - 1];
      if (ultimoPago) {
        const start = isBusinessDay(new Date(`${ultimoPago.fecha}T00:00:00`), new Set(parsedFeriados.map((f) => f.fecha)))
          ? ultimoPago.fecha
          : getNextBusinessDay(ultimoPago.fecha, parsedFeriados);
        const periodoPagado = {
          id: createId(),
          clienteId: ultimoPago.clienteId,
          tipo: "periodo" as const,
          estado: "pagado" as const,
          inicio: start,
          fin: buildMealCalendar(start, getComidasPorCiclo(), parsedFeriados).slice(-1)[0],
          pagoId: ultimoPago.id,
        };
        const periodoImpago = {
          id: createId(),
          clienteId: ultimoPago.clienteId,
          tipo: "periodo" as const,
          estado: "impago" as const,
          inicio: getNextBusinessDay(periodoPagado.fin, parsedFeriados),
          fin: buildMealCalendar(getNextBusinessDay(periodoPagado.fin, parsedFeriados), getComidasPorCiclo(), parsedFeriados).slice(-1)[0],
        };
        parsedPeriodos = [periodoPagado, periodoImpago];
        await AsyncStorage.setItem(STORAGE_KEYS.PERIODOS, JSON.stringify(parsedPeriodos));
      }
    }

    const clientesNormalizados = parsedClientes.map((cliente) =>
      recalcularEstadoCliente(cliente, parsedEventos)
    );

    setClientes(clientesNormalizados);
    setEventos(parsedEventos);
    setPeriodos(parsedPeriodos);
    setFeriados(parsedFeriados);

    if (JSON.stringify(clientesNormalizados) !== JSON.stringify(parsedClientes)) {
      await AsyncStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(clientesNormalizados));
    }
  };

  const saveClientes = async (updated: Client[]) => {
    setClientes(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(updated));
    } catch (err) {
      console.error("saveClientes error", err);
      showMessage("Error guardando clientes en almacenamiento.");
      throw err;
    }
  };

  const saveEventos = async (updated: ClientEvent[]) => {
    setEventos(updated);
    console.log("saveEventos setEventos", updated.length);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EVENTOS_CLIENTE, JSON.stringify(updated));
      console.log("saveEventos stored to AsyncStorage");
    } catch (err) {
      console.error("saveEventos error", err);
      showMessage("Error guardando eventos en almacenamiento.");
      throw err;
    }
  };

  const savePeriodos = async (updated: Period[]) => {
    setPeriodos(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PERIODOS, JSON.stringify(updated));
    } catch (err) {
      console.error("savePeriodos error", err);
      showMessage("Error guardando periodos en almacenamiento.");
      throw err;
    }
  };

  const recalcularEstadoCliente = (cliente: Client, eventos: ClientEvent[]): Client => {
    const pagosCliente = eventos
      .filter((ev) => ev.clienteId === cliente.id && ev.tipo === "pago")
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    const ultimoPago = pagosCliente.length > 0 ? pagosCliente[pagosCliente.length - 1].fecha : cliente.ultimoPago;
    const totalComidas = cliente.viandas?.reduce((s, v) => s + (v.cantidad ?? 0), 0) ?? 0;
    const fechaInicioCiclo = ultimoPago ? normalizeStartDate(ultimoPago) : cliente.fechaInicioCiclo;
    const diasDelCiclo = getClientCycleDays({
      ...cliente,
      diasPagadosAcumulados: cliente.diasPagadosAcumulados ?? getComidasPorCiclo(),
      totalComidas: cliente.totalComidas ?? totalComidas,
      comidasReponer: cliente.comidasReponer ?? 0,
    });
    const diasConsumidosCalculados = fechaInicioCiclo
      ? Math.min(
          diasDelCiclo,
          buildMealCalendar(fechaInicioCiclo, diasDelCiclo, feriados).filter((fecha) => fecha <= hoy)
            .length
        )
      : 0;

    return {
      ...cliente,
      ultimoPago: ultimoPago ?? undefined,
      fechaInicioCiclo,
      totalComidas: cliente.totalComidas ?? totalComidas,
      diasConsumidosEnPeriodo: diasConsumidosCalculados,
      comidasReponer: cliente.comidasReponer ?? 0,
      diasPagadosAcumulados: cliente.diasPagadosAcumulados ?? getComidasPorCiclo(),
    };
  };

  const ajustarDiasPeriodo = async (delta: number) => {
    if (!clienteSeleccionado) return;

    const nuevoAjuste = (clienteSeleccionado.ajusteDiasPeriodo ?? 0) + delta;
    const diasTotalesActuales = getClientCycleDays(clienteSeleccionado);
    const diasTotalesNuevos = diasTotalesActuales + delta;
    if (diasTotalesNuevos < 1) {
      showMessage("El período no puede quedar en menos de 1 día.");
      return;
    }

    const updatedClientes = clientes.map((cliente) => {
      if (cliente.id !== clienteSeleccionado.id) return cliente;
      return {
        ...cliente,
        ajusteDiasPeriodo: nuevoAjuste,
      };
    });

    await saveClientes(updatedClientes);
    showMessage(
      delta > 0
        ? `Se agregaron ${delta} día(s) al período.`
        : `Se restaron ${Math.abs(delta)} día(s) al período.`
    );
  };

  useFocusEffect(
    useCallback(() => {
      if (!route.params?.clienteId) return;
      setClienteSeleccionadoId(route.params.clienteId);
      setExpandedClientes(false);
      setFechaPago("");
      setMostrarTodosPagos(false);
      setActiveModal(null);
      setConfirmDeleteEventVisible(false);
      setEventoAEliminar(null);
      setPagoEnEdicion(null);
      setFechaPagoEdicion("");
      navigation.setParams({ clienteId: undefined, abrir: undefined });
    }, [navigation, route.params?.clienteId])
  );

  const clienteSeleccionado = useMemo(
    () => clientes.find((cliente: Client) => cliente.id === clienteSeleccionadoId) ?? null,
    [clienteSeleccionadoId, clientes]
  );

  const eventosDelCliente = useMemo(() => {
    if (!clienteSeleccionadoId) return [];
    return eventos
      .filter((ev) => ev.clienteId === clienteSeleccionadoId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [clienteSeleccionadoId, eventos]);

  const periodosDelCliente = useMemo(() => {
    if (!clienteSeleccionadoId) return [];
    return periodos
      .filter((periodo) => periodo.clienteId === clienteSeleccionadoId)
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
  }, [clienteSeleccionadoId, periodos]);

  const pagosDelCliente = useMemo(
    () => eventosDelCliente.filter((ev) => ev.tipo === "pago"),
    [eventosDelCliente]
  );

  const [mostrarTodosPagos, setMostrarTodosPagos] = useState(false);

  const alertasDeuda = useMemo(
    () => clientes.filter((cliente: Client) => getBillingStatus(cliente).estado === "deuda"),
    [clientes]
  );

  const alertasProximoCobro = useMemo(
    () => clientes.filter((cliente: Client) => getBillingStatus(cliente).estado === "proximo-cobro"),
    [clientes]
  );

  const hoy = getTodayString();

  const timingCobro = useMemo(() => {
    if (!clienteSeleccionado) return null;
    return getClientChargeTiming(clienteSeleccionado, feriados, hoy);
  }, [clienteSeleccionado, feriados, hoy]);

  const ajustePeriodo = clienteSeleccionado?.ajusteDiasPeriodo ?? 0;
  const cicloDetalleTexto = useMemo(() => {
    if (!clienteSeleccionado) return "";

    const partes: string[] = [`${getComidasPorCiclo()} base`];
    if (ajustePeriodo !== 0) {
      partes.push(`${ajustePeriodo > 0 ? "+" : ""}${ajustePeriodo} ajuste manual`);
    }

    return partes.length > 1 ? `(${partes.join(" · ")})` : "";
  }, [ajustePeriodo, clienteSeleccionado]);

  const esFinDeSemana = (fecha: string) => {
    const dia = new Date(`${fecha}T00:00:00`).getDay();
    return dia === 0 || dia === 6;
  };

  const esFeriado = (fecha: string) => feriados.some((f) => f.fecha === fecha);

  const normalizeStartDate = (fecha: string) => {
    if (!esFinDeSemana(fecha) && !esFeriado(fecha)) return fecha;
    return getNextBusinessDay(fecha, feriados);
  };

  const buildPeriodRecord = (
    clienteId: string,
    inicio: string,
    estado: Period["estado"],
    pagoId?: string
  ): Period => ({
    id: createId(),
    clienteId,
    tipo: "periodo",
    estado,
    inicio,
    fin: buildMealCalendar(inicio, getComidasPorCiclo(), feriados).slice(-1)[0] ?? inicio,
    pagoId,
    detalle: estado === "pagado" ? "Periodo pagado" : "Periodo pendiente",
  });

  const rebuildPeriodsForClient = (clienteId: string, pagos: ClientEvent[]): Period[] => {
    const pagosOrdenados = [...pagos].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const periodosGenerados: Period[] = [];

    pagosOrdenados.forEach((pago) => {
      const inicio = normalizeStartDate(pago.fecha);

      const ultimoPeriodo = periodosGenerados[periodosGenerados.length - 1];
      if (ultimoPeriodo?.estado === "impago") {
        const periodoPagado: Period = {
          ...ultimoPeriodo,
          estado: "pagado",
          pagoId: pago.id,
          detalle: "Periodo pagado",
        };

        periodosGenerados[periodosGenerados.length - 1] = periodoPagado;
        const siguienteInicio = getNextBusinessDay(periodoPagado.fin, feriados);
        periodosGenerados.push(buildPeriodRecord(clienteId, siguienteInicio, "impago"));
        return;
      }

      const periodoPagado = buildPeriodRecord(clienteId, inicio, "pagado", pago.id);
      periodosGenerados.push(periodoPagado);
      const siguienteInicio = getNextBusinessDay(periodoPagado.fin, feriados);
      periodosGenerados.push(buildPeriodRecord(clienteId, siguienteInicio, "impago"));
    });

    return periodosGenerados;
  };

  const procesarPago = async (fecha: string, esHistorico?: boolean) => {
    if (!clienteSeleccionado) return;
    console.log("procesarPago start", { clienteId: clienteSeleccionado.id, fecha, esHistorico });

    const ultimoPagoActual = clienteSeleccionado.ultimoPago;
    const pagoHistorico = esHistorico ?? Boolean(ultimoPagoActual && fecha < ultimoPagoActual);

    const pagoEvent: ClientEvent = {
      id: createId(),
      clienteId: clienteSeleccionado.id,
      tipo: "pago",
      fecha,
      detalle: "Pago registrado",
    };

    const updatedEventos = [pagoEvent, ...eventos];
    const pagosClienteActualizados = updatedEventos
      .filter((ev) => ev.clienteId === clienteSeleccionado.id && ev.tipo === "pago")
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    const clientesActualizados = clientes.map((cliente) =>
      cliente.id === clienteSeleccionado.id
        ? recalcularEstadoCliente(cliente, updatedEventos)
        : cliente
    );

    const otrosPeriodos = periodos.filter((periodo) => periodo.clienteId !== clienteSeleccionado.id);
    const periodosClienteActualizados = rebuildPeriodsForClient(
      clienteSeleccionado.id,
      pagosClienteActualizados
    );

    console.log("procesarPago preparing save", {
      updatedEventosLength: updatedEventos.length,
      pagosClienteActualizados: pagosClienteActualizados.length,
      periodosClienteActualizados: periodosClienteActualizados.length,
      otrosPeriodos: otrosPeriodos.length,
    });

    try {
      await saveEventos(updatedEventos);
      await savePeriodos([...otrosPeriodos, ...periodosClienteActualizados]);
      await saveClientes(clientesActualizados);
      console.log("procesarPago saved", { pagoEventId: pagoEvent.id });
      setActiveModal("pagos");
    } catch (err) {
      console.error("procesarPago error", err);
      showMessage("Error al procesar el pago. Revisa consola.");
      return;
    }

    setFechaPago("");
    setConfirmPagoFecha(null);
    showMessage(pagoHistorico ? "Pago registrado (histórico)." : "Pago registrado.");
  };

  const registrarPago = async () => {
    if (!clienteSeleccionado) return;

    const fechaInput = fechaPago.trim();
    const fecha = fechaInput || hoy; // usar hoy por defecto si no se eligió fecha

    const ultimoPagoActual = clienteSeleccionado.ultimoPago;
    const pagoHistorico = Boolean(ultimoPagoActual && fecha < ultimoPagoActual);


    if (!pagoHistorico && fecha < hoy) {
      setConfirmPagoFecha(fecha);
      setConfirmPagoVisible(true);
      return;
    }

    await procesarPago(fecha, pagoHistorico);
  };

  const iniciarEdicionPago = (pago: ClientEvent) => {
    setPagoEnEdicion(pago);
    setFechaPagoEdicion(pago.fecha);
  };

  const cancelarEdicionPago = () => {
    setPagoEnEdicion(null);
    setFechaPagoEdicion("");
  };

  const iniciarBorradoEvento = (evento: ClientEvent) => {
    setEventoAEliminar(evento);
    setConfirmDeleteEventVisible(true);
  };

  const cancelarBorradoEvento = () => {
    setConfirmDeleteEventVisible(false);
    setEventoAEliminar(null);
  };

  const borrarEventoSeleccionado = async () => {
    if (!clienteSeleccionado || !eventoAEliminar) return;

    const eventosActualizados = eventos.filter((ev) => ev.id !== eventoAEliminar.id);
    const clientesActualizados = clientes.map((cliente) =>
      cliente.id === clienteSeleccionado.id
        ? recalcularEstadoCliente(cliente, eventosActualizados)
        : cliente
    );

    const pagosClienteActualizados = eventosActualizados
      .filter((ev) => ev.clienteId === clienteSeleccionado.id && ev.tipo === "pago")
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    const otrosPeriodos = periodos.filter((periodo) => periodo.clienteId !== clienteSeleccionado.id);
    const periodosClienteActualizados = rebuildPeriodsForClient(
      clienteSeleccionado.id,
      pagosClienteActualizados
    );

    await saveEventos(eventosActualizados);
    await savePeriodos([...otrosPeriodos, ...periodosClienteActualizados]);
    await saveClientes(clientesActualizados);

    if (pagoEnEdicion?.id === eventoAEliminar.id) cancelarEdicionPago();

    cancelarBorradoEvento();
    showMessage("Pago eliminado.");
  };

  const guardarEdicionPago = async () => {
    if (!clienteSeleccionado || !pagoEnEdicion) return;

    const nuevaFecha = fechaPagoEdicion.trim();
    if (!nuevaFecha) {
      showMessage("Elegí una fecha para actualizar el pago.");
      return;
    }

    const eventosActualizados = eventos.map((ev) =>
      ev.id === pagoEnEdicion.id ? { ...ev, fecha: nuevaFecha } : ev
    );

    const pagosClienteActualizados = eventosActualizados
      .filter((ev) => ev.clienteId === clienteSeleccionado.id && ev.tipo === "pago")
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    const clientesActualizados = clientes.map((cliente) =>
      cliente.id === clienteSeleccionado.id
        ? recalcularEstadoCliente(cliente, eventosActualizados)
        : cliente
    );

    const otrosPeriodos = periodos.filter((periodo) => periodo.clienteId !== clienteSeleccionado.id);
    const periodosClienteActualizados = rebuildPeriodsForClient(
      clienteSeleccionado.id,
      pagosClienteActualizados
    );

    await saveEventos(eventosActualizados);
    await savePeriodos([...otrosPeriodos, ...periodosClienteActualizados]);
    await saveClientes(clientesActualizados);

    cancelarEdicionPago();
    showMessage("Fecha de pago actualizada.");
  };

  const modalMaxHeight = Math.min(640, Math.round(height * 0.85));

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
          gap: 10,
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
        infoText: {
          color: theme.colors.onSurfaceVariant,
          fontSize: bodySize,
          lineHeight: getLineHeight(bodySize),
        },
        sectionTitle: {
          fontSize: getFontSize(width, 18),
          fontWeight: "700",
          marginBottom: 8,
        },
        card: {
          marginTop: 10,
          padding: 14,
          borderRadius: 12,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
        },
        marginTop: {
          marginTop: 8,
        },
        button: {
          marginTop: 12,
          marginBottom: 8,
          borderRadius: 12,
        },
        row: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          marginBottom: 8,
        },
        emptyText: {
          marginTop: 12,
          color: theme.colors.onSurfaceVariant,
        },
        alertBox: {
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
        },
        alertDebt: {
          backgroundColor: "#ffe3e3",
          borderColor: "#f3b7b7",
        },
        alertSoon: {
          backgroundColor: "#fff1cc",
          borderColor: "#f2d58a",
        },
        alertTitle: {
          fontWeight: "700",
          marginBottom: 4,
        },
        quickCard: {
          marginTop: 10,
          padding: 12,
          borderRadius: 12,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
        },
        modalContainer: {
          width: "100%",
          maxWidth: CONTENT_MAX_WIDTH,
          maxHeight: modalMaxHeight,
          alignSelf: "center",
          backgroundColor: theme.colors.surface,
          borderRadius: 10,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.colors.outline,
        },
        modalHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        },
        modalTitle: {
          fontSize: getFontSize(width, 18),
          fontWeight: "700",
        },
        modalContent: {
          paddingBottom: 8,
          gap: 12,
        },
        modalSection: {
          gap: 6,
        },
        modalSectionTitle: {
          fontSize: getFontSize(width, 16),
          fontWeight: "700",
        },
        editHint: {
          color: theme.colors.onSurfaceVariant,
        },
        editStateRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        },
        editStateButton: {
          minWidth: 140,
        },
        editStateOption: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        },
        editStateLabel: {
          flex: 1,
          color: theme.colors.onSurface,
        },
        editDivider: {
          marginVertical: 10,
        },
        detailRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        },
        detailValue: {
          flexShrink: 1,
          color: theme.colors.onSurface,
        },
        historyActions: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
      }),
    [
      bodySize,
      modalMaxHeight,
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Text style={styles.title}>Cobros</Text>
           <Text style={styles.infoText}>
             Regla activa: cada {getComidasPorCiclo()} días corresponde un cobro. Sábado, domingo y feriados no cuentan.
           </Text>

          {alertasDeuda.length > 0 && (
            <View style={[styles.alertBox, styles.alertDebt]}>
              <Text style={styles.alertTitle}>Deuda actual</Text>
              {alertasDeuda.map((cliente: Client) => (
                <Text key={cliente.id}>
                  {cliente.nombre}: {formatBillingMessage(cliente)}
                </Text>
              ))}
            </View>
          )}

          {alertasProximoCobro.length > 0 && (
            <View style={[styles.alertBox, styles.alertSoon]}>
              <Text style={styles.alertTitle}>Próximo cobro</Text>
              {alertasProximoCobro.map((cliente: Client) => (
                <Text key={cliente.id}>
                  {cliente.nombre}: {formatBillingMessage(cliente)}
                </Text>
              ))}
            </View>
          )}

           <Button
             mode="contained"
             onPress={registrarPago}
             style={styles.button}
             buttonColor={theme.colors.secondary}
             contentStyle={{ minHeight: 48 }}
           >
             Registrar pago
           </Button>

          <List.Accordion
            title={
              clienteSeleccionado ? `Cliente: ${clienteSeleccionado.nombre}` : "Seleccionar cliente"
            }
            expanded={expandedClientes}
            onPress={() => setExpandedClientes((prev) => !prev)}
          >
            {clientes.map((cliente: Client) => (
              <List.Item
                key={cliente.id}
                title={cliente.nombre}
                onPress={() => {
                  setClienteSeleccionadoId(cliente.id);
                  setExpandedClientes(false);
                  setFechaPago("");
                  setMostrarTodosPagos(false);
                  setPagoEnEdicion(null);
                  setFechaPagoEdicion("");
                }}
              />
            ))}
          </List.Accordion>

          {clienteSeleccionado ? (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Resumen</Text>
                {clienteSeleccionado.ultimoPago ? (
                  <>
                    <Text>
                       Días consumidos en el ciclo: {clienteSeleccionado.diasConsumidosEnPeriodo}
                    </Text>
                    <Text>
                      Último pago: {formatDateLong(clienteSeleccionado.ultimoPago)}
                    </Text>
                    {timingCobro?.fechaVencimiento && (
                      <Text>
                        Fecha estimada próximo cobro: {formatDateLong(timingCobro.fechaVencimiento)}
                        {timingCobro.diasAtraso > 0 ? " (vencido)" : ""}
                      </Text>
                    )}
                    <Text style={styles.marginTop}>
                      Ciclo actual: {getClientCycleDays(clienteSeleccionado)} días {cicloDetalleTexto}
                    </Text>
                    <Text>
                      Ajuste manual: {ajustePeriodo > 0 ? `+${ajustePeriodo}` : ajustePeriodo} día(s)
                    </Text>
                    <View style={styles.row}>
                      <Button
                        mode="outlined"
                        onPress={() => ajustarDiasPeriodo(-1)}
                        contentStyle={{ minHeight: 40 }}
                      >
                        -1 día
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => ajustarDiasPeriodo(1)}
                        contentStyle={{ minHeight: 40 }}
                      >
                        +1 día
                      </Button>
                    </View>
                    <Text style={styles.marginTop}>{formatBillingMessage(clienteSeleccionado)}</Text>
                  </>
                ) : (
                  <Text>Sin pagos registrados. El ciclo inicia con el primer pago.</Text>
                )}
              </View>

              <View style={styles.quickCard}>
                <Text style={styles.sectionTitle}>Abrir detalles</Text>
                <List.Item
                  title="Viandas y cobros"
                  description="Configuración y estado de cobro"
                  onPress={() => setActiveModal("viandas")}
                />
                <Divider />
                <List.Item
                  title="Pagos"
                  description="Registrar pago e historial"
                  onPress={() => setActiveModal("pagos")}
                />
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>Seleccioná un cliente para gestionar cobros.</Text>
          )}
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: "" })}
        duration={2500}
      >
        {snackbar.message}
      </Snackbar>

      <DatePickerModal
        locale="es"
        mode="single"
        visible={openDatePago}
        onDismiss={() => setOpenDatePago(false)}
        onConfirm={(params) => {
          setOpenDatePago(false);
          if (params.date) {
            const fechaSeleccionada = formatLocalDate(params.date);
            if (datePickerTarget === "editar-pago") {
              setFechaPagoEdicion(fechaSeleccionada);
            } else {
              setFechaPago(fechaSeleccionada);
            }
          }
        }}
      />

      <Portal>
        <Modal
          visible={activeModal === "viandas"}
          onDismiss={() => setActiveModal(null)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Viandas y cobros</Text>
            <Button mode="text" onPress={() => setActiveModal(null)}>
              Cerrar
            </Button>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {clienteSeleccionado && (
              <>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Viandas configuradas</Text>
                  {clienteSeleccionado.viandas.map((item) => (
                    <Text key={item.id}>
                      - {item.tipo}: {item.cantidad}
                    </Text>
                  ))}
                  <Text style={styles.marginTop}>
                    Total por día: {clienteSeleccionado.viandas.reduce((total, item) => total + item.cantidad, 0)} comida(s)
                  </Text>
                </View>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Estado de cobro</Text>
                  <Text>                       Días consumidos en el ciclo: {clienteSeleccionado.diasConsumidosEnPeriodo}</Text>
                  <Text>
                    {clienteSeleccionado.ultimoPago
                      ? `Último pago: ${formatDateLong(clienteSeleccionado.ultimoPago)}`
                      : "Sin pagos registrados"}
                  </Text>
                  {timingCobro?.fechaVencimiento && (
                    <Text>
                      Fecha estimada próximo cobro: {formatDateLong(timingCobro.fechaVencimiento)}
                      {timingCobro.diasAtraso > 0 ? " (vencido)" : ""}
                    </Text>
                  )}
                  <Text>{formatBillingMessage(clienteSeleccionado)}</Text>
                  <Text>
                    Ajuste manual del período:{" "}
                    {ajustePeriodo > 0 ? `+${ajustePeriodo}` : ajustePeriodo} día(s)
                  </Text>
                </View>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Detalles del cliente</Text>
                  {clienteSeleccionado.direccion ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailValue}>Dirección: {clienteSeleccionado.direccion}</Text>
                      <Button
                        mode="text"
                        onPress={() => copiarTexto(clienteSeleccionado.direccion ?? "", "Dirección")}
                      >
                        Copiar
                      </Button>
                    </View>
                  ) : (
                    <Text>Dirección: Sin cargar</Text>
                  )}
                  {clienteSeleccionado.telefono ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailValue}>Teléfono: {clienteSeleccionado.telefono}</Text>
                      <Button
                        mode="text"
                        onPress={() => copiarTexto(clienteSeleccionado.telefono ?? "", "Teléfono")}
                      >
                        Copiar
                      </Button>
                    </View>
                  ) : (
                    <Text>Teléfono: Sin cargar</Text>
                  )}
                  <View style={styles.row}>
                    <Button
                      mode="outlined"
                      onPress={() => llamarTelefono(clienteSeleccionado.telefono ?? "")}
                      disabled={!clienteSeleccionado.telefono}
                      contentStyle={{ minHeight: 44 }}
                    >
                      Llamar
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={agendarContacto}
                      disabled={!clienteSeleccionado.telefono && !clienteSeleccionado.direccion}
                      contentStyle={{ minHeight: 44 }}
                    >
                      Agendar
                    </Button>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </Modal>



        <Modal
          visible={activeModal === "pagos"}
          onDismiss={() => {
            setActiveModal(null);
            cancelarEdicionPago();
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pagos</Text>
            <Button mode="text" onPress={() => setActiveModal(null)}>
              Cerrar
            </Button>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {clienteSeleccionado && (
              <>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Registrar pago</Text>
                  <Text>
                    Fecha de pago: {fechaPago ? formatDateLong(fechaPago) : "Sin seleccionar"}
                  </Text>
                  <View style={styles.row}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setDatePickerTarget("nuevo-pago");
                        setOpenDatePago(true);
                      }}
                      contentStyle={{ minHeight: 44 }}
                    >
                      Elegir fecha
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => setFechaPago(getTodayString())}
                      contentStyle={{ minHeight: 44 }}
                    >
                      Usar hoy
                    </Button>
                  </View>
                  <Button
                    mode="contained"
                    onPress={registrarPago}
                    buttonColor={theme.colors.secondary}
                    contentStyle={{ minHeight: 44 }}
                  >
                    Registrar pago
                  </Button>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Historial de pagos</Text>
                  {pagoEnEdicion && (
                    <>
                      <Text>
                        Editando pago:{" "}
                        {fechaPagoEdicion ? formatDateLong(fechaPagoEdicion) : "Sin seleccionar"}
                      </Text>
                      <View style={styles.row}>
                        <Button
                          mode="outlined"
                          onPress={() => {
                            setDatePickerTarget("editar-pago");
                            setOpenDatePago(true);
                          }}
                          contentStyle={{ minHeight: 44 }}
                        >
                          Cambiar fecha
                        </Button>
                        <Button
                          mode="contained"
                          onPress={guardarEdicionPago}
                          buttonColor={theme.colors.secondary}
                          contentStyle={{ minHeight: 44 }}
                        >
                          Guardar cambio
                        </Button>
                        <Button
                          mode="text"
                          onPress={cancelarEdicionPago}
                          contentStyle={{ minHeight: 44 }}
                        >
                          Cancelar
                        </Button>
                      </View>
                    </>
                  )}
                  {pagosDelCliente.length === 0 ? (
                    <Text>No hay pagos registrados.</Text>
                  ) : (
                    <>
                      {pagosDelCliente
                        .slice(0, mostrarTodosPagos ? pagosDelCliente.length : 3)
                        .map((ev) => (
                          <List.Item
                            key={ev.id}
                            title="Pago registrado"
                            description={`${formatDateLong(ev.fecha)}${ev.detalle ? ` - ${ev.detalle}` : ""}`}
                            right={() => (
                              <View style={styles.historyActions}>
                                <Button
                                  mode="text"
                                  onPress={() => iniciarEdicionPago(ev)}
                                  compact
                                >
                                  Editar
                                </Button>
                                <Button
                                  mode="text"
                                  textColor={theme.colors.error}
                                  onPress={() => iniciarBorradoEvento(ev)}
                                  compact
                                >
                                  Borrar
                                </Button>
                              </View>
                            )}
                          />
                        ))}
                      {pagosDelCliente.length > 3 && (
                        <Button
                          mode="text"
                          onPress={() => setMostrarTodosPagos((prev) => !prev)}
                        >
                          {mostrarTodosPagos ? "Ver menos" : "Ver más"}
                        </Button>
                      )}
                    </>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </Modal>

        <Dialog
          visible={confirmPagoVisible}
          onDismiss={() => {
            setConfirmPagoVisible(false);
            setConfirmPagoFecha(null);
          }}
          style={miViandaDialogStyle}
        >
          <Dialog.Title>Pago con fecha anterior</Dialog.Title>
          <Dialog.Content>
            <Text>¿Deseás registrar este pago con fecha anterior?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setConfirmPagoVisible(false);
                if (confirmPagoFecha) procesarPago(confirmPagoFecha, false);
              }}
            >
              No
            </Button>
            <Button
              onPress={() => {
                setConfirmPagoVisible(false);
                if (confirmPagoFecha) procesarPago(confirmPagoFecha, true);
              }}
            >
              Sí, marcar
            </Button>
          </Dialog.Actions>
        </Dialog>


        <Dialog
          visible={confirmDeleteEventVisible}
          onDismiss={cancelarBorradoEvento}
          style={miViandaDialogStyle}
        >
          <Dialog.Title>Eliminar pago</Dialog.Title>
          <Dialog.Content>
            <Text>¿Querés borrar este pago? Se recalculará el estado del cliente.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={cancelarBorradoEvento}>Cancelar</Button>
            <Button textColor={theme.colors.error} onPress={borrarEventoSeleccionado}>
              Borrar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
