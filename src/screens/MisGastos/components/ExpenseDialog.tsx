import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Chip,
  Dialog,
  HelperText,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { DatePickerModal } from "react-native-paper-dates";
import { format, subDays } from "date-fns";

import type { ExpenseCategory } from "../../../types/types";
import {
  formatCurrency,
  formatDateInput,
  formatTimeInput,
  misGastosDialogStyle,
  parseAmountInput,
  parseExpenseDate,
  type ExpenseFormState,
} from "../misGastosShared";

type Props = {
  visible: boolean;
  categories: ExpenseCategory[];
  form: ExpenseFormState;
  onDismiss: () => void;
  onChange: (form: ExpenseFormState) => void;
  onSave: () => void;
};

export default function ExpenseDialog({
  visible,
  categories,
  form,
  onDismiss,
  onChange,
  onSave,
}: Props) {
  const theme = useTheme();
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setAttemptedSave(false);
    }
  }, [visible]);

  const parsedAmount = parseAmountInput(form.monto);
  const parsedDate = parseExpenseDate(form.fecha, form.hora);

  const categoryError = !form.categoriaId ? "Seleccioná una categoría." : null;
  const amountError =
    parsedAmount === null ? "Ingresá un monto válido mayor a 0 (ej: 1500,50)." : null;
  const dateError =
    parsedDate === null ? "Fecha u hora inválida (formato dd/mm/aaaa y HH:mm)." : null;

  const pickerInitialDate = parsedDate ?? new Date();

  const handleSave = () => {
    setAttemptedSave(true);
    if (categoryError || amountError || dateError) return;
    onSave();
  };

  const applyToday = () => {
    onChange({
      ...form,
      fecha: format(new Date(), "dd/MM/yyyy"),
    });
  };

  const applyYesterday = () => {
    onChange({
      ...form,
      fecha: format(subDays(new Date(), 1), "dd/MM/yyyy"),
    });
  };

  const applyNow = () => {
    const now = new Date();
    onChange({
      ...form,
      fecha: format(now, "dd/MM/yyyy"),
      hora: format(now, "HH:mm"),
    });
  };

  return (
    <>
      <Portal>
        <Dialog visible={visible} onDismiss={onDismiss} style={misGastosDialogStyle}>
          <Dialog.Title>{form.id ? "Editar gasto" : "Nuevo gasto"}</Dialog.Title>
          <Dialog.ScrollArea style={styles.scrollArea}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Categoría
                </Text>
                {categories.length === 0 ? (
                  <HelperText type="error" visible>
                    Creá primero una categoría para registrar gastos.
                  </HelperText>
                ) : (
                  <View style={styles.categoriesWrap}>
                    {categories.map((category) => {
                      const isSelected = form.categoriaId === category.id;
                      const catColor = category.color ?? theme.colors.primary;

                      return (
                        <Chip
                          key={category.id}
                          selected={isSelected}
                          style={{
                            backgroundColor: isSelected
                              ? `${catColor}20`
                              : theme.colors.surfaceVariant,
                            borderColor: isSelected ? catColor : theme.colors.outline,
                            borderWidth: 1,
                          }}
                          textStyle={{
                            color: isSelected ? catColor : theme.colors.onSurface,
                            fontWeight: isSelected ? "700" : "500",
                          }}
                          onPress={() => onChange({ ...form, categoriaId: category.id })}
                        >
                          {category.nombre}
                        </Chip>
                      );
                    })}
                  </View>
                )}
                {attemptedSave && categoryError ? (
                  <HelperText type="error" visible>
                    {categoryError}
                  </HelperText>
                ) : null}
              </View>

              <View>
                <TextInput
                  label="Monto en ARS"
                  value={form.monto}
                  onChangeText={(monto) => onChange({ ...form, monto })}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                  left={<TextInput.Affix text="$" />}
                  error={Boolean((attemptedSave || form.monto.length > 0) && amountError)}
                />
                {parsedAmount !== null ? (
                  <HelperText type="info" visible>
                    Importe a guardar: {formatCurrency(parsedAmount)}
                  </HelperText>
                ) : attemptedSave || form.monto.length > 0 ? (
                  <HelperText type="error" visible>
                    {amountError}
                  </HelperText>
                ) : null}
              </View>

              <View style={styles.dateTimeSection}>
                <View style={styles.dateTimeRow}>
                  <TextInput
                    label="Fecha"
                    value={form.fecha}
                    onChangeText={(raw) => onChange({ ...form, fecha: formatDateInput(raw) })}
                    mode="outlined"
                    keyboardType="number-pad"
                    placeholder="dd/mm/aaaa"
                    maxLength={10}
                    style={{ flex: 1.3 }}
                    error={Boolean(attemptedSave && dateError)}
                  />
                  <TextInput
                    label="Hora"
                    value={form.hora}
                    onChangeText={(raw) => onChange({ ...form, hora: formatTimeInput(raw) })}
                    mode="outlined"
                    keyboardType="number-pad"
                    placeholder="HH:mm"
                    maxLength={5}
                    style={{ flex: 0.9 }}
                    error={Boolean(attemptedSave && dateError)}
                  />
                </View>

                <View style={styles.quickDatesRow}>
                  <Button
                    mode="outlined"
                    compact
                    icon="calendar"
                    onPress={() => setDatePickerOpen(true)}
                  >
                    Calendario
                  </Button>
                  <Button mode="text" compact onPress={applyToday}>
                    Hoy
                  </Button>
                  <Button mode="text" compact onPress={applyYesterday}>
                    Ayer
                  </Button>
                  <Button mode="text" compact onPress={applyNow}>
                    Ahora
                  </Button>
                </View>

                {dateError ? (
                  <HelperText type="error" visible>
                    {dateError}
                  </HelperText>
                ) : null}
              </View>

              <View>
                <TextInput
                  label="Referencia o descripción (opcional)"
                  value={form.referencia}
                  onChangeText={(referencia) => onChange({ ...form, referencia })}
                  mode="outlined"
                  autoCapitalize="sentences"
                  maxLength={120}
                  multiline
                />
                <HelperText type="info" visible>
                  Ej.: Verdulería, luz, almuerzo ({form.referencia.length}/120).
                </HelperText>
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={onDismiss}>Cancelar</Button>
            <Button mode="contained" onPress={handleSave} disabled={categories.length === 0}>
              Guardar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <DatePickerModal
        locale="es"
        mode="single"
        visible={datePickerOpen}
        date={pickerInitialDate}
        onDismiss={() => setDatePickerOpen(false)}
        onConfirm={({ date }) => {
          setDatePickerOpen(false);
          if (date) {
            onChange({
              ...form,
              fecha: format(date, "dd/MM/yyyy"),
            });
          }
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    maxHeight: 450,
    paddingHorizontal: 0,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    gap: 12,
  },
  sectionBlock: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  categoriesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dateTimeSection: {
    gap: 6,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 10,
  },
  quickDatesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
  },
});
