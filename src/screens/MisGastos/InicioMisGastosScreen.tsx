import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FAB, Snackbar, useTheme } from "react-native-paper";
import { format } from "date-fns";

import type { RootStackParamList, ExpenseCategory, ExpenseRecord } from "../../types/types";
import {
  CONTENT_MAX_WIDTH,
  getFabBottomOffset,
  getFontSize,
  getLineHeight,
  getSpacing,
} from "../../theme/layout";
import { STORAGE_KEYS } from "../../utils/storage";
import CategoriesPanel from "./components/CategoriesPanel";
import CategoryDialog from "./components/CategoryDialog";
import ConfirmDeleteDialog from "./components/ConfirmDeleteDialog";
import ExpensesPanel from "./components/ExpensesPanel";
import FilterSummaryCard from "./components/FilterSummaryCard";
import MisGastosHeader from "./components/MisGastosHeader";
import ExpenseDialog from "./components/ExpenseDialog";
import RespaldoMisGastosScreen from "./RespaldoMisGastosScreen";
import {
  buildId,
  getInitialCategoryForm,
  getInitialExpenseForm,
  isExpenseInFilter,
  parseExpenseDate,
  type CategoryFormState,
  type ExpenseFormState,
  type FilterMode,
  type ViewMode,
} from "./misGastosShared";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "MisGastos">;

export default function InicioMisGastosScreen() {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const fabBottomOffset = getFabBottomOffset();
  const titleSize = getFontSize(width, 28);
  const bodySize = getFontSize(width, 16);

  const [viewMode, setViewMode] = useState<ViewMode>("inicio");
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
          padding: spacing,
          paddingBottom: 120,
        },
        content: {
          width: "100%",
          maxWidth: CONTENT_MAX_WIDTH,
          alignSelf: "center",
          gap: spacing,
        },
        hero: {
          borderRadius: 28,
          padding: spacing,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          gap: 12,
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
        categoryTop: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        },
        categoryInfo: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          flex: 1,
        },
        iconWrap: {
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
        },
        categoryName: {
          color: theme.colors.onSurface,
          fontWeight: "700",
          fontSize: getFontSize(width, 16),
        },
        expenseMeta: {
          color: theme.colors.onSurfaceVariant,
          fontSize: getFontSize(width, 13),
        },
        expenseRow: {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          padding: 14,
          gap: 10,
        },
        expenseTop: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        },
        expenseTitle: {
          color: theme.colors.onSurface,
          fontWeight: "700",
          fontSize: getFontSize(width, 16),
        },
        iconGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
        },
        iconButtonWrap: {
          width: 46,
          height: 46,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
        },
        colorRow: {
          flexDirection: "row",
          flexWrap: "wrap",
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
      showMessage("La categoria necesita un nombre.");
      return;
    }

    try {
      if (categoryForm.id) {
        await persistCategories(
          categories.map((category) =>
            category.id === categoryForm.id
              ? { ...category, nombre, icono: categoryForm.icono, color: categoryForm.color }
              : category
          )
        );
        showMessage("Categoria actualizada.");
      } else {
        const nextCategory: ExpenseCategory = {
          id: buildId(),
          nombre,
          icono: categoryForm.icono,
          color: categoryForm.color,
          creadoEn: new Date().toISOString(),
        };
        await persistCategories([nextCategory, ...categories]);
        setSelectedCategoryId(nextCategory.id);
        showMessage("Categoria creada.");
      }
      setCategoryDialogVisible(false);
      setCategoryForm(getInitialCategoryForm());
    } catch {
      showMessage("No se pudo guardar la categoria.");
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      await persistCategories(categories.filter((category) => category.id !== categoryId));
      await persistExpenses(expenses.filter((expense) => expense.categoriaId !== categoryId));
      setDeleteCategoryId(null);
      showMessage("Categoria eliminada junto con sus gastos.");
    } catch {
      showMessage("No se pudo eliminar la categoria.");
    }
  };

  const saveExpense = async () => {
    const amount = Number(expenseForm.monto.replace(",", "."));
    const expenseDate = parseExpenseDate(expenseForm.fecha.trim(), expenseForm.hora.trim());

    if (!expenseForm.categoriaId) {
      showMessage("Selecciona una categoria.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      showMessage("Ingresa un monto valido en pesos argentinos.");
      return;
    }
    if (!expenseDate) {
      showMessage("La fecha u hora no tienen un formato valido.");
      return;
    }

    const nowIso = new Date().toISOString();
    const nextExpense: ExpenseRecord = {
      id: expenseForm.id ?? buildId(),
      categoriaId: expenseForm.categoriaId,
      monto: amount,
      fecha: expenseDate.toISOString(),
      referencia: expenseForm.referencia.trim() || undefined,
      creadoEn: expenseForm.id
        ? expenses.find((expense) => expense.id === expenseForm.id)?.creadoEn ?? nowIso
        : nowIso,
      actualizadoEn: nowIso,
    };

    try {
      await persistExpenses(
        expenseForm.id
          ? expenses.map((expense) => (expense.id === expenseForm.id ? nextExpense : expense))
          : [nextExpense, ...expenses]
      );
      setSelectedCategoryId(nextExpense.categoriaId);
      setExpenseDialogVisible(false);
      setExpenseForm(getInitialExpenseForm(nextExpense.categoriaId));
      showMessage(expenseForm.id ? "Gasto actualizado." : "Gasto agregado.");
    } catch {
      showMessage("No se pudo guardar el gasto.");
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      await persistExpenses(expenses.filter((expense) => expense.id !== expenseId));
      setDeleteExpenseId(null);
      showMessage("Gasto eliminado.");
    } catch {
      showMessage("No se pudo eliminar el gasto.");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <MisGastosHeader
            titleStyle={styles.title}
            bodyStyle={styles.body}
            cardStyle={styles.hero}
            value={viewMode}
            onChange={setViewMode}
            onBack={() => navigation.navigate("Bienvenida")}
          />

          {viewMode === "inicio" ? (
            <>
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
                onChangeFilter={setFilterMode}
                onChangeReferenceDate={setReferenceDate}
              />

              <View style={styles.row}>
                <View style={styles.column}>
                  <CategoriesPanel
                    cardStyle={styles.card}
                    titleStyle={styles.sectionTitle}
                    bodyStyle={styles.body}
                    emptyStateStyle={styles.emptyState}
                    categoriesWrapStyle={styles.categoriesWrap}
                    categoryCardStyle={styles.categoryCard}
                    categoryTopStyle={styles.categoryTop}
                    categoryInfoStyle={styles.categoryInfo}
                    iconWrapStyle={styles.iconWrap}
                    categoryNameStyle={styles.categoryName}
                    expenseMetaStyle={styles.expenseMeta}
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
                </View>

                <View style={styles.column}>
                  <ExpensesPanel
                    cardStyle={styles.card}
                    titleStyle={styles.sectionTitle}
                    bodyStyle={styles.body}
                    emptyStateStyle={styles.emptyState}
                    expenseRowStyle={styles.expenseRow}
                    expenseTopStyle={styles.expenseTop}
                    expenseTitleStyle={styles.expenseTitle}
                    expenseMetaStyle={styles.expenseMeta}
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
              </View>
            </>
          ) : (
            <RespaldoMisGastosScreen
              onImported={(nextCategories, nextExpenses) => {
                setCategories(nextCategories);
                setExpenses(nextExpenses);
                setSelectedCategoryId(nextCategories[0]?.id ?? null);
              }}
            />
          )}
        </View>
      </ScrollView>

      {viewMode === "inicio" ? (
        <FAB
          icon="plus"
          label={selectedCategory ? "Nuevo gasto" : "Nueva categoria"}
          style={{ position: "absolute", right: spacing, bottom: fabBottomOffset }}
          onPress={() => {
            if (selectedCategory) {
              setExpenseForm(getInitialExpenseForm(selectedCategory.id));
              setExpenseDialogVisible(true);
              return;
            }
            setCategoryForm(getInitialCategoryForm());
            setCategoryDialogVisible(true);
          }}
        />
      ) : null}

      <CategoryDialog
        visible={categoryDialogVisible}
        form={categoryForm}
        sectionTitleStyle={styles.sectionTitle}
        iconGridStyle={styles.iconGrid}
        iconButtonWrapStyle={styles.iconButtonWrap}
        colorRowStyle={styles.colorRow}
        colorDotStyle={styles.colorDot}
        onDismiss={() => setCategoryDialogVisible(false)}
        onChange={setCategoryForm}
        onSave={() => void saveCategory()}
      />

      <ExpenseDialog
        visible={expenseDialogVisible}
        categories={categories}
        form={expenseForm}
        categoriesWrapStyle={styles.categoriesWrap}
        onDismiss={() => setExpenseDialogVisible(false)}
        onChange={setExpenseForm}
        onSave={() => void saveExpense()}
      />

      <ConfirmDeleteDialog
        visible={Boolean(deleteExpenseId)}
        title="Eliminar gasto"
        message="Este gasto se borrara de forma permanente."
        onDismiss={() => setDeleteExpenseId(null)}
        onConfirm={() => {
          if (deleteExpenseId) void deleteExpense(deleteExpenseId);
        }}
      />

      <ConfirmDeleteDialog
        visible={Boolean(deleteCategoryId)}
        title="Eliminar categoria"
        message="Tambien se eliminaran todos los gastos asociados a esta categoria."
        onDismiss={() => setDeleteCategoryId(null)}
        onConfirm={() => {
          if (deleteCategoryId) void deleteCategory(deleteCategoryId);
        }}
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMsg}
      </Snackbar>
    </View>
  );
}
