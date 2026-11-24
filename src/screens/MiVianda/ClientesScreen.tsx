import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import {
  Button,
  Checkbox,
  Chip,
  Dialog,
  FAB,
  HelperText,
  IconButton,
  Portal,
  Searchbar,
  Snackbar,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useStore } from "../../store/zustand";
import { palette } from "../../theme/appTheme";
import {
  CONTENT_MAX_WIDTH,
  getFontSize,
  getLineHeight,
  getMiViandaFabBottomOffset,
  getSpacing,
} from "../../theme/layout";
import type {
  Client,
  MealSelection,
  MiViandaStackParamList,
  PaymentCycle,
} from "../../types/types";
import {
  compareClientsByUpcomingCharge,
  formatBillingMessage,
  getClientBillingSnapshot,
  type ClientBillingSnapshot,
} from "../../utils/billing";
import { formatDateLong, getTodayString } from "../../utils/date";
import MealSelectionEditor, { buildEmptyMealSelection } from "./components/MealSelectionEditor";
import { miViandaDialogStyle } from "./miViandaShared";

type NavigationProp = NativeStackNavigationProp<MiViandaStackParamList>;
type StatusFilter = "todos" | "deuda" | "proximo-cobro" | "sin-pagos";

const formatDueSectionTitle = (dateStr: string) => {
  const formatted = new Date(`${dateStr}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const normalized = formatted.replace(",", "");
  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return capitalized.replace(/ de ([a-záéíóúñ])/i, (_, firstLetter: string) => {
    return ` de ${firstLetter.toUpperCase()}`;
  });
};

export default function ClientesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const fabBottomOffset = getMiViandaFabBottomOffset();
  const titleSize = getFontSize(width, 24);
  const bodySize = getFontSize(width, 15);

  const setUbi = useStore((state) => state.setUbi);
  const clientes = useStore((state) => state.miViandaClientes);
  const ciclos = useStore((state) => state.miViandaCiclos);
  const feriados = useStore((state) => state.miViandaFeriados);
  const tiposVianda = useStore((state) => state.miViandaTiposVianda);
  const updateMiViandaClient = useStore((state) => state.updateMiViandaClient);
  const deleteMiViandaClient = useStore((state) => state.deleteMiViandaClient);

  const [snackbar, setSnackbar] = useState({ visible: false, message: "" });
  const [edicionVisible, setEdicionVisible] = useState(false);
  const [clienteEnEdicion, setClienteEnEdicion] = useState<Client | null>(null);
  const [nombreEdit, setNombreEdit] = useState("");
  const [detalleEdit, setDetalleEdit] = useState("");
  const [direccionEdit, setDireccionEdit] = useState("");
  const [telefonoEdit, setTelefonoEdit] = useState("");
  const [viandasEdit, setViandasEdit] = useState<MealSelection[]>([buildEmptyMealSelection()]);
  const [editAttempted, setEditAttempted] = useState(false);

  const [confirmBorrarVisible, setConfirmBorrarVisible] = useState(false);
  const [clienteABorrar, setClienteABorrar] = useState<Client | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [soloConDetalles, setSoloConDetalles] = useState(false);
  const [filtroViandas, setFiltroViandas] = useState<string[]>([]);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [ordenarPorProximosCobros, setOrdenarPorProximosCobros] = useState(false);
  const [filtroVisible, setFiltroVisible] = useState(false);

  const today = getTodayString();

  useFocusEffect(
    useCallback(() => {
      setUbi("Clientes");
    }, [setUbi])
  );

  const showMessage = (message: string) => {
    setSnackbar({ visible: true, message });
  };

  const limpiarFiltros = () => {
    setFiltroNombre("");
    setStatusFilter("todos");
    setSoloConDetalles(false);
    setFiltroViandas([]);
    setOrdenarPorProximosCobros(false);
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
      const ciclosCliente = ciclosByClient.get(c.id) ?? [];
      map.set(c.id, getClientBillingSnapshot(c, ciclosCliente, feriados, today));
    });
    return map;
  }, [ciclosByClient, clientes, feriados, today]);

  const alertasDeuda = useMemo(
    () =>
      clientes.filter((c) => snapshotsByClient.get(c.id)?.status.estado === "deuda"),
    [clientes, snapshotsByClient]
  );

  const alertasProximoCobro = useMemo(
    () =>
      clientes.filter((c) => snapshotsByClient.get(c.id)?.status.estado === "proximo-cobro"),
    [clientes, snapshotsByClient]
  );

  const sinPagosCount = useMemo(
    () =>
      clientes.filter((c) => snapshotsByClient.get(c.id)?.status.estado === "sin-pagos").length,
    [clientes, snapshotsByClient]
  );

  const clientesOrdenados = useMemo(() => {
    const needle = filtroNombre.trim().toLowerCase();

    return [...clientes]
      .filter((c) => {
        if (!needle) return true;
        return (
          c.nombre.toLowerCase().includes(needle) ||
          (c.telefono ?? "").toLowerCase().includes(needle) ||
          (c.direccion ?? "").toLowerCase().includes(needle) ||
          (c.detalleEspecifico ?? "").toLowerCase().includes(needle)
        );
      })
      .filter((c) => {
        if (statusFilter === "todos") return true;
        return snapshotsByClient.get(c.id)?.status.estado === statusFilter;
      })
      .filter((c) => (soloConDetalles ? Boolean(c.detalleEspecifico?.trim()) : true))
      .filter((c) =>
        filtroViandas.length === 0
          ? true
          : c.viandas.some((v) => filtroViandas.includes(v.tipo))
      )
      .sort((a, b) =>
        ordenarPorProximosCobros
          ? compareClientsByUpcomingCharge(a, b, ciclosByClient, feriados, today)
          : a.nombre.localeCompare(b.nombre)
      );
  }, [
    ciclosByClient,
    clientes,
    feriados,
    filtroNombre,
    filtroViandas,
    ordenarPorProximosCobros,
    snapshotsByClient,
    soloConDetalles,
    statusFilter,
    today,
  ]);

  const clientesAgrupadosPorCobro = useMemo(() => {
    if (!ordenarPorProximosCobros) return [];

    const deudaOVencidos: Client[] = [];
    const gruposPorFecha = new Map<string, Client[]>();
    const sinFecha: Client[] = [];

    clientesOrdenados.forEach((cliente) => {
      const snapshot = snapshotsByClient.get(cliente.id);
      const timing = snapshot?.timing;
      const status = snapshot?.status;
      const estaVencido = status?.estado === "deuda" || (timing?.diasAtraso ?? 0) > 0;

      if (estaVencido) {
        deudaOVencidos.push(cliente);
        return;
      }

      if (!timing?.fechaVencimiento) {
        sinFecha.push(cliente);
        return;
      }

      const existentes = gruposPorFecha.get(timing.fechaVencimiento) ?? [];
      existentes.push(cliente);
      gruposPorFecha.set(timing.fechaVencimiento, existentes);
    });

    const grupos: { key: string; title: string; clientes: Client[] }[] = [];

    if (deudaOVencidos.length > 0) {
      grupos.push({
        key: "deuda",
        title: "Deuda y vencidos",
        clientes: [...deudaOVencidos].sort((a, b) =>
          compareClientsByUpcomingCharge(a, b, ciclosByClient, feriados, today)
        ),
      });
    }

    Array.from(gruposPorFecha.keys())
      .sort((a, b) => a.localeCompare(b))
      .forEach((fecha) => {
        const clientesDelGrupo = gruposPorFecha.get(fecha) ?? [];
        grupos.push({
          key: fecha,
          title: formatDueSectionTitle(fecha),
          clientes: [...clientesDelGrupo].sort((a, b) =>
            compareClientsByUpcomingCharge(a, b, ciclosByClient, feriados, today)
          ),
        });
      });

    if (sinFecha.length > 0) {
      grupos.push({
        key: "sin-fecha",
        title: "Sin pagos registrados",
        clientes: [...sinFecha].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      });
    }

    return grupos;
  }, [
    ciclosByClient,
    clientesOrdenados,
    feriados,
    ordenarPorProximosCobros,
    snapshotsByClient,
    today,
  ]);

  const abrirDetalle = (cliente: Client) => {
    navigation.navigate("Cobros", { clienteId: cliente.id });
  };

  const abrirEdicion = (cliente: Client) => {
    setClienteEnEdicion(cliente);
    setNombreEdit(cliente.nombre);
    setDetalleEdit(cliente.detalleEspecifico ?? "");
    setDireccionEdit(cliente.direccion ?? "");
    setTelefonoEdit(cliente.telefono ?? "");
    setViandasEdit(
      cliente.viandas.length > 0
        ? cliente.viandas.map((v) => ({ ...v }))
        : [buildEmptyMealSelection()]
    );
    setEditAttempted(false);
    setEdicionVisible(true);
  };

  const nombreEditLimpio = nombreEdit.trim();
  const nombreEditDuplicado = Boolean(
    clienteEnEdicion &&
      nombreEditLimpio &&
      clientes.some(
        (c) =>
          c.id !== clienteEnEdicion.id &&
          c.nombre.toLowerCase() === nombreEditLimpio.toLowerCase()
      )
  );
  const nombreEditError = !nombreEditLimpio
    ? "Ingresá un nombre válido."
    : nombreEditDuplicado
    ? "Ya existe un cliente con ese nombre."
    : null;

  const viandasEditLimpias = useMemo(
    () =>
      viandasEdit
        .map((item) => ({ ...item, tipo: item.tipo.trim() }))
        .filter((item) => item.tipo.length > 0 && item.cantidad > 0),
    [viandasEdit]
  );

  const guardarEdicion = async () => {
    if (!clienteEnEdicion) return;
    setEditAttempted(true);

    if (nombreEditError || viandasEditLimpias.length === 0) {
      return;
    }

    await updateMiViandaClient({
      ...clienteEnEdicion,
      nombre: nombreEditLimpio,
      viandas: viandasEditLimpias,
      detalleEspecifico: detalleEdit.trim() ? detalleEdit.trim() : undefined,
      direccion: direccionEdit.trim() ? direccionEdit.trim() : undefined,
      telefono: telefonoEdit.trim() ? telefonoEdit.trim() : undefined,
    });

    setEdicionVisible(false);
    setClienteEnEdicion(null);
    showMessage("Cliente actualizado.");
  };

  const abrirConfirmBorrado = (cliente: Client) => {
    setClienteABorrar(cliente);
    setConfirmBorrarVisible(true);
  };

  const borrarCliente = async () => {
    if (!clienteABorrar) return;
    await deleteMiViandaClient(clienteABorrar.id);
    setConfirmBorrarVisible(false);
    setClienteABorrar(null);
    showMessage("Cliente eliminado.");
  };

  const getBadgeStyle = (estado: ClientBillingSnapshot["status"]["estado"]) => {
    if (estado === "deuda") {
      return { bg: "#fdecec", border: "#f5b7b1", text: palette.danger, label: "Con deuda" };
    }
    if (estado === "proximo-cobro") {
      return { bg: "#fef5e7", border: "#f8c471", text: palette.warning, label: "Próximo cobro" };
    }
    if (estado === "sin-pagos") {
      return {
        bg: theme.colors.surfaceVariant,
        border: theme.colors.outline,
        text: theme.colors.onSurfaceVariant,
        label: "Sin pagos",
      };
    }
    return { bg: "#eafaf1", border: "#a9dfbf", text: palette.success, label: "Al día" };
  };

  const renderClienteItem = (cliente: Client) => {
    const ciclosCliente = ciclosByClient.get(cliente.id) ?? [];
    const snapshot = snapshotsByClient.get(cliente.id);
    const estado = snapshot?.status.estado ?? "sin-pagos";
    const badge = getBadgeStyle(estado);
    const totalViandasDia = cliente.viandas.reduce((s, v) => s + (v.cantidad || 0), 0);
    const viandasText = cliente.viandas.map((v) => `${v.tipo} (${v.cantidad})`).join(", ");
    const billingText = formatBillingMessage(cliente, ciclosCliente, feriados, today);

    return (
      <Surface
        key={cliente.id}
        style={[
          styles.clientCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
        elevation={0}
      >
        <Pressable
          onPress={() => abrirDetalle(cliente)}
          style={({ pressed }) => [styles.clientCardInner, pressed && { opacity: 0.78 }]}
        >
          <View style={styles.clientCardHeader}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.clientName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                {cliente.nombre}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: badge.bg, borderColor: badge.border },
                ]}
              >
                <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                  {badge.label}
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              <IconButton
                icon="pencil"
                iconColor={theme.colors.primary}
                size={20}
                onPress={() => abrirEdicion(cliente)}
                accessibilityLabel={`Editar ${cliente.nombre}`}
              />
              <IconButton
                icon="delete"
                iconColor={theme.colors.error}
                size={20}
                onPress={() => abrirConfirmBorrado(cliente)}
                accessibilityLabel={`Eliminar ${cliente.nombre}`}
              />
            </View>
          </View>

          <View style={styles.clientMetaBlock}>
            <Text style={[styles.clientMetaLine, { color: theme.colors.onSurfaceVariant }]}>
              {totalViandasDia} {totalViandasDia === 1 ? "vianda" : "viandas"}/día: {viandasText}
            </Text>
            {cliente.detalleEspecifico ? (
              <Text style={[styles.clientNoteLine, { color: theme.colors.primary }]}>
                Obs.: {cliente.detalleEspecifico}
              </Text>
            ) : null}
            <Text style={[styles.clientMetaLine, { color: theme.colors.onSurfaceVariant }]}>
              {cliente.ultimoPago
                ? `Último pago: ${formatDateLong(cliente.ultimoPago)}`
                : "Sin pagos registrados"}
            </Text>
            {snapshot?.timing?.fechaVencimiento ? (
              <Text style={[styles.clientMetaLine, { color: theme.colors.onSurfaceVariant }]}>
                {snapshot.timing.diasAtraso > 0
                  ? `Venció el ${formatDateLong(snapshot.timing.fechaVencimiento)}`
                  : `Vence el ${formatDateLong(snapshot.timing.fechaVencimiento)}`}
              </Text>
            ) : null}
            <Text style={[styles.clientBillingLine, { color: badge.text }]}>
              {billingText}
            </Text>
          </View>
        </Pressable>
      </Surface>
    );
  };

  const hasActiveFilters =
    filtroNombre.trim().length > 0 ||
    statusFilter !== "todos" ||
    soloConDetalles ||
    filtroViandas.length > 0 ||
    ordenarPorProximosCobros;

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
        headerRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        },
        title: {
          fontSize: titleSize,
          fontWeight: "800",
          color: theme.colors.onSurface,
        },
        subtitleCount: {
          fontSize: getFontSize(width, 13),
          color: theme.colors.onSurfaceVariant,
          fontWeight: "600",
        },
        searchbar: {
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          backgroundColor: theme.colors.surface,
        },
        chipsScroll: {
          gap: 8,
          paddingVertical: 2,
        },
        alertBox: {
          borderRadius: 14,
          padding: 12,
          gap: 4,
          borderWidth: 1,
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
          fontSize: getFontSize(width, 15),
        },
        alertLinkText: {
          fontSize: getFontSize(width, 13),
          lineHeight: getLineHeight(getFontSize(width, 13)),
          textDecorationLine: "underline",
        },
        clientCard: {
          borderRadius: 16,
          borderWidth: 1,
          overflow: "hidden",
        },
        clientCardInner: {
          padding: 14,
          gap: 8,
        },
        clientCardHeader: {
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        },
        clientName: {
          fontSize: getFontSize(width, 17),
          fontWeight: "700",
        },
        statusBadge: {
          alignSelf: "flex-start",
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 999,
          borderWidth: 1,
        },
        statusBadgeText: {
          fontSize: 11,
          fontWeight: "700",
        },
        actions: {
          flexDirection: "row",
          alignItems: "center",
        },
        clientMetaBlock: {
          gap: 3,
        },
        clientMetaLine: {
          fontSize: getFontSize(width, 13),
          lineHeight: getLineHeight(getFontSize(width, 13)),
        },
        clientNoteLine: {
          fontSize: getFontSize(width, 13),
          fontWeight: "600",
        },
        clientBillingLine: {
          fontSize: getFontSize(width, 13),
          fontWeight: "700",
          marginTop: 2,
        },
        emptyCard: {
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: theme.colors.outline,
          backgroundColor: theme.colors.surface,
          alignItems: "center",
          gap: 10,
        },
        emptyText: {
          color: theme.colors.onSurfaceVariant,
          fontSize: bodySize,
          textAlign: "center",
        },
        fab: {
          position: "absolute",
          right: 16,
          bottom: fabBottomOffset,
          backgroundColor: theme.colors.primary,
        },
        dialogScrollArea: {
          maxHeight: 460,
          paddingHorizontal: 0,
        },
        dialogScrollContent: {
          paddingHorizontal: 22,
          paddingVertical: 10,
          gap: 10,
        },
        editInput: {
          backgroundColor: theme.colors.surface,
        },
        filterRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        filterSectionTitle: {
          marginTop: 6,
          fontWeight: "700",
          fontSize: getFontSize(width, 15),
        },
        sectionBlock: {
          marginTop: 6,
          gap: 8,
        },
        sectionTitle: {
          fontSize: getFontSize(width, 16),
          fontWeight: "700",
          color: theme.colors.primary,
        },
      }),
    [
      bodySize,
      fabBottomOffset,
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Clientes</Text>
              <Text style={styles.subtitleCount}>
                {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"} en total
              </Text>
            </View>
            <Button
              mode={soloConDetalles || filtroViandas.length > 0 ? "contained-tonal" : "outlined"}
              icon="tune-variant"
              compact
              onPress={() => setFiltroVisible(true)}
            >
              Filtros
            </Button>
          </View>

          <Searchbar
            placeholder="Buscar cliente, teléfono o dirección..."
            value={filtroNombre}
            onChangeText={setFiltroNombre}
            style={styles.searchbar}
            elevation={0}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            <Chip
              selected={statusFilter === "todos"}
              onPress={() => setStatusFilter("todos")}
            >
              Todos ({clientes.length})
            </Chip>
            <Chip
              selected={statusFilter === "deuda"}
              onPress={() =>
                setStatusFilter((prev) => (prev === "deuda" ? "todos" : "deuda"))
              }
            >
              Con deuda ({alertasDeuda.length})
            </Chip>
            <Chip
              selected={statusFilter === "proximo-cobro"}
              onPress={() =>
                setStatusFilter((prev) =>
                  prev === "proximo-cobro" ? "todos" : "proximo-cobro"
                )
              }
            >
              Próximo cobro ({alertasProximoCobro.length})
            </Chip>
            <Chip
              selected={statusFilter === "sin-pagos"}
              onPress={() =>
                setStatusFilter((prev) => (prev === "sin-pagos" ? "todos" : "sin-pagos"))
              }
            >
              Sin pagos ({sinPagosCount})
            </Chip>
            <Chip
              selected={ordenarPorProximosCobros}
              icon="calendar-clock"
              onPress={() => setOrdenarPorProximosCobros((prev) => !prev)}
            >
              Agrupar por cobro
            </Chip>
          </ScrollView>

          {!ordenarPorProximosCobros && statusFilter === "todos" && alertasDeuda.length > 0 && (
            <View style={[styles.alertBox, styles.alertDebt]}>
              <Text style={[styles.alertTitle, { color: palette.danger }]}>
                Clientes con deuda ({alertasDeuda.length})
              </Text>
              {alertasDeuda.map((cliente) => (
                <Pressable key={cliente.id} onPress={() => abrirDetalle(cliente)}>
                  <Text style={[styles.alertLinkText, { color: palette.danger }]}>
                    {cliente.nombre}:{" "}
                    {formatBillingMessage(
                      cliente,
                      ciclosByClient.get(cliente.id) ?? [],
                      feriados,
                      today
                    )}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {!ordenarPorProximosCobros &&
            statusFilter === "todos" &&
            alertasProximoCobro.length > 0 && (
              <View style={[styles.alertBox, styles.alertSoon]}>
                <Text style={[styles.alertTitle, { color: palette.warning }]}>
                  Próximo cobro ({alertasProximoCobro.length})
                </Text>
                {alertasProximoCobro.map((cliente) => (
                  <Pressable key={cliente.id} onPress={() => abrirDetalle(cliente)}>
                    <Text style={[styles.alertLinkText, { color: palette.warning }]}>
                      {cliente.nombre}:{" "}
                      {formatBillingMessage(
                        cliente,
                        ciclosByClient.get(cliente.id) ?? [],
                        feriados,
                        today
                      )}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

          {clientes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Todavía no hay clientes registrados.</Text>
              <Button
                mode="contained"
                icon="plus"
                onPress={() => navigation.navigate("Nuevo Cliente")}
              >
                Crear primer cliente
              </Button>
            </View>
          ) : clientesOrdenados.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No hay clientes que coincidan con los filtros aplicados.
              </Text>
              {hasActiveFilters ? (
                <Button mode="outlined" onPress={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              ) : null}
            </View>
          ) : ordenarPorProximosCobros ? (
            clientesAgrupadosPorCobro.map((grupo) => (
              <View key={grupo.key} style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>{grupo.title}</Text>
                {grupo.clientes.map((cliente) => renderClienteItem(cliente))}
              </View>
            ))
          ) : (
            clientesOrdenados.map((cliente) => renderClienteItem(cliente))
          )}
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        label="Nuevo cliente"
        style={styles.fab}
        color={theme.colors.onPrimary}
        onPress={() => navigation.navigate("Nuevo Cliente")}
        accessibilityLabel="Agregar cliente"
      />

      <Portal>
        <Dialog
          visible={filtroVisible}
          onDismiss={() => setFiltroVisible(false)}
          style={miViandaDialogStyle}
        >
          <Dialog.Title>Filtros avanzados</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView
              contentContainerStyle={styles.dialogScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable
                style={styles.filterRow}
                onPress={() => setSoloConDetalles((prev) => !prev)}
              >
                <Checkbox status={soloConDetalles ? "checked" : "unchecked"} />
                <Text>Solo con detalles específicos</Text>
              </Pressable>

              <Pressable
                style={styles.filterRow}
                onPress={() => setOrdenarPorProximosCobros((prev) => !prev)}
              >
                <Checkbox status={ordenarPorProximosCobros ? "checked" : "unchecked"} />
                <Text>Agrupar por fecha de próximo cobro</Text>
              </Pressable>

              <Text style={styles.filterSectionTitle}>Tipos de vianda</Text>
              {tiposVianda.length === 0 ? (
                <Text style={styles.emptyText}>No hay tipos de vianda cargados.</Text>
              ) : (
                tiposVianda.map((tipo) => (
                  <Pressable
                    key={tipo.id}
                    style={styles.filterRow}
                    onPress={() =>
                      setFiltroViandas((prev) =>
                        prev.includes(tipo.nombre)
                          ? prev.filter((v) => v !== tipo.nombre)
                          : [...prev, tipo.nombre]
                      )
                    }
                  >
                    <Checkbox
                      status={filtroViandas.includes(tipo.nombre) ? "checked" : "unchecked"}
                    />
                    <Text>{tipo.nombre}</Text>
                  </Pressable>
                ))
              )}

              <Button mode="text" onPress={limpiarFiltros}>
                Limpiar filtros
              </Button>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button mode="contained" onPress={() => setFiltroVisible(false)}>
              Listo
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={edicionVisible}
          onDismiss={() => setEdicionVisible(false)}
          style={miViandaDialogStyle}
        >
          <Dialog.Title>Editar cliente</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView
              contentContainerStyle={styles.dialogScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View>
                <TextInput
                  label="Nombre"
                  value={nombreEdit}
                  onChangeText={setNombreEdit}
                  mode="outlined"
                  autoCapitalize="words"
                  maxLength={60}
                  style={styles.editInput}
                  error={Boolean((editAttempted || nombreEdit.length > 0) && nombreEditError)}
                />
                {(editAttempted || nombreEdit.length > 0) && nombreEditError ? (
                  <HelperText type="error" visible>
                    {nombreEditError}
                  </HelperText>
                ) : null}
              </View>

              <TextInput
                label="Detalle específico (opcional)"
                value={detalleEdit}
                onChangeText={setDetalleEdit}
                mode="outlined"
                autoCapitalize="sentences"
                maxLength={120}
                style={styles.editInput}
              />
              <TextInput
                label="Dirección (opcional)"
                value={direccionEdit}
                onChangeText={setDireccionEdit}
                mode="outlined"
                autoCapitalize="sentences"
                maxLength={120}
                style={styles.editInput}
              />
              <TextInput
                label="Teléfono (opcional)"
                value={telefonoEdit}
                onChangeText={setTelefonoEdit}
                mode="outlined"
                keyboardType="phone-pad"
                maxLength={30}
                style={styles.editInput}
              />

              <Text style={styles.filterSectionTitle}>Viandas por día</Text>
              <MealSelectionEditor
                viandas={viandasEdit}
                tiposVianda={tiposVianda}
                onChange={setViandasEdit}
                showError={editAttempted}
                onNavigateToTipos={() => {
                  setEdicionVisible(false);
                  navigation.navigate("Tipos de vianda");
                }}
              />
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setEdicionVisible(false)}>Cancelar</Button>
            <Button mode="contained" onPress={guardarEdicion}>
              Guardar
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={confirmBorrarVisible}
          onDismiss={() => setConfirmBorrarVisible(false)}
          style={miViandaDialogStyle}
        >
          <Dialog.Title>Eliminar cliente</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Estás seguro que querés eliminar a {clienteABorrar?.nombre}? Esta acción también
              borra su historial de pagos y períodos.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmBorrarVisible(false)}>Cancelar</Button>
            <Button textColor={theme.colors.error} onPress={borrarCliente}>
              Eliminar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: "" })}
        duration={2500}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}
