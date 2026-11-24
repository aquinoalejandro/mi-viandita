import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import {
  Button,
  Checkbox,
  HelperText,
  Snackbar,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { DatePickerModal } from "react-native-paper-dates";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useStore } from "../../store/zustand";
import {
  CONTENT_MAX_WIDTH,
  getFontSize,
  getSpacing,
} from "../../theme/layout";
import type { Client, MealSelection, MiViandaStackParamList } from "../../types/types";
import { formatDateLong, formatLocalDate, getTodayString } from "../../utils/date";
import MealSelectionEditor, { buildEmptyMealSelection } from "./components/MealSelectionEditor";

type NavigationProp = NativeStackNavigationProp<MiViandaStackParamList, "Nuevo Cliente">;

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function NuevoClienteScreen() {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 24);
  const subtitleSize = getFontSize(width, 17);

  const setUbi = useStore((state) => state.setUbi);
  const clientes = useStore((state) => state.miViandaClientes);
  const tiposVianda = useStore((state) => state.miViandaTiposVianda);
  const addMiViandaClient = useStore((state) => state.addMiViandaClient);

  const [nombre, setNombre] = useState("");
  const [detalle, setDetalle] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [viandas, setViandas] = useState<MealSelection[]>([buildEmptyMealSelection()]);
  const [registrarPagoInicial, setRegistrarPagoInicial] = useState(false);
  const [fechaPagoInicial, setFechaPagoInicial] = useState(getTodayString());
  const [detallePagoInicial, setDetallePagoInicial] = useState("");
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: "" });

  useFocusEffect(
    useCallback(() => {
      setUbi("Clientes");
    }, [setUbi])
  );

  const showMessage = (message: string) => {
    setSnackbar({ visible: true, message });
  };

  const nombreLimpio = nombre.trim();
  const yaExiste = Boolean(
    nombreLimpio &&
      clientes.some((c) => c.nombre.toLowerCase() === nombreLimpio.toLowerCase())
  );
  const nombreError = !nombreLimpio
    ? "Ingresá el nombre del cliente."
    : yaExiste
    ? "Ya existe un cliente con ese nombre."
    : null;

  const viandasLimpias = useMemo(
    () =>
      viandas
        .map((item) => ({ ...item, tipo: item.tipo.trim() }))
        .filter((item) => item.tipo.length > 0 && item.cantidad > 0),
    [viandas]
  );

  const volver = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Clientes");
    }
  };

  const guardarCliente = async () => {
    setAttemptedSave(true);

    if (nombreError || viandasLimpias.length === 0) {
      showMessage(nombreError ?? "Cargá al menos un tipo de vianda con cantidad.");
      return;
    }

    const totalComidas = viandasLimpias.reduce((s, v) => s + v.cantidad, 0);
    const nuevoCliente: Client = {
      id: createId(),
      nombre: nombreLimpio,
      viandas: viandasLimpias,
      detalleEspecifico: detalle.trim() ? detalle.trim() : undefined,
      direccion: direccion.trim() ? direccion.trim() : undefined,
      telefono: telefono.trim() ? telefono.trim() : undefined,
      creadoEn: getTodayString(),
      totalComidas,
      diasConsumidosEnPeriodo: 0,
      comidasReponer: 0,
      ajusteDiasPeriodo: 0,
    };

    await addMiViandaClient(
      nuevoCliente,
      registrarPagoInicial
        ? { fecha: fechaPagoInicial, detalle: detallePagoInicial.trim() || "Pago inicial" }
        : undefined
    );

    setNombre("");
    setDetalle("");
    setDireccion("");
    setTelefono("");
    setViandas([buildEmptyMealSelection()]);
    setRegistrarPagoInicial(false);
    setFechaPagoInicial(getTodayString());
    setDetallePagoInicial("");
    setAttemptedSave(false);
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
          gap: 12,
        },
        headerRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        },
        title: {
          fontSize: titleSize,
          fontWeight: "800",
          color: theme.colors.onSurface,
        },
        card: {
          padding: 14,
          borderRadius: 16,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          gap: 10,
        },
        subtitle: {
          fontSize: subtitleSize,
          fontWeight: "700",
          color: theme.colors.onSurface,
        },
        input: {
          backgroundColor: theme.colors.surface,
        },
        checkboxRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        dateRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        },
        mainButton: {
          borderRadius: 14,
        },
      }),
    [
      spacing,
      subtitleSize,
      theme.colors.background,
      theme.colors.onSurface,
      theme.colors.outline,
      theme.colors.surface,
      titleSize,
    ]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Nuevo cliente</Text>
            <Button mode="text" icon="arrow-left" onPress={volver}>
              Volver
            </Button>
          </View>

          <Surface style={styles.card} elevation={0}>
            <Text style={styles.subtitle}>Datos del cliente</Text>

            <View>
              <TextInput
                label="Nombre del cliente"
                value={nombre}
                onChangeText={setNombre}
                mode="outlined"
                autoCapitalize="words"
                maxLength={60}
                style={styles.input}
                error={Boolean((attemptedSave || nombre.length > 0) && nombreError)}
              />
              {(attemptedSave || nombre.length > 0) && nombreError ? (
                <HelperText type="error" visible>
                  {nombreError}
                </HelperText>
              ) : null}
            </View>

            <TextInput
              label="Detalle específico (opcional)"
              value={detalle}
              onChangeText={setDetalle}
              mode="outlined"
              autoCapitalize="sentences"
              maxLength={120}
              style={styles.input}
            />
            <TextInput
              label="Dirección (opcional)"
              value={direccion}
              onChangeText={setDireccion}
              mode="outlined"
              autoCapitalize="sentences"
              maxLength={120}
              style={styles.input}
            />
            <TextInput
              label="Teléfono (opcional)"
              value={telefono}
              onChangeText={setTelefono}
              mode="outlined"
              keyboardType="phone-pad"
              maxLength={30}
              style={styles.input}
            />
          </Surface>

          <Surface style={styles.card} elevation={0}>
            <Text style={styles.subtitle}>Viandas elegidas</Text>
            <MealSelectionEditor
              viandas={viandas}
              tiposVianda={tiposVianda}
              onChange={setViandas}
              showError={attemptedSave}
              onNavigateToTipos={() => navigation.navigate("Tipos de vianda")}
            />
          </Surface>

          <Surface style={styles.card} elevation={0}>
            <Pressable
              style={styles.checkboxRow}
              onPress={() => setRegistrarPagoInicial((prev) => !prev)}
            >
              <Checkbox status={registrarPagoInicial ? "checked" : "unchecked"} />
              <Text style={{ fontWeight: "600", flex: 1 }}>
                Registrar primer pago al crear
              </Text>
            </Pressable>

            {registrarPagoInicial ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  Fecha de inicio del ciclo:{" "}
                  <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>
                    {formatDateLong(fechaPagoInicial)}
                  </Text>
                </Text>
                <View style={styles.dateRow}>
                  <Button
                    mode="outlined"
                    icon="calendar"
                    onPress={() => setOpenDatePicker(true)}
                  >
                    Elegir fecha
                  </Button>
                  <Button
                    mode="text"
                    onPress={() => setFechaPagoInicial(getTodayString())}
                  >
                    Usar hoy
                  </Button>
                </View>
                <TextInput
                  label="Nota del pago (opcional)"
                  value={detallePagoInicial}
                  onChangeText={setDetallePagoInicial}
                  mode="outlined"
                  placeholder="Ej.: Efectivo, Transferencia"
                  maxLength={60}
                  style={styles.input}
                />
              </View>
            ) : null}
          </Surface>

          <Button
            mode="contained"
            icon="check"
            onPress={guardarCliente}
            style={styles.mainButton}
            buttonColor={theme.colors.primary}
            contentStyle={{ minHeight: 50 }}
          >
            Guardar cliente
          </Button>
        </View>
      </ScrollView>

      <DatePickerModal
        locale="es"
        mode="single"
        visible={openDatePicker}
        date={new Date(`${fechaPagoInicial}T00:00:00`)}
        onDismiss={() => setOpenDatePicker(false)}
        onConfirm={({ date }) => {
          setOpenDatePicker(false);
          if (date) {
            setFechaPagoInicial(formatLocalDate(date));
          }
        }}
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
