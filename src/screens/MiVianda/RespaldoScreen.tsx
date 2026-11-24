import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Button, Dialog, Portal, Snackbar, Surface, Text, useTheme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";

import { useStore } from "../../store/zustand";
import { CONTENT_MAX_WIDTH, getFontSize, getLineHeight, getSpacing } from "../../theme/layout";
import { readSharedFileText } from "../../utils/sharedBackupFile";
import { parseMiViandaBackup, type MiViandaBackupData } from "../../utils/backup";
import { miViandaDialogStyle } from "./miViandaShared";

export default function RespaldoScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 22);
  const bodySize = getFontSize(width, 15);

  const setUbi = useStore((state) => state.setUbi);
  const clientes = useStore((state) => state.miViandaClientes);
  const eventosCliente = useStore((state) => state.miViandaEventos);
  const periodos = useStore((state) => state.miViandaPeriodos);
  const ciclosPagos = useStore((state) => state.miViandaCiclos);
  const feriados = useStore((state) => state.miViandaFeriados);
  const tiposVianda = useStore((state) => state.miViandaTiposVianda);
  const replaceMiViandaData = useStore((state) => state.replaceMiViandaData);
  const clearMiViandaData = useStore((state) => state.clearMiViandaData);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [confirmImportVisible, setConfirmImportVisible] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setUbi("Configuracion");
    }, [setUbi])
  );

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
          gap: 12,
        },
        cardTitle: {
          fontSize: 16,
          fontWeight: "700",
          color: theme.colors.onSurface,
        },
        statsGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        },
        statBox: {
          flexGrow: 1,
          flexBasis: "46%",
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          backgroundColor: theme.colors.surfaceVariant,
        },
        statValue: {
          fontSize: 20,
          fontWeight: "800",
          color: theme.colors.onSurface,
        },
        statLabel: {
          fontSize: 12,
          color: theme.colors.onSurfaceVariant,
          fontWeight: "600",
        },
        dangerButton: {
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.error,
        },
      }),
    [
      bodySize,
      spacing,
      theme.colors.background,
      theme.colors.error,
      theme.colors.onSurface,
      theme.colors.onSurfaceVariant,
      theme.colors.outline,
      theme.colors.surface,
      theme.colors.surfaceVariant,
      titleSize,
    ]
  );

  const mostrarMensaje = (msg: string) => {
    setSnackbarMsg(msg);
    setSnackbarVisible(true);
  };

  const exportarConfiguracion = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const data: MiViandaBackupData = {
        version: 2,
        exportadoEn: new Date().toISOString(),
        clientes,
        eventosCliente,
        periodos,
        feriados,
        tiposVianda,
        ciclosPagos,
      };

      const jsonData = JSON.stringify(data, null, 2);
      const file = new File(Paths.cache, "respaldo_mi_vianda.json");
      await file.write(jsonData);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/json",
          dialogTitle: "Compartir respaldo de MiVianda",
          UTI: "public.json",
        });
        mostrarMensaje("Respaldo de MiVianda exportado con éxito.");
      } else {
        mostrarMensaje("Respaldo creado, pero no se puede compartir.");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      mostrarMensaje("Error al exportar: " + message);
    } finally {
      setBusy(false);
    }
  };

  const importarConfiguracion = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (res.canceled) {
        mostrarMensaje("Importación cancelada.");
        return;
      }

      const fileUri = res.assets[0]?.uri;
      if (!fileUri) {
        mostrarMensaje("No se encontró el archivo seleccionado.");
        return;
      }

      const content = await readSharedFileText(fileUri);
      const parsed = parseMiViandaBackup(content);

      await replaceMiViandaData(parsed);
      mostrarMensaje("Datos de MiVianda importados con éxito.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      mostrarMensaje("Error al importar: " + message);
    } finally {
      setBusy(false);
    }
  };

  const borrarTodo = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await clearMiViandaData();
      mostrarMensaje("Datos de MiVianda eliminados correctamente.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      mostrarMensaje("Error al borrar datos: " + message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Respaldo</Text>
          <Text style={styles.subtitle}>
            Exportá un respaldo para guardar tus datos o importá uno existente. El borrado total es
            irreversible.
          </Text>

          <Surface style={styles.card} elevation={0}>
            <Text style={styles.cardTitle}>Estado de la base de datos</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{clientes.length}</Text>
                <Text style={styles.statLabel}>Clientes</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{eventosCliente.length}</Text>
                <Text style={styles.statLabel}>Pagos registrados</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{tiposVianda.length}</Text>
                <Text style={styles.statLabel}>Tipos de vianda</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{feriados.length}</Text>
                <Text style={styles.statLabel}>Feriados</Text>
              </View>
            </View>
          </Surface>

          <Surface style={styles.card} elevation={0}>
            <Button
              mode="contained"
              icon="export"
              onPress={() => void exportarConfiguracion()}
              disabled={busy}
              loading={busy}
              buttonColor={theme.colors.primary}
              contentStyle={{ minHeight: 48 }}
            >
              Exportar respaldo
            </Button>

            <Button
              mode="outlined"
              icon="import"
              onPress={() => setConfirmImportVisible(true)}
              disabled={busy}
              contentStyle={{ minHeight: 48 }}
            >
              Importar respaldo
            </Button>

            <Button
              mode="text"
              icon="delete"
              textColor={theme.colors.error}
              style={styles.dangerButton}
              onPress={() => setConfirmDeleteVisible(true)}
              disabled={busy}
              contentStyle={{ minHeight: 48 }}
            >
              Eliminar todos los datos
            </Button>
          </Surface>
        </View>
      </ScrollView>

      <Portal>
        <Dialog
          visible={confirmImportVisible}
          onDismiss={() => setConfirmImportVisible(false)}
          style={miViandaDialogStyle}
        >
          <Dialog.Title>Importar respaldo</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Estás seguro que querés importar este respaldo? Se sobrescribirán tus datos actuales.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmImportVisible(false)}>Cancelar</Button>
            <Button
              mode="contained"
              onPress={() => {
                setConfirmImportVisible(false);
                void importarConfiguracion();
              }}
            >
              Importar
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={confirmDeleteVisible}
          onDismiss={() => setConfirmDeleteVisible(false)}
          style={miViandaDialogStyle}
        >
          <Dialog.Title>Eliminar datos</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Estás seguro que querés eliminar todos los datos? Esta acción no se puede deshacer.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDeleteVisible(false)}>Cancelar</Button>
            <Button
              onPress={() => {
                setConfirmDeleteVisible(false);
                void borrarTodo();
              }}
              textColor={theme.colors.error}
            >
              Eliminar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMsg}
      </Snackbar>
    </View>
  );
}
