import React from "react";
import { StyleSheet, View } from "react-native";
import { format, isSameYear } from "date-fns";
import { es } from "date-fns/locale";
import {
  Clock,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  Wallet,
} from "lucide-react-native";
import { Button, Divider, IconButton, Surface, Text, useTheme } from "react-native-paper";

import type { ExpenseCategory, ExpenseRecord } from "../../../types/types";
import { palette } from "../../../theme/appTheme";
import { formatCurrency, iconMap } from "../misGastosShared";

type Props = {
  selectedCategoryName?: string;
  selectedCategoryId?: string | null;
  categories?: ExpenseCategory[];
  expenses: ExpenseRecord[];
  hasSearchFilter?: boolean;
  onAdd: () => void;
  onEdit: (expense: ExpenseRecord) => void;
  onDelete: (id: string) => void;
};

function ExpensesPanel({
  selectedCategoryName,
  selectedCategoryId,
  categories = [],
  expenses,
  hasSearchFilter = false,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  const theme = useTheme();
  const currentYear = new Date();

  const categoryMap = React.useMemo(() => {
    const map = new Map<string, ExpenseCategory>();
    categories.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [categories]);

  const renderCategoryIcon = (category?: ExpenseCategory) => {
    const IconComponent = category?.icono ? iconMap[category.icono] ?? Wallet : Wallet;
    const iconColor = category?.color ?? theme.colors.primary;
    return <IconComponent color={iconColor} size={20} strokeWidth={2.2} />;
  };

  return (
    <Surface
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}
      elevation={0}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.headerIconBadge,
              { backgroundColor: `${theme.colors.primary}18` },
            ]}
          >
            <Receipt color={theme.colors.primary} size={20} strokeWidth={2.2} />
          </View>
          <View style={styles.headerTitles}>
            <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {selectedCategoryId || selectedCategoryName
                ? `Gastos: ${selectedCategoryName ?? "Categoría"}`
                : "Todos los gastos"}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              {expenses.length === 1
                ? "1 registro encontrado"
                : `${expenses.length} registros encontrados`}
            </Text>
          </View>
        </View>

        <Button
          mode="contained"
          icon={({ size, color }) => <Plus size={size} color={color} />}
          onPress={onAdd}
          style={styles.addButton}
          labelStyle={styles.addButtonLabel}
          compact
        >
          Nuevo
        </Button>
      </View>

      <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

      {expenses.length === 0 ? (
        <View
          style={[
            styles.emptyState,
            {
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.surfaceVariant,
            },
          ]}
        >
          <View
            style={[
              styles.emptyIconBadge,
              { backgroundColor: `${theme.colors.primary}15` },
            ]}
          >
            <Receipt color={theme.colors.primary} size={32} strokeWidth={1.8} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
            No hay gastos registrados
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
            {hasSearchFilter
              ? "No hay gastos que coincidan con tu búsqueda en este período."
              : selectedCategoryId || selectedCategoryName
              ? "No se encontraron gastos en este período para la categoría seleccionada."
              : "No se encontraron gastos con el período de filtro actual."}
          </Text>
          <Button
            mode="contained-tonal"
            icon={({ size, color }) => <Plus size={size} color={color} />}
            onPress={onAdd}
            style={styles.emptyAddButton}
          >
            Cargar un gasto
          </Button>
        </View>
      ) : (
        <View style={styles.list}>
          {expenses.map((expense) => {
            const category = categoryMap.get(expense.categoriaId);
            const expenseDate = new Date(expense.fecha);
            const isValidDate = !Number.isNaN(expenseDate.getTime());
            const dateStr = isValidDate
              ? format(
                  expenseDate,
                  isSameYear(expenseDate, currentYear) ? "d 'de' MMMM" : "d 'de' MMM yyyy",
                  { locale: es }
                )
              : "Fecha sin definir";
            const timeStr = isValidDate ? format(expenseDate, "HH:mm") : "--:--";
            const catColor = category?.color ?? theme.colors.primary;
            const label = expense.referencia || category?.nombre || "Gasto sin concepto";

            return (
              <View
                key={expense.id}
                style={[
                  styles.expenseItem,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <View
                  style={[
                    styles.categoryIconBadge,
                    {
                      backgroundColor: `${catColor}20`,
                      borderColor: `${catColor}40`,
                    },
                  ]}
                >
                  {renderCategoryIcon(category)}
                </View>

                <View style={styles.expenseMain}>
                  <View style={styles.expenseTopRow}>
                    <Text
                      style={[styles.expenseTitle, { color: theme.colors.onSurface }]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                    <Text style={[styles.expenseAmount, { color: palette.danger }]}>
                      -{formatCurrency(expense.monto)}
                    </Text>
                  </View>

                  <View style={styles.expenseMetaRow}>
                    <View style={styles.metaBadge}>
                      <View
                        style={[
                          styles.categoryPill,
                          {
                            backgroundColor: `${catColor}15`,
                            borderColor: `${catColor}30`,
                          },
                        ]}
                      >
                        <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                        <Text
                          style={[styles.categoryPillText, { color: catColor }]}
                          numberOfLines={1}
                        >
                          {category?.nombre ?? "Sin categoría"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.dateTimeBadge}>
                      <Clock size={12} color={theme.colors.onSurfaceVariant} strokeWidth={2} />
                      <Text style={[styles.dateTimeText, { color: theme.colors.onSurfaceVariant }]}>
                        {dateStr} • {timeStr}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  <IconButton
                    icon={() => (
                      <Pencil size={18} color={theme.colors.onSurfaceVariant} strokeWidth={2.2} />
                    )}
                    size={20}
                    onPress={() => onEdit(expense)}
                    style={styles.actionIconBtn}
                    accessibilityLabel={`Editar gasto ${label}`}
                  />
                  <IconButton
                    icon={() => (
                      <Trash2 size={18} color={theme.colors.error} strokeWidth={2.2} />
                    )}
                    size={20}
                    onPress={() => onDelete(expense.id)}
                    style={styles.actionIconBtn}
                    accessibilityLabel={`Eliminar gasto ${label}`}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  addButton: {
    borderRadius: 14,
  },
  addButtonLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    opacity: 0.6,
  },
  list: {
    gap: 10,
  },
  expenseItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  categoryIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseMain: {
    flex: 1,
    gap: 6,
  },
  expenseTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  expenseTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  expenseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  dateTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateTimeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionIconBtn: {
    margin: 0,
    width: 34,
    height: 34,
  },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyAddButton: {
    marginTop: 8,
    borderRadius: 12,
  },
});

export default React.memo(ExpensesPanel);
