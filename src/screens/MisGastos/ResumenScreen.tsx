import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { FAB, Snackbar, Surface, Text, useTheme } from "react-native-paper";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  BarChart3,
  Calendar,
  ChevronRight,
  PieChart,
  TrendingUp,
} from "lucide-react-native";

import { useStore } from "../../store/zustand";
import type {
  ExpenseCategory,
  ExpenseRecord,
  MisGastosStackParamList,
} from "../../types/types";
import {
  CONTENT_MAX_WIDTH,
  getFabBottomOffset,
  getFontSize,
  getSpacing,
} from "../../theme/layout";
import CategoryDialog from "./components/CategoryDialog";
import ExpenseDialog from "./components/ExpenseDialog";
import ExpenseWheelCard from "./components/ExpenseWheelCard";
import FilterSummaryCard from "./components/FilterSummaryCard";
import {
  buildId,
  formatCurrency,
  formatMonthYearLabel,
  getInitialCategoryForm,
  getInitialExpenseForm,
  isExpenseInFilter,
  parseAmountInput,
  parseExpenseDate,
  type CategoryFormState,
  type ExpenseFormState,
  type FilterMode,
} from "./misGastosShared";

type PeriodTotal = {
  key: string;
  label: string;
  total: number;
  date: Date;
};

type NavigationProp = NativeStackNavigationProp<MisGastosStackParamList, "Resumen">;

export default function ResumenScreen() {
  const navigation = useNavigation<NavigationProp>();
  const setMisGastosUbi = useStore((state) => state.setMisGastosUbi);
  const categories = useStore((state) => state.misGastosCategories);
  const expenses = useStore((state) => state.misGastosExpenses);
  const saveMisGastosCategory = useStore((state) => state.saveMisGastosCategory);
  const saveMisGastosExpense = useStore((state) => state.saveMisGastosExpense);

  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const fabBottomOffset = getFabBottomOffset();
  const titleSize = getFontSize(width, 24);
  const bodySize = getFontSize(width, 15);

  const [filterMode, setFilterMode] = useState<FilterMode>("mes");
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);
  const [expenseDialogVisible, setExpenseDialogVisible] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(getInitialCategoryForm());
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(getInitialExpenseForm());
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");

  useFocusEffect(
    useCallback(() => {
      setMisGastosUbi("Resumen");
    }, [setMisGastosUbi])
  );

  const showMessage = (message: string) => {
    setSnackbarMsg(message);
    setSnackbarVisible(true);
  };

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
      const key = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
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

  const topMonth = monthlyTotals[0] ?? null;
  const topYear = yearlyTotals[0] ?? null;
  const maxMonthSpend = topMonth ? topMonth.total : 1;
  const maxYearSpend = topYear ? topYear.total : 1;

  const openMonthDetail = (date: Date) => {
    setFilterMode("mes");
    setReferenceDate(date);
  };

  const openYearDetail = (date: Date) => {
    setFilterMode("anio");
    setReferenceDate(date);
  };

  const handleSaveCategory = async () => {
    const nombre = categoryForm.nombre.trim();
    if (!nombre) return;

    const nowIso = new Date().toISOString();
    const newCategory: ExpenseCategory = {
      id: categoryForm.id || buildId(),
      nombre,
      icono: categoryForm.icono,
      color: categoryForm.color,
      creadoEn: nowIso,
    };

    await saveMisGastosCategory(newCategory);
    setCategoryDialogVisible(false);
    setExpenseForm(getInitialExpenseForm(newCategory.id));
    setExpenseDialogVisible(true);
    showMessage("Categoría creada. Ahora cargá tu gasto.");
  };

  const handleSaveExpense = async () => {
    const monto = parseAmountInput(expenseForm.monto);
    const expenseDate = parseExpenseDate(expenseForm.fecha, expenseForm.hora);
    if (monto === null || !expenseForm.categoriaId || !expenseDate) return;

    const nowIso = new Date().toISOString();
    const newExpense: ExpenseRecord = {
      id: expenseForm.id || buildId(),
      categoriaId: expenseForm.categoriaId,
      monto,
      fecha: expenseDate.toISOString(),
      referencia: expenseForm.referencia.trim() || undefined,
      creadoEn: nowIso,
      actualizadoEn: nowIso,
    };

    await saveMisGastosExpense(newExpense);
    setExpenseDialogVisible(false);
    const insideFilter = isExpenseInFilter(expenseDate, filterMode, referenceDate);
    showMessage(
      insideFilter
        ? "Gasto guardado."
        : "Gasto guardado (corresponde a otro período de filtro)."
    );
  };

  const onFabPress = () => {
    if (categories.length === 0) {
      showMessage("Creá primero una categoría para registrar gastos.");
      setCategoryForm(getInitialCategoryForm());
      setCategoryDialogVisible(true);
      return;
    }
    setExpenseForm(getInitialExpenseForm(categories[0].id));
    setExpenseDialogVisible(true);
  };

  const renderTrendRows = (
    items: PeriodTotal[],
    maxSpend: number,
    onPressItem: (item: PeriodTotal) => void
  ) =>
    items
      .filter((item) => item.total > 0)
      .map((item, index) => {
        const percent = Math.min(100, Math.round((item.total / maxSpend) * 100));
        const isTop = index === 0;

        return (
          <Pressable
            key={item.key}
            style={({ pressed }) => [
              styles.trendCard,
              {
                backgroundColor: theme.colors.surfaceVariant,
                borderColor: isTop ? `${theme.colors.primary}60` : theme.colors.outline,
              },
              pressed ? { opacity: 0.8, transform: [{ scale: 0.99 }] } : null,
            ]}
            onPress={() => onPressItem(item)}
          >
            <View style={styles.trendRowTop}>
              <View style={styles.trendLabelGroup}>
                <View
                  style={[
                    styles.rankBadge,
                    {
                      backgroundColor: isTop
                        ? theme.colors.primary
                        : `${theme.colors.onSurfaceVariant}20`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.rankBadgeText,
                      {
                        color: isTop
                          ? theme.colors.onPrimary
                          : theme.colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    #{index + 1}
                  </Text>
                </View>
                <Text style={[styles.trendLabel, { color: theme.colors.onSurface }]}>
                  {item.label}
                </Text>
              </View>

              <View style={styles.trendAmountGroup}>
                <Text style={[styles.trendAmount, { color: theme.colors.onSurface }]}>
                  {formatCurrency(item.total)}
                </Text>
                <ChevronRight
                  size={16}
                  color={theme.colors.onSurfaceVariant}
                  strokeWidth={2}
                />
              </View>
            </View>

            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${percent}%`,
                    backgroundColor: isTop ? theme.colors.primary : `${theme.colors.primary}80`,
                  },
                ]}
              />
            </View>

            <View style={styles.trendMetaRow}>
              <Text style={[styles.trendHint, { color: theme.colors.onSurfaceVariant }]}>
                {isTop ? "Período de mayor gasto" : `${percent}% relativo al pico`}
              </Text>
              <Text style={[styles.trendTouchHint, { color: theme.colors.primary }]}>
                Ver detalle
              </Text>
            </View>
          </Pressable>
        );
      });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { padding: spacing }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderTop}>
              <View
                style={[
                  styles.titleIconBadge,
                  { backgroundColor: `${theme.colors.primary}18` },
                ]}
              >
                <PieChart color={theme.colors.primary} size={22} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: theme.colors.onSurface, fontSize: titleSize }]}>
                  Resumen de Gastos
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { color: theme.colors.onSurfaceVariant, fontSize: bodySize },
                  ]}
                >
                  Análisis global, rueda de distribución y tendencias
                </Text>
              </View>
            </View>
          </View>

          <FilterSummaryCard
            filterMode={filterMode}
            referenceDate={referenceDate}
            total={totalFiltered}
            expenseCount={filteredExpenses.length}
            onChangeFilter={setFilterMode}
            onChangeReferenceDate={setReferenceDate}
          />

          <ExpenseWheelCard
            categories={categories}
            expenses={filteredExpenses}
            onOpenCategoryExpenses={(categoriaId) =>
              navigation.navigate("Gastos", {
                categoriaId: categoriaId ?? null,
                filterMode,
                referenceDateIso: referenceDate.toISOString(),
              })
            }
          />

          {monthlyTotals.length > 0 ? (
            <Surface
              style={[
                styles.sectionCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
              elevation={0}
            >
              <View style={styles.sectionHeaderRow}>
                <View
                  style={[
                    styles.sectionIconBadge,
                    { backgroundColor: `${theme.colors.primary}15` },
                  ]}
                >
                  <Calendar size={18} color={theme.colors.primary} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Gastos por mes
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                    {filterMode === "anio"
                      ? "Meses del año ordenados de mayor a menor gasto"
                      : "Meses del historial ordenados de mayor a menor gasto"}
                  </Text>
                </View>
              </View>

              {topMonth ? (
                <View
                  style={[
                    styles.heroPillBox,
                    {
                      backgroundColor: `${theme.colors.primary}12`,
                      borderColor: `${theme.colors.primary}30`,
                    },
                  ]}
                >
                  <TrendingUp size={18} color={theme.colors.primary} strokeWidth={2.4} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.heroPillLabel, { color: theme.colors.primary }]}>
                      Pico de gasto: {topMonth.label}
                    </Text>
                    <Text style={[styles.heroPillValue, { color: theme.colors.onSurface }]}>
                      {formatCurrency(topMonth.total)}
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.trendList}>
                {renderTrendRows(monthlyTotals, maxMonthSpend, (item) =>
                  openMonthDetail(item.date)
                )}
              </View>
            </Surface>
          ) : null}

          {filterMode === "historico" && yearlyTotals.length > 0 ? (
            <Surface
              style={[
                styles.sectionCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
              elevation={0}
            >
              <View style={styles.sectionHeaderRow}>
                <View
                  style={[
                    styles.sectionIconBadge,
                    { backgroundColor: `${theme.colors.secondary}15` },
                  ]}
                >
                  <BarChart3 size={18} color={theme.colors.secondary} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Gastos por año
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                    Histórico consolidado anual de mayor a menor
                  </Text>
                </View>
              </View>

              {topYear ? (
                <View
                  style={[
                    styles.heroPillBox,
                    {
                      backgroundColor: `${theme.colors.secondary}12`,
                      borderColor: `${theme.colors.secondary}30`,
                    },
                  ]}
                >
                  <TrendingUp size={18} color={theme.colors.secondary} strokeWidth={2.4} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.heroPillLabel, { color: theme.colors.secondary }]}>
                      Año con más gastos: {topYear.label}
                    </Text>
                    <Text style={[styles.heroPillValue, { color: theme.colors.onSurface }]}>
                      {formatCurrency(topYear.total)}
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.trendList}>
                {renderTrendRows(yearlyTotals, maxYearSpend, (item) => openYearDetail(item.date))}
              </View>
            </Surface>
          ) : null}
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        label="Nuevo gasto"
        color={theme.colors.onPrimary}
        style={[
          styles.fab,
          {
            bottom: fabBottomOffset,
            right: spacing,
            backgroundColor: theme.colors.primary,
          },
        ]}
        onPress={onFabPress}
      />

      <CategoryDialog
        visible={categoryDialogVisible}
        form={categoryForm}
        existingCategories={categories}
        onDismiss={() => setCategoryDialogVisible(false)}
        onChange={setCategoryForm}
        onSave={handleSaveCategory}
      />

      <ExpenseDialog
        visible={expenseDialogVisible}
        categories={categories}
        form={expenseForm}
        onDismiss={() => setExpenseDialogVisible(false)}
        onChange={setExpenseForm}
        onSave={handleSaveExpense}
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2800}
      >
        {snackbarMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 150,
  },
  content: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    gap: 14,
  },
  pageHeader: {
    gap: 4,
    marginBottom: 4,
  },
  pageHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  titleIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontWeight: "500",
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  heroPillBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  heroPillLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroPillValue: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: -0.3,
  },
  trendList: {
    gap: 10,
  },
  trendCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  trendRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  trendLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rankBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  trendLabel: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  trendAmountGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trendAmount: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  trendMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trendHint: {
    fontSize: 11,
    fontWeight: "500",
  },
  trendTouchHint: {
    fontSize: 11,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    borderRadius: 18,
  },
});
