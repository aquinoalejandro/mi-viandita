import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Button, Dialog, Portal, Snackbar, Surface, Text, useTheme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  AlertTriangle,
  Coins,
  Database,
  Download,
  FolderSync,
  Receipt,
  ShieldCheck,
  Tag,
  Trash2,
  Upload,
} from "lucide-react-native";

import { useStore } from "../../store/zustand";
import { palette } from "../../theme/appTheme";
import { CONTENT_MAX_WIDTH, getFontSize, getSpacing } from "../../theme/layout";
import type { ExpenseCategory, ExpenseRecord } from "../../types/types";
import { formatCurrency, misGastosDialogStyle } from "./misGastosShared";
import { readSharedFileText } from "../../utils/sharedBackupFile";
import { parseMisGastosBackup, type MisGastosBackupData } from "../../utils/backup";

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
  const titleSize = getFontSize(width, 24);
  const bodySize = getFontSize(width, 15);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [confirmImportVisible, setConfirmImportVisible] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setMisGastosUbi("Respaldo");
    }, [setMisGastosUbi])
  );

  const totalSpent = useMemo(
    () => expenses.reduce((acc, e) => acc + e.monto, 0),
    [expenses]
  );

  const mostrarMensaje = (msg: string) => {
    setSnackbarMsg(msg);
    setSnackbarVisible(true);
  };

  const exportarRespaldo = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const data: MisGastosBackupData = {
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
    } finally {
      setBusy(false);
    }
  };

  const importarRespaldo = async () => {
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
      const { categorias, gastos } = parseMisGastosBackup(content);

      await replaceMisGastosData(categorias, gastos);
      onImported?.(categorias, gastos);
      mostrarMensaje("Datos importados con éxito.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      mostrarMensaje(`Error al importar: ${message}`);
    } finally {
      setBusy(false);
    }
  };

  const borrarTodo = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await clearMisGastosData();
      onImported?.([], []);
      mostrarMensaje("Datos eliminados correctamente.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      mostrarMensaje("Error al borrar datos: " + message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { padding: spacing }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderTop}>
              <View
                style={[
                  styles.titleIconBadge,
                  { backgroundColor: `${theme.colors.primary}18` },
                ]}
              >
                <Database color={theme.colors.primary} size={22} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: theme.colors.onSurface, fontSize: titleSize }]}>
                  Copia de Seguridad
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { color: theme.colors.onSurfaceVariant, fontSize: bodySize },
                  ]}
                >
                  Exportá, importá o reseteá la información de tus finanzas
                </Text>
              </View>
            </View>
          </View>

          <Surface
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
            elevation={0}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconSmallBadge,
                  { backgroundColor: `${theme.colors.primary}15` },
                ]}
              >
                <ShieldCheck size={18} color={theme.colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                Estado de la base de datos
              </Text>
            </View>

            <View style={styles.statsGrid}>
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <Tag size={16} color={theme.colors.primary} strokeWidth={2.2} />
                <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
                  {categories.length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Categorías
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <Receipt size={16} color={theme.colors.secondary} strokeWidth={2.2} />
                <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
                  {expenses.length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Gastos totales
                </Text>
              </View>

              <View
                style={[
                  styles.statCardFull,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <Coins size={16} color={palette.danger} strokeWidth={2.2} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Monto total histórico registrado
                  </Text>
                  <Text style={[styles.statValueBig, { color: theme.colors.onSurface }]}>
                    {formatCurrency(totalSpent)}
                  </Text>
                </View>
              </View>
            </View>
          </Surface>

          <Surface
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
            elevation={0}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconSmallBadge,
                  { backgroundColor: `${theme.colors.secondary}15` },
                ]}
              >
                <FolderSync size={18} color={theme.colors.secondary} strokeWidth={2.2} />
              </View>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                Sincronización de archivos
              </Text>
            </View>

            <Text style={[styles.cardDesc, { color: theme.colors.onSurfaceVariant }]}>
              Generá un archivo JSON con todos tus movimientos para guardarlo en la nube o
              transferirlo a otro dispositivo.
            </Text>

            <View style={styles.actionButtonsCol}>
              <Button
                mode="contained"
                icon={({ size, color }) => <Download size={size} color={color} />}
                onPress={exportarRespaldo}
                disabled={busy}
                loading={busy}
                style={styles.actionButton}
                contentStyle={{ minHeight: 48 }}
                labelStyle={styles.actionButtonLabel}
              >
                Exportar copia de seguridad
              </Button>

              <Button
                mode="outlined"
                icon={({ size, color }) => <Upload size={size} color={color} />}
                onPress={() => setConfirmImportVisible(true)}
                disabled={busy}
                style={[styles.actionButton, { borderColor: theme.colors.outline }]}
                contentStyle={{ minHeight: 48 }}
                labelStyle={styles.actionButtonLabel}
              >
                Restaurar desde archivo
              </Button>
            </View>
          </Surface>

          <Surface
            style={[
              styles.dangerCard,
              {
                backgroundColor: `${theme.colors.error}08`,
                borderColor: `${theme.colors.error}40`,
              },
            ]}
            elevation={0}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconSmallBadge,
                  { backgroundColor: `${theme.colors.error}18` },
                ]}
              >
                <AlertTriangle size={18} color={theme.colors.error} strokeWidth={2.4} />
              </View>
              <Text style={[styles.cardTitle, { color: theme.colors.error }]}>
                Zona de riesgo
              </Text>
            </View>

            <Text style={[styles.cardDesc, { color: theme.colors.onSurfaceVariant }]}>
              Esta opción eliminará permanentemente todas las categorías y todos los registros de
              gastos almacenados en este dispositivo.
            </Text>

            <Button
              mode="text"
              icon={({ size, color }) => <Trash2 size={size} color={color} />}
              textColor={theme.colors.error}
              style={[styles.dangerButton, { borderColor: theme.colors.error }]}
              onPress={() => setConfirmDeleteVisible(true)}
              disabled={busy}
              contentStyle={{ minHeight: 46 }}
              labelStyle={styles.actionButtonLabel}
            >
              Borrar todos los datos de MisGastos
            </Button>
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
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 15, lineHeight: 22 }}>
              ¿Estás seguro de que deseás importar este archivo? Los datos actuales de categorías y
              gastos se sobrescribirán con el contenido del respaldo.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmImportVisible(false)}>Cancelar</Button>
            <Button
              mode="contained"
              onPress={async () => {
                setConfirmImportVisible(false);
                await importarRespaldo();
              }}
            >
              Sobrescribir e importar
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={confirmDeleteVisible}
          onDismiss={() => setConfirmDeleteVisible(false)}
          style={misGastosDialogStyle}
        >
          <Dialog.Title style={{ color: theme.colors.error }}>Eliminar todos los datos</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 15, lineHeight: 22 }}>
              ¿Confirmás que querés borrar permanentemente todos los gastos y categorías? Esta
              acción no se puede deshacer.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDeleteVisible(false)}>Cancelar</Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              textColor={theme.colors.onError}
              onPress={async () => {
                setConfirmDeleteVisible(false);
                await borrarTodo();
              }}
            >
              Borrar definitivamente
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 150,
  },
  content: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    gap: 14,
  },
  pageHeader: {
    gap: 4,
    marginBottom: 4,
  },
  pageHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  titleIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontWeight: "500",
    marginTop: 2,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconSmallBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: 130,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  statCardFull: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  statValueBig: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionButtonsCol: {
    gap: 10,
  },
  actionButton: {
    borderRadius: 14,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  dangerCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    gap: 12,
  },
  dangerButton: {
    borderRadius: 14,
    borderWidth: 1,
  },
});
