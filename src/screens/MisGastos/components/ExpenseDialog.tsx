import React from "react";
import { ScrollView, View } from "react-native";
import { Button, Chip, Dialog, HelperText, Portal, TextInput } from "react-native-paper";

import type { ExpenseCategory } from "../../../types/types";
import { getInitialExpenseForm, misGastosDialogStyle, type ExpenseFormState } from "../misGastosShared";

type Props = {
  visible: boolean;
  categories: ExpenseCategory[];
  form: ExpenseFormState;
  categoriesWrapStyle: object;
  onDismiss: () => void;
  onChange: (form: ExpenseFormState) => void;
  onSave: () => void;
};

export default function ExpenseDialog({
  visible,
  categories,
  form,
  categoriesWrapStyle,
  onDismiss,
  onChange,
  onSave,
}: Props) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={misGastosDialogStyle}>
        <Dialog.Title>{form.id ? "Editar gasto" : "Nuevo gasto"}</Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={{ gap: 14 }}>
            <View style={categoriesWrapStyle as object}>
              {categories.map((category) => (
                <Chip
                  key={category.id}
                  selected={form.categoriaId === category.id}
                  onPress={() => onChange({ ...form, categoriaId: category.id })}
                >
                  {category.nombre}
                </Chip>
              ))}
            </View>

            <TextInput
              label="Monto en ARS"
              value={form.monto}
              onChangeText={(monto) => onChange({ ...form, monto })}
              mode="outlined"
              keyboardType="decimal-pad"
              left={<TextInput.Affix text="$" />}
            />

            <TextInput
              label="Fecha"
              value={form.fecha}
              onChangeText={(fecha) => onChange({ ...form, fecha })}
              mode="outlined"
              placeholder="dd/mm/aaaa"
            />

            <TextInput
              label="Hora"
              value={form.hora}
              onChangeText={(hora) => onChange({ ...form, hora })}
              mode="outlined"
              placeholder="HH:mm"
            />

            <Button mode="text" onPress={() => onChange(getInitialExpenseForm(form.categoriaId))}>
              Usar fecha y hora actual
            </Button>

            <TextInput
              label="Referencia o descripción"
              value={form.referencia}
              onChangeText={(referencia) => onChange({ ...form, referencia })}
              mode="outlined"
              multiline
            />
            <HelperText type="info">
              Formatos esperados: fecha dd/mm/aaaa y hora HH:mm.
            </HelperText>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancelar</Button>
          <Button onPress={onSave}>Guardar</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
