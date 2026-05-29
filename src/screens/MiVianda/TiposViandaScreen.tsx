import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Button, Dialog, Portal, Snackbar, Text, TextInput, useTheme } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { ViandaTipo } from "../../types/types";
import { STORAGE_KEYS } from "../../utils/storage";
import { CONTENT_MAX_WIDTH, getFontSize, getLineHeight, getSpacing } from "../../theme/layout";
import { miViandaDialogStyle } from "./miViandaShared";

export default function TiposViandaScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 22);
  const bodySize = getFontSize(width, 16);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [tiposVianda, setTiposVianda] = useState<ViandaTipo[]>([]);
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [editandoTipoId, setEditandoTipoId] = useState<string | null>(null);
  const [editandoNombre, setEditandoNombre] = useState("");
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [tipoABorrar, setTipoABorrar] = useState<ViandaTipo | null>(null);
  const [confirmEditVisible, setConfirmEditVisible] = useState(false);

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
          gap: 10,
        },
        input: {
          backgroundColor: theme.colors.surface,
        },
        primaryButton: {
          borderRadius: 12,
        },
        row: {
          flexDirection: width < 380 ? "column" : "row",
          alignItems: width < 380 ? "flex-start" : "center",
          gap: 10,
          paddingVertical: 6,
        },
        rowActions: {
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
        },
        inlineInput: {
          flex: 1,
          backgroundColor: theme.colors.surface,
        },
        emptyText: {
          color: theme.colors.onSurfaceVariant,
        },
        dangerButton: {
          borderRadius: 12,
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

  const mostrarMensaje = (msg: string) => {
    setSnackbarMsg(msg);
    setSnackbarVisible(true);
  };

  const loadTipos = useCallback(async () => {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.VIANDAS_TIPOS);
    setTiposVianda(data ? (JSON.parse(data) as ViandaTipo[]) : []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTipos();
    }, [loadTipos])
  );

  const saveTipos = async (updated: ViandaTipo[]) => {
    setTiposVianda(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.VIANDAS_TIPOS, JSON.stringify(updated));
  };

  const agregarTipo = async () => {
    const nombre = nuevoTipo.trim();
    if (!nombre) {
      mostrarMensaje("Ingresá un nombre de vianda.");
      return;
    }
    if (tiposVianda.some((t) => t.nombre.toLowerCase() === nombre.toLowerCase())) {
      mostrarMensaje("Ese tipo de vianda ya existe.");
      return;
    }
    const nuevo: ViandaTipo = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      nombre,
    };
    const updated = [...tiposVianda, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre));
    await saveTipos(updated);
    setNuevoTipo("");
    mostrarMensaje("Tipo de vianda agregado.");
  };

  const iniciarEdicionTipo = (tipo: ViandaTipo) => {
    setEditandoTipoId(tipo.id);
    setEditandoNombre(tipo.nombre);
  };

  const solicitarGuardarEdicion = () => {
    if (!editandoTipoId) return;
    setConfirmEditVisible(true);
  };

  const guardarEdicionTipo = async () => {
    if (!editandoTipoId) return;
    const nombre = editandoNombre.trim();
    if (!nombre) {
      mostrarMensaje("Ingresá un nombre válido.");
      return;
    }
    if (
      tiposVianda.some(
        (t) => t.id !== editandoTipoId && t.nombre.toLowerCase() === nombre.toLowerCase()
      )
    ) {
      mostrarMensaje("Ya existe un tipo con ese nombre.");
      return;
    }
    const updated = tiposVianda.map((t) =>
      t.id === editandoTipoId ? { ...t, nombre } : t
    );
    await saveTipos(updated);
    setEditandoTipoId(null);
    setEditandoNombre("");
    setConfirmEditVisible(false);
    mostrarMensaje("Tipo actualizado.");
  };

  const solicitarBorrarTipo = (tipo: ViandaTipo) => {
    setTipoABorrar(tipo);
    setConfirmDeleteVisible(true);
  };

  const borrarTipo = async () => {
    if (!tipoABorrar) return;
    const updated = tiposVianda.filter((t) => t.id !== tipoABorrar.id);
    await saveTipos(updated);
    setConfirmDeleteVisible(false);
    setTipoABorrar(null);
    mostrarMensaje("Tipo eliminado.");
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Text style={styles.title}>Tipos de vianda</Text>
          <Text style={styles.subtitle}>
            Cargá los tipos disponibles. Estos se usan al crear o editar clientes.
          </Text>

          <View style={styles.card}>
            <TextInput
              label="Nuevo tipo de vianda"
              value={nuevoTipo}
              onChangeText={setNuevoTipo}
              style={styles.input}
            />
            <Button
              mode="contained"
              onPress={agregarTipo}
              style={styles.primaryButton}
              buttonColor={theme.colors.primary}
              contentStyle={{ minHeight: 48 }}
            >
              Agregar tipo
            </Button>

            {tiposVianda.length === 0 ? (
              <Text style={styles.emptyText}>No hay tipos cargados.</Text>
            ) : (
              tiposVianda.map((tipo) => (
                <View key={tipo.id} style={styles.row}>
                  {editandoTipoId === tipo.id ? (
                    <>
                      <TextInput
                        value={editandoNombre}
                        onChangeText={setEditandoNombre}
                        style={styles.inlineInput}
                      />
                      <View style={styles.rowActions}>
                        <Button onPress={solicitarGuardarEdicion} mode="contained">
                          Guardar
                        </Button>
                        <Button onPress={() => setEditandoTipoId(null)} mode="outlined">
                          Cancelar
                        </Button>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={{ flex: 1, fontSize: bodySize }}>{tipo.nombre}</Text>
                      <View style={styles.rowActions}>
                        <Button mode="outlined" onPress={() => iniciarEdicionTipo(tipo)}>
                          Editar
                        </Button>
                        <Button
                          mode="text"
                          textColor={theme.colors.error}
                          onPress={() => solicitarBorrarTipo(tipo)}
                        >
                          Borrar
                        </Button>
                      </View>
                    </>
                  )}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <Portal>
        <Dialog
          visible={confirmDeleteVisible}
          onDismiss={() => setConfirmDeleteVisible(false)}
          style={miViandaDialogStyle}
        >
          <Dialog.Title>Eliminar tipo</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Estás seguro que querés eliminar "{tipoABorrar?.nombre}"? Este tipo dejará de estar
              disponible al cargar clientes.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDeleteVisible(false)}>Cancelar</Button>
            <Button onPress={borrarTipo} textColor={theme.colors.error}>
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
              ¿Estás seguro que querés editar este tipo y guardar los cambios?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmEditVisible(false)}>Cancelar</Button>
            <Button onPress={guardarEdicionTipo}>Confirmar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2800}
      >
        {snackbarMsg}
      </Snackbar>
    </View>
  );
}
