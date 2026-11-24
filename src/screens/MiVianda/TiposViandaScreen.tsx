import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import {
  Button,
  Dialog,
  HelperText,
  Portal,
  Snackbar,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";

import { useStore } from "../../store/zustand";
import { CONTENT_MAX_WIDTH, getFontSize, getLineHeight, getSpacing } from "../../theme/layout";
import type { ViandaTipo } from "../../types/types";
import { miViandaDialogStyle } from "./miViandaShared";

export default function TiposViandaScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 22);
  const bodySize = getFontSize(width, 15);

  const setUbi = useStore((state) => state.setUbi);
  const tiposVianda = useStore((state) => state.miViandaTiposVianda);
  const clientes = useStore((state) => state.miViandaClientes);
  const addMiViandaTipo = useStore((state) => state.addMiViandaTipo);
  const renameMiViandaTipo = useStore((state) => state.renameMiViandaTipo);
  const deleteMiViandaTipo = useStore((state) => state.deleteMiViandaTipo);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [attemptedAdd, setAttemptedAdd] = useState(false);
  const [editandoTipoId, setEditandoTipoId] = useState<string | null>(null);
  const [editandoNombre, setEditandoNombre] = useState("");
  const [attemptedEdit, setAttemptedEdit] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [tipoABorrar, setTipoABorrar] = useState<ViandaTipo | null>(null);

  useFocusEffect(
    useCallback(() => {
      setUbi("Configuracion");
    }, [setUbi])
  );

  const clientesCountByTipo = useMemo(() => {
    const map = new Map<string, number>();
    clientes.forEach((c) => {
      const seen = new Set<string>();
      c.viandas.forEach((v) => {
        const key = v.tipo.trim().toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          map.set(key, (map.get(key) ?? 0) + 1);
        }
      });
    });
    return map;
  }, [clientes]);

  const mostrarMensaje = (msg: string) => {
    setSnackbarMsg(msg);
    setSnackbarVisible(true);
  };

  const nuevoTrimmed = nuevoTipo.trim();
  const addError = !nuevoTrimmed
    ? "Ingresá un nombre de vianda."
    : tiposVianda.some((t) => t.nombre.toLowerCase() === nuevoTrimmed.toLowerCase())
    ? "Ese tipo de vianda ya existe."
    : null;

  const editTrimmed = editandoNombre.trim();
  const editError = !editTrimmed
    ? "Ingresá un nombre válido."
    : tiposVianda.some(
        (t) => t.id !== editandoTipoId && t.nombre.toLowerCase() === editTrimmed.toLowerCase()
      )
    ? "Ya existe un tipo con ese nombre."
    : null;

  const agregarTipo = async () => {
    setAttemptedAdd(true);
    if (addError) {
      mostrarMensaje(addError);
      return;
    }

    await addMiViandaTipo(nuevoTrimmed);
    setNuevoTipo("");
    setAttemptedAdd(false);
    mostrarMensaje("Tipo de vianda agregado.");
  };

  const iniciarEdicionTipo = (tipo: ViandaTipo) => {
    setEditandoTipoId(tipo.id);
    setEditandoNombre(tipo.nombre);
    setAttemptedEdit(false);
  };

  const guardarEdicionTipo = async () => {
    if (!editandoTipoId) return;
    setAttemptedEdit(true);
    if (editError) {
      mostrarMensaje(editError);
      return;
    }

    await renameMiViandaTipo(editandoTipoId, editTrimmed);
    setEditandoTipoId(null);
    setEditandoNombre("");
    setAttemptedEdit(false);
    mostrarMensaje("Tipo actualizado en catálogo y clientes.");
  };

  const solicitarBorrarTipo = (tipo: ViandaTipo) => {
    setTipoABorrar(tipo);
    setConfirmDeleteVisible(true);
  };

  const borrarTipo = async () => {
    if (!tipoABorrar) return;
    await deleteMiViandaTipo(tipoABorrar.id);
    setConfirmDeleteVisible(false);
    setTipoABorrar(null);
    mostrarMensaje("Tipo eliminado.");
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
        },
        title: {
          fontSize: titleSize,
          fontWeight: "800",
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
          borderRadius: 16,
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
          alignItems: width < 380 ? "stretch" : "center",
          gap: 10,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.outlineVariant,
        },
        rowActions: {
          flexDirection: "row",
          gap: 6,
          alignItems: "center",
        },
        inlineInput: {
          flex: 1,
          backgroundColor: theme.colors.surface,
        },
        emptyText: {
          color: theme.colors.onSurfaceVariant,
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
      theme.colors.surface,
      titleSize,
      width,
    ]
  );

  const countForDelete = tipoABorrar
    ? clientesCountByTipo.get(tipoABorrar.nombre.toLowerCase()) ?? 0
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Tipos de vianda</Text>
          <Text style={styles.subtitle}>
            Cargá los tipos disponibles. Renombrar un tipo también actualiza automáticamente los
            clientes que ya lo tienen asignado.
          </Text>

          <Surface style={styles.card} elevation={0}>
            <View>
              <TextInput
                label="Nuevo tipo de vianda"
                value={nuevoTipo}
                onChangeText={setNuevoTipo}
                mode="outlined"
                autoCapitalize="sentences"
                maxLength={45}
                returnKeyType="done"
                onSubmitEditing={() => void agregarTipo()}
                style={styles.input}
                error={Boolean((attemptedAdd || nuevoTipo.length > 0) && addError)}
              />
              {(attemptedAdd || nuevoTipo.length > 0) && addError ? (
                <HelperText type="error" visible>
                  {addError}
                </HelperText>
              ) : null}
            </View>

            <Button
              mode="contained"
              icon="plus"
              onPress={() => void agregarTipo()}
              style={styles.primaryButton}
              buttonColor={theme.colors.primary}
              contentStyle={{ minHeight: 48 }}
            >
              Agregar tipo
            </Button>

            {tiposVianda.length === 0 ? (
              <Text style={styles.emptyText}>No hay tipos cargados.</Text>
            ) : (
              tiposVianda.map((tipo) => {
                const count = clientesCountByTipo.get(tipo.nombre.toLowerCase()) ?? 0;

                return (
                  <View key={tipo.id} style={styles.row}>
                    {editandoTipoId === tipo.id ? (
                      <View style={{ flex: 1, gap: 6 }}>
                        <TextInput
                          value={editandoNombre}
                          onChangeText={setEditandoNombre}
                          mode="outlined"
                          autoCapitalize="sentences"
                          maxLength={45}
                          style={styles.inlineInput}
                          error={Boolean(attemptedEdit && editError)}
                        />
                        {attemptedEdit && editError ? (
                          <HelperText type="error" visible>
                            {editError}
                          </HelperText>
                        ) : null}
                        <View style={styles.rowActions}>
                          <Button onPress={() => void guardarEdicionTipo()} mode="contained" compact>
                            Guardar
                          </Button>
                          <Button onPress={() => setEditandoTipoId(null)} mode="outlined" compact>
                            Cancelar
                          </Button>
                        </View>
                      </View>
                    ) : (
                      <>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: bodySize, fontWeight: "700" }}>
                            {tipo.nombre}
                          </Text>
                          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                            {count === 0
                              ? "Sin clientes asignados"
                              : count === 1
                              ? "Usado por 1 cliente"
                              : `Usado por ${count} clientes`}
                          </Text>
                        </View>
                        <View style={styles.rowActions}>
                          <Button
                            mode="outlined"
                            onPress={() => iniciarEdicionTipo(tipo)}
                            compact
                          >
                            Editar
                          </Button>
                          <Button
                            mode="text"
                            textColor={theme.colors.error}
                            onPress={() => solicitarBorrarTipo(tipo)}
                            compact
                          >
                            Borrar
                          </Button>
                        </View>
                      </>
                    )}
                  </View>
                );
              })
            )}
          </Surface>
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
              ¿Estás seguro que querés eliminar &quot;{tipoABorrar?.nombre}&quot;?{" "}
              {countForDelete > 0
                ? `Actualmente ${countForDelete} cliente(s) tienen este tipo asignado (conservarán su registro actual, pero no podrá elegirse en nuevos).`
                : "Dejará de estar disponible al cargar clientes."}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDeleteVisible(false)}>Cancelar</Button>
            <Button onPress={() => void borrarTipo()} textColor={theme.colors.error}>
              Eliminar
            </Button>
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
