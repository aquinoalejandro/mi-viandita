import React from "react";
import { Button, SegmentedButtons, Surface, Text } from "react-native-paper";

import type { ViewMode } from "../misGastosShared";

type Props = {
  titleStyle: object;
  bodyStyle: object;
  cardStyle: object;
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  onBack: () => void;
};

export default function MisGastosHeader({
  titleStyle,
  bodyStyle,
  cardStyle,
  value,
  onChange,
  onBack,
}: Props) {
  return (
    <Surface style={cardStyle} elevation={1}>
      <Text style={titleStyle}>MisGastos</Text>
      <Text style={bodyStyle}>
        Crea categorias personalizadas, registra gastos en pesos argentinos y consulta totales
        por dia, semana, mes, anio o historico.
      </Text>
      <SegmentedButtons
        value={value}
        onValueChange={(nextValue) => onChange(nextValue as ViewMode)}
        buttons={[
          { value: "inicio", label: "Inicio", icon: "view-dashboard-outline" },
          { value: "respaldo", label: "Respaldo", icon: "backup-restore" },
        ]}
      />
      <Button mode="text" onPress={onBack}>
        Volver al inicio
      </Button>
    </Surface>
  );
}
