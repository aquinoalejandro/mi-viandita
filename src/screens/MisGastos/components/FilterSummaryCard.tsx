import React from "react";
import { ScrollView, View } from "react-native";
import {
  Button,
  IconButton,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

import type { FilterMode } from "../misGastosShared";
import { formatCurrency, getFilterLabel, shiftReferenceDate } from "../misGastosShared";

type Props = {
  cardStyle: object;
  titleStyle: object;
  bodyStyle: object;
  amountStyle: object;
  filterRowStyle: object;
  filterLabelStyle: object;
  periodPillStyle?: object;
  filterMode: FilterMode;
  referenceDate: Date;
  total: number;
  selectedCategoryName?: string;
  onChangeFilter: (value: FilterMode) => void;
  onChangeReferenceDate: (value: Date) => void;
};

function FilterSummaryCard({
  cardStyle,
  titleStyle,
  bodyStyle,
  amountStyle,
  filterRowStyle,
  filterLabelStyle,
  periodPillStyle,
  filterMode,
  referenceDate,
  total,
  selectedCategoryName,
  onChangeFilter,
  onChangeReferenceDate,
}: Props) {
  const theme = useTheme();

  return (
    <Surface style={cardStyle} elevation={0}>
      <Text style={titleStyle}>Periodo y total</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[
          { value: "dia", label: "Día" },
          { value: "semana", label: "Semana" },
          { value: "mes", label: "Mes" },
          { value: "anio", label: "Año" },
          { value: "historico", label: "Todo" },
        ].map((item) => {
          const active = filterMode === item.value;
          return (
            <Button
              key={item.value}
              mode={active ? "contained" : "outlined"}
              onPress={() => onChangeFilter(item.value as FilterMode)}
              compact
              style={{ minWidth: 84 }}
              contentStyle={{ paddingHorizontal: 4 }}
            >
              {item.label}
            </Button>
          );
        })}
      </ScrollView>

      <View style={filterRowStyle as object}>
        <IconButton
          icon="chevron-left"
          size={20}
          style={{ margin: 0 }}
          onPress={() =>
            onChangeReferenceDate(shiftReferenceDate(referenceDate, filterMode, -1))
          }
          disabled={filterMode === "historico"}
          accessibilityLabel="Periodo anterior"
        />

        <Surface style={periodPillStyle as object} elevation={0}>
          <Text style={filterLabelStyle}>{getFilterLabel(filterMode, referenceDate)}</Text>
        </Surface>

        <IconButton
          icon="chevron-right"
          size={20}
          style={{ margin: 0 }}
          onPress={() =>
            onChangeReferenceDate(shiftReferenceDate(referenceDate, filterMode, 1))
          }
          disabled={filterMode === "historico"}
          accessibilityLabel="Periodo siguiente"
        />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <Button mode="text" onPress={() => onChangeReferenceDate(new Date())}>
          Volver a hoy
        </Button>
        <Button
          mode="text"
          textColor={theme.colors.primary}
          onPress={() => onChangeReferenceDate(new Date())}
        >
          Ir al periodo actual
        </Button>
      </View>

      <Text style={amountStyle}>{formatCurrency(total)}</Text>
      <Text style={bodyStyle}>
        {selectedCategoryName
          ? `Total de ${selectedCategoryName} en el periodo seleccionado.`
          : "Resumen general de todos los gastos del periodo seleccionado."}
      </Text>
    </Surface>
  );
}

export default React.memo(FilterSummaryCard);
