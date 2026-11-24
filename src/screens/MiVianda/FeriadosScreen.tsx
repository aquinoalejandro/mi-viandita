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
import { DatePickerModal } from "react-native-paper-dates";
import { useFocusEffect } from "@react-navigation/native";

import { useStore } from "../../store/zustand";
import { CONTENT_MAX_WIDTH, getFontSize, getLineHeight, getSpacing } from "../../theme/layout";
import type { Holiday } from "../../types/types";
import { formatDateLong, formatLocalDate, getTodayString } from "../../utils/date";
import { miViandaDialogStyle } from "./miViandaShared";

export default function FeriadosScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 22);
  const bodySize = getFontSize(width, 15);

  const setUbi = useStore((state) => state.setUbi);
  const feriados = useStore((state) => state.miViandaFeriados);
  const addMiViandaHoliday = useStore((state) => state.addMiViandaHoliday);
  const deleteMiViandaHoliday = useStore((state) => state.deleteMiViandaHoliday);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [fechaFeriado, setFechaFeriado] = useState("");
  const [openDateFeriado, setOpenDateFeriado] = useState(false);
  const [motivoFeriado, setMotivoFeriado] = useState("");
  const [attemptedAdd, setAttemptedAdd] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [feriadoABorrar, setFeriadoABorrar] = useState<Holiday | null>(null);

  useFocusEffect(
    useCallback(() => {
      setUbi("Configuracion");
    }, [setUbi])
  );

  const mostrarMensaje = (msg: string) => {
    setSnackbarMsg(msg);
    setSnackbarVisible(true);
  };

  const esFinDeSemana = (fecha: string) => {
    const dia = new Date(`${fecha}T00:00:00`).getDay();
    return dia === 0 || dia === 6;
  };

  const esFeriado = (fecha: string) => feriados.some((f) => f.fecha === fecha);

  const dateValidationError = useMemo(() => {
    const fecha = fechaFeriado.trim();
    if (!fecha) return "Elegí una fecha para el feriado.";
    if (esFinDeSemana(fecha)) return "Sábado y domingo ya son días no hábiles.";
    if (esFeriado(fecha)) return "Ese feriado ya está cargado.";
    return null;
  }, [fechaFeriado, feriados]);

  const agregarFeriado = async () => {
    setAttemptedAdd(true);
    if (dateValidationError) {
      mostrarMensaje(dateValidationError);
      return;
    }

    await addMiViandaHoliday(fechaFeriado.trim(), motivoFeriado.trim());
    setFechaFeriado("");
    setMotivoFeriado("");
    setAttemptedAdd(false);
    mostrarMensaje("Feriado agregado y ciclos recalculados.");
  };

  const solicitarBorrarFeriado = (feriado: Holiday) => {
    setFeriadoABorrar(feriado);
    setConfirmDeleteVisible(true);
  };

  const borrarFeriado = async () => {
    if (!feriadoABorrar) return;
    await deleteMiViandaHoliday(feriadoABorrar.id);
    setConfirmDeleteVisible(false);
    setFeriadoABorrar(null);
    mostrarMensaje("Feriado eliminado y ciclos recalculados.");
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
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.outlineVariant,
        },
        emptyText: {
          color: theme.colors.onSurfaceVariant,
        },
        tag: {
          fontWeight: "700",
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
      theme.colors.outlineVariant,
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
          <Text style={styles.title}>Feriados</Text>
          <Text style={styles.subtitle}>
            Los feriados no cuentan como días hábiles. Al agregar o quitar un feriado, todos los
            ciclos de pago se recalculan automáticamente para correr o ajustar las entregas.
          </Text>

          <Surface style={styles.card} elevation={0}>
            <Text>
              Fecha seleccionada:{" "}
              <Text style={styles.tag}>
                {fechaFeriado ? formatDateLong(fechaFeriado) : "Sin seleccionar"}
              </Text>
            </Text>

            <View style={styles.actionRow}>
              <Button
                mode="outlined"
                icon="calendar"
                onPress={() => setOpenDateFeriado(true)}
              >
                Elegir fecha
              </Button>
              <Button
                mode="outlined"
                onPress={() => setFechaFeriado(getTodayString())}
              >
                Usar hoy
              </Button>
            </View>

            {(attemptedAdd || fechaFeriado.length > 0) && dateValidationError ? (
              <HelperText type="error" visible>
                {dateValidationError}
              </HelperText>
            ) : null}

            <TextInput
              label="Motivo (opcional)"
              value={motivoFeriado}
              onChangeText={setMotivoFeriado}
              mode="outlined"
              autoCapitalize="sentences"
              maxLength={60}
              style={styles.input}
            />

            <Button
              mode="contained"
              icon="plus"
              onPress={() => void agregarFeriado()}
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
                  <Text style={{ flex: 1 }}>
                    {formatDateLong(f.fecha)}
                    {f.motivo ? ` — ${f.motivo}` : ""}
                  </Text>
                  <Button
                    mode="text"
                    textColor={theme.colors.error}
                    onPress={() => solicitarBorrarFeriado(f)}
                    compact
                  >
                    Quitar
                  </Button>
                </View>
              ))
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
          <Dialog.Title>Eliminar feriado</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Estás seguro que querés eliminar el feriado{" "}
              {feriadoABorrar ? formatDateLong(feriadoABorrar.fecha) : ""}? Los ciclos vigentes se
              recalcularán automáticamente.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDeleteVisible(false)}>Cancelar</Button>
            <Button onPress={() => void borrarFeriado()} textColor={theme.colors.error}>
              Eliminar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <DatePickerModal
        locale="es"
        mode="single"
        visible={openDateFeriado}
        date={fechaFeriado ? new Date(`${fechaFeriado}T00:00:00`) : new Date()}
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
