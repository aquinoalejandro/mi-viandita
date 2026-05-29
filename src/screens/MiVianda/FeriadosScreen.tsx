import React, { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import {
  Button,
  Dialog,
  Portal,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { DatePickerModal, registerTranslation, es } from "react-native-paper-dates";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Client, Holiday } from "../../types/types";
import { miViandaDialogStyle } from "./miViandaShared";
import { STORAGE_KEYS } from "../../utils/storage";
import { formatDateLong, formatLocalDate, getTodayString } from "../../utils/date";
import { CONTENT_MAX_WIDTH, getFontSize, getLineHeight, getSpacing } from "../../theme/layout";
import { buildMealCalendar } from "../../utils/calendar";
import { getClientCycleDays, getClientCycleStart } from "../../utils/billing";

registerTranslation("es", es);

export default function FeriadosScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 22);
  const bodySize = getFontSize(width, 16);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [feriados, setFeriados] = useState<Holiday[]>([]);
  const [fechaFeriado, setFechaFeriado] = useState("");
  const [openDateFeriado, setOpenDateFeriado] = useState(false);
  const [motivoFeriado, setMotivoFeriado] = useState("");
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [feriadoABorrar, setFeriadoABorrar] = useState<Holiday | null>(null);

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
        actionRow: {
          flexDirection: width < 380 ? "column" : "row",
          alignItems: width < 380 ? "stretch" : "center",
          gap: 8,
        },
        input: {
          backgroundColor: theme.colors.surface,
        },
        row: {
          flexDirection: width < 380 ? "column" : "row",
          alignItems: width < 380 ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: 8,
          paddingVertical: 6,
        },
        emptyText: {
          color: theme.colors.onSurfaceVariant,
        },
        tag: {
          fontWeight: "600",
          color: theme.colors.primary,
        },
      }),
    [
      bodySize,
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

  const mostrarMensaje = (msg: string) => {
    setSnackbarMsg(msg);
    setSnackbarVisible(true);
  };

  const loadFeriados = useCallback(async () => {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.FERIADOS);
    setFeriados(data ? (JSON.parse(data) as Holiday[]) : []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFeriados();
    }, [loadFeriados])
  );

  const esFinDeSemana = (fecha: string) => {
    const dia = new Date(`${fecha}T00:00:00`).getDay();
    return dia === 0 || dia === 6;
  };

  const esFeriado = (fecha: string) => feriados.some((f) => f.fecha === fecha);

  const agregarFeriado = async () => {
    const fecha = fechaFeriado.trim();
    const motivo = motivoFeriado.trim();

    if (!fecha) {
      mostrarMensaje("Elegí una fecha para el feriado.");
      return;
    }

    if (esFinDeSemana(fecha)) {
      mostrarMensaje("Sábado y domingo ya no cuentan como vianda.");
      return;
    }

    if (esFeriado(fecha)) {
      mostrarMensaje("Ese feriado ya está cargado.");
      return;
    }

    const nuevo: Holiday = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fecha,
      motivo: motivo.length ? motivo : undefined,
    };

    const updated = [...feriados, nuevo].sort((a, b) => a.fecha.localeCompare(b.fecha));

    await AsyncStorage.setItem(STORAGE_KEYS.FERIADOS, JSON.stringify(updated));
    setFeriados(updated);
    setFechaFeriado("");
    setMotivoFeriado("");

    Alert.alert(
      "Compensar feriado",
      "Este feriado quita 1 día del ciclo. ¿Querés agregar ese día al final del ciclo de cada cliente vigente?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Sí",
          onPress: async () => {
            try {
              const clientesRaw = await AsyncStorage.getItem(STORAGE_KEYS.CLIENTES);
              if (!clientesRaw) {
                mostrarMensaje("Feriado agregado.");
                return;
              }

              const clientes = JSON.parse(clientesRaw) as Client[];

              const updatedClientes = clientes.map((c) => {
                const cicloDesde = getClientCycleStart(c);
                if (!cicloDesde) return c;

                const totalCiclo = getClientCycleDays(c);
                const calendario = buildMealCalendar(cicloDesde, totalCiclo, updated);
                const vigente = calendario.includes(fecha);
                if (!vigente) return c;

                return {
                  ...c,
                  comidasReponer: (c.comidasReponer ?? 0) + 1,
                };
              });

              await AsyncStorage.setItem(
                STORAGE_KEYS.CLIENTES,
                JSON.stringify(updatedClientes)
              );

              mostrarMensaje(
                "Feriado agregado y día compensado en clientes vigentes."
              );
            } catch (e) {
              console.error(e);
              mostrarMensaje("Feriado agregado, pero no se pudo compensar el ciclo.");
            }
          },
        },
      ]
    );
  };

  const solicitarBorrarFeriado = (feriado: Holiday) => {
    setFeriadoABorrar(feriado);
    setConfirmDeleteVisible(true);
  };

  const borrarFeriado = async () => {
    if (!feriadoABorrar) return;
    const updated = feriados.filter((f) => f.id !== feriadoABorrar.id);
    await AsyncStorage.setItem(STORAGE_KEYS.FERIADOS, JSON.stringify(updated));
    setFeriados(updated);
    setConfirmDeleteVisible(false);
    setFeriadoABorrar(null);
    mostrarMensaje("Feriado eliminado.");
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Text style={styles.title}>Feriados</Text>
          <Text style={styles.subtitle}>
            Los feriados no cuentan como días hábiles. Agregalos para que el calendario sea correcto.
          </Text>

          <View style={styles.card}>
            <Text>
              Fecha seleccionada:{" "}
              <Text style={styles.tag}>
                {fechaFeriado ? formatDateLong(fechaFeriado) : "Sin seleccionar"}
              </Text>
            </Text>

            <View style={styles.actionRow}>
              <Button mode="outlined" onPress={() => setOpenDateFeriado(true)}>
                Elegir fecha
              </Button>
              <Button
                mode="outlined"
                onPress={() => setFechaFeriado(getTodayString())}
              >
                Usar hoy
              </Button>
            </View>

            <TextInput
              label="Motivo (opcional)"
              value={motivoFeriado}
              onChangeText={setMotivoFeriado}
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={agregarFeriado}
              buttonColor={theme.colors.primary}
              contentStyle={{ minHeight: 48 }}
            >
              Agregar feriado
            </Button>

            {feriados.length === 0 ? (
              <Text style={styles.emptyText}>No hay feriados cargados.</Text>
            ) : (
              feriados.map((f) => (
                <View key={f.id} style={styles.row}>
                  <Text>
                    {formatDateLong(f.fecha)}
                    {f.motivo ? ` - ${f.motivo}` : ""}
                  </Text>
                  <Button
                    mode="text"
                    textColor={theme.colors.error}
                    onPress={() => solicitarBorrarFeriado(f)}
                  >
                    Quitar
                  </Button>
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
          <Dialog.Title>Eliminar feriado</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Estás seguro que querés eliminar el feriado{" "}
              {feriadoABorrar ? formatDateLong(feriadoABorrar.fecha) : ""}?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDeleteVisible(false)}>Cancelar</Button>
            <Button onPress={borrarFeriado} textColor={theme.colors.error}>
              Eliminar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <DatePickerModal
        locale="es"
        mode="single"
        visible={openDateFeriado}
        onDismiss={() => setOpenDateFeriado(false)}
        onConfirm={({ date }) => {
          setOpenDateFeriado(false);
          if (date) {
            setFechaFeriado(formatLocalDate(date));
          }
        }}
      />

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
