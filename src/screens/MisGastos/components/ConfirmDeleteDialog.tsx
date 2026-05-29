import React from "react";
import { Button, Dialog, Portal, Text, useTheme } from "react-native-paper";

import { misGastosDialogStyle } from "../misGastosShared";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  onDismiss: () => void;
  onConfirm: () => void;
};

export default function ConfirmDeleteDialog({
  visible,
  title,
  message,
  onDismiss,
  onConfirm,
}: Props) {
  const theme = useTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={misGastosDialogStyle}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text>{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancelar</Button>
          <Button textColor={theme.colors.error} onPress={onConfirm}>
            Eliminar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
