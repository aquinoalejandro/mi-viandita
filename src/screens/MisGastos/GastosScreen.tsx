import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { FAB, Menu, Snackbar, Text, useTheme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { format } from "date-fns";

import { useStore } from "../../store/zustand";
import { ExpenseCategory, ExpenseRecord } from "../../types/types";
import {
  CONTENT_MAX_WIDTH,
  getFabBottomOffset,
  getFontSize,
  getLineHeight,
  getSpacing,
} from "../../theme/layout";
import CategoryDialog from "./components/CategoryDialog";
import ConfirmDeleteDialog from "./components/ConfirmDeleteDialog";
import ExpenseDialog from "./components/ExpenseDialog";
import ExpensesPanel from "./components/ExpensesPanel";
import FilterSummaryCard from "./components/FilterSummaryCard";
import {
  buildId,
  getInitialCategoryForm,
  getInitialExpenseForm,
  isExpenseInFilter,
  parseExpenseDate,
  type CategoryFormState,
  type ExpenseFormState,
  type FilterMode,
} from "./misGastosShared";

export default function GastosScreen() {
  const setMisGastosUbi = useStore((state) => state.setMisGastosUbi);
  const categories = useStore((state) => state.misGastosCategories);
  const expenses = useStore((state) => state.misGastosExpenses);
  const persistMisGastosCategories = useStore((state) => state.persistMisGastosCategories);
  const persistMisGastosExpenses = useStore((state) => state.persistMisGastosExpenses);
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const fabBottomOffset = getFabBottomOffset();
  const titleSize = getFontSize(width, 24);
  const bodySize = getFontSize(width, 16);

  const [filterMode, setFilterMode] = useState<FilterMode>("mes");
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);
  const [expenseDialogVisible, setExpenseDialogVisible] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(getInitialCategoryForm());
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(getInitialExpenseForm());
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [fabOpen, setFabOpen] = useState(false);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setMisGastosUbi("Gastos");
    }, [setMisGastosUbi])
  );

  useEffect(() => {
    if (selectedCategoryId && categories.some((category) => category.id === selectedCategoryId)) {
      return;
    }
    setSelectedCategoryId(categories[0]?.id ?? null);
  }, [categories, selectedCategoryId]);

  const showMessage = (message: string) => {
    setSnackbarMsg(message);
    setSnackbarVisible(true);
  };

  const persistCategories = async (nextCategories: ExpenseCategory[]) => {
    await persistMisGastosCategories(nextCategories);
  };

  const persistExpenses = async (nextExpenses: ExpenseRecord[]) => {
    await persistMisGastosExpenses(nextExpenses);
  };

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

  const saveCategory = async () => {
    const nombre = categoryForm.nombre.trim();
    if (!nombre) {
      showMessage("Ingresá un nombre para la categoría.");
      return;
    }
    if (
      categories.some(
        (category) =>
          category.id !== categoryForm.id &&
          category.nombre.toLowerCase() === nombre.toLowerCase()
      )
    ) {
      showMessage("Ya existe una categoría con ese nombre.");
      return;
    }

    const nowIso = new Date().toISOString();
    const newCategory: ExpenseCategory = {
      id: categoryForm.id || buildId(),
      nombre,
      icono: categoryForm.icono,
      color: categoryForm.color,
      creadoEn: categoryForm.id
        ? categories.find((category) => category.id === categoryForm.id)?.creadoEn ?? nowIso
        : nowIso,
    };

    const updatedCategories = categoryForm.id
      ? categories.map((category) => (category.id === categoryForm.id ? newCategory : category))
      : [...categories, newCategory];

    await persistCategories(updatedCategories);
    setCategoryDialogVisible(false);
    setFabOpen(false);
    setSelectedCategoryId(newCategory.id);
    showMessage(categoryForm.id ? "Categoría actualizada." : "Categoría guardada.");
  };

  const saveExpense = async () => {
    const monto = Number(expenseForm.monto);
    if (Number.isNaN(monto) || monto <= 0) {
      showMessage("Ingresá un monto válido.");
      return;
    }
    if (!expenseForm.categoriaId) {
      showMessage("Elegí una categoría.");
      return;
    }

    const expenseDate = parseExpenseDate(expenseForm.fecha, expenseForm.hora);
    if (!expenseDate) {
      showMessage("Ingresá una fecha y hora válidas.");
      return;
    }

    const nowIso = new Date().toISOString();
    const newExpense: ExpenseRecord = {
      id: expenseForm.id || buildId(),
      categoriaId: expenseForm.categoriaId,
      monto,
      fecha: expenseDate.toISOString(),
      referencia: expenseForm.referencia.trim() || undefined,
      creadoEn: expenseForm.id
        ? expenses.find((expense) => expense.id === expenseForm.id)?.creadoEn ?? nowIso
        : nowIso,
      actualizadoEn: nowIso,
    };

    const updatedExpenses = expenseForm.id
      ? expenses.map((expense) => (expense.id === expenseForm.id ? newExpense : expense))
      : [...expenses, newExpense];

    await persistExpenses(updatedExpenses);
    setExpenseDialogVisible(false);
    setFabOpen(false);
    showMessage(expenseForm.id ? "Gasto actualizado." : "Gasto guardado.");
  };

  const deleteCategory = async () => {
    if (!deleteCategoryId) return;

    const updatedCategories = categories.filter((category) => category.id !== deleteCategoryId);
    const updatedExpenses = expenses.filter((expense) => expense.categoriaId !== deleteCategoryId);

    await persistCategories(updatedCategories);
    await persistExpenses(updatedExpenses);
    setDeleteCategoryId(null);
    setSelectedCategoryId(updatedCategories[0]?.id ?? null);
    showMessage("Categoria eliminada.");
  };

  const deleteExpense = async () => {
    if (!deleteExpenseId) return;

    const updatedExpenses = expenses.filter((expense) => expense.id !== deleteExpenseId);
    await persistExpenses(updatedExpenses);
    setDeleteExpenseId(null);
    showMessage("Gasto eliminado.");
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        scroll: {
          padding: spacing,
          paddingBottom: 180,
        },
        content: {
          width: "100%",
          maxWidth: CONTENT_MAX_WIDTH,
          alignSelf: "center",
          gap: spacing,
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
        selectorCard: {
          borderRadius: 22,
          padding: spacing,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          gap: 12,
        },
        selectorRow: {
          flexDirection: width >= 720 ? "row" : "column",
          gap: 10,
          alignItems: width >= 720 ? "center" : "stretch",
          justifyContent: "space-between",
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
        selectorBody: {
          flex: 1,
          gap: 8,
        },
        selectorLabel: {
          color: theme.colors.onSurfaceVariant,
          fontSize: getFontSize(width, 13),
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: 0.8,
        },
        selectorButton: {
          borderRadius: 16,
          paddingVertical: 4,
        },
        selectorActions: {
          flexDirection: "row",
          gap: 8,
          flexWrap: "wrap",
        },
        emptyState: {
          borderRadius: 18,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: theme.colors.outline,
          padding: spacing,
          gap: 8,
        },
        fabGroup: {
          position: "absolute",
          right: spacing,
          bottom: fabBottomOffset,
        },
      }),
    [
      bodySize,
      fabBottomOffset,
      spacing,
      theme.colors.background,
      theme.colors.onSurface,
      theme.colors.onSurfaceVariant,
      theme.colors.outline,
      theme.colors.surface,
      theme.colors.surfaceVariant,
      titleSize,
      width,
    ]
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Text style={styles.title}>Gastos</Text>
          <Text style={styles.subtitle}>
            Elegí una categoría para revisar su detalle y filtrá por período según necesites.
          </Text>

          <View style={styles.selectorCard}>
            <View style={styles.selectorRow}>
              <View style={styles.selectorBody}>
                <Text style={styles.selectorLabel}>Categoria a revisar</Text>
                <Menu
                  visible={categoryMenuVisible}
                  onDismiss={() => setCategoryMenuVisible(false)}
                  anchor={
                    <FAB
                      icon="chevron-down"
                      label={selectedCategory?.nombre ?? "Seleccionar categoría"}
                      style={styles.selectorButton}
                      onPress={() => setCategoryMenuVisible(true)}
                    />
                  }
                >
                  {categories.length === 0 ? (
                    <Menu.Item title="No hay categorías aún" disabled />
                  ) : (
                    categories.map((category) => (
                      <Menu.Item
                        key={category.id}
                        title={category.nombre}
                        leadingIcon={selectedCategoryId === category.id ? "check" : undefined}
                        onPress={() => {
                          setSelectedCategoryId(category.id);
                          setCategoryMenuVisible(false);
                        }}
                      />
                    ))
                  )}
                </Menu>
              </View>

              <View style={styles.selectorActions}>
                <FAB
                  icon="pencil-outline"
                  label="Editar"
                  disabled={!selectedCategory}
                  onPress={() => {
                    if (!selectedCategory) return;
                    setCategoryForm({
                      id: selectedCategory.id,
                      nombre: selectedCategory.nombre,
                      icono: selectedCategory.icono,
                      color: selectedCategory.color,
                    });
                    setCategoryDialogVisible(true);
                  }}
                />
                <FAB
                  icon="delete-outline"
                  label="Eliminar"
                  disabled={!selectedCategory}
                  onPress={() => {
                    if (!selectedCategory) return;
                    setDeleteCategoryId(selectedCategory.id);
                  }}
                />
              </View>
            </View>
          </View>

          {!selectedCategory ? (
            <View style={styles.emptyState}>
              <Text style={styles.title}>No hay categoría seleccionada</Text>
              <Text style={styles.subtitle}>
                Creá una categoría desde el FAB y luego elegila para ver su detalle.
              </Text>
            </View>
          ) : (
            <FilterSummaryCard
              cardStyle={styles.card}
              titleStyle={styles.title}
              bodyStyle={styles.subtitle}
              amountStyle={styles.title}
              filterRowStyle={styles.filterRow}
              filterLabelStyle={styles.subtitle}
              periodPillStyle={styles.periodPill}
              filterMode={filterMode}
              referenceDate={referenceDate}
              total={totalFiltered}
              selectedCategoryName={selectedCategory.nombre}
              onChangeFilter={setFilterMode}
              onChangeReferenceDate={setReferenceDate}
            />
          )}

          <ExpensesPanel
            cardStyle={styles.card}
            titleStyle={styles.title}
            bodyStyle={styles.subtitle}
            emptyStateStyle={styles.emptyState}
            expenseRowStyle={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.colors.outline,
              padding: 14,
              gap: 10,
            }}
            expenseTopStyle={styles.selectorRow}
            expenseTitleStyle={styles.title}
            expenseMetaStyle={styles.subtitle}
            inlineRowStyle={styles.selectorActions}
            selectedCategoryName={selectedCategory?.nombre}
            expenses={filteredExpenses}
            onAdd={() => {
              if (!selectedCategory) {
                showMessage("Primero creá o seleccioná una categoría.");
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
      </ScrollView>

      <FAB.Group
        open={fabOpen}
        visible
        icon={fabOpen ? "close" : "plus"}
        color={theme.colors.onSecondary}
        fabStyle={{ backgroundColor: theme.colors.secondary }}
        actions={[
          {
            icon: "cash-plus",
            label: "Nuevo gasto",
            onPress: () => {
              if (!selectedCategory) {
                showMessage("Primero crea o selecciona una categoria.");
                return;
              }
              setExpenseForm(getInitialExpenseForm(selectedCategory.id));
              setExpenseDialogVisible(true);
              setFabOpen(false);
            },
          },
          {
            icon: "tag-plus-outline",
            label: "Nueva categoría",
            onPress: () => {
              setCategoryForm(getInitialCategoryForm());
              setCategoryDialogVisible(true);
              setFabOpen(false);
            },
          },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
        style={styles.fabGroup}
      />

      <CategoryDialog
        visible={categoryDialogVisible}
        form={categoryForm}
        sectionTitleStyle={styles.title}
        iconGridStyle={styles.selectorActions}
        iconButtonWrapStyle={{
          width: 46,
          height: 46,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
        }}
        colorRowStyle={styles.selectorActions}
        colorDotStyle={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2 }}
        onDismiss={() => setCategoryDialogVisible(false)}
        onChange={setCategoryForm}
        onSave={saveCategory}
      />

      <ExpenseDialog
        visible={expenseDialogVisible}
        categories={categories}
        form={expenseForm}
        categoriesWrapStyle={styles.selectorActions}
        onDismiss={() => setExpenseDialogVisible(false)}
        onChange={setExpenseForm}
        onSave={saveExpense}
      />

      <ConfirmDeleteDialog
        visible={Boolean(deleteCategoryId)}
        title="Eliminar categoría"
        message="También se eliminarán todos los gastos asociados."
        onDismiss={() => setDeleteCategoryId(null)}
        onConfirm={deleteCategory}
      />

      <ConfirmDeleteDialog
        visible={Boolean(deleteExpenseId)}
        title="Eliminar gasto"
        message="Este gasto se borrará de forma permanente."
        onDismiss={() => setDeleteExpenseId(null)}
        onConfirm={deleteExpense}
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2500}
      >
        {snackbarMsg}
      </Snackbar>
    </View>
  );
}
