import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  HelperText,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { Check, Wallet } from "lucide-react-native";

import type { ExpenseCategory } from "../../../types/types";
import {
  categoryColors,
  iconMap,
  iconOptions,
  misGastosDialogStyle,
  type CategoryFormState,
} from "../misGastosShared";

type Props = {
  visible: boolean;
  form: CategoryFormState;
  existingCategories?: ExpenseCategory[];
  onDismiss: () => void;
  onChange: (form: CategoryFormState) => void;
  onSave: () => void;
};

export default function CategoryDialog({
  visible,
  form,
  existingCategories = [],
  onDismiss,
  onChange,
  onSave,
}: Props) {
  const theme = useTheme();
  const [attemptedSave, setAttemptedSave] = useState(false);

  useEffect(() => {
    if (visible) {
      setAttemptedSave(false);
    }
  }, [visible]);

  const trimmedName = form.nombre.trim();
  const isDuplicate = existingCategories.some(
    (c) => c.id !== form.id && c.nombre.trim().toLowerCase() === trimmedName.toLowerCase()
  );

  const nameError = !trimmedName
    ? "Ingresá un nombre para la categoría."
    : isDuplicate
    ? "Ya existe una categoría con ese nombre."
    : null;

  const activeColor = form.color ?? theme.colors.primary;
  const PreviewIcon = form.icono ? iconMap[form.icono] ?? Wallet : Wallet;

  const handleSave = () => {
    setAttemptedSave(true);
    if (nameError) return;
    onSave();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={misGastosDialogStyle}>
        <Dialog.Title>{form.id ? "Editar categoría" : "Nueva categoría"}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Vista previa */}
            <View
              style={[
                styles.previewBox,
                {
                  backgroundColor: `${activeColor}12`,
                  borderColor: `${activeColor}35`,
                },
              ]}
            >
              <View style={[styles.previewIconBadge, { backgroundColor: `${activeColor}22` }]}>
                <PreviewIcon color={activeColor} size={20} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.previewLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Vista previa
                </Text>
                <Text style={[styles.previewName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                  {trimmedName || "Nombre de categoría"}
                </Text>
              </View>
            </View>

            <View>
              <TextInput
                label="Nombre"
                value={form.nombre}
                onChangeText={(nombre) => onChange({ ...form, nombre })}
                mode="outlined"
                autoCapitalize="sentences"
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                error={Boolean((attemptedSave || form.nombre.length > 0) && nameError)}
              />
              {(attemptedSave || form.nombre.length > 0) && nameError ? (
                <HelperText type="error" visible>
                  {nameError}
                </HelperText>
              ) : null}
            </View>

            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Ícono
                </Text>
                <Button
                  mode={form.icono ? "text" : "contained-tonal"}
                  compact
                  onPress={() => onChange({ ...form, icono: undefined })}
                >
                  Por defecto
                </Button>
              </View>

              <View style={styles.iconGrid}>
                {iconOptions.map(({ key, label, Icon }) => {
                  const selected = form.icono === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => onChange({ ...form, icono: key })}
                      accessibilityRole="button"
                      accessibilityLabel={`Ícono ${label}`}
                      style={[
                        styles.iconButtonWrap,
                        {
                          borderColor: selected ? activeColor : theme.colors.outline,
                          backgroundColor: selected
                            ? `${activeColor}18`
                            : theme.colors.surface,
                        },
                      ]}
                    >
                      <Icon color={selected ? activeColor : theme.colors.onSurfaceVariant} size={20} strokeWidth={2.1} />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Color
                </Text>
                <Button
                  mode={form.color ? "text" : "contained-tonal"}
                  compact
                  onPress={() => onChange({ ...form, color: undefined })}
                >
                  Automático
                </Button>
              </View>

              <View style={styles.colorRow}>
                {categoryColors.map((color) => {
                  const selected = form.color === color;
                  return (
                    <Pressable
                      key={color}
                      onPress={() => onChange({ ...form, color })}
                      accessibilityRole="button"
                      accessibilityLabel={`Color ${color}`}
                      style={[
                        styles.colorDot,
                        {
                          backgroundColor: color,
                          borderColor: selected ? theme.colors.onSurface : "transparent",
                        },
                      ]}
                    >
                      {selected ? <Check color="#ffffff" size={16} strokeWidth={2.8} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancelar</Button>
          <Button mode="contained" onPress={handleSave}>
            Guardar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    maxHeight: 440,
    paddingHorizontal: 0,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    gap: 14,
  },
  previewBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  previewIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewName: {
    fontSize: 15,
    fontWeight: "700",
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  iconButtonWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
