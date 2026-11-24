import React from "react";
import { StyleSheet, View } from "react-native";
import { ArrowRight, FolderPlus, Pencil, Plus, Tag, Trash2, Wallet } from "lucide-react-native";
import { Button, Divider, IconButton, Surface, Text, useTheme } from "react-native-paper";

import type { ExpenseCategory } from "../../../types/types";
import { formatCurrency, iconMap } from "../misGastosShared";

type CategoryWithTotal = ExpenseCategory & {
  total: number;
  count?: number;
};

type Props = {
  categories: CategoryWithTotal[];
  onAdd: () => void;
  onSelect: (id: string) => void;
  onEdit: (category: ExpenseCategory) => void;
  onDelete: (id: string) => void;
};

function CategoriesPanel({
  categories,
  onAdd,
  onSelect,
  onEdit,
  onDelete,
}: Props) {
  const theme = useTheme();

  const renderIcon = (iconName?: string, color?: string) => {
    const IconComponent = iconName ? iconMap[iconName] ?? Wallet : Wallet;
    return <IconComponent color={color ?? theme.colors.primary} size={22} strokeWidth={2.2} />;
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
            <Tag color={theme.colors.primary} size={20} strokeWidth={2.2} />
          </View>
          <View style={styles.headerTitles}>
            <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
              Categorías
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              {categories.length === 1
                ? "1 categoría configurada"
                : `${categories.length} categorías configuradas`}
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
          Nueva
        </Button>
      </View>

      <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

      {categories.length === 0 ? (
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
            <FolderPlus color={theme.colors.primary} size={32} strokeWidth={1.8} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
            No tenés categorías aún
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
            Creá categorías (como Comida, Servicios o Ocio) para organizar tus gastos diarios.
          </Text>
          <Button
            mode="contained-tonal"
            icon={({ size, color }) => <Plus size={size} color={color} />}
            onPress={onAdd}
            style={styles.emptyAddButton}
          >
            Crear primera categoría
          </Button>
        </View>
      ) : (
        <View style={styles.categoryList}>
          {categories.map((category) => {
            const catColor = category.color ?? theme.colors.primary;

            return (
              <Surface
                key={category.id}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.outline,
                  },
                ]}
                elevation={0}
              >
                <View style={styles.categoryTop}>
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: `${catColor}20`,
                        borderColor: `${catColor}40`,
                      },
                    ]}
                  >
                    {renderIcon(category.icono, catColor)}
                  </View>

                  <View style={styles.categoryInfo}>
                    <Text
                      style={[styles.categoryName, { color: theme.colors.onSurface }]}
                      numberOfLines={1}
                    >
                      {category.nombre}
                    </Text>

                    <Text style={[styles.categoryMeta, { color: theme.colors.onSurfaceVariant }]}>
                      {category.count !== undefined
                        ? category.count === 1
                          ? "1 gasto registrado"
                          : `${category.count} gastos registrados`
                        : "Detalle de gastos"}
                    </Text>
                  </View>

                  <View style={styles.categoryAmountCol}>
                    <Text style={[styles.categoryTotal, { color: catColor }]}>
                      {formatCurrency(category.total)}
                    </Text>
                    <Text style={[styles.categoryTotalLabel, { color: theme.colors.onSurfaceVariant }]}>
                      Acumulado
                    </Text>
                  </View>
                </View>

                <View style={styles.categoryBottomActions}>
                  <Button
                    mode="outlined"
                    onPress={() => onSelect(category.id)}
                    style={[styles.selectBtn, { borderColor: theme.colors.outline }]}
                    labelStyle={styles.selectBtnLabel}
                    icon={({ size, color }) => <ArrowRight size={size} color={color} />}
                    contentStyle={{ flexDirection: "row-reverse" }}
                    compact
                  >
                    Ver gastos
                  </Button>

                  <View style={styles.iconActions}>
                    <IconButton
                      icon={() => (
                        <Pencil size={18} color={theme.colors.onSurfaceVariant} strokeWidth={2.2} />
                      )}
                      size={20}
                      onPress={() => onEdit(category)}
                      style={styles.actionIcon}
                      accessibilityLabel={`Editar categoría ${category.nombre}`}
                    />
                    <IconButton
                      icon={() => (
                        <Trash2 size={18} color={theme.colors.error} strokeWidth={2.2} />
                      )}
                      size={20}
                      onPress={() => onDelete(category.id)}
                      style={styles.actionIcon}
                      accessibilityLabel={`Eliminar categoría ${category.nombre}`}
                    />
                  </View>
                </View>
              </Surface>
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
  categoryList: {
    gap: 12,
  },
  categoryCard: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  categoryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryInfo: {
    flex: 1,
    gap: 2,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  categoryMeta: {
    fontSize: 12,
    fontWeight: "500",
  },
  categoryAmountCol: {
    alignItems: "flex-end",
  },
  categoryTotal: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  categoryTotalLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  categoryBottomActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  selectBtn: {
    borderRadius: 12,
  },
  selectBtnLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  iconActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionIcon: {
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

export default React.memo(CategoriesPanel);
