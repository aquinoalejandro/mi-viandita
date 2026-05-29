import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { FAB, Snackbar, Text, useTheme } from "react-native-paper";
import { BarChart } from "react-native-chart-kit";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, eachMonthOfInterval, startOfYear, endOfYear } from "date-fns";

import type { RootStackParamList, ExpenseCategory, ExpenseRecord } from "../../types/types";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../utils/storage";
import {
  CONTENT_MAX_WIDTH,
  getFabBottomOffset,
  getFontSize,
  getLineHeight,
  getSpacing,
} from "../../theme/layout";
import { useStore } from "../../store/zustand";
import Header from "../../components/MisGastos/Header";
import ScreenSelector from "../../components/MisGastos/ScreenSelector";
import FilterSummaryCard from "./components/FilterSummaryCard";
import CategoriesPanel from "./components/CategoriesPanel";
import ExpensesPanel from "./components/ExpensesPanel";
import RespaldoMisGastosScreen from "./RespaldoMisGastosScreen";
import CategoryDialog from "./components/CategoryDialog";
import ExpenseDialog from "./components/ExpenseDialog";
import ConfirmDeleteDialog from "./components/ConfirmDeleteDialog";
import {
  buildId,
  getInitialCategoryForm,
  getInitialExpenseForm,
  isExpenseInFilter,
  parseExpenseDate,
  formatCurrency,
  type CategoryFormState,
  type ExpenseFormState,
  type FilterMode,
} from "./misGastosShared";

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MisGastosHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { misGastosUbicacion, setMisGastosUbi } = useStore();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const fabBottomOffset = getFabBottomOffset();
  const titleSize = getFontSize(width, 28);
  const bodySize = getFontSize(width, 16);

  const [filterMode, setFilterMode] = useState<FilterMode>("mes");
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);
  const [expenseDialogVisible, setExpenseDialogVisible] = useState(false);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(getInitialCategoryForm());
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(getInitialExpenseForm());
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        scroll: {
          flex: 1,
          padding: spacing,
          paddingBottom: 120,
        },
        content: {
          width: "100%",
          maxWidth: CONTENT_MAX_WIDTH,
          alignSelf: "center",
          gap: spacing,
        },
        card: {
          borderRadius: 22,
          padding: spacing,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          gap: 12,
        },
        title: {
          color: theme.colors.onSurface,
          fontSize: titleSize,
          fontWeight: "800",
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
        filterLabel: {
          flex: 1,
          textAlign: "center",
          color: theme.colors.onSurface,
          fontSize: getFontSize(width, 16),
          fontWeight: "700",
        },
        row: {
          flexDirection: width >= 720 ? "row" : "column",
          gap: spacing,
        },
        column: {
          flex: 1,
        },
        emptyState: {
          borderRadius: 18,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: theme.colors.outline,
          padding: spacing,
          gap: 8,
        },
        inlineRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        },
        categoriesWrap: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
        },
        categoryCard: {
          width: width >= 720 ? "48.8%" : "100%",
          borderRadius: 18,
          padding: 14,
          borderWidth: 1,
          gap: 10,
        },
        expenseRow: {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          padding: 14,
          gap: 10,
        },
        colorDot: {
          width: 34,
          height: 34,
          borderRadius: 17,
          borderWidth: 2,
        },
      }),
    [
      bodySize,
      spacing,
      theme.colors.background,
      theme.colors.onSurface,
      theme.colors.onSurfaceVariant,
      theme.colors.outline,
      theme.colors.primary,
      theme.colors.surface,
      titleSize,
      width,
    ]
  );

  // ... rest of useEffect, memos, save/delete functions from original InicioMisGastosScreen.tsx (loadData, persist, saveCategory, deleteCategory, saveExpense, deleteExpense, showMessage)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [storedCategories, storedExpenses] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.GASTOS_CATEGORIAS),
          AsyncStorage.getItem(STORAGE_KEYS.GASTOS_REGISTROS),
        ]);

        const nextCategories = storedCategories
          ? (JSON.parse(storedCategories) as ExpenseCategory[])
          : [];
        const nextExpenses = storedExpenses ? (JSON.parse(storedExpenses) as ExpenseRecord[]) : [];

        setCategories(nextCategories);
        setExpenses(nextExpenses);
        setSelectedCategoryId(nextCategories[0]?.id ?? null);
      } catch {
        showMessage("No se pudieron cargar los datos de MisGastos.");
      }
    };

    void loadData();
  }, []);

  useEffect(() => {
    if (selectedCategoryId && categories.some((category) => category.id === selectedCategoryId)) {
      return;
    }
    setSelectedCategoryId(categories[0]?.id ?? null);
  }, [categories, selectedCategoryId]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const filteredExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => {
          if (selectedCategory && expense.categoriaId !== selectedCategory.id) return false;
          const expenseDate = new Date(expense.fecha);
          return !Number.isNaN(expenseDate.getTime())
            ? isExpenseInFilter(expenseDate, filterMode, referenceDate)
            : false;
        })
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [expenses, filterMode, referenceDate, selectedCategory]
  );

  const totalFiltered = useMemo(
    () => filteredExpenses.reduce((acc, expense) => acc + expense.monto, 0),
    [filteredExpenses]
  );

  const chartData = useMemo(() => {
    if (filterMode === "dia") {
      return null;
    }
    if (filterMode === "semana") {
      const start = startOfWeek(referenceDate, { weekStartsOn: 1 });
      const end = endOfWeek(referenceDate, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start, end });
      const data = days.map(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        const total = filteredExpenses
          .filter(exp => exp.fecha.startsWith(dayStr))
          .reduce((acc, exp) => acc + exp.monto, 0);
        return total;
      });
      return {
        labels: days.map(d => format(d, "EEE")),
        datasets: [{ data }]
      };
    }
    if (filterMode === "mes") {
      const start = startOfMonth(referenceDate);
      const end = endOfMonth(referenceDate);
      const days = eachDayOfInterval({ start, end });
      const data = days.map(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        const total = filteredExpenses
          .filter(exp => exp.fecha.startsWith(dayStr))
          .reduce((acc, exp) => acc + exp.monto, 0);
        return total;
      });
      return {
        labels: days.map(d => format(d, "dd")),
        datasets: [{ data }]
      };
    }
    if (filterMode === "anio") {
      const start = startOfYear(referenceDate);
      const end = endOfYear(referenceDate);
      const months = eachMonthOfInterval({ start, end });
      const data = months.map(month => {
        const monthStart = month;
        const monthEnd = endOfMonth(month);
        const total = filteredExpenses
          .filter(exp => {
            const expDate = new Date(exp.fecha);
            return expDate >= monthStart && expDate <= monthEnd;
          })
          .reduce((acc, exp) => acc + exp.monto, 0);
        return total;
      });
      return {
        labels: months.map(m => format(m, "MMM")),
        datasets: [{ data }]
      };
    }
    return null;
  }, [filterMode, referenceDate, filteredExpenses]);

  const categoriesWithTotals = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        total: expenses.reduce((acc, expense) => {
          if (expense.categoriaId !== category.id) return acc;
          const expenseDate = new Date(expense.fecha);
          if (Number.isNaN(expenseDate.getTime())) return acc;
          return isExpenseInFilter(expenseDate, filterMode, referenceDate)
            ? acc + expense.monto
            : acc;
        }, 0),
      })),
    [categories, expenses, filterMode, referenceDate]
  );

  const showMessage = (message: string) => {
    setSnackbarMsg(message);
    setSnackbarVisible(true);
  };

  const persistCategories = async (nextCategories: ExpenseCategory[]) => {
    setCategories(nextCategories);
    await AsyncStorage.setItem(STORAGE_KEYS.GASTOS_CATEGORIAS, JSON.stringify(nextCategories));
  };

  const persistExpenses = async (nextExpenses: ExpenseRecord[]) => {
    setExpenses(nextExpenses);
    await AsyncStorage.setItem(STORAGE_KEYS.GASTOS_REGISTROS, JSON.stringify(nextExpenses));
  };

  const saveCategory = async () => {
    const nombre = categoryForm.nombre.trim();
    if (!nombre) {
      showMessage("Ingresá un nombre para la categoria.");
      return;
    }
    if (categories.some((c) => c.id !== categoryForm.id && c.nombre === nombre)) {
      showMessage("Ya existe una categoria con ese nombre.");
      return;
    }

    const nowIso = new Date().toISOString();
    const newCategory: ExpenseCategory = {
      id: categoryForm.id || buildId(),
      nombre,
      icono: categoryForm.icono,
      color: categoryForm.color,
      creadoEn: categoryForm.id
        ? categories.find((c) => c.id === categoryForm.id)?.creadoEn ?? nowIso
        : nowIso,
    };

    let updatedCategories: ExpenseCategory[];
    if (categoryForm.id) {
      updatedCategories = categories.map((category) =>
        category.id === categoryForm.id ? newCategory : category
      );
    } else {
      updatedCategories = [...categories, newCategory];
    }

    await persistCategories(updatedCategories);
    setCategoryDialogVisible(false);
    showMessage(categoryForm.id ? "Categoria actualizada." : "Categoria guardada.");
  };

  const deleteCategory = async () => {
    if (!deleteCategoryId) return;

    const updatedCategories = categories.filter((category) => category.id !== deleteCategoryId);
    const updatedExpenses = expenses.filter((expense) => expense.categoriaId !== deleteCategoryId);
    await Promise.all([
      persistCategories(updatedCategories),
      persistExpenses(updatedExpenses),
    ]);
    setDeleteCategoryId(null);
    showMessage("Categoria eliminada.");
  };

  const saveExpense = async () => {
    const monto = Number(expenseForm.monto);
    if (Number.isNaN(monto) || monto <= 0) {
      showMessage("Ingresá un monto válido.");
      return;
    }
    if (!expenseForm.fecha) {
      showMessage("Elegí una fecha para el gasto.");
      return;
    }

    const nowIso = new Date().toISOString();
    const newExpense: ExpenseRecord = {
      id: expenseForm.id || buildId(),
      categoriaId: expenseForm.categoriaId,
      monto,
      fecha: expenseForm.fecha,
      referencia: expenseForm.referencia.trim() || undefined,
      creadoEn: expenseForm.id
        ? expenses.find((e) => e.id === expenseForm.id)?.creadoEn ?? nowIso
        : nowIso,
      actualizadoEn: nowIso,
    };

    let updatedExpenses: ExpenseRecord[];
    if (expenseForm.id) {
      updatedExpenses = expenses.map((expense) =>
        expense.id === expenseForm.id ? newExpense : expense
      );
    } else {
      updatedExpenses = [...expenses, newExpense];
    }

    await persistExpenses(updatedExpenses);
    setExpenseDialogVisible(false);
    showMessage(expenseForm.id ? "Gasto actualizado." : "Gasto guardado.");
  };

  const deleteExpense = async () => {
    if (!deleteExpenseId) return;

    const updatedExpenses = expenses.filter((expense) => expense.id !== deleteExpenseId);
    await persistExpenses(updatedExpenses);
    setDeleteExpenseId(null);
    showMessage("Gasto eliminado.");
  };

  const getFabLabel = () => {
    return "Nuevo gasto";
  };

  const onFabPress = () => {
    if (!selectedCategory) {
      showMessage("Primero crea una categoria.");
      return;
    }
    setExpenseForm(getInitialExpenseForm(selectedCategory.id));
    setExpenseDialogVisible(true);
  };

  const renderContent = () => {
    switch (misGastosUbicacion) {
      case "Resumen":
        return (
          <View style={styles.column}>
            <FilterSummaryCard
              cardStyle={styles.card}
              titleStyle={styles.sectionTitle}
              bodyStyle={styles.body}
              amountStyle={styles.amountText}
              filterRowStyle={styles.filterRow}
              filterLabelStyle={styles.filterLabel}
              filterMode={filterMode}
              referenceDate={referenceDate}
              total={totalFiltered}
              selectedCategoryName={selectedCategory?.nombre}
              onChangeFilter={(v) => setFilterMode(v)}

              onChangeReferenceDate={setReferenceDate}
            />
            {chartData && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Gráfico de gastos</Text>
                <BarChart
                  data={chartData}
                  width={width - 2 * spacing - 32}
                  height={220}
                  yAxisLabel="$"
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: theme.colors.surface,
                    backgroundGradientFrom: theme.colors.surface,
                    backgroundGradientTo: theme.colors.surface,
                    decimalPlaces: 0,
                    color: (opacity = 1) => hexToRgba(theme.colors.primary, opacity),
                    labelColor: (opacity = 1) => hexToRgba(theme.colors.onSurface, opacity),
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: "6",
                      strokeWidth: "2",
                      stroke: theme.colors.primary,
                    },
                  }}
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                  }}
                />
              </View>
            )}
          </View>
        );
      case "Gastos":
        return (
          <View style={styles.column}>
            <CategoriesPanel
              cardStyle={styles.card}
              titleStyle={styles.sectionTitle}
              bodyStyle={styles.body}
              emptyStateStyle={styles.emptyState}
              categoriesWrapStyle={styles.categoriesWrap}
              categoryCardStyle={styles.categoryCard}
              categoryTopStyle={styles.inlineRow}
              categoryInfoStyle={styles.inlineRow}
              iconWrapStyle={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
              categoryNameStyle={styles.sectionTitle}
              expenseMetaStyle={styles.body}
              inlineRowStyle={styles.inlineRow}
              categories={categoriesWithTotals}
              selectedCategoryId={selectedCategoryId}
              onAdd={() => {
                setCategoryForm(getInitialCategoryForm());
                setCategoryDialogVisible(true);
              }}
              onSelect={setSelectedCategoryId}
              onEdit={(category) => {
                setCategoryForm({
                  id: category.id,
                  nombre: category.nombre,
                  icono: category.icono,
                  color: category.color,
                });
                setCategoryDialogVisible(true);
              }}
              onDelete={setDeleteCategoryId}
            />
            <ExpensesPanel
              cardStyle={styles.card}
              titleStyle={styles.sectionTitle}
              bodyStyle={styles.body}
              emptyStateStyle={styles.emptyState}
              expenseRowStyle={styles.expenseRow}
              expenseTopStyle={styles.inlineRow}
              expenseTitleStyle={styles.sectionTitle}
              expenseMetaStyle={styles.body}
              inlineRowStyle={styles.inlineRow}
              selectedCategoryName={selectedCategory?.nombre}
              expenses={filteredExpenses}
              onAdd={() => {
                if (!selectedCategory) {
                  showMessage("Primero crea una categoria.");
                  return;
                }
                setExpenseForm(getInitialExpenseForm(selectedCategory.id));
                setExpenseDialogVisible(true);
              }}
              onEdit={(expense) => {
                const expenseDate = new Date(expense.fecha);
                setExpenseForm({
                  id: expense.id,
                  categoriaId: expense.categoriaId,
                  monto: expense.monto.toString(),
                  fecha: format(expenseDate, "dd/MM/yyyy"),
                  hora: format(expenseDate, "HH:mm"),
                  referencia: expense.referencia ?? "",
                });
                setExpenseDialogVisible(true);
              }}
              onDelete={setDeleteExpenseId}
            />
          </View>
        );
      case "Respaldo":
        return (
          <RespaldoMisGastosScreen
            onImported={(nextCategories, nextExpenses) => {
              setCategories(nextCategories);
              setExpenses(nextExpenses);
              setSelectedCategoryId(nextCategories[0]?.id ?? null);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          {renderContent()}
        </View>
      </ScrollView>
      <ScreenSelector />
      {misGastosUbicacion === "Gastos" && (
        <FAB
          icon="plus"
          label={getFabLabel()}
          style={{ position: "absolute", right: 16, bottom: fabBottomOffset }}
          onPress={onFabPress}
        />
      )}

      {/* Dialogs - common */}
      <CategoryDialog
        visible={categoryDialogVisible}
        form={categoryForm}
        sectionTitleStyle={styles.sectionTitle}
        iconGridStyle={styles.categoriesWrap}
        iconButtonWrapStyle={{ width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" }}
        colorRowStyle={styles.inlineRow}
        colorDotStyle={styles.colorDot}
        onDismiss={() => setCategoryDialogVisible(false)}
        onChange={setCategoryForm}
        onSave={saveCategory}
        // ... styles
      />

      <ExpenseDialog
        visible={expenseDialogVisible}
        categories={categories}
        form={expenseForm}
        categoriesWrapStyle={styles.categoriesWrap}
        onDismiss={() => setExpenseDialogVisible(false)}
        onChange={setExpenseForm}
        onSave={saveExpense}
      />

      <ConfirmDeleteDialog
        visible={Boolean(deleteExpenseId)}
        title="Eliminar gasto"
        message="Este gasto se borrará de forma permanente."
        onDismiss={() => setDeleteExpenseId(null)}
        onConfirm={deleteExpense}
      />
      <ConfirmDeleteDialog
        visible={Boolean(deleteCategoryId)}
        title="Eliminar categoria"
        message="También se eliminarán todos los gastos asociados."
        onDismiss={() => setDeleteCategoryId(null)}
        onConfirm={deleteCategory}
      />

      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)}>
        {snackbarMsg}
      </Snackbar>
    </View>
  );
}
