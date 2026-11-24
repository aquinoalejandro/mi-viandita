import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Button, Surface, Text, useTheme } from "react-native-paper";
import { format } from "date-fns";
import { Wallet } from "lucide-react-native";

import type { ExpenseCategory, ExpenseRecord } from "../../../types/types";
import { formatCurrency, iconMap } from "../misGastosShared";

type CategorySlice = {
  key: string;
  label: string;
  total: number;
  category: ExpenseCategory;
  expenses: ExpenseRecord[];
};

type Props = {
  categories: ExpenseCategory[];
  expenses: ExpenseRecord[];
  onOpenCategoryExpenses?: (categoriaId: string | null) => void;
};

const wheelColors = [
  "#1f4d45",
  "#2563eb",
  "#7c3aed",
  "#0891b2",
  "#c0392b",
  "#f4b740",
  "#49776f",
  "#9a3412",
  "#166534",
  "#475569",
  "#be185d",
  "#4f46e5",
];

const polarToCartesian = (cx: number, cy: number, radius: number, angle: number) => {
  const radians = ((angle - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
};

const describeSlice = (
  cx: number,
  cy: number,
  radius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
) => {
  const outerStart = polarToCartesian(cx, cy, radius, endAngle);
  const outerEnd = polarToCartesian(cx, cy, radius, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    outerStart.x,
    outerStart.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    outerEnd.x,
    outerEnd.y,
    "L",
    innerStart.x,
    innerStart.y,
    "A",
    innerRadius,
    innerRadius,
    0,
    largeArcFlag,
    1,
    innerEnd.x,
    innerEnd.y,
    "Z",
  ].join(" ");
};

function ExpenseWheelCard({ categories, expenses, onOpenCategoryExpenses }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const slices = useMemo(() => {
    const map = new Map<string, CategorySlice>();

    categories.forEach((category) => {
      map.set(category.id, {
        key: category.id,
        label: category.nombre,
        total: 0,
        category,
        expenses: [],
      });
    });

    const uncategorized: CategorySlice = {
      key: "__uncategorized__",
      label: "Sin categoría",
      total: 0,
      category: {
        id: "__uncategorized__",
        nombre: "Sin categoría",
        creadoEn: "",
      },
      expenses: [],
    };

    expenses.forEach((expense) => {
      const current = map.get(expense.categoriaId) ?? uncategorized;
      current.total += expense.monto;
      current.expenses.push(expense);
    });

    const list = Array.from(map.values());
    if (uncategorized.total > 0) {
      list.push(uncategorized);
    }

    return list
      .filter((slice) => slice.total > 0)
      .map((slice) => ({
        ...slice,
        expenses: slice.expenses.sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        ),
      }))
      .sort((a, b) => b.total - a.total);
  }, [categories, expenses]);

  useEffect(() => {
    setSelectedIndex(null);
  }, [slices]);

  const total = useMemo(() => slices.reduce((acc, slice) => acc + slice.total, 0), [slices]);
  const selectedSlice = selectedIndex === null ? null : slices[selectedIndex] ?? null;

  const size = Math.min(Math.max(width - 64, 220), 280);
  const radius = size / 2;
  const innerRadius = radius * 0.65;
  const outerStrokeR = radius - 4;
  const innerStrokeR = innerRadius + 4;
  const ringStrokeWidth = outerStrokeR - innerStrokeR;
  const ringMidR = innerStrokeR + ringStrokeWidth / 2;
  const totalForWheel = total > 0 ? total : 1;
  const selectedExpenses = selectedSlice?.expenses ?? [];
  const selectedCategory = selectedSlice?.category;

  const renderIcon = (iconName?: string, color = "#ffffff") => {
    const IconComponent = iconName ? iconMap[iconName] ?? Wallet : Wallet;
    return <IconComponent color={color} size={16} strokeWidth={2.2} />;
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
      elevation={1}
    >
      <View style={styles.header}>
        <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
          Distribución por Categoría
        </Text>
        <Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>
          Tocá una porción o categoría para inspeccionar su porcentaje y gastos.
        </Text>
      </View>

      {total === 0 ? (
        <View style={styles.emptyContainer}>
          <Wallet size={40} color={theme.colors.onSurfaceVariant} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
            Sin gastos en este período
          </Text>
          <Text style={[styles.emptyDesc, { color: theme.colors.onSurfaceVariant }]}>
            No hay registros para graficar en este rango de fechas.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.chartWrapper}>
            <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
              <Svg width={size} height={size}>
                <Circle cx={radius} cy={radius} r={innerRadius} fill={theme.colors.surface} />
                {slices.length === 1 ? (
                  <Circle
                    cx={radius}
                    cy={radius}
                    r={ringMidR}
                    fill="none"
                    stroke={slices[0].category.color ?? wheelColors[0]}
                    strokeWidth={ringStrokeWidth}
                    onPress={() => setSelectedIndex((prev) => (prev === 0 ? null : 0))}
                  />
                ) : (
                  slices.map((slice, index) => {
                    const startAngle = slices
                      .slice(0, index)
                      .reduce((acc, item) => acc + (item.total / totalForWheel) * 360, 0);
                    const sweep = (slice.total / totalForWheel) * 360;
                    const adjustedSweep = Math.max(sweep - 1.2, 0.35);
                    const d = describeSlice(
                      radius,
                      radius,
                      outerStrokeR,
                      innerStrokeR,
                      startAngle,
                      startAngle + adjustedSweep
                    );
                    const active = selectedIndex === null || index === selectedIndex;
                    const baseColor = slice.category.color ?? wheelColors[index % wheelColors.length];

                    return (
                      <Path
                        key={slice.key}
                        d={d}
                        fill={baseColor}
                        opacity={active ? 1 : 0.38}
                        onPress={() =>
                          setSelectedIndex((prev) => (prev === index ? null : index))
                        }
                      />
                    );
                  })
                )}
              </Svg>

              <View pointerEvents="none" style={[styles.centerHole, { width: innerRadius * 1.8 }]}>
                <Text style={[styles.centerLabel, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
                  {selectedCategory?.nombre ?? "Total"}
                </Text>
                <Text style={[styles.centerAmount, { color: theme.colors.onSurface }]}>
                  {formatCurrency(selectedSlice?.total ?? total)}
                </Text>
                <Text style={[styles.centerSub, { color: theme.colors.onSurfaceVariant }]}>
                  {selectedSlice
                    ? `${Math.round((selectedSlice.total / totalForWheel) * 100)}% del total`
                    : `${slices.length} ${slices.length === 1 ? "categoría" : "categorías"}`}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.breakdownSection}>
            <Text style={[styles.sectionHeading, { color: theme.colors.onSurface }]}>
              Desglose de rubros
            </Text>

            <View style={styles.categoryList}>
              {slices.map((slice, index) => {
                const isSelected = selectedIndex === index;
                const percent = Math.round((slice.total / totalForWheel) * 100);
                const color = slice.category.color ?? wheelColors[index % wheelColors.length];

                return (
                  <Pressable
                    key={slice.key}
                    onPress={() => setSelectedIndex((prev) => (prev === index ? null : index))}
                    style={[
                      styles.categoryRowCard,
                      {
                        backgroundColor: theme.colors.surfaceVariant,
                        borderColor: isSelected ? color : theme.colors.outline,
                      },
                      isSelected && { backgroundColor: `${color}0D` },
                    ]}
                  >
                    <View style={styles.categoryRowTop}>
                      <View style={styles.categoryLeft}>
                        <View style={[styles.categoryIconWrap, { backgroundColor: color }]}>
                          {renderIcon(slice.category.icono, "#ffffff")}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.categoryName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                            {slice.category.nombre}
                          </Text>
                          <Text style={[styles.categoryCount, { color: theme.colors.onSurfaceVariant }]}>
                            {slice.expenses.length} {slice.expenses.length === 1 ? "gasto" : "gastos"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.categoryRight}>
                        <Text style={[styles.categoryAmount, { color: theme.colors.onSurface }]}>
                          {formatCurrency(slice.total)}
                        </Text>
                        <View style={[styles.percentBadge, { backgroundColor: `${color}20` }]}>
                          <Text style={[styles.percentText, { color }]}>{percent}%</Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.progressBarTrack, { backgroundColor: theme.colors.outline }]}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.max(percent, 2)}%`,
                            backgroundColor: color,
                          },
                        ]}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {selectedSlice && (
            <View
              style={[
                styles.selectedDetailSection,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outline,
                },
              ]}
            >
              <View style={styles.selectedDetailHeader}>
                <Text style={[styles.selectedDetailTitle, { color: theme.colors.onSurface }]}>
                  Últimos gastos de {selectedCategory?.nombre}
                </Text>
                <View style={styles.detailHeaderActions}>
                  {onOpenCategoryExpenses && selectedSlice.key !== "__uncategorized__" ? (
                    <Button
                      mode="text"
                      compact
                      onPress={() => onOpenCategoryExpenses(selectedSlice.key)}
                      textColor={theme.colors.primary}
                    >
                      Ver en Gastos
                    </Button>
                  ) : null}
                  <Button
                    mode="text"
                    compact
                    onPress={() => setSelectedIndex(null)}
                    textColor={theme.colors.onSurfaceVariant}
                  >
                    Todos
                  </Button>
                </View>
              </View>

              {selectedExpenses.slice(0, 5).map((expense) => {
                const parsedDate = new Date(expense.fecha);
                const dateLabel = Number.isNaN(parsedDate.getTime())
                  ? "Fecha inválida"
                  : format(parsedDate, "dd/MM/yyyy HH:mm");

                return (
                  <View
                    key={expense.id}
                    style={[
                      styles.expenseItem,
                      { borderBottomColor: theme.colors.outlineVariant },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.expenseRef, { color: theme.colors.onSurface }]}>
                        {expense.referencia || "Sin referencia"}
                      </Text>
                      <Text style={[styles.expenseDate, { color: theme.colors.onSurfaceVariant }]}>
                        {dateLabel}
                      </Text>
                    </View>
                    <Text style={[styles.expenseAmount, { color: theme.colors.onSurface }]}>
                      {formatCurrency(expense.monto)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  header: {
    gap: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: "center",
  },
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  centerHole: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  centerLabel: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
  },
  centerAmount: {
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  centerSub: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  breakdownSection: {
    gap: 10,
    marginTop: 6,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
  },
  categoryList: {
    gap: 8,
  },
  categoryRowCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  categoryRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  categoryLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "700",
  },
  categoryCount: {
    fontSize: 11,
  },
  categoryRight: {
    alignItems: "flex-end",
    gap: 3,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  percentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  percentText: {
    fontSize: 10,
    fontWeight: "800",
  },
  progressBarTrack: {
    height: 6,
    width: "100%",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  selectedDetailSection: {
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  selectedDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 4,
  },
  detailHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedDetailTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  expenseItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  expenseRef: {
    fontSize: 13,
    fontWeight: "600",
  },
  expenseDate: {
    fontSize: 11,
  },
  expenseAmount: {
    fontSize: 13,
    fontWeight: "700",
  },
});

export default React.memo(ExpenseWheelCard);
