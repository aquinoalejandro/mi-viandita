import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import {
  Button,
  FAB,
  IconButton,
  List,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useIsFocused } from "@react-navigation/native";
import { Client, MealSelection, MiViandaStackParamList, ViandaTipo } from "../../types/types";
import { STORAGE_KEYS } from "../../utils/storage";
import { getTodayString } from "../../utils/date";
import {
  CONTENT_MAX_WIDTH,
  getMiViandaFabBottomOffset,
  getFontSize,
  getLineHeight,
  getSpacing,
} from "../../theme/layout";

type Props = NativeStackScreenProps<MiViandaStackParamList, "Nuevo Cliente">;

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildEmptySelection = (): MealSelection => ({
  id: createId(),
  tipo: "",
  cantidad: 1,
});

export default function NuevoClienteScreen({ navigation }: Props) {
  const isFocused = useIsFocused();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const fabBottomOffset = getMiViandaFabBottomOffset();
  const titleSize = getFontSize(width, 24);
  const subtitleSize = getFontSize(width, 18);
  const [clientes, setClientes] = useState<Client[]>([]);
  const [nombre, setNombre] = useState("");
  const [detalle, setDetalle] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [viandas, setViandas] = useState<MealSelection[]>([buildEmptySelection()]);
  const [tiposVianda, setTiposVianda] = useState<ViandaTipo[]>([]);
  const [expandedTipoId, setExpandedTipoId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ visible: false, message: "" });

  useEffect(() => {
    if (!isFocused) return;
    loadClientes();
  }, [isFocused]);

  const showMessage = (message: string) => {
    setSnackbar({ visible: true, message });
  };

  const loadClientes = async () => {
    const [dataClientes, dataTipos] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.CLIENTES),
      AsyncStorage.getItem(STORAGE_KEYS.VIANDAS_TIPOS),
    ]);
    setClientes(dataClientes ? (JSON.parse(dataClientes) as Client[]) : []);
    setTiposVianda(dataTipos ? (JSON.parse(dataTipos) as ViandaTipo[]) : []);
  };

  const updateTipo = (selectionId: string, tipo: string) => {
    setViandas((prev) =>
      prev.map((item) => (item.id === selectionId ? { ...item, tipo } : item))
    );
  };

  const updateCantidad = (selectionId: string, cantidadText: string) => {
    const parsed = Number(cantidadText.replace(/[^\d]/g, ""));
    setViandas((prev) =>
      prev.map((item) =>
        item.id === selectionId
          ? { ...item, cantidad: Number.isFinite(parsed) && parsed > 0 ? parsed : 1 }
          : item
      )
    );
  };

  const addViandaRow = () => {
    setViandas((prev) => [...prev, buildEmptySelection()]);
  };

  const removeViandaRow = (selectionId: string) => {
    setViandas((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((item) => item.id !== selectionId);
    });
  };

  const guardarCliente = async () => {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      showMessage("Ingresá el nombre del cliente.");
      return;
    }

    const viandasLimpias = viandas
      .map((item) => ({
        ...item,
        tipo: item.tipo.trim(),
      }))
      .filter((item) => item.tipo.length > 0 && item.cantidad > 0);

    if (viandasLimpias.length === 0) {
      showMessage("Cargá al menos un tipo de vianda con cantidad.");
      return;
    }

    const yaExiste = clientes.some(
      (cliente) => cliente.nombre.toLowerCase() === nombreLimpio.toLowerCase()
    );

    if (yaExiste) {
      showMessage("Ya existe un cliente con ese nombre.");
      return;
    }

     const nuevoCliente: Client = {
       id: createId(),
       nombre: nombreLimpio,
       viandas: viandasLimpias,
       detalleEspecifico: detalle.trim() ? detalle.trim() : undefined,
       direccion: direccion.trim() ? direccion.trim() : undefined,
       telefono: telefono.trim() ? telefono.trim() : undefined,
       creadoEn: getTodayString(),
       totalComidas: 0,
       diasConsumidosEnPeriodo: 0,
       comidasReponer: 0,
       ajusteDiasPeriodo: 0,
     };

    const updated = [...clientes, nuevoCliente];
    await AsyncStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(updated));
    setClientes(updated);

    showMessage("Cliente guardado.");
    setNombre("");
    setDetalle("");
    setDireccion("");
    setTelefono("");
    setViandas([buildEmptySelection()]);
    navigation.navigate("Clientes");
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
          fontSize: subtitleSize,
          fontWeight: "600",
          marginTop: 10,
          color: theme.colors.onSurface,
        },
        emptyText: {
          color: theme.colors.onSurfaceVariant,
          marginBottom: 8,
          fontSize: getFontSize(width, 15),
          lineHeight: getLineHeight(getFontSize(width, 15)),
        },
        input: {
          backgroundColor: theme.colors.surface,
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
        mainButton: {
          marginTop: 12,
          borderRadius: 12,
        },
        fab: {
          position: "absolute",
          margin: 16,
          right: 0,
          bottom: fabBottomOffset,
          backgroundColor: theme.colors.secondary,
        },
      }),
    [
      fabBottomOffset,
      spacing,
      subtitleSize,
      theme.colors.background,
      theme.colors.onSurface,
      theme.colors.onSurfaceVariant,
      theme.colors.secondary,
      theme.colors.surface,
      titleSize,
      width,
    ]
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Text style={styles.title}>Nuevo cliente</Text>

          <TextInput
            label="Nombre del cliente"
            value={nombre}
            onChangeText={setNombre}
            style={styles.input}
          />
          <TextInput
            label="Detalle específico (opcional)"
            value={detalle}
            onChangeText={setDetalle}
            style={styles.input}
          />
          <TextInput
            label="Dirección (opcional)"
            value={direccion}
            onChangeText={setDireccion}
            style={styles.input}
          />
          <TextInput
            label="Teléfono (opcional)"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            style={styles.input}
          />

          <Text style={styles.subtitle}>Viandas elegidas</Text>
          {tiposVianda.length === 0 && (
            <Text style={styles.emptyText}>
              No hay tipos de vianda cargados. Agregalos en Configuración.
            </Text>
          )}
          {viandas.map((item, index) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.typeInput}>
                <List.Accordion
                  title={item.tipo ? item.tipo : `Tipo de vianda ${index + 1}`}
                  expanded={expandedTipoId === item.id}
                  onPress={() =>
                    setExpandedTipoId((prev) => (prev === item.id ? null : item.id))
                  }
                >
                  {tiposVianda.map((tipo) => (
                    <List.Item
                      key={tipo.id}
                      title={tipo.nombre}
                      onPress={() => {
                        updateTipo(item.id, tipo.nombre);
                        setExpandedTipoId(null);
                      }}
                    />
                  ))}
                </List.Accordion>
              </View>
              <TextInput
                label="Cant."
                value={String(item.cantidad)}
                onChangeText={(value) => updateCantidad(item.id, value)}
                keyboardType="numeric"
                style={[styles.input, styles.qtyInput]}
              />
              <IconButton
                icon="delete"
                onPress={() => removeViandaRow(item.id)}
                disabled={viandas.length === 1}
                iconColor={theme.colors.error}
              />
            </View>
          ))}

          <Button mode="outlined" onPress={addViandaRow} contentStyle={{ minHeight: 48 }}>
            Agregar otro tipo de vianda
          </Button>

          <Button
            mode="contained"
            onPress={guardarCliente}
            style={styles.mainButton}
            buttonColor={theme.colors.primary}
            contentStyle={{ minHeight: 48 }}
          >
            Guardar cliente
          </Button>
        </View>
      </ScrollView>

      <FAB
        icon="arrow-left"
        style={styles.fab}
        color={theme.colors.onSecondary}
        onPress={() => navigation.navigate("Clientes")}
        accessibilityLabel="Volver a clientes"
      />

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
