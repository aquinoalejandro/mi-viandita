import React from "react";
import { View } from "react-native";
import { format } from "date-fns";
import { Button, Divider, IconButton, Surface, Text, useTheme } from "react-native-paper";

import type { ExpenseRecord } from "../../../types/types";
import { formatCurrency } from "../misGastosShared";

type Props = {
  cardStyle: object;
  titleStyle: object;
  bodyStyle: object;
  emptyStateStyle: object;
  expenseRowStyle: object;
  expenseTopStyle: object;
  expenseTitleStyle: object;
  expenseMetaStyle: object;
  inlineRowStyle: object;
  selectedCategoryName?: string;
  expenses: ExpenseRecord[];
  onAdd: () => void;
  onEdit: (expense: ExpenseRecord) => void;
  onDelete: (id: string) => void;
};

function ExpensesPanel({
  cardStyle,
  titleStyle,
  bodyStyle,
  emptyStateStyle,
  expenseRowStyle,
  expenseTopStyle,
  expenseTitleStyle,
  expenseMetaStyle,
  inlineRowStyle,
  selectedCategoryName,
  expenses,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  const theme = useTheme();

  return (
    <Surface style={cardStyle} elevation={0}>
      <View style={inlineRowStyle as object}>
        <Text style={titleStyle}>{selectedCategoryName ? `Gastos de ${selectedCategoryName}` : "Gastos"}</Text>
        <Button mode="contained" onPress={onAdd}>
          Agregar gasto
        </Button>
      </View>
      <Text style={bodyStyle}>
        Cada gasto guarda fecha y hora, monto en ARS y una referencia opcional.
      </Text>
      <Divider />

      {!selectedCategoryName ? (
        <View style={emptyStateStyle as object}>
          <Text style={titleStyle}>Sin categoria seleccionada</Text>
          <Text style={bodyStyle}>Elige una categoria para ver, editar o eliminar sus gastos.</Text>
        </View>
      ) : expenses.length === 0 ? (
        <View style={emptyStateStyle as object}>
          <Text style={titleStyle}>No hay gastos para este filtro</Text>
          <Text style={bodyStyle}>
            Cambia el periodo o agrega un gasto nuevo dentro de esta categoria.
          </Text>
        </View>
      ) : (
        expenses.map((expense) => (
          <View key={expense.id} style={expenseRowStyle as object}>
            <View style={expenseTopStyle as object}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={expenseTitleStyle}>{formatCurrency(expense.monto)}</Text>
                <Text style={expenseMetaStyle}>
                  {format(new Date(expense.fecha), "dd/MM/yyyy HH:mm")}
                </Text>
                {expense.referencia ? <Text style={bodyStyle}>{expense.referencia}</Text> : null}
              </View>
              <View style={inlineRowStyle as object}>
                <IconButton icon="pencil-outline" onPress={() => onEdit(expense)} />
                <IconButton
                  icon="delete-outline"
                  iconColor={theme.colors.error}
                  onPress={() => onDelete(expense.id)}
                />
              </View>
            </View>
          </View>
        ))
      )}
    </Surface>
  );
}

export default React.memo(ExpensesPanel);
