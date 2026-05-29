import React, { useEffect, useMemo, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Button, Surface, Text, useTheme } from "react-native-paper";
import { format } from "date-fns";

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
  cardStyle: object;
  titleStyle: object;
  bodyStyle: object;
  selectedLabelStyle: object;
  selectedAmountStyle: object;
  detailRowStyle: object;
  categories: ExpenseCategory[];
  expenses: ExpenseRecord[];
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

function ExpenseWheelCard({
  cardStyle,
  titleStyle,
  bodyStyle,
  selectedLabelStyle,
  selectedAmountStyle,
  detailRowStyle,
  categories,
  expenses,
}: Props) {
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

    expenses.forEach((expense) => {
      const current = map.get(expense.categoriaId);
      if (!current) return;
      current.total += expense.monto;
      current.expenses.push(expense);
    });

    return Array.from(map.values())
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
  const size = Math.min(Math.max(width - 72, 240), 340);
  const radius = size / 2;
  const innerRadius = radius * 0.62;
  const totalForWheel = total > 0 ? total : 1;
  const selectedExpenses = selectedSlice?.expenses ?? [];
  const selectedCategory = selectedSlice?.category;
  const showingDetail = selectedSlice !== null;

  return (
    <>
      <Surface style={cardStyle} elevation={0}>
        <Text style={titleStyle}>Resumen por categoria</Text>
        <Text style={bodyStyle}>
          Toca una porcion o una categoria para ver cuanto representa dentro del periodo.
        </Text>

        {total === 0 ? (
          <View style={{ paddingVertical: 24 }}>
            <Text style={selectedLabelStyle}>No hay gastos para mostrar</Text>
          </View>
        ) : (
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
              <Svg width={size} height={size}>
                <Circle cx={radius} cy={radius} r={innerRadius} fill={theme.colors.surface} />
                {slices.map((slice, index) => {
                  const startAngle = slices
                    .slice(0, index)
                    .reduce((acc, item) => acc + (item.total / totalForWheel) * 360, 0);
                  const sweep = (slice.total / totalForWheel) * 360;
                  const adjustedSweep = Math.max(sweep - 1.25, 0.35);
                  const d = describeSlice(
                    radius,
                    radius,
                    radius - 6,
                    innerRadius + 4,
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
                      opacity={active ? 1 : 0.72}
                      onPress={() => setSelectedIndex(index)}
                    />
                  );
                })}
              </Svg>

              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  width: innerRadius * 1.7,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <Text
                  style={[selectedLabelStyle, { textAlign: "center", alignSelf: "center", width: "100%" }]}
                  numberOfLines={2}
                >
                  {selectedCategory?.nombre ?? "Todas las categorias"}
                </Text>
                <Text style={[selectedAmountStyle, { textAlign: "center", alignSelf: "center", width: "100%" }]}>
                  {formatCurrency(selectedSlice?.total ?? total)}
                </Text>
                <Text
                  style={[bodyStyle, { textAlign: "center", alignSelf: "center", width: "100%" }]}
                  numberOfLines={1}
                >
                  {selectedSlice
                    ? `${selectedExpenses.length} gasto${selectedExpenses.length === 1 ? "" : "s"}`
                    : `${slices.length} categoria${slices.length === 1 ? "" : "s"}`}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ gap: 10, marginTop: 8 }}>
          <Text style={titleStyle}>{showingDetail ? "Detalle de la categoria" : "Resumen general"}</Text>

          {selectedSlice ? (
            <>
              <View style={detailRowStyle as object}>
                <Text style={selectedLabelStyle}>{selectedCategory?.nombre}</Text>
                <Text style={selectedAmountStyle}>{formatCurrency(selectedSlice.total)}</Text>
              </View>

              {selectedExpenses.slice(0, 4).map((expense) => (
                <View key={expense.id} style={detailRowStyle as object}>
                  <View style={{ flex: 1 }}>
                    <Text style={selectedLabelStyle}>{expense.referencia || "Sin referencia"}</Text>
                    <Text style={bodyStyle}>{format(new Date(expense.fecha), "dd/MM/yyyy HH:mm")}</Text>
                  </View>
                  <Text style={selectedAmountStyle}>{formatCurrency(expense.monto)}</Text>
                </View>
              ))}

              {selectedExpenses.length > 4 ? (
                <Text style={bodyStyle}>
                  Y {selectedExpenses.length - 4} gasto{selectedExpenses.length - 4 === 1 ? "" : "s"} mas.
                </Text>
              ) : null}

              <Button mode="outlined" onPress={() => setSelectedIndex(null)}>
                Ver todas las categorias
              </Button>
            </>
          ) : (
            <>
              {slices.slice(0, 4).map((slice, index) => {
                const IconComponent = slice.category.icono ? iconMap[slice.category.icono] : null;

                return (
                  <Button
                    key={slice.key}
                    mode="outlined"
                    onPress={() => setSelectedIndex(index)}
                    contentStyle={{ alignItems: "center" }}
                    style={{ borderRadius: 16 }}
                    icon={
                      IconComponent
                        ? () => (
                            <View
                              style={{
                                width: 24,
                                height: 24,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <IconComponent
                                color={slice.category.color ?? theme.colors.primary}
                                size={18}
                                strokeWidth={2.1}
                              />
                            </View>
                          )
                        : undefined
                    }
                  >
                    <View style={{ flex: 1, width: "100%", gap: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <Text style={[selectedLabelStyle, { flex: 1 }]}>{slice.label}</Text>
                        <View style={{ minHeight: 24, justifyContent: "center", alignItems: "flex-end" }}>
                          <Text style={[selectedAmountStyle, { textAlign: "right" }]}>
                            {formatCurrency(slice.total)}
                          </Text>
                        </View>
                      </View>
                      <Text style={bodyStyle}>
                        {slice.expenses.length} gasto{slice.expenses.length === 1 ? "" : "s"}
                      </Text>
                    </View>
                  </Button>
                );
              })}

              {slices.length > 4 ? (
                <Text style={bodyStyle}>
                  Y {slices.length - 4} categoria{slices.length - 4 === 1 ? "" : "s"} mas.
                </Text>
              ) : null}
            </>
          )}
        </View>
      </Surface>
    </>
  );
}

export default React.memo(ExpenseWheelCard);
