import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, HelperText, IconButton, List, Text, TextInput, useTheme } from "react-native-paper";

import type { MealSelection, ViandaTipo } from "../../../types/types";

type Props = {
  viandas: MealSelection[];
  tiposVianda: ViandaTipo[];
  onChange: (next: MealSelection[]) => void;
  onNavigateToTipos?: () => void;
  showError?: boolean;
};

const createRowId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const buildEmptyMealSelection = (): MealSelection => ({
  id: createRowId(),
  tipo: "",
  cantidad: 1,
});

export default function MealSelectionEditor({
  viandas,
  tiposVianda,
  onChange,
  onNavigateToTipos,
  showError = false,
}: Props) {
  const theme = useTheme();
  const [expandedTipoId, setExpandedTipoId] = useState<string | null>(null);
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});

  const hasValidVianda = viandas.some((item) => item.tipo.trim().length > 0 && item.cantidad > 0);

  const selectTipo = (rowId: string, tipo: string) => {
    onChange(viandas.map((item) => (item.id === rowId ? { ...item, tipo } : item)));
    setExpandedTipoId(null);
  };

  const handleQtyChange = (rowId: string, rawText: string) => {
    const digitsOnly = rawText.replace(/[^\d]/g, "");
    setQtyDrafts((prev) => ({ ...prev, [rowId]: digitsOnly }));

    if (digitsOnly.length > 0) {
      const parsed = parseInt(digitsOnly, 10);
      if (Number.isFinite(parsed) && parsed >= 1) {
        onChange(viandas.map((item) => (item.id === rowId ? { ...item, cantidad: parsed } : item)));
      }
    }
  };

  const handleQtyBlur = (rowId: string) => {
    const draft = qtyDrafts[rowId];
    if (draft !== undefined) {
      const parsed = parseInt(draft, 10);
      const validQty = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
      onChange(
        viandas.map((item) => (item.id === rowId ? { ...item, cantidad: validQty } : item))
      );
      setQtyDrafts((prev) => {
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
    }
  };

  const stepQty = (rowId: string, delta: number, currentQty: number) => {
    const nextQty = Math.max(1, currentQty + delta);
    setQtyDrafts((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
    onChange(viandas.map((item) => (item.id === rowId ? { ...item, cantidad: nextQty } : item)));
  };

  const addRow = () => {
    onChange([...viandas, buildEmptyMealSelection()]);
  };

  const removeRow = (rowId: string) => {
    if (viandas.length <= 1) return;
    setQtyDrafts((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
    onChange(viandas.filter((item) => item.id !== rowId));
  };

  const canAddMoreRows =
    tiposVianda.length === 0 || viandas.length < tiposVianda.length;

  return (
    <View style={styles.container}>
      {tiposVianda.length === 0 ? (
        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <Text style={[styles.warningText, { color: theme.colors.onSurfaceVariant }]}>
            No hay tipos de vianda cargados. Crealos en Configuración para poder asignarlos.
          </Text>
          {onNavigateToTipos ? (
            <Button mode="contained-tonal" compact onPress={onNavigateToTipos}>
              Ir a Tipos de vianda
            </Button>
          ) : null}
        </View>
      ) : null}

      {viandas.map((item, index) => {
        const usedByOtherRows = new Set(
          viandas
            .filter((other) => other.id !== item.id && other.tipo.trim().length > 0)
            .map((other) => other.tipo.trim().toLowerCase())
        );

        const displayQty =
          qtyDrafts[item.id] !== undefined ? qtyDrafts[item.id] : String(item.cantidad);

        return (
          <View
            key={item.id}
            style={[
              styles.mealRowCard,
              {
                backgroundColor: theme.colors.surfaceVariant,
                borderColor: theme.colors.outline,
              },
            ]}
          >
            <View style={styles.accordionWrap}>
              <List.Accordion
                title={item.tipo ? item.tipo : `Elegir tipo ${index + 1}`}
                expanded={expandedTipoId === item.id}
                onPress={() =>
                  setExpandedTipoId((prev) => (prev === item.id ? null : item.id))
                }
                style={[styles.accordion, { backgroundColor: theme.colors.surface }]}
                titleStyle={{
                  fontWeight: item.tipo ? "700" : "500",
                  color: item.tipo ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                }}
              >
                {tiposVianda.length === 0 ? (
                  <List.Item title="Sin tipos disponibles" disabled />
                ) : (
                  tiposVianda.map((tipo) => {
                    const isUsedElsewhere = usedByOtherRows.has(tipo.nombre.toLowerCase());
                    const isSelected =
                      item.tipo.trim().toLowerCase() === tipo.nombre.toLowerCase();

                    return (
                      <List.Item
                        key={tipo.id}
                        title={tipo.nombre}
                        description={isUsedElsewhere ? "Ya seleccionada en otra fila" : undefined}
                        disabled={isUsedElsewhere}
                        right={(props) =>
                          isSelected ? (
                            <List.Icon {...props} icon="check" color={theme.colors.primary} />
                          ) : null
                        }
                        onPress={() => {
                          if (!isUsedElsewhere) {
                            selectTipo(item.id, tipo.nombre);
                          }
                        }}
                      />
                    );
                  })
                )}
              </List.Accordion>
            </View>

            <View style={styles.qtyControlsRow}>
              <Text style={[styles.qtyLabel, { color: theme.colors.onSurfaceVariant }]}>
                Cantidad diaria:
              </Text>
              <View style={styles.stepperGroup}>
                <IconButton
                  icon="minus"
                  size={18}
                  mode="outlined"
                  onPress={() => stepQty(item.id, -1, item.cantidad)}
                  disabled={item.cantidad <= 1}
                  accessibilityLabel="Restar una vianda"
                  style={styles.stepperBtn}
                />
                <TextInput
                  value={displayQty}
                  onChangeText={(value) => handleQtyChange(item.id, value)}
                  onBlur={() => handleQtyBlur(item.id)}
                  keyboardType="number-pad"
                  mode="outlined"
                  dense
                  maxLength={3}
                  style={[styles.qtyInput, { backgroundColor: theme.colors.surface }]}
                  contentStyle={{ textAlign: "center" }}
                />
                <IconButton
                  icon="plus"
                  size={18}
                  mode="outlined"
                  onPress={() => stepQty(item.id, 1, item.cantidad)}
                  accessibilityLabel="Sumar una vianda"
                  style={styles.stepperBtn}
                />
              </View>

              <IconButton
                icon="delete-outline"
                onPress={() => removeRow(item.id)}
                disabled={viandas.length === 1}
                iconColor={theme.colors.error}
                accessibilityLabel="Quitar fila de vianda"
              />
            </View>
          </View>
        );
      })}

      {showError && !hasValidVianda ? (
        <HelperText type="error" visible>
          Seleccioná al menos un tipo de vianda con cantidad mayor o igual a 1.
        </HelperText>
      ) : null}

      <Button
        mode="outlined"
        icon="plus"
        onPress={addRow}
        disabled={!canAddMoreRows}
        contentStyle={{ minHeight: 44 }}
      >
        {canAddMoreRows
          ? "Agregar otro tipo de vianda"
          : "Ya están incluidos todos los tipos"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  warningBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    alignItems: "flex-start",
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
  },
  mealRowCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  accordionWrap: {
    borderRadius: 10,
    overflow: "hidden",
  },
  accordion: {
    paddingVertical: 0,
  },
  qtyControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  qtyLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  stepperGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  stepperBtn: {
    margin: 0,
  },
  qtyInput: {
    width: 58,
    height: 38,
  },
});
