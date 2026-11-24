import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Contact, requestPermissionsAsync } from "expo-contacts";
import * as IntentLauncher from "expo-intent-launcher";
import {
  Button,
  Dialog,
  Divider,
  Icon,
  IconButton,
  List,
  Modal,
  Portal,
  Searchbar,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { DatePickerModal } from "react-native-paper-dates";
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useStore } from "../../store/zustand";
import { palette } from "../../theme/appTheme";
import { CONTENT_MAX_WIDTH, getFontSize, getLineHeight, getSpacing } from "../../theme/layout";
import type { Client, ClientEvent, MiViandaStackParamList, PaymentCycle } from "../../types/types";
import {
  formatBillingMessage,
  getClientBillingSnapshot,
  getClientExtraDays,
  getComidasPorCiclo,
  type ClientBillingSnapshot,
} from "../../utils/billing";
import { formatDateLong, formatLocalDate, getTodayString } from "../../utils/date";
import { miViandaDialogStyle } from "./miViandaShared";

type ConfirmPagoState = {
  visible: boolean;
  fecha: string;
  reason: "anterior" | "duplicado";
};

export default function CobrosScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MiViandaStackParamList, "Cobros">>();
  const route = useRoute<RouteProp<MiViandaStackParamList, "Cobros">>();
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 24);
  const bodySize = getFontSize(width, 15);

  const setUbi = useStore((state) => state.setUbi);
  const clientes = useStore((state) => state.miViandaClientes);
  const eventos = useStore((state) => state.miViandaEventos);
  const ciclos = useStore((state) => state.miViandaCiclos);
  const feriados = useStore((state) => state.miViandaFeriados);

  const addMiViandaPayment = useStore((state) => state.addMiViandaPayment);
  const updateMiViandaPayment = useStore((state) => state.updateMiViandaPayment);
  const deleteMiViandaPayment = useStore((state) => state.deleteMiViandaPayment);
  const adjustMiViandaClientDays = useStore((state) => state.adjustMiViandaClientDays);
  const resetMiViandaClientAdjustment = useStore(
    (state) => state.resetMiViandaClientAdjustment
  );

  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [expandedClientes, setExpandedClientes] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: "" });
  const [fechaPago, setFechaPago] = useState("");
  const [detallePago, setDetallePago] = useState("");
  const [openDatePago, setOpenDatePago] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<"nuevo-pago" | "editar-pago">(
    "nuevo-pago"
  );
  const [activeModal, setActiveModal] = useState<null | "viandas" | "pagos">(null);
  const [confirmPago, setConfirmPago] = useState<ConfirmPagoState>({
    visible: false,
    fecha: "",
    reason: "anterior",
  });
  const [confirmDeleteEventVisible, setConfirmDeleteEventVisible] = useState(false);
  const [eventoAEliminar, setEventoAEliminar] = useState<ClientEvent | null>(null);
  const [pagoEnEdicion, setPagoEnEdicion] = useState<ClientEvent | null>(null);
  const [fechaPagoEdicion, setFechaPagoEdicion] = useState("");
  const [detallePagoEdicion, setDetallePagoEdicion] = useState("");
  const [mostrarTodosPagos, setMostrarTodosPagos] = useState(false);
  const [agendandoContacto, setAgendandoContacto] = useState(false);
  const [contactoAgendado, setContactoAgendado] = useState(false);

  const hoy = getTodayString();

  useEffect(() => {
    setContactoAgendado(false);
  }, [clienteSeleccionadoId]);

  useEffect(() => {
    if (
      clienteSeleccionadoId &&
      !clientes.some((c) => c.id === clienteSeleccionadoId)
    ) {
      setClienteSeleccionadoId("");
      setActiveModal(null);
    }
  }, [clienteSeleccionadoId, clientes]);

  useFocusEffect(
    useCallback(() => {
      setUbi("Cobros");
      if (!route.params?.clienteId) return;

      setClienteSeleccionadoId(route.params.clienteId);
      setExpandedClientes(false);
      setFechaPago("");
      setDetallePago("");
      setMostrarTodosPagos(false);
      setActiveModal(route.params.abrir ?? null);
      setConfirmDeleteEventVisible(false);
      setEventoAEliminar(null);
      setPagoEnEdicion(null);
      setFechaPagoEdicion("");
      setDetallePagoEdicion("");
      navigation.setParams({ clienteId: undefined, abrir: undefined });
    }, [navigation, route.params?.abrir, route.params?.clienteId, setUbi])
  );

  const showMessage = (message: string) => {
    setSnackbar({ visible: true, message });
  };

  const ciclosByClient = useMemo(() => {
    const map = new Map<string, PaymentCycle[]>();
    ciclos.forEach((c) => {
      const arr = map.get(c.clienteId);
      if (arr) {
        arr.push(c);
      } else {
        map.set(c.clienteId, [c]);
      }
    });
    return map;
  }, [ciclos]);

  const snapshotsByClient = useMemo(() => {
    const map = new Map<string, ClientBillingSnapshot>();
    clientes.forEach((c) => {
      map.set(
        c.id,
        getClientBillingSnapshot(c, ciclosByClient.get(c.id) ?? [], feriados, hoy)
      );
    });
    return map;
  }, [ciclosByClient, clientes, feriados, hoy]);

  const clienteSeleccionado = useMemo(
    () => clientes.find((c) => c.id === clienteSeleccionadoId) ?? null,
    [clienteSeleccionadoId, clientes]
  );

  const clientesOrdenados = useMemo(() => {
    const needle = clientSearch.trim().toLowerCase();
    return [...clientes]
      .filter((c) => (!needle ? true : c.nombre.toLowerCase().includes(needle)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [clientSearch, clientes]);

  const ciclosCliente = useMemo(
    () => (clienteSeleccionado ? ciclosByClient.get(clienteSeleccionado.id) ?? [] : []),
    [ciclosByClient, clienteSeleccionado]
  );

  const snapshotSeleccionado = useMemo(
    () => (clienteSeleccionado ? snapshotsByClient.get(clienteSeleccionado.id) ?? null : null),
    [clienteSeleccionado, snapshotsByClient]
  );

  const pagosDelCliente = useMemo(() => {
    if (!clienteSeleccionadoId) return [];
    return eventos
      .filter((ev) => ev.clienteId === clienteSeleccionadoId && ev.tipo === "pago")
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [clienteSeleccionadoId, eventos]);

  const alertasDeuda = useMemo(
    () => clientes.filter((c) => snapshotsByClient.get(c.id)?.status.estado === "deuda"),
    [clientes, snapshotsByClient]
  );

  const alertasProximoCobro = useMemo(
    () =>
      clientes.filter((c) => snapshotsByClient.get(c.id)?.status.estado === "proximo-cobro"),
    [clientes, snapshotsByClient]
  );

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
    } catch {
      showMessage("No se pudo iniciar la llamada.");
    }
  };

  const abrirAgendaContactos = async () => {
    try {
      if (Platform.OS === "android") {
        const canOpen = await Linking.canOpenURL("content://contacts/people/").catch(() => false);
        if (canOpen) {
          await Linking.openURL("content://contacts/people/");
          return;
        }
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: "content://contacts/people/",
        });
      } else if (Platform.OS === "ios") {
        const canOpen = await Linking.canOpenURL("contacts:").catch(() => false);
        if (canOpen) {
          await Linking.openURL("contacts:");
        }
      }
    } catch {
      showMessage("No se pudo abrir la app de Contactos directamente.");
    }
  };

  const agendarContacto = async () => {
    if (!clienteSeleccionado) return;
    if (!clienteSeleccionado.telefono && !clienteSeleccionado.direccion) {
      Alert.alert(
        "Datos incompletos",
        "El cliente no tiene teléfono ni dirección cargados para poder agendarlo."
      );
      return;
    }

    setAgendandoContacto(true);
    try {
      const { status } = await requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permiso denegado",
          "Se requiere permiso para agregar contactos a la agenda del teléfono."
        );
        return;
      }

      const telefono = clienteSeleccionado.telefono?.trim();
      const direccion = clienteSeleccionado.direccion?.trim();

      const partesNombre = (clienteSeleccionado.nombre || "").trim().split(/\s+/);
      const givenName = partesNombre[0] || clienteSeleccionado.nombre;
      const familyName = partesNombre.slice(1).join(" ") || undefined;

      await Contact.create({
        givenName,
        familyName,
        phones: telefono
          ? [
              {
                number: telefono,
                label: "mobile",
              },
            ]
          : undefined,
        addresses: direccion
          ? [
              {
                street: direccion,
                label: "home",
              },
            ]
          : undefined,
      });

      setContactoAgendado(true);
      showMessage("Contacto agregado.");

      Alert.alert(
        "¡Contacto agendado!",
        `"${clienteSeleccionado.nombre}" se guardó exitosamente en los contactos de tu teléfono.`,
        [
          {
            text: "Ver en Contactos",
            onPress: () => void abrirAgendaContactos(),
          },
          {
            text: "Listo",
            style: "cancel",
          },
        ]
      );
    } catch {
      Alert.alert("Error", "No se pudo agregar el contacto a la agenda.");
    } finally {
      setAgendandoContacto(false);
    }
  };

  const seleccionarCliente = (id: string) => {
    setClienteSeleccionadoId(id);
    setExpandedClientes(false);
    setFechaPago("");
    setDetallePago("");
    setMostrarTodosPagos(false);
    setPagoEnEdicion(null);
    setFechaPagoEdicion("");
    setDetallePagoEdicion("");
  };

  const ajustarDiasPeriodo = async (delta: number) => {
    if (!clienteSeleccionado) return;
    const ok = await adjustMiViandaClientDays(clienteSeleccionado.id, delta);
    if (!ok) {
      showMessage("El período no puede quedar en menos de 1 día.");
      return;
    }
    showMessage(
      delta > 0
        ? `Se agregó ${delta} día al último ciclo.`
        : `Se restó ${Math.abs(delta)} día al último ciclo.`
    );
  };

  const restablecerAjustes = async () => {
    if (!clienteSeleccionado) return;
    await resetMiViandaClientAdjustment(clienteSeleccionado.id);
    showMessage("Ajustes de días restablecidos.");
  };

  const procesarPago = async (fecha: string, esHistorico = false) => {
    if (!clienteSeleccionado) return;

    await addMiViandaPayment(clienteSeleccionado.id, fecha, detallePago);
    setFechaPago("");
    setDetallePago("");
    setConfirmPago({ visible: false, fecha: "", reason: "anterior" });
    showMessage(esHistorico ? "Pago registrado (histórico)." : "Pago registrado.");
  };

  const registrarPago = async () => {
    if (!clienteSeleccionado) return;

    const fecha = fechaPago.trim() || hoy;
    const ultimoPagoActual = clienteSeleccionado.ultimoPago;
    const pagoHistorico = Boolean(ultimoPagoActual && fecha < ultimoPagoActual);
    const yaExisteMismaFecha = pagosDelCliente.some((p) => p.fecha === fecha);

    if (pagoHistorico) {
      setConfirmPago({ visible: true, fecha, reason: "anterior" });
      return;
    }

    if (yaExisteMismaFecha) {
      setConfirmPago({ visible: true, fecha, reason: "duplicado" });
      return;
    }

    await procesarPago(fecha, false);
  };

  const iniciarEdicionPago = (pago: ClientEvent) => {
    setPagoEnEdicion(pago);
    setFechaPagoEdicion(pago.fecha);
    setDetallePagoEdicion(pago.detalle ?? "");
  };

  const cancelarEdicionPago = () => {
    setPagoEnEdicion(null);
    setFechaPagoEdicion("");
    setDetallePagoEdicion("");
  };

  const guardarEdicionPago = async () => {
    if (!clienteSeleccionado || !pagoEnEdicion) return;

    const nuevaFecha = fechaPagoEdicion.trim();
    if (!nuevaFecha) {
      showMessage("Elegí una fecha para actualizar el pago.");
      return;
    }

    await updateMiViandaPayment(pagoEnEdicion.id, nuevaFecha, detallePagoEdicion);
    cancelarEdicionPago();
    showMessage("Pago actualizado.");
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

    await deleteMiViandaPayment(eventoAEliminar.id);
    if (pagoEnEdicion?.id === eventoAEliminar.id) cancelarEdicionPago();
    cancelarBorradoEvento();
    showMessage("Pago eliminado.");
  };

  const ajusteTotal = clienteSeleccionado ? getClientExtraDays(clienteSeleccionado) : 0;
  const cicloDetalleTexto = useMemo(() => {
    if (!clienteSeleccionado) return "";
    const partes: string[] = [`${getComidasPorCiclo()} base`];
    if (ajusteTotal !== 0) {
      partes.push(`${ajusteTotal > 0 ? "+" : ""}${ajusteTotal} ajuste`);
    }
    return partes.length > 1 ? `(${partes.join(" · ")})` : "";
  }, [ajusteTotal, clienteSeleccionado]);

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
          fontWeight: "800",
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
          marginBottom: 6,
          color: theme.colors.onSurface,
        },
        searchbar: {
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          backgroundColor: theme.colors.surface,
          marginBottom: 8,
        },
        card: {
          marginTop: 6,
          padding: 14,
          borderRadius: 16,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          gap: 6,
        },
        marginTop: {
          marginTop: 6,
        },
        row: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginTop: 4,
        },
        emptyText: {
          marginTop: 8,
          color: theme.colors.onSurfaceVariant,
        },
        alertBox: {
          borderRadius: 14,
          padding: 12,
          borderWidth: 1,
          gap: 4,
        },
        alertDebt: {
          backgroundColor: "#fdecec",
          borderColor: "#f5b7b1",
        },
        alertSoon: {
          backgroundColor: "#fef5e7",
          borderColor: "#f8c471",
        },
        alertTitle: {
          fontWeight: "700",
          marginBottom: 2,
        },
        alertLinkText: {
          fontSize: getFontSize(width, 13),
          textDecorationLine: "underline",
        },
        quickCard: {
          marginTop: 4,
          padding: 14,
          borderRadius: 16,
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
          borderRadius: 16,
          padding: 0,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          overflow: "hidden",
        },
        modalHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: theme.colors.surface,
        },
        modalHeaderTitleBox: {
          flex: 1,
          paddingRight: 8,
        },
        modalTitle: {
          fontSize: getFontSize(width, 18),
          fontWeight: "700",
          color: theme.colors.onSurface,
        },
        modalSubtitle: {
          fontSize: getFontSize(width, 13),
          color: theme.colors.onSurfaceVariant,
          marginTop: 2,
        },
        modalContent: {
          padding: 16,
          gap: 14,
        },
        modalSection: {
          gap: 8,
        },
        modalSectionCard: {
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          padding: 14,
          gap: 12,
        },
        modalSectionHeaderRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        },
        modalSectionTitle: {
          fontSize: getFontSize(width, 16),
          fontWeight: "700",
          color: theme.colors.onSurface,
        },
        statusBanner: {
          borderRadius: 10,
          borderWidth: 1,
          padding: 12,
          gap: 6,
        },
        statusBannerHeader: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        statusBannerTitle: {
          fontSize: getFontSize(width, 14),
          fontWeight: "700",
        },
        statusBannerDesc: {
          fontSize: getFontSize(width, 13),
          lineHeight: getLineHeight(getFontSize(width, 13)),
        },
        metricGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
        },
        metricItem: {
          flexGrow: 1,
          flexBasis: width < 420 ? "100%" : "47%",
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          padding: 10,
          gap: 4,
        },
        metricHeader: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        metricLabel: {
          fontSize: getFontSize(width, 12),
          color: theme.colors.onSurfaceVariant,
          fontWeight: "500",
        },
        metricValue: {
          fontSize: getFontSize(width, 14),
          fontWeight: "700",
          color: theme.colors.onSurface,
        },
        metricSubtext: {
          fontSize: getFontSize(width, 11),
          color: theme.colors.onSurfaceVariant,
        },
        progressBarBackground: {
          height: 6,
          backgroundColor: theme.colors.outline,
          borderRadius: 3,
          overflow: "hidden",
          marginVertical: 2,
        },
        progressBarFill: {
          height: "100%",
          borderRadius: 3,
        },
        viandasList: {
          gap: 8,
        },
        viandaRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 8,
          paddingHorizontal: 10,
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.colors.outline,
        },
        viandaTypeInfo: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          flex: 1,
        },
        viandaTypeName: {
          fontSize: getFontSize(width, 14),
          fontWeight: "600",
          color: theme.colors.onSurface,
        },
        viandaQtyBadge: {
          backgroundColor: palette.primarySoft,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
        },
        viandaQtyText: {
          fontSize: getFontSize(width, 12),
          fontWeight: "700",
          color: palette.primary,
        },
        emptyViandasBox: {
          padding: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: 8,
        },
        emptyViandasText: {
          fontSize: getFontSize(width, 13),
          color: theme.colors.onSurfaceVariant,
          fontStyle: "italic",
        },
        viandasTotalBox: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 10,
          backgroundColor: theme.colors.primaryContainer,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.colors.outline,
        },
        viandasTotalLabel: {
          fontSize: getFontSize(width, 13),
          color: palette.text,
          fontWeight: "600",
        },
        viandasTotalCount: {
          fontSize: getFontSize(width, 13),
          color: palette.primary,
          fontWeight: "700",
        },
        viandasNotesBox: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 6,
          padding: 10,
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.colors.outline,
        },
        viandasNotesText: {
          fontSize: getFontSize(width, 12),
          color: theme.colors.onSurfaceVariant,
          flex: 1,
          lineHeight: getLineHeight(getFontSize(width, 12)),
        },
        contactRow: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          padding: 10,
          gap: 8,
        },
        contactIconWrap: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: palette.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        },
        contactInfo: {
          flex: 1,
        },
        contactFieldLabel: {
          fontSize: getFontSize(width, 11),
          color: theme.colors.onSurfaceVariant,
          marginBottom: 1,
        },
        contactFieldValue: {
          fontSize: getFontSize(width, 13),
          color: theme.colors.onSurface,
          fontWeight: "500",
        },
        contactFieldEmpty: {
          fontSize: getFontSize(width, 13),
          color: theme.colors.onSurfaceVariant,
          fontStyle: "italic",
        },
        contactButtonsRow: {
          flexDirection: "row",
          gap: 10,
          marginTop: 4,
        },
        actionBtn: {
          flex: 1,
          borderRadius: 10,
        },
        historyActions: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        },
        input: {
          backgroundColor: theme.colors.surface,
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
      theme.colors.primaryContainer,
      theme.colors.surface,
      theme.colors.surfaceVariant,
      titleSize,
      width,
    ]
  );

  const effectiveFechaNueva = fechaPago.trim() || hoy;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Cobros</Text>
          <Text style={styles.infoText}>
            Regla activa: cada {getComidasPorCiclo()} días hábiles corresponde un cobro. Sábado,
            domingo y feriados no cuentan.
          </Text>

          {alertasDeuda.length > 0 && (
            <View style={[styles.alertBox, styles.alertDebt]}>
              <Text style={[styles.alertTitle, { color: palette.danger }]}>
                Deuda actual ({alertasDeuda.length})
              </Text>
              {alertasDeuda.map((cliente) => (
                <Pressable key={cliente.id} onPress={() => seleccionarCliente(cliente.id)}>
                  <Text style={[styles.alertLinkText, { color: palette.danger }]}>
                    {cliente.nombre}:{" "}
                    {formatBillingMessage(
                      cliente,
                      ciclosByClient.get(cliente.id) ?? [],
                      feriados,
                      hoy
                    )}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {alertasProximoCobro.length > 0 && (
            <View style={[styles.alertBox, styles.alertSoon]}>
              <Text style={[styles.alertTitle, { color: palette.warning }]}>
                Próximo cobro ({alertasProximoCobro.length})
              </Text>
              {alertasProximoCobro.map((cliente) => (
                <Pressable key={cliente.id} onPress={() => seleccionarCliente(cliente.id)}>
                  <Text style={[styles.alertLinkText, { color: palette.warning }]}>
                    {cliente.nombre}:{" "}
                    {formatBillingMessage(
                      cliente,
                      ciclosByClient.get(cliente.id) ?? [],
                      feriados,
                      hoy
                    )}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

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
            <View style={{ padding: 10 }}>
              <Searchbar
                placeholder="Buscar cliente..."
                value={clientSearch}
                onChangeText={setClientSearch}
                style={styles.searchbar}
                elevation={0}
              />
              {clientesOrdenados.length === 0 ? (
                <Text style={styles.emptyText}>No hay clientes que coincidan.</Text>
              ) : (
                clientesOrdenados.map((cliente) => {
                  const snap = snapshotsByClient.get(cliente.id);
                  const desc =
                    snap?.status.estado === "deuda"
                      ? `Deuda (${snap.status.diasAtraso} d. atraso)`
                      : snap?.status.estado === "proximo-cobro"
                      ? `Próximo cobro (${snap.status.restante} d.)`
                      : snap?.status.estado === "al-dia"
                      ? `Al día (${snap.status.restante} d. disp.)`
                      : "Sin pagos";

                  return (
                    <List.Item
                      key={cliente.id}
                      title={cliente.nombre}
                      description={desc}
                      onPress={() => seleccionarCliente(cliente.id)}
                      right={(props) =>
                        clienteSeleccionado?.id === cliente.id ? (
                          <List.Icon {...props} icon="check" color={theme.colors.primary} />
                        ) : null
                      }
                    />
                  );
                })
              )}
            </View>
          </List.Accordion>

          {clienteSeleccionado && snapshotSeleccionado ? (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Resumen de {clienteSeleccionado.nombre}</Text>
                {clienteSeleccionado.ultimoPago ? (
                  <>
                    <Text>
                      Ciclo actual: {snapshotSeleccionado.diasConsumidosCicloActual} de{" "}
                      {snapshotSeleccionado.diasTotalesCicloActual} días {cicloDetalleTexto}
                    </Text>
                    {snapshotSeleccionado.futureCyclesCount > 0 ? (
                      <Text>
                        Ciclos pagados por adelantado: {snapshotSeleccionado.futureCyclesCount} (
                        {snapshotSeleccionado.diasDisponiblesTotales} días hábiles totales
                        disponibles)
                      </Text>
                    ) : null}
                    <Text>Último pago: {formatDateLong(clienteSeleccionado.ultimoPago)}</Text>
                    {snapshotSeleccionado.timing?.fechaVencimiento ? (
                      <Text>
                        Fecha de cobro:{" "}
                        {formatDateLong(snapshotSeleccionado.timing.fechaVencimiento)}
                        {snapshotSeleccionado.timing.diasAtraso > 0
                          ? ` (vencido hace ${snapshotSeleccionado.timing.diasAtraso} d.)`
                          : ""}
                      </Text>
                    ) : null}
                    <Text style={styles.marginTop}>
                      Ajuste manual al último ciclo:{" "}
                      {ajusteTotal > 0 ? `+${ajusteTotal}` : ajusteTotal} día(s)
                    </Text>
                    <View style={styles.row}>
                      <Button
                        mode="outlined"
                        onPress={() => void ajustarDiasPeriodo(-1)}
                        contentStyle={{ minHeight: 40 }}
                      >
                        -1 día
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => void ajustarDiasPeriodo(1)}
                        contentStyle={{ minHeight: 40 }}
                      >
                        +1 día
                      </Button>
                      {ajusteTotal !== 0 ? (
                        <Button
                          mode="text"
                          onPress={() => void restablecerAjustes()}
                          contentStyle={{ minHeight: 40 }}
                        >
                          Restablecer
                        </Button>
                      ) : null}
                    </View>
                    <Text style={[styles.marginTop, { fontWeight: "700" }]}>
                      {formatBillingMessage(
                        clienteSeleccionado,
                        ciclosCliente,
                        feriados,
                        hoy
                      )}
                    </Text>
                  </>
                ) : (
                  <Text>Sin pagos registrados. El ciclo inicia con el primer pago.</Text>
                )}

                <View style={[styles.row, { marginTop: 10 }]}>
                  <Button
                    mode="contained"
                    icon="cash-plus"
                    onPress={() => setActiveModal("pagos")}
                    buttonColor={theme.colors.secondary}
                    style={{ flex: 1, borderRadius: 12 }}
                    contentStyle={{ minHeight: 44 }}
                  >
                    Registrar pago
                  </Button>
                  <Button
                    mode="outlined"
                    icon="food"
                    onPress={() => setActiveModal("viandas")}
                    style={{ flex: 1, borderRadius: 12 }}
                    contentStyle={{ minHeight: 44 }}
                  >
                    Ver detalles
                  </Button>
                </View>
              </View>

              <View style={styles.quickCard}>
                <Text style={styles.sectionTitle}>Accesos rápidos</Text>
                <List.Item
                  title="Viandas y cobros"
                  description="Detalle completo, viandas y contacto del cliente"
                  left={(props) => <List.Icon {...props} icon="card-account-details-outline" />}
                  right={(props) => <List.Icon {...props} icon="chevron-right" />}
                  onPress={() => setActiveModal("viandas")}
                />
                <Divider />
                <List.Item
                  title="Pagos e historial"
                  description={`${pagosDelCliente.length} ${
                    pagosDelCliente.length === 1 ? "pago registrado" : "pagos registrados"
                  }`}
                  left={(props) => <List.Icon {...props} icon="receipt" />}
                  right={(props) => <List.Icon {...props} icon="chevron-right" />}
                  onPress={() => setActiveModal("pagos")}
                />
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>
              {clientes.length === 0
                ? "Todavía no hay clientes creados."
                : "Seleccioná un cliente para gestionar cobros."}
            </Text>
          )}
        </View>
      </ScrollView>

      <DatePickerModal
        locale="es"
        mode="single"
        visible={openDatePago}
        date={
          datePickerTarget === "editar-pago" && fechaPagoEdicion
            ? new Date(`${fechaPagoEdicion}T00:00:00`)
            : fechaPago
            ? new Date(`${fechaPago}T00:00:00`)
            : new Date()
        }
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
            <View style={styles.modalHeaderTitleBox}>
              <Text style={styles.modalTitle}>Viandas y cobros</Text>
              {clienteSeleccionado && (
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {clienteSeleccionado.nombre}
                </Text>
              )}
            </View>
            <IconButton
              icon="close"
              size={22}
              onPress={() => setActiveModal(null)}
              accessibilityLabel="Cerrar modal"
            />
          </View>
          <Divider />

          <ScrollView contentContainerStyle={styles.modalContent}>
            {clienteSeleccionado &&
              snapshotSeleccionado &&
              (() => {
                const billingStatus = snapshotSeleccionado.status;
                const timingCobro = snapshotSeleccionado.timing;
                const totalViandasDia = clienteSeleccionado.viandas.reduce(
                  (total, item) => total + (item.cantidad || 0),
                  0
                );
                const cicloDiasTotal = Math.max(
                  1,
                  snapshotSeleccionado.diasTotalesCicloActual || getComidasPorCiclo()
                );
                const diasConsumidos = snapshotSeleccionado.diasConsumidosCicloActual;
                const diasRestantes = snapshotSeleccionado.diasDisponiblesTotales;
                const porcentajeConsumo = Math.min(
                  100,
                  Math.round((diasConsumidos / cicloDiasTotal) * 100)
                );

                const isDeuda = billingStatus.estado === "deuda";
                const isProximo = billingStatus.estado === "proximo-cobro";
                const isSinPagos = billingStatus.estado === "sin-pagos";

                const statusColor = isDeuda
                  ? palette.danger
                  : isProximo
                  ? palette.warning
                  : isSinPagos
                  ? palette.muted
                  : palette.success;

                const statusBg = isDeuda
                  ? "#FDF2F2"
                  : isProximo
                  ? "#FFFBEB"
                  : isSinPagos
                  ? theme.colors.surfaceVariant
                  : "#F0FDF4";

                const statusBorder = isDeuda
                  ? "#FCA5A5"
                  : isProximo
                  ? "#FCD34D"
                  : isSinPagos
                  ? theme.colors.outline
                  : "#86EFAC";

                const statusIcon = isDeuda
                  ? "alert-circle-outline"
                  : isProximo
                  ? "clock-alert-outline"
                  : isSinPagos
                  ? "cash-remove"
                  : "check-circle-outline";

                const statusTitle = isDeuda
                  ? `Con deuda (${billingStatus.ciclosDeuda} ciclo${
                      billingStatus.ciclosDeuda > 1 ? "s" : ""
                    })`
                  : isProximo
                  ? "Próximo cobro por vencer"
                  : isSinPagos
                  ? "Sin pagos registrados"
                  : "Al día";

                return (
                  <>
                    <View style={styles.modalSectionCard}>
                      <View style={styles.modalSectionHeaderRow}>
                        <Icon source="cash-clock" size={20} color={palette.primary} />
                        <Text style={styles.modalSectionTitle}>Estado de cobro</Text>
                      </View>

                      <View
                        style={[
                          styles.statusBanner,
                          { backgroundColor: statusBg, borderColor: statusBorder },
                        ]}
                      >
                        <View style={styles.statusBannerHeader}>
                          <Icon source={statusIcon} size={20} color={statusColor} />
                          <Text style={[styles.statusBannerTitle, { color: statusColor }]}>
                            {statusTitle}
                          </Text>
                        </View>
                        <Text style={[styles.statusBannerDesc, { color: statusColor }]}>
                          {formatBillingMessage(
                            clienteSeleccionado,
                            ciclosCliente,
                            feriados,
                            hoy
                          )}
                        </Text>
                      </View>

                      <View style={styles.metricGrid}>
                        <View style={styles.metricItem}>
                          <View style={styles.metricHeader}>
                            <Icon source="calendar-clock" size={16} color={palette.secondary} />
                            <Text style={styles.metricLabel}>Próximo cobro</Text>
                          </View>
                          <Text style={styles.metricValue}>
                            {timingCobro?.fechaVencimiento
                              ? formatDateLong(timingCobro.fechaVencimiento)
                              : "Sin calcular"}
                          </Text>
                          {timingCobro?.fechaVencimiento && (
                            <Text
                              style={[
                                styles.metricSubtext,
                                timingCobro.diasAtraso > 0
                                  ? { color: palette.danger, fontWeight: "600" }
                                  : timingCobro.diasPendientes === 0
                                  ? { color: palette.warning, fontWeight: "600" }
                                  : { color: palette.muted },
                              ]}
                            >
                              {timingCobro.diasAtraso > 0
                                ? `Vencido hace ${timingCobro.diasAtraso} día(s)`
                                : timingCobro.diasPendientes === 0
                                ? "Vence hoy"
                                : `En ${timingCobro.diasPendientes} día(s) hábiles`}
                            </Text>
                          )}
                        </View>

                        <View style={styles.metricItem}>
                          <View style={styles.metricHeader}>
                            <Icon source="chart-donut" size={16} color={palette.secondary} />
                            <Text style={styles.metricLabel}>Días del ciclo</Text>
                          </View>
                          <Text style={styles.metricValue}>
                            {isSinPagos
                              ? "0 días"
                              : `${diasConsumidos} de ${snapshotSeleccionado.diasTotalesCicloActual} días`}
                          </Text>
                          <View style={styles.progressBarBackground}>
                            <View
                              style={[
                                styles.progressBarFill,
                                {
                                  width: `${Math.min(100, Math.max(0, porcentajeConsumo))}%`,
                                  backgroundColor: isDeuda
                                    ? palette.danger
                                    : isProximo
                                    ? palette.warning
                                    : palette.primary,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.metricSubtext}>
                            {diasRestantes > 0
                              ? `${diasRestantes} día(s) disponibles totales`
                              : isSinPagos
                              ? "Pendiente de primer pago"
                              : "Ciclo finalizado"}
                          </Text>
                        </View>

                        <View style={styles.metricItem}>
                          <View style={styles.metricHeader}>
                            <Icon source="receipt" size={16} color={palette.secondary} />
                            <Text style={styles.metricLabel}>Último pago</Text>
                          </View>
                          <Text style={styles.metricValue}>
                            {clienteSeleccionado.ultimoPago
                              ? formatDateLong(clienteSeleccionado.ultimoPago)
                              : "Sin pagos registrados"}
                          </Text>
                        </View>

                        <View style={styles.metricItem}>
                          <View style={styles.metricHeader}>
                            <Icon source="tune-vertical" size={16} color={palette.secondary} />
                            <Text style={styles.metricLabel}>Ajuste manual</Text>
                          </View>
                          <Text style={styles.metricValue}>
                            {ajusteTotal > 0 ? `+${ajusteTotal}` : ajusteTotal} día(s)
                          </Text>
                          <Text style={styles.metricSubtext}>
                            Base {getComidasPorCiclo()} días hábiles
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.modalSectionCard}>
                      <View style={styles.modalSectionHeaderRow}>
                        <Icon source="food" size={20} color={palette.primary} />
                        <Text style={styles.modalSectionTitle}>Viandas configuradas</Text>
                      </View>

                      {clienteSeleccionado.viandas.length === 0 ? (
                        <View style={styles.emptyViandasBox}>
                          <Text style={styles.emptyViandasText}>
                            No hay viandas asignadas a este cliente.
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.viandasList}>
                          {clienteSeleccionado.viandas.map((item) => (
                            <View key={item.id} style={styles.viandaRow}>
                              <View style={styles.viandaTypeInfo}>
                                <Icon
                                  source="silverware-fork-knife"
                                  size={16}
                                  color={palette.primary}
                                />
                                <Text style={styles.viandaTypeName}>{item.tipo}</Text>
                              </View>
                              <View style={styles.viandaQtyBadge}>
                                <Text style={styles.viandaQtyText}>
                                  {item.cantidad} {item.cantidad === 1 ? "vianda" : "viandas"}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      <View style={styles.viandasTotalBox}>
                        <Text style={styles.viandasTotalLabel}>Total por día:</Text>
                        <Text style={styles.viandasTotalCount}>
                          {totalViandasDia} {totalViandasDia === 1 ? "comida" : "comidas"} / día
                        </Text>
                      </View>

                      {Boolean(clienteSeleccionado.detalleEspecifico?.trim()) && (
                        <View style={styles.viandasNotesBox}>
                          <Icon source="information-outline" size={16} color={palette.muted} />
                          <Text style={styles.viandasNotesText}>
                            {clienteSeleccionado.detalleEspecifico}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.modalSectionCard}>
                      <View style={styles.modalSectionHeaderRow}>
                        <Icon
                          source="card-account-details-outline"
                          size={20}
                          color={palette.primary}
                        />
                        <Text style={styles.modalSectionTitle}>Detalles del cliente</Text>
                      </View>

                      <View style={styles.contactRow}>
                        <View style={styles.contactIconWrap}>
                          <Icon source="map-marker-outline" size={20} color={palette.primary} />
                        </View>
                        <View style={styles.contactInfo}>
                          <Text style={styles.contactFieldLabel}>Dirección</Text>
                          <Text
                            style={
                              clienteSeleccionado.direccion
                                ? styles.contactFieldValue
                                : styles.contactFieldEmpty
                            }
                          >
                            {clienteSeleccionado.direccion || "Sin dirección cargada"}
                          </Text>
                        </View>
                        {clienteSeleccionado.direccion ? (
                          <IconButton
                            icon="content-copy"
                            size={20}
                            iconColor={palette.primary}
                            onPress={() =>
                              void copiarTexto(clienteSeleccionado.direccion ?? "", "Dirección")
                            }
                            accessibilityLabel="Copiar dirección"
                          />
                        ) : null}
                      </View>

                      <View style={styles.contactRow}>
                        <View style={styles.contactIconWrap}>
                          <Icon source="phone-outline" size={20} color={palette.primary} />
                        </View>
                        <View style={styles.contactInfo}>
                          <Text style={styles.contactFieldLabel}>Teléfono</Text>
                          <Text
                            style={
                              clienteSeleccionado.telefono
                                ? styles.contactFieldValue
                                : styles.contactFieldEmpty
                            }
                          >
                            {clienteSeleccionado.telefono || "Sin teléfono cargado"}
                          </Text>
                        </View>
                        {clienteSeleccionado.telefono ? (
                          <IconButton
                            icon="content-copy"
                            size={20}
                            iconColor={palette.primary}
                            onPress={() =>
                              void copiarTexto(clienteSeleccionado.telefono ?? "", "Teléfono")
                            }
                            accessibilityLabel="Copiar teléfono"
                          />
                        ) : null}
                      </View>

                      <View style={styles.contactButtonsRow}>
                        <Button
                          mode="contained"
                          icon="phone"
                          buttonColor={palette.primary}
                          textColor="#ffffff"
                          onPress={() => void llamarTelefono(clienteSeleccionado.telefono ?? "")}
                          disabled={!clienteSeleccionado.telefono}
                          style={styles.actionBtn}
                          contentStyle={{ minHeight: 42 }}
                        >
                          Llamar
                        </Button>
                        <Button
                          mode={contactoAgendado ? "contained-tonal" : "outlined"}
                          icon={contactoAgendado ? "check-circle" : "account-plus"}
                          textColor={contactoAgendado ? palette.secondary : palette.primary}
                          loading={agendandoContacto}
                          onPress={() => void agendarContacto()}
                          disabled={
                            agendandoContacto ||
                            (!clienteSeleccionado.telefono && !clienteSeleccionado.direccion)
                          }
                          style={styles.actionBtn}
                          contentStyle={{ minHeight: 42 }}
                        >
                          {agendandoContacto
                            ? "Guardando..."
                            : contactoAgendado
                            ? "Agendado"
                            : "Agendar"}
                        </Button>
                      </View>
                    </View>
                  </>
                );
              })()}
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
            <View style={styles.modalHeaderTitleBox}>
              <Text style={styles.modalTitle}>Pagos</Text>
              {clienteSeleccionado && (
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {clienteSeleccionado.nombre}
                </Text>
              )}
            </View>
            <IconButton
              icon="close"
              size={22}
              onPress={() => {
                setActiveModal(null);
                cancelarEdicionPago();
              }}
              accessibilityLabel="Cerrar modal"
            />
          </View>
          <Divider />
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            {clienteSeleccionado && (
              <>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Registrar pago</Text>
                  <Text>
                    Fecha seleccionada:{" "}
                    <Text style={{ fontWeight: "700", color: theme.colors.primary }}>
                      {formatDateLong(effectiveFechaNueva)}
                    </Text>
                    {!fechaPago ? " (hoy)" : ""}
                  </Text>
                  <View style={styles.row}>
                    <Button
                      mode="outlined"
                      icon="calendar"
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
                  <TextInput
                    label="Nota opcional (ej. Efectivo, Transferencia)"
                    value={detallePago}
                    onChangeText={setDetallePago}
                    mode="outlined"
                    maxLength={60}
                    style={styles.input}
                  />
                  <Button
                    mode="contained"
                    icon="check"
                    onPress={() => void registrarPago()}
                    buttonColor={theme.colors.secondary}
                    contentStyle={{ minHeight: 44 }}
                  >
                    Registrar pago
                  </Button>
                </View>

                <Divider />

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Historial de pagos</Text>
                  {pagoEnEdicion && (
                    <View
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: theme.colors.surfaceVariant,
                        borderWidth: 1,
                        borderColor: theme.colors.outline,
                        gap: 8,
                      }}
                    >
                      <Text style={{ fontWeight: "700" }}>
                        Editando pago:{" "}
                        {fechaPagoEdicion ? formatDateLong(fechaPagoEdicion) : "Sin seleccionar"}
                      </Text>
                      <Button
                        mode="outlined"
                        icon="calendar"
                        onPress={() => {
                          setDatePickerTarget("editar-pago");
                          setOpenDatePago(true);
                        }}
                      >
                        Cambiar fecha
                      </Button>
                      <TextInput
                        label="Nota del pago"
                        value={detallePagoEdicion}
                        onChangeText={setDetallePagoEdicion}
                        mode="outlined"
                        maxLength={60}
                        style={styles.input}
                      />
                      <View style={styles.row}>
                        <Button
                          mode="contained"
                          onPress={() => void guardarEdicionPago()}
                          buttonColor={theme.colors.secondary}
                        >
                          Guardar cambio
                        </Button>
                        <Button mode="text" onPress={cancelarEdicionPago}>
                          Cancelar
                        </Button>
                      </View>
                    </View>
                  )}

                  {pagosDelCliente.length === 0 ? (
                    <Text>No hay pagos registrados.</Text>
                  ) : (
                    <>
                      {pagosDelCliente
                        .slice(0, mostrarTodosPagos ? pagosDelCliente.length : 5)
                        .map((ev) => (
                          <List.Item
                            key={ev.id}
                            title={ev.detalle || "Pago registrado"}
                            description={formatDateLong(ev.fecha)}
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
                      {pagosDelCliente.length > 5 && (
                        <Button
                          mode="text"
                          onPress={() => setMostrarTodosPagos((prev) => !prev)}
                        >
                          {mostrarTodosPagos ? "Ver menos" : `Ver todos (${pagosDelCliente.length})`}
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
          visible={confirmPago.visible}
          onDismiss={() => setConfirmPago({ visible: false, fecha: "", reason: "anterior" })}
          style={miViandaDialogStyle}
        >
          <Dialog.Title>
            {confirmPago.reason === "duplicado"
              ? "Pago en la misma fecha"
              : "Pago con fecha anterior"}
          </Dialog.Title>
          <Dialog.Content>
            <Text>
              {confirmPago.reason === "duplicado"
                ? `Ya existe un pago registrado el ${formatDateLong(
                    confirmPago.fecha
                  )}. ¿Querés sumar otro ciclo adicional con esa fecha?`
                : `La fecha elegida (${formatDateLong(
                    confirmPago.fecha
                  )}) es anterior al último pago registrado. ¿Deseás agregar este pago histórico?`}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setConfirmPago({ visible: false, fecha: "", reason: "anterior" })}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                const fecha = confirmPago.fecha;
                const isHist = confirmPago.reason === "anterior";
                setConfirmPago({ visible: false, fecha: "", reason: "anterior" });
                if (fecha) void procesarPago(fecha, isHist);
              }}
            >
              Confirmar
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
            <Button textColor={theme.colors.error} onPress={() => void borrarEventoSeleccionado()}>
              Borrar
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar({ visible: false, message: "" })}
          duration={2500}
        >
          {snackbar.message}
        </Snackbar>
      </Portal>
    </View>
  );
}
