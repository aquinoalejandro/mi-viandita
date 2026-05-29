import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Button, Dialog, Portal, Snackbar, Text, useTheme } from "react-native-paper";
import { File, Paths } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Client, ClientEvent, Holiday, PaymentCycle, Period, ViandaTipo } from "../../types/types";
import { STORAGE_KEYS } from "../../utils/storage";
import { CONTENT_MAX_WIDTH, getFontSize, getLineHeight, getSpacing } from "../../theme/layout";
import { miViandaDialogStyle } from "./miViandaShared";

type BackupData = {
  version: number;
  exportadoEn: string;
  clientes: Client[];
  eventosCliente: ClientEvent[];
  periodos: Period[];
  feriados: Holiday[];
  tiposVianda: ViandaTipo[];
  ciclosPagos: PaymentCycle[];
};

export default function RespaldoScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 22);
  const bodySize = getFontSize(width, 16);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [confirmImportVisible, setConfirmImportVisible] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

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
          gap: 12,
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
      titleSize,
    ]
  );

  const mostrarMensaje = (msg: string) => {
    setSnackbarMsg(msg);
    setSnackbarVisible(true);
  };

  const miViandaKeys = [
    STORAGE_KEYS.CLIENTES,
    STORAGE_KEYS.EVENTOS_CLIENTE,
    STORAGE_KEYS.PERIODOS,
    STORAGE_KEYS.CICLOS_PAGOS,
    STORAGE_KEYS.FERIADOS,
    STORAGE_KEYS.VIANDAS_TIPOS,
  ];

  const exportarConfiguracion = async () => {
    try {
      const [clientes, eventosCliente, periodos, ciclosPagos, feriados, tiposVianda] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.CLIENTES),
          AsyncStorage.getItem(STORAGE_KEYS.EVENTOS_CLIENTE),
          AsyncStorage.getItem(STORAGE_KEYS.PERIODOS),
          AsyncStorage.getItem(STORAGE_KEYS.CICLOS_PAGOS),
          AsyncStorage.getItem(STORAGE_KEYS.FERIADOS),
          AsyncStorage.getItem(STORAGE_KEYS.VIANDAS_TIPOS),
        ]);

      const data: BackupData = {
        version: 2,
        exportadoEn: new Date().toISOString(),
        clientes: clientes ? (JSON.parse(clientes) as Client[]) : [],
        eventosCliente: eventosCliente ? (JSON.parse(eventosCliente) as ClientEvent[]) : [],
        periodos: periodos ? (JSON.parse(periodos) as Period[]) : [],
        feriados: feriados ? (JSON.parse(feriados) as Holiday[]) : [],
        tiposVianda: tiposVianda ? (JSON.parse(tiposVianda) as ViandaTipo[]) : [],
        ciclosPagos: ciclosPagos ? (JSON.parse(ciclosPagos) as PaymentCycle[]) : [],
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
        mostrarMensaje("Respaldo creado pero no se puede compartir.");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      mostrarMensaje("Error al exportar: " + message);
    }
  };

  const importarConfiguracion = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/json",
      });

      if (res.canceled) {
        mostrarMensaje("Importación cancelada.");
        return;
      }

      const fileUri = res.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri);

      const parsed = JSON.parse(content) as Partial<BackupData>;

      const eventosFiltrados = (Array.isArray(parsed.eventosCliente)
        ? parsed.eventosCliente
        : []
      ).filter((ev) => (ev as ClientEvent)?.tipo === "pago");

      const dataCompat: BackupData = {
        version: typeof parsed.version === "number" ? parsed.version : 2,
        exportadoEn: typeof parsed.exportadoEn === "string" ? parsed.exportadoEn : new Date().toISOString(),
        clientes: Array.isArray(parsed.clientes) ? parsed.clientes : [],
        eventosCliente: eventosFiltrados,
        periodos: Array.isArray(parsed.periodos) ? parsed.periodos : [],
        feriados: Array.isArray(parsed.feriados) ? parsed.feriados : [],
        tiposVianda: Array.isArray(parsed.tiposVianda) ? parsed.tiposVianda : [],
        ciclosPagos: Array.isArray(parsed.ciclosPagos) ? parsed.ciclosPagos : [],
      };

      if (
        !Array.isArray(dataCompat.clientes) ||
        !Array.isArray(dataCompat.eventosCliente) ||
        !Array.isArray(dataCompat.periodos) ||
        !Array.isArray(dataCompat.feriados) ||
        !Array.isArray(dataCompat.tiposVianda) ||
        !Array.isArray(dataCompat.ciclosPagos)
      ) {
        mostrarMensaje("Formato de archivo inválido.");
        return;
      }

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(dataCompat.clientes)),
        AsyncStorage.setItem(
          STORAGE_KEYS.EVENTOS_CLIENTE,
          JSON.stringify(dataCompat.eventosCliente)
        ),
        AsyncStorage.setItem(STORAGE_KEYS.PERIODOS, JSON.stringify(dataCompat.periodos)),
        AsyncStorage.setItem(STORAGE_KEYS.CICLOS_PAGOS, JSON.stringify(dataCompat.ciclosPagos)),
        AsyncStorage.setItem(STORAGE_KEYS.FERIADOS, JSON.stringify(dataCompat.feriados)),
        AsyncStorage.setItem(STORAGE_KEYS.VIANDAS_TIPOS, JSON.stringify(dataCompat.tiposVianda)),
      ]);

      mostrarMensaje("Datos de MiVianda importados con éxito.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      mostrarMensaje("Error al importar: " + message);
    }
  };

  const borrarTodo = async () => {
    try {
      await Promise.all(miViandaKeys.map((key) => AsyncStorage.removeItem(key)));
      mostrarMensaje("Datos de MiVianda eliminados correctamente.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      mostrarMensaje("Error al borrar datos: " + message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Text style={styles.title}>Respaldo</Text>
          <Text style={styles.subtitle}>
            Exportá un respaldo para guardar tus datos o importá uno existente. El borrado total es
            irreversible.
          </Text>

          <View style={styles.card}>
            <Button
              mode="contained"
              icon="export"
              onPress={exportarConfiguracion}
              buttonColor={theme.colors.primary}
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
              onPress={async () => {
                setConfirmImportVisible(false);
                await importarConfiguracion();
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
