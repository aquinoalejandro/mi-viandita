import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";

import { useStore } from "../../store/zustand";
import { ExpenseCategory, ExpenseRecord } from "../../types/types";
import { CONTENT_MAX_WIDTH, getFontSize, getLineHeight, getSpacing } from "../../theme/layout";
import ExpenseWheelCard from "./components/ExpenseWheelCard";
import FilterSummaryCard from "./components/FilterSummaryCard";
import {
  formatCurrency,
  formatMonthYearLabel,
  isExpenseInFilter,
  type FilterMode,
} from "./misGastosShared";

type PeriodTotal = {
  key: string;
  label: string;
  total: number;
  date: Date;
};

export default function ResumenScreen() {
  const setMisGastosUbi = useStore((state) => state.setMisGastosUbi);
  const categories = useStore((state) => state.misGastosCategories);
  const expenses = useStore((state) => state.misGastosExpenses);
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const titleSize = getFontSize(width, 24);
  const bodySize = getFontSize(width, 16);

  const [filterMode, setFilterMode] = useState<FilterMode>("mes");
  const [referenceDate, setReferenceDate] = useState(new Date());
  useFocusEffect(
    useCallback(() => {
      setMisGastosUbi("Resumen");
    }, [setMisGastosUbi])
  );

  const filteredExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => {
          const expenseDate = new Date(expense.fecha);
          return !Number.isNaN(expenseDate.getTime())
            ? isExpenseInFilter(expenseDate, filterMode, referenceDate)
            : false;
        })
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [expenses, filterMode, referenceDate]
  );

  const totalFiltered = useMemo(
    () => filteredExpenses.reduce((acc, expense) => acc + expense.monto, 0),
    [filteredExpenses]
  );

  const monthlyTotals = useMemo<PeriodTotal[]>(() => {
    if (filterMode !== "anio" && filterMode !== "historico") {
      return [];
    }

    const buckets = new Map<string, PeriodTotal>();

    filteredExpenses.forEach((expense) => {
      const expenseDate = new Date(expense.fecha);
      const key = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, "0")}`;
      const current = buckets.get(key);

      if (current) {
        current.total += expense.monto;
        return;
      }

      const date = new Date(expenseDate.getFullYear(), expenseDate.getMonth(), 1);
      buckets.set(key, {
        key,
        label: formatMonthYearLabel(date),
        total: expense.monto,
        date,
      });
    });

    return Array.from(buckets.values()).sort((a, b) => b.total - a.total);
  }, [filterMode, filteredExpenses]);

  const yearlyTotals = useMemo<PeriodTotal[]>(() => {
    if (filterMode !== "historico") {
      return [];
    }

    const map = new Map<number, number>();
    filteredExpenses.forEach((expense) => {
      const year = new Date(expense.fecha).getFullYear();
      map.set(year, (map.get(year) ?? 0) + expense.monto);
    });

    return Array.from(map.entries())
      .map(([year, total]) => ({
        key: String(year),
        label: String(year),
        total,
        date: new Date(year, 0, 1),
      }))
      .sort((a, b) => b.total - a.total);
  }, [filterMode, filteredExpenses]);

  const topMonth = useMemo(() => {
    if (monthlyTotals.length === 0) return null;
    return monthlyTotals.reduce((best, item) => (item.total > best.total ? item : best), monthlyTotals[0]);
  }, [monthlyTotals]);

  const topYear = useMemo(() => {
    if (yearlyTotals.length === 0) return null;
    return yearlyTotals.reduce((best, item) => (item.total > best.total ? item : best), yearlyTotals[0]);
  }, [yearlyTotals]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        scroll: {
          padding: spacing,
          paddingBottom: 140,
        },
        content: {
          width: "100%",
          maxWidth: CONTENT_MAX_WIDTH,
          alignSelf: "center",
          gap: 10,
        },
        title: {
          fontSize: titleSize,
          fontWeight: "700",
          color: theme.colors.onSurface,
        },
        subtitle: {
          marginTop: 6,
          fontSize: bodySize,
          lineHeight: getLineHeight(bodySize),
          color: theme.colors.onSurfaceVariant,
        },
        card: {
          borderRadius: 22,
          padding: spacing,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          gap: 12,
        },
        sectionTitle: {
          color: theme.colors.onSurface,
          fontSize: getFontSize(width, 20),
          fontWeight: "700",
        },
        body: {
          color: theme.colors.onSurfaceVariant,
          fontSize: bodySize,
          lineHeight: getLineHeight(bodySize),
        },
        chartNote: {
          color: theme.colors.onSurfaceVariant,
          fontSize: getFontSize(width, 13),
          lineHeight: getLineHeight(getFontSize(width, 13)),
        },
        trendSummary: {
          borderRadius: 18,
          padding: 14,
          backgroundColor: theme.colors.surfaceVariant,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          gap: 6,
        },
        trendSummaryLabel: {
          color: theme.colors.onSurfaceVariant,
          fontSize: getFontSize(width, 12),
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: 0.6,
        },
        trendSummaryValue: {
          color: theme.colors.onSurface,
          fontSize: getFontSize(width, 18),
          fontWeight: "800",
        },
        trendList: {
          gap: 10,
          marginTop: 4,
        },
        trendRow: {
          borderRadius: 16,
          padding: 12,
          backgroundColor: theme.colors.surfaceVariant,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          gap: 4,
        },
        trendRowTop: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        },
        trendRowLabel: {
          flex: 1,
          color: theme.colors.onSurface,
          fontSize: getFontSize(width, 15),
          fontWeight: "700",
        },
        trendRowAmount: {
          color: theme.colors.primary,
          fontSize: getFontSize(width, 15),
          fontWeight: "800",
        },
        trendRowHint: {
          color: theme.colors.onSurfaceVariant,
          fontSize: getFontSize(width, 12),
        },
        amountText: {
          color: theme.colors.primary,
          fontWeight: "800",
          fontSize: getFontSize(width, 18),
        },
        filterRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          backgroundColor: "transparent",
        },
        periodPill: {
          flex: 1,
          borderRadius: 18,
          paddingVertical: 10,
          paddingHorizontal: 12,
          backgroundColor: theme.colors.surfaceVariant,
          borderWidth: 1,
          borderColor: theme.colors.outline,
        },
        filterLabel: {
          flex: 1,
          textAlign: "center",
          color: theme.colors.onSurface,
          fontSize: getFontSize(width, 16),
          fontWeight: "700",
        },
        detailRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.outline,
        },
      }),
    [
      bodySize,
      spacing,
      theme.colors.background,
      theme.colors.onSurface,
      theme.colors.onSurfaceVariant,
      theme.colors.outline,
      theme.colors.surface,
      theme.colors.surfaceVariant,
      theme.colors.primary,
      titleSize,
      width,
    ]
  );

  const openMonthDetail = (date: Date) => {
    setFilterMode("mes");
    setReferenceDate(date);
  };

  const openYearDetail = (date: Date) => {
    setFilterMode("anio");
    setReferenceDate(date);
  };

  const renderRows = (
    items: PeriodTotal[],
    onPressItem: (item: PeriodTotal) => void,
    hint: string
  ) =>
    items
      .filter((item) => item.total > 0)
      .map((item, index) => {
        const isTop = index === 0;
        return (
          <Pressable
            key={item.key}
            style={({ pressed }) => [
              styles.trendRow,
              pressed ? { opacity: 0.82, transform: [{ scale: 0.99 }] } : null,
            ]}
            onPress={() => onPressItem(item)}
          >
            <View style={styles.trendRowTop}>
              <Text style={styles.trendRowLabel}>
                {isTop ? "Mas gasto: " : ""}
                {item.label}
              </Text>
              <Text style={styles.trendRowAmount}>{formatCurrency(item.total)}</Text>
            </View>
            <Text style={styles.trendRowHint}>
              {isTop ? hint : "Toca para ver el detalle de este periodo."}
            </Text>
          </Pressable>
        );
      });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Text style={styles.title}>Resumen de gastos</Text>
          <Text style={styles.subtitle}>
            Ve el total de gastos por periodo y categoria seleccionada.
          </Text>

          <FilterSummaryCard
            cardStyle={styles.card}
            titleStyle={styles.sectionTitle}
            bodyStyle={styles.body}
            amountStyle={styles.amountText}
            filterRowStyle={styles.filterRow}
            filterLabelStyle={styles.filterLabel}
            periodPillStyle={styles.periodPill}
            filterMode={filterMode}
            referenceDate={referenceDate}
            total={totalFiltered}
            onChangeFilter={(v) => setFilterMode(v as FilterMode)}
            onChangeReferenceDate={setReferenceDate}
          />

          {monthlyTotals.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Gastos por mes</Text>
              <Text style={styles.chartNote}>
                {filterMode === "anio"
                  ? "Lista de meses del ano seleccionado, ordenada de mayor a menor gasto."
                  : "Lista de meses del historial, ordenada de mayor a menor gasto."}
              </Text>
              {topMonth ? (
                <View style={styles.trendSummary}>
                  <Text style={styles.trendSummaryLabel}>Mes con mayor gasto</Text>
                  <Text style={styles.trendSummaryValue}>
                    {topMonth.label} - {formatCurrency(topMonth.total)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.trendList}>
                {renderRows(
                  monthlyTotals,
                  (item) => openMonthDetail(item.date),
                  "Este mes encabeza el filtro actual. Tocalo para ver el detalle."
                )}
              </View>
            </View>
          ) : null}

          {filterMode === "historico" && yearlyTotals.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Gastos por año</Text>
              <Text style={styles.chartNote}>
                Lista de años del historial, ordenada de mayor a menor gasto.
              </Text>
              {topYear ? (
                <View style={styles.trendSummary}>
                  <Text style={styles.trendSummaryLabel}>Ano con mayor gasto</Text>
                  <Text style={styles.trendSummaryValue}>
                    {topYear.label} - {formatCurrency(topYear.total)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.trendList}>
                {renderRows(
                  yearlyTotals,
                  (item) => openYearDetail(item.date),
                  "Este ano encabeza el historial. Tocalo para ver sus meses."
                )}
              </View>
            </View>
          ) : null}

          <ExpenseWheelCard
            cardStyle={styles.card}
            titleStyle={styles.sectionTitle}
            bodyStyle={styles.body}
            selectedLabelStyle={styles.sectionTitle}
            selectedAmountStyle={styles.amountText}
            detailRowStyle={styles.detailRow}
            categories={categories}
            expenses={filteredExpenses}
          />
        </View>
      </ScrollView>
    </View>
  );
}
