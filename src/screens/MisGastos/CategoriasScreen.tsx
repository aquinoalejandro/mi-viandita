import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { FAB, Portal, Snackbar, Text, useTheme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";

import { useStore } from "../../store/zustand";
import { ExpenseCategory, ExpenseRecord } from "../../types/types";
import {
  CONTENT_MAX_WIDTH,
  getFabBottomOffset,
  getFontSize,
  getLineHeight,
  getSpacing,
} from "../../theme/layout";
import CategoriesPanel from "./components/CategoriesPanel";
import CategoryDialog from "./components/CategoryDialog";
import ConfirmDeleteDialog from "./components/ConfirmDeleteDialog";
import ExpenseDialog from "./components/ExpenseDialog";
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

export default function CategoriasScreen() {
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
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(getInitialCategoryForm());
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(getInitialExpenseForm());
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [fabOpen, setFabOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setMisGastosUbi("Categorias");
    }, [setMisGastosUbi])
  );

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

    const newCategory: ExpenseCategory = {
      id: categoryForm.id || buildId(),
      nombre,
      icono: categoryForm.icono,
      color: categoryForm.color,
      creadoEn: categoryForm.id
        ? categories.find((category) => category.id === categoryForm.id)?.creadoEn ??
          new Date().toISOString()
        : new Date().toISOString(),
    };

    const updatedCategories = categoryForm.id
      ? categories.map((category) =>
          category.id === categoryForm.id ? newCategory : category
        )
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

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

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
        fabGroup: {
          position: "absolute",
          right: 0,
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
      titleSize,
      width,
    ]
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Text style={styles.title}>Categorias</Text>
          <Text style={styles.subtitle}>
            Crea y gestiona las categorias para organizar tus gastos.
          </Text>

          <CategoriesPanel
            cardStyle={styles.card}
            titleStyle={styles.sectionTitle}
            bodyStyle={styles.body}
            emptyStateStyle={styles.emptyState}
            categoriesWrapStyle={styles.categoriesWrap}
            categoryCardStyle={styles.categoryCard}
            categoryTopStyle={styles.inlineRow}
            categoryInfoStyle={styles.inlineRow}
            iconWrapStyle={{
              width: 40,
              height: 40,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
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
                showMessage("Primero creá o seleccioná una categoría.");
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

      <Portal>
        <CategoryDialog
          visible={categoryDialogVisible}
          form={categoryForm}
          sectionTitleStyle={styles.sectionTitle}
          iconGridStyle={styles.categoriesWrap}
          iconButtonWrapStyle={{
            width: 46,
            height: 46,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
          }}
          colorRowStyle={styles.inlineRow}
          colorDotStyle={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2 }}
          onDismiss={() => setCategoryDialogVisible(false)}
          onChange={setCategoryForm}
          onSave={saveCategory}
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
          visible={Boolean(deleteCategoryId)}
          title="Eliminar categoría"
          message="También se eliminarán todos los gastos asociados."
          onDismiss={() => setDeleteCategoryId(null)}
          onConfirm={deleteCategory}
        />
      </Portal>

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
