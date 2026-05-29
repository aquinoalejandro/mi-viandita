import React from "react";
import { ScrollView, View } from "react-native";
import { Button, Dialog, IconButton, Portal, Text, TextInput, useTheme } from "react-native-paper";

import {
  categoryColors,
  misGastosDialogStyle,
  type CategoryFormState,
  iconOptions,
} from "../misGastosShared";

type Props = {
  visible: boolean;
  form: CategoryFormState;
  sectionTitleStyle: object;
  iconGridStyle: object;
  iconButtonWrapStyle: object;
  colorRowStyle: object;
  colorDotStyle: object;
  onDismiss: () => void;
  onChange: (form: CategoryFormState) => void;
  onSave: () => void;
};

export default function CategoryDialog({
  visible,
  form,
  sectionTitleStyle,
  iconGridStyle,
  iconButtonWrapStyle,
  colorRowStyle,
  colorDotStyle,
  onDismiss,
  onChange,
  onSave,
}: Props) {
  const theme = useTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={misGastosDialogStyle}>
        <Dialog.Title>{form.id ? "Editar categoría" : "Nueva categoría"}</Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={{ gap: 14 }}>
            <TextInput
              label="Nombre"
              value={form.nombre}
              onChangeText={(nombre) => onChange({ ...form, nombre })}
              mode="outlined"
            />

            <Text style={sectionTitleStyle}>Ícono opcional</Text>
            <View style={iconGridStyle as object}>
              <Button
                mode={form.icono ? "outlined" : "contained-tonal"}
                onPress={() => onChange({ ...form, icono: undefined })}
              >
                Sin ícono
              </Button>
              {iconOptions.map(({ key, Icon }) => (
                <View
                  key={key}
                  style={[
                    iconButtonWrapStyle as object,
                    {
                      borderColor:
                        form.icono === key ? form.color ?? theme.colors.primary : theme.colors.outline,
                      backgroundColor:
                        form.icono === key
                          ? `${form.color ?? theme.colors.primary}12`
                          : theme.colors.surface,
                    },
                  ]}
                >
                  <IconButton
                    icon={() => (
                      <Icon color={form.color ?? theme.colors.primary} size={18} strokeWidth={2.1} />
                    )}
                    onPress={() => onChange({ ...form, icono: key })}
                  />
                </View>
              ))}
            </View>

            <Text style={sectionTitleStyle}>Color opcional</Text>
            <View style={colorRowStyle as object}>
              <Button
                mode={form.color ? "outlined" : "contained-tonal"}
                onPress={() => onChange({ ...form, color: undefined })}
              >
                Sin color
              </Button>
              {categoryColors.map((color) => (
                <IconButton
                  key={color}
                  style={[
                    colorDotStyle as object,
                    {
                      backgroundColor: color,
                      borderColor: form.color === color ? theme.colors.onSurface : "transparent",
                    },
                  ]}
                  icon={form.color === color ? "check" : ""}
                  iconColor="#ffffff"
                  onPress={() => onChange({ ...form, color })}
                />
              ))}
            </View>
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
