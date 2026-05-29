import React, { useCallback, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import {
  Button,
  Checkbox,
  Dialog,
  FAB,
  IconButton,
  List,
  Portal,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Client,
  Holiday,
  MealSelection,
  MiViandaStackParamList,
  ViandaTipo,
} from "../../types/types";
import { STORAGE_KEYS } from "../../utils/storage";
import { miViandaDialogStyle } from "./miViandaShared";
import {
  compareClientsByUpcomingCharge,
  formatBillingMessage,
  getClientChargeTiming,
  getBillingStatus,
} from "../../utils/billing";
import { formatDateLong } from "../../utils/date";
import {
  CONTENT_MAX_WIDTH,
  getMiViandaFabBottomOffset,
  getFontSize,
  getLineHeight,
  getSpacing,
} from "../../theme/layout";

type NavigationProp = NativeStackNavigationProp<MiViandaStackParamList>;

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildEmptySelection = (): MealSelection => ({
  id: createId(),
  tipo: "",
  cantidad: 1,
});

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
  const bodySize = getFontSize(width, 16);
  const [clientes, setClientes] = useState<Client[]>([]);
  const [feriados, setFeriados] = useState<Holiday[]>([]);
  const [tiposVianda, setTiposVianda] = useState<ViandaTipo[]>([]);
  const [snackbar, setSnackbar] = useState({ visible: false, message: "" });

  const [edicionVisible, setEdicionVisible] = useState(false);
  const [clienteEnEdicion, setClienteEnEdicion] = useState<Client | null>(null);
  const [nombreEdit, setNombreEdit] = useState("");
  const [detalleEdit, setDetalleEdit] = useState("");
  const [direccionEdit, setDireccionEdit] = useState("");
  const [telefonoEdit, setTelefonoEdit] = useState("");
  const [viandasEdit, setViandasEdit] = useState<MealSelection[]>([buildEmptySelection()]);
  const [expandedTipoEditId, setExpandedTipoEditId] = useState<string | null>(null);
  const [confirmEditVisible, setConfirmEditVisible] = useState(false);

  const [confirmBorrarVisible, setConfirmBorrarVisible] = useState(false);
  const [clienteABorrar, setClienteABorrar] = useState<Client | null>(null);
  const [soloConDetalles, setSoloConDetalles] = useState(false);
  const [filtroViandas, setFiltroViandas] = useState<string[]>([]);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [ordenarPorProximosCobros, setOrdenarPorProximosCobros] = useState(false);
  const [filtroVisible, setFiltroVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadClientes();
    }, [])
  );

  const showMessage = (message: string) => {
    setSnackbar({ visible: true, message });
  };

  const limpiarFiltros = () => {
    setFiltroNombre("");
    setSoloConDetalles(false);
    setFiltroViandas([]);
    setOrdenarPorProximosCobros(false);
  };

  const loadClientes = async () => {
    const [dataClientes, dataTipos, dataFeriados] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.CLIENTES),
      AsyncStorage.getItem(STORAGE_KEYS.VIANDAS_TIPOS),
      AsyncStorage.getItem(STORAGE_KEYS.FERIADOS),
    ]);

    if (!dataClientes) {
      setClientes([]);
    } else {
      const parsed = JSON.parse(dataClientes) as Client[];
      setClientes(parsed);
    }

    setTiposVianda(dataTipos ? (JSON.parse(dataTipos) as ViandaTipo[]) : []);
    setFeriados(dataFeriados ? (JSON.parse(dataFeriados) as Holiday[]) : []);
  };

  const saveClientes = async (updated: Client[]) => {
    setClientes(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(updated));
  };

  const clientesOrdenados = useMemo(
    () =>
      [...clientes]
        .filter((c) =>
          filtroNombre.trim().length === 0
            ? true
            : c.nombre.toLowerCase().includes(filtroNombre.trim().toLowerCase())
        )
        .filter((c) => (soloConDetalles ? Boolean(c.detalleEspecifico?.trim()) : true))
        .filter((c) =>
          filtroViandas.length === 0
            ? true
            : c.viandas.some((v) => filtroViandas.includes(v.tipo))
        )
        .sort((a, b) =>
          ordenarPorProximosCobros
            ? compareClientsByUpcomingCharge(a, b)
            : a.nombre.localeCompare(b.nombre)
        ),
    [clientes, filtroNombre, ordenarPorProximosCobros, soloConDetalles, filtroViandas]
  );

  const alertasDeuda = useMemo(
    () => clientes.filter((c) => getBillingStatus(c).estado === "deuda"),
    [clientes]
  );

  const alertasProximoCobro = useMemo(
    () => clientes.filter((c) => getBillingStatus(c).estado === "proximo-cobro"),
    [clientes]
  );

  const abrirDetalle = (cliente: Client) => {
    navigation.navigate("Cobros", { clienteId: cliente.id });
  };

  const getCobroDetalle = (cliente: Client) => {
    if (!ordenarPorProximosCobros) return "";

    const timing = getClientChargeTiming(cliente, feriados);
    if (!timing?.fechaVencimiento) {
      return "\nCobro: sin último pago registrado.";
    }

    if (timing.diasAtraso > 0) {
      return `\nCobro: ${timing.diasAtraso} día(s) de atraso. Venció el ${formatDateLong(
        timing.fechaVencimiento
      )}.`;
    }

    if (timing.diasPendientes > 0) {
      return `\nCobro: faltan ${timing.diasPendientes} día(s) hábiles. Vence el ${formatDateLong(
        timing.fechaVencimiento
      )}.`;
    }

    return `\nCobro: vence hoy (${formatDateLong(timing.fechaVencimiento)}).`;
  };

  const clientesAgrupadosPorCobro = useMemo(() => {
    if (!ordenarPorProximosCobros) return [];

    const deudaOVencidos: Client[] = [];
    const gruposPorFecha = new Map<string, Client[]>();
    const sinFecha: Client[] = [];

    clientesOrdenados.forEach((cliente) => {
      const timing = getClientChargeTiming(cliente, feriados);
      const status = getBillingStatus(cliente);
      const estaVencido = (timing?.diasAtraso ?? 0) > 0 || status.estado === "deuda";

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
        clientes: [...deudaOVencidos].sort((a, b) => {
          const atrasoA = getClientChargeTiming(a, feriados)?.diasAtraso ?? 0;
          const atrasoB = getClientChargeTiming(b, feriados)?.diasAtraso ?? 0;
          if (atrasoA !== atrasoB) return atrasoB - atrasoA;

          const statusA = getBillingStatus(a);
          const statusB = getBillingStatus(b);
          if (statusA.estado !== statusB.estado) {
            if (statusA.estado === "deuda") return -1;
            if (statusB.estado === "deuda") return 1;
          }

          return compareClientsByUpcomingCharge(a, b);
        }),
      });
    }

    Array.from(gruposPorFecha.keys())
      .sort((a, b) => a.localeCompare(b))
      .forEach((fecha) => {
        const clientesDelGrupo = gruposPorFecha.get(fecha) ?? [];
        grupos.push({
          key: fecha,
          title: formatDueSectionTitle(fecha),
          clientes: [...clientesDelGrupo].sort((a, b) => compareClientsByUpcomingCharge(a, b)),
        });
      });

    if (sinFecha.length > 0) {
      grupos.push({
        key: "sin-fecha",
        title: "Sin vencimiento calculado",
        clientes: [...sinFecha].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      });
    }

    return grupos;
  }, [clientesOrdenados, feriados, ordenarPorProximosCobros]);

  const renderClienteItem = (cliente: Client) => (
    <List.Item
      key={cliente.id}
      title={cliente.nombre}
      description={`${cliente.ultimoPago
        ? `Ãšltimo pago: ${formatDateLong(cliente.ultimoPago)}`
        : "Sin pagos registrados"}${getCobroDetalle(cliente)}\n${formatBillingMessage(cliente)}`}
      onPress={() => abrirDetalle(cliente)}
      right={() => (
        <View style={styles.actions}>
          <IconButton
            icon="pencil"
            iconColor={theme.colors.primary}
            onPress={() => abrirEdicion(cliente)}
          />
          <IconButton
            icon="delete"
            iconColor={theme.colors.error}
            onPress={() => abrirConfirmBorrado(cliente)}
          />
        </View>
      )}
      titleStyle={styles.listTitle}
      descriptionStyle={styles.listDesc}
    />
  );

  const abrirEdicion = (cliente: Client) => {
    setClienteEnEdicion(cliente);
    setNombreEdit(cliente.nombre);
    setDetalleEdit(cliente.detalleEspecifico ?? "");
    setDireccionEdit(cliente.direccion ?? "");
    setTelefonoEdit(cliente.telefono ?? "");
    setViandasEdit(cliente.viandas.map((v) => ({ ...v })));
    setEdicionVisible(true);
  };

  const updateTipoEdit = (id: string, tipo: string) => {
    setViandasEdit((prev) => prev.map((item) => (item.id === id ? { ...item, tipo } : item)));
  };

  const updateCantidadEdit = (id: string, cantidadText: string) => {
    const parsed = Number(cantidadText.replace(/[^\d]/g, ""));
    setViandasEdit((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, cantidad: Number.isFinite(parsed) && parsed > 0 ? parsed : 1 }
          : item
      )
    );
  };

  const addViandaEdit = () => {
    setViandasEdit((prev) => [...prev, buildEmptySelection()]);
  };

  const removeViandaEdit = (id: string) => {
    setViandasEdit((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  };

  const prepararEdicion = () => {
    if (!clienteEnEdicion) return null;

    const nombreLimpio = nombreEdit.trim();
    if (!nombreLimpio) {
      showMessage("Ingresá un nombre válido.");
      return null;
    }

    const viandasLimpias = viandasEdit
      .map((item) => ({ ...item, tipo: item.tipo.trim() }))
      .filter((item) => item.tipo.length > 0 && item.cantidad > 0);

    if (viandasLimpias.length === 0) {
      showMessage("Ingresá al menos un tipo de vianda.");
      return null;
    }

    const nombreDuplicado = clientes.some(
      (c) =>
        c.id !== clienteEnEdicion.id &&
        c.nombre.toLowerCase() === nombreLimpio.toLowerCase()
    );
    if (nombreDuplicado) {
      showMessage("Ya existe un cliente con ese nombre.");
      return null;
    }

    return {
      nombreLimpio,
      viandasLimpias,
      detalleLimpio: detalleEdit.trim() ? detalleEdit.trim() : undefined,
      direccionLimpia: direccionEdit.trim() ? direccionEdit.trim() : undefined,
      telefonoLimpio: telefonoEdit.trim() ? telefonoEdit.trim() : undefined,
    };
  };

  const solicitarGuardarEdicion = () => {
    if (prepararEdicion()) {
      setConfirmEditVisible(true);
    }
  };

  const guardarEdicion = async () => {
    if (!clienteEnEdicion) return;
    const prepared = prepararEdicion();
    if (!prepared) return;

    const updated = clientes.map((cliente) =>
      cliente.id === clienteEnEdicion.id
        ? {
            ...cliente,
            nombre: prepared.nombreLimpio,
            viandas: prepared.viandasLimpias,
            detalleEspecifico: prepared.detalleLimpio,
            direccion: prepared.direccionLimpia,
            telefono: prepared.telefonoLimpio,
          }
        : cliente
    );

    await saveClientes(updated);
    setEdicionVisible(false);
    setClienteEnEdicion(null);
    setConfirmEditVisible(false);
    showMessage("Cliente actualizado.");
  };

  const abrirConfirmBorrado = (cliente: Client) => {
    setClienteABorrar(cliente);
    setConfirmBorrarVisible(true);
  };

  const borrarCliente = async () => {
    if (!clienteABorrar) return;

    const updatedClientes = clientes.filter((c) => c.id !== clienteABorrar.id);
    await saveClientes(updatedClientes);

    const dataEventos = await AsyncStorage.getItem(STORAGE_KEYS.EVENTOS_CLIENTE);
    if (dataEventos) {
      const parsed = JSON.parse(dataEventos) as {
        id: string;
        clienteId: string;
      }[];
      const filtered = parsed.filter((ev) => ev.clienteId !== clienteABorrar.id);
      await AsyncStorage.setItem(STORAGE_KEYS.EVENTOS_CLIENTE, JSON.stringify(filtered));
    }

    const dataPeriodos = await AsyncStorage.getItem(STORAGE_KEYS.PERIODOS);
    if (dataPeriodos) {
      const parsedPeriodos = JSON.parse(dataPeriodos) as {
        id: string;
        clienteId: string;
      }[];
      const filteredPeriodos = parsedPeriodos.filter(
        (periodo) => periodo.clienteId !== clienteABorrar.id
      );
      await AsyncStorage.setItem(STORAGE_KEYS.PERIODOS, JSON.stringify(filteredPeriodos));
    }

    setConfirmBorrarVisible(false);
    setClienteABorrar(null);
    showMessage("Cliente eliminado.");
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
          gap: 8,
        },
        title: {
          fontSize: titleSize,
          fontWeight: "700",
          color: theme.colors.onSurface,
        },
        filterButton: {
          marginBottom: 8,
        },
        activeFilters: {
          color: theme.colors.onSurfaceVariant,
          marginBottom: 6,
          fontSize: getFontSize(width, 14),
          lineHeight: getLineHeight(getFontSize(width, 14)),
        },
        emptyText: {
          color: theme.colors.onSurfaceVariant,
          marginTop: 10,
          fontSize: bodySize,
        },
        alertBox: {
          borderRadius: 12,
          padding: 12,
          marginBottom: 8,
        },
        alertDebt: {
          backgroundColor: "#ffe3e3",
          borderWidth: 1,
          borderColor: "#f3b7b7",
        },
        alertSoon: {
          backgroundColor: "#fff1cc",
          borderWidth: 1,
          borderColor: "#f2d58a",
        },
        alertTitle: {
          fontWeight: "700",
          marginBottom: 4,
          fontSize: getFontSize(width, 16),
        },
        actions: {
          flexDirection: "row",
          alignItems: "center",
        },
        marginTop: {
          marginTop: 10,
        },
        fab: {
          position: "absolute",
          right: 16,
          bottom: fabBottomOffset,
          backgroundColor: theme.colors.primary,
        },
        editInput: {
          backgroundColor: theme.colors.surface,
          marginBottom: 8,
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
        },
        typeInput: {
          flex: 1,
        },
        qtyInput: {
          width: 90,
          marginLeft: 10,
        },
        listTitle: {
          fontSize: getFontSize(width, 18),
          fontWeight: "600",
        },
        listDesc: {
          fontSize: getFontSize(width, 15),
          color: theme.colors.onSurfaceVariant,
          lineHeight: getLineHeight(getFontSize(width, 15)),
        },
        filterRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        },
        filterSectionTitle: {
          marginTop: 8,
          marginBottom: 4,
          fontWeight: "700",
          fontSize: getFontSize(width, 15),
        },
        sectionBlock: {
          marginTop: 8,
        },
        sectionTitle: {
          fontSize: getFontSize(width, 16),
          fontWeight: "700",
          color: theme.colors.primary,
          marginBottom: 4,
        },
      }),
    [
      bodySize,
      fabBottomOffset,
      spacing,
      theme.colors.background,
      theme.colors.onSurface,
      theme.colors.onSurfaceVariant,
      theme.colors.primary,
      theme.colors.surface,
      titleSize,
      width,
    ]
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Text style={styles.title}>Clientes</Text>
          <Button
            mode="contained"
            onPress={() => setFiltroVisible(true)}
            style={styles.filterButton}
            buttonColor={theme.colors.secondary}
            contentStyle={{ minHeight: 48 }}
          >
            Buscar y filtrar
          </Button>
          {(filtroNombre.trim().length > 0 ||
            soloConDetalles ||
            filtroViandas.length > 0 ||
            ordenarPorProximosCobros) && (
            <Text style={styles.activeFilters}>
              Filtros activos:
              {filtroNombre.trim().length > 0 ? ` Nombre: "${filtroNombre.trim()}"` : ""}
              {soloConDetalles ? " | Con detalles" : ""}
              {filtroViandas.length > 0 ? ` | Viandas: ${filtroViandas.join(", ")}` : ""}
              {ordenarPorProximosCobros ? " | Ordenado por próximos cobros" : ""}
            </Text>
          )}

        {!ordenarPorProximosCobros && alertasDeuda.length > 0 && (
          <View style={[styles.alertBox, styles.alertDebt]}>
            <Text style={styles.alertTitle}>Clientes con deuda</Text>
            {alertasDeuda.map((cliente) => (
              <Text key={cliente.id}>
                {cliente.nombre}: {formatBillingMessage(cliente)}
              </Text>
            ))}
          </View>
        )}

        {!ordenarPorProximosCobros && alertasProximoCobro.length > 0 && (
          <View style={[styles.alertBox, styles.alertSoon]}>
            <Text style={styles.alertTitle}>Próximo cobro</Text>
            {alertasProximoCobro.map((cliente) => (
              <Text key={cliente.id}>
                {cliente.nombre}: {formatBillingMessage(cliente)}
              </Text>
            ))}
          </View>
        )}

        {clientesOrdenados.length === 0 ? (
          <Text style={styles.emptyText}>Todavía no hay clientes registrados.</Text>
        ) : ordenarPorProximosCobros ? (
          clientesAgrupadosPorCobro.map((grupo) => (
            <View key={grupo.key} style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>{grupo.title}</Text>
              {grupo.clientes.map((cliente) => renderClienteItem(cliente))}
            </View>
          ))
        ) : (
          clientesOrdenados.map((cliente) => (
            <List.Item
              key={cliente.id}
              title={cliente.nombre}
              description={`${cliente.ultimoPago
                ? `Último pago: ${formatDateLong(cliente.ultimoPago)}`
                : "Sin pagos registrados"}${getCobroDetalle(cliente)}\n${formatBillingMessage(cliente)}`}
              onPress={() => abrirDetalle(cliente)}
              right={() => (
                <View style={styles.actions}>
                  <IconButton
                    icon="pencil"
                    iconColor={theme.colors.primary}
                    onPress={() => abrirEdicion(cliente)}
                  />
                  <IconButton
                    icon="delete"
                    iconColor={theme.colors.error}
                    onPress={() => abrirConfirmBorrado(cliente)}
                  />
                </View>
              )}
              titleStyle={styles.listTitle}
              descriptionStyle={styles.listDesc}
            />
          ))
        )}
        </View>
      </ScrollView>

      <FAB
        icon="plus"
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
          <Dialog.Title>Buscar y filtrar</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Buscar por nombre"
              value={filtroNombre}
              onChangeText={setFiltroNombre}
              style={styles.editInput}
            />
            <View style={styles.filterRow}>
              <Checkbox
                status={soloConDetalles ? "checked" : "unchecked"}
                onPress={() => setSoloConDetalles((prev) => !prev)}
              />
              <Text>Solo con detalles específicos</Text>
            </View>
            <View style={styles.filterRow}>
              <Checkbox
                status={ordenarPorProximosCobros ? "checked" : "unchecked"}
                onPress={() => setOrdenarPorProximosCobros((prev) => !prev)}
              />
              <Text>Ordenar por próximos cobros</Text>
            </View>
            <Text style={styles.filterSectionTitle}>Tipos de vianda</Text>
            {tiposVianda.length === 0 ? (
              <Text style={styles.emptyText}>No hay tipos de vianda cargados.</Text>
            ) : (
              tiposVianda.map((tipo) => (
                <View key={tipo.id} style={styles.filterRow}>
                  <Checkbox
                    status={filtroViandas.includes(tipo.nombre) ? "checked" : "unchecked"}
                    onPress={() =>
                      setFiltroViandas((prev) =>
                        prev.includes(tipo.nombre)
                          ? prev.filter((v) => v !== tipo.nombre)
                          : [...prev, tipo.nombre]
                      )
                    }
                  />
                  <Text>{tipo.nombre}</Text>
                </View>
              ))
            )}
            <Button mode="text" onPress={limpiarFiltros}>
              Limpiar filtros
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setFiltroVisible(false)}>Cerrar</Button>
            <Button onPress={() => setFiltroVisible(false)}>Aplicar</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={edicionVisible}
          onDismiss={() => setEdicionVisible(false)}
          style={miViandaDialogStyle}
        >
          <Dialog.Title>Editar cliente</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nombre"
              value={nombreEdit}
              onChangeText={setNombreEdit}
              style={styles.editInput}
            />
            <TextInput
              label="Detalle específico (opcional)"
              value={detalleEdit}
              onChangeText={setDetalleEdit}
              style={styles.editInput}
            />
            <TextInput
              label="Dirección (opcional)"
              value={direccionEdit}
              onChangeText={setDireccionEdit}
              style={styles.editInput}
            />
            <TextInput
              label="Teléfono (opcional)"
              value={telefonoEdit}
              onChangeText={setTelefonoEdit}
              keyboardType="phone-pad"
              style={styles.editInput}
            />

            {viandasEdit.map((item, index) => (
              <View key={item.id} style={styles.row}>
                <View style={styles.typeInput}>
                  <List.Accordion
                    title={item.tipo ? item.tipo : `Tipo ${index + 1}`}
                    expanded={expandedTipoEditId === item.id}
                    onPress={() =>
                      setExpandedTipoEditId((prev) => (prev === item.id ? null : item.id))
                    }
                  >
                    {tiposVianda.map((tipo) => (
                      <List.Item
                        key={tipo.id}
                        title={tipo.nombre}
                        onPress={() => {
                          updateTipoEdit(item.id, tipo.nombre);
                          setExpandedTipoEditId(null);
                        }}
                      />
                    ))}
                  </List.Accordion>
                </View>
                <TextInput
                  label="Cant."
                  value={String(item.cantidad)}
                  onChangeText={(value) => updateCantidadEdit(item.id, value)}
                  keyboardType="numeric"
                  style={[styles.editInput, styles.qtyInput]}
                />
                <IconButton
                  icon="delete"
                  onPress={() => removeViandaEdit(item.id)}
                  disabled={viandasEdit.length === 1}
                  iconColor={theme.colors.error}
                />
              </View>
            ))}
            <Button mode="outlined" onPress={addViandaEdit}>
              Agregar tipo
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEdicionVisible(false)}>Cancelar</Button>
            <Button onPress={solicitarGuardarEdicion}>Guardar</Button>
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
              borra su historial de pagos y periodos.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmBorrarVisible(false)}>Cancelar</Button>
            <Button textColor={theme.colors.error} onPress={borrarCliente}>
              Eliminar
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={confirmEditVisible}
          onDismiss={() => setConfirmEditVisible(false)}
          style={miViandaDialogStyle}
        >
          <Dialog.Title>Confirmar edición</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Estás seguro que querés editar este cliente y guardar los cambios?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmEditVisible(false)}>Cancelar</Button>
            <Button onPress={guardarEdicion}>Confirmar</Button>
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
    </SafeAreaView>
  );
}
