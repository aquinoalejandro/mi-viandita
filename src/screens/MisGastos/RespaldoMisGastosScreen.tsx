import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Button, Dialog, Divider, Portal, Snackbar, Surface, Text, useTheme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { useStore } from "../../store/zustand";
import { CONTENT_MAX_WIDTH, getFontSize, getLineHeight, getSpacing } from "../../theme/layout";
import type { ExpenseCategory, ExpenseRecord } from "../../types/types";
import { misGastosDialogStyle } from "./misGastosShared";
import { resolveSharedFileUri } from "../../utils/sharedBackupFile";

type BackupData = {
  categorias: ExpenseCategory[];
  gastos: ExpenseRecord[];
};

export type Props = {
  onImported?: (categorias: ExpenseCategory[], gastos: ExpenseRecord[]) => void;
};

export default function RespaldoMisGastosScreen({ onImported }: Props = {}) {
  const setMisGastosUbi = useStore((state) => state.setMisGastosUbi);
  const categories = useStore((state) => state.misGastosCategories);
  const expenses = useStore((state) => state.misGastosExpenses);
  const replaceMisGastosData = useStore((state) => state.replaceMisGastosData);
  const clearMisGastosData = useStore((state) => state.clearMisGastosData);
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 22);
  const bodySize = getFontSize(width, 16);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [confirmImportVisible, setConfirmImportVisible] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

  const stats = useMemo(
    () => [
      { label: "Categorías", value: String(categories.length) },
      { label: "Gastos", value: String(expenses.length) },
    ],
    [categories.length, expenses.length]
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
          paddingBottom: 160,
        },
        content: {
          width: "100%",
          maxWidth: CONTENT_MAX_WIDTH,
          alignSelf: "center",
        },
        hero: {
          padding: spacing,
          borderRadius: 24,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          gap: 14,
        },
        sectionBlock: {
          gap: 10,
        },
        title: {
          fontSize: titleSize,
          fontWeight: "700",
          color: theme.colors.onSurface,
        },
        sectionTitle: {
          fontSize: getFontSize(width, 18),
          fontWeight: "700",
          color: theme.colors.onSurface,
        },
        subtitle: {
          fontSize: bodySize,
          lineHeight: getLineHeight(bodySize),
          color: theme.colors.onSurfaceVariant,
        },
        statsRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
        },
        statPill: {
          flexGrow: 1,
          minWidth: 120,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 16,
          backgroundColor: theme.colors.surfaceVariant,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          gap: 2,
        },
        statLabel: {
          fontSize: getFontSize(width, 12),
          color: theme.colors.onSurfaceVariant,
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: 0.6,
        },
        statValue: {
          fontSize: getFontSize(width, 18),
          color: theme.colors.onSurface,
          fontWeight: "800",
        },
        actionStack: {
          gap: 10,
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
      width,
    ]
  );

  useFocusEffect(
    useCallback(() => {
      setMisGastosUbi("Respaldo");
    }, [setMisGastosUbi])
  );

  const mostrarMensaje = (msg: string) => {
    setSnackbarMsg(msg);
    setSnackbarVisible(true);
  };

  const exportarRespaldo = async () => {
    try {
      const data: BackupData = {
        categorias: categories,
        gastos: expenses,
      };

      const jsonData = JSON.stringify(data, null, 2);
      const file = new File(Paths.cache, "respaldo_mis_gastos.json");
      await file.write(jsonData);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/json",
          dialogTitle: "Compartir respaldo de MisGastos",
          UTI: "public.json",
        });
        mostrarMensaje("Respaldo exportado con éxito.");
        return;
      }

      mostrarMensaje("Respaldo creado, pero no se puede compartir desde este dispositivo.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      mostrarMensaje(`Error al exportar: ${message}`);
    }
  };

  const importarRespaldo = async () => {
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

      const readableUri = await resolveSharedFileUri(fileUri);
      const content = await FileSystemLegacy.readAsStringAsync(readableUri);

      const data = JSON.parse(content) as Partial<BackupData>;
      const categorias = Array.isArray(data.categorias) ? data.categorias : null;
      const gastos = Array.isArray(data.gastos) ? data.gastos : null;

      if (!categorias || !gastos) {
        mostrarMensaje("Formato de archivo inválido.");
        return;
      }

      await replaceMisGastosData(categorias, gastos);
      onImported?.(categorias, gastos);
      mostrarMensaje("Datos importados con éxito.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      mostrarMensaje(`Error al importar: ${message}`);
    }
  };

  const borrarTodo = async () => {
    try {
      await clearMisGastosData();
      onImported?.([], []);
      mostrarMensaje("Datos eliminados correctamente.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      mostrarMensaje("Error al borrar datos: " + message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Surface style={styles.hero} elevation={0}>
            <View style={styles.sectionBlock}>
              <Text style={styles.title}>Respaldo</Text>
              <Text style={styles.subtitle}>
                Exporta un respaldo para guardar tus datos o importa uno existente. El borrado total
                es irreversible.
              </Text>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Resumen</Text>
              <View style={styles.statsRow}>
                {stats.map((stat) => (
                  <View key={stat.label} style={styles.statPill}>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                    <Text style={styles.statValue}>{stat.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Divider />

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Acciones</Text>
              <View style={styles.actionStack}>
                <Button
                  mode="contained"
                  icon="export"
                  onPress={exportarRespaldo}
                  contentStyle={{ minHeight: 48 }}
                >
                  Exportar respaldo
                </Button>

                <Button
                  mode="outlined"
                  icon="import"
                  onPress={() => setConfirmImportVisible(true)}
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
                  contentStyle={{ minHeight: 48 }}
                >
                  Eliminar todos los datos
                </Button>
              </View>
            </View>
          </Surface>
        </View>
      </ScrollView>

      <Portal>
        <Dialog
          visible={confirmImportVisible}
          onDismiss={() => setConfirmImportVisible(false)}
          style={misGastosDialogStyle}
        >
          <Dialog.Title>Importar respaldo</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Estás seguro que querés importar este respaldo? Se sobrescribirán tus datos
              actuales.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmImportVisible(false)}>Cancelar</Button>
            <Button
              onPress={async () => {
                setConfirmImportVisible(false);
                await importarRespaldo();
              }}
            >
              Importar
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={confirmDeleteVisible}
          onDismiss={() => setConfirmDeleteVisible(false)}
          style={misGastosDialogStyle}
        >
          <Dialog.Title>Eliminar datos</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Estás seguro que querés eliminar todos los datos? Esta acción no se puede
              deshacer.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDeleteVisible(false)}>Cancelar</Button>
            <Button
              onPress={async () => {
                setConfirmDeleteVisible(false);
                await borrarTodo();
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
