import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { FAB, Snackbar, Text, useTheme } from "react-native-paper";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Tag } from "lucide-react-native";

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
import CategoriesPanel from "./components/CategoriesPanel";
import CategoryDialog from "./components/CategoryDialog";
import ConfirmDeleteDialog from "./components/ConfirmDeleteDialog";
import ExpenseDialog from "./components/ExpenseDialog";
import {
  buildId,
  getInitialCategoryForm,
  getInitialExpenseForm,
  parseAmountInput,
  parseExpenseDate,
  type CategoryFormState,
  type ExpenseFormState,
} from "./misGastosShared";

type NavigationProp = NativeStackNavigationProp<MisGastosStackParamList, "Categorias">;

export default function CategoriasScreen() {
  const navigation = useNavigation<NavigationProp>();
  const setMisGastosUbi = useStore((state) => state.setMisGastosUbi);
  const categories = useStore((state) => state.misGastosCategories);
  const expenses = useStore((state) => state.misGastosExpenses);
  const saveMisGastosCategory = useStore((state) => state.saveMisGastosCategory);
  const deleteMisGastosCategory = useStore((state) => state.deleteMisGastosCategory);
  const saveMisGastosExpense = useStore((state) => state.saveMisGastosExpense);

  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const fabBottomOffset = getFabBottomOffset();
  const titleSize = getFontSize(width, 24);
  const bodySize = getFontSize(width, 15);

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

  const saveCategory = async () => {
    const nombre = categoryForm.nombre.trim();
    if (!nombre) return;

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

    await saveMisGastosCategory(newCategory);
    setCategoryDialogVisible(false);
    setFabOpen(false);
    showMessage(categoryForm.id ? "Categoría actualizada." : "Categoría guardada.");
  };

  const saveExpense = async () => {
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
    setFabOpen(false);
    showMessage("Gasto guardado.");
  };

  const deleteCategory = async () => {
    if (!deleteCategoryId) return;
    await deleteMisGastosCategory(deleteCategoryId);
    setDeleteCategoryId(null);
    showMessage("Categoría eliminada.");
  };

  const categoriesWithTotals = useMemo(
    () =>
      categories.map((category) => {
        const catExpenses = expenses.filter((e) => e.categoriaId === category.id);
        const total = catExpenses.reduce((acc, e) => acc + e.monto, 0);
        return {
          ...category,
          total,
          count: catExpenses.length,
        };
      }),
    [categories, expenses]
  );

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
                <Tag color={theme.colors.primary} size={22} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: theme.colors.onSurface, fontSize: titleSize }]}>
                  Categorías
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { color: theme.colors.onSurfaceVariant, fontSize: bodySize },
                  ]}
                >
                  Personalizá nombres, colores e íconos para clasificar gastos
                </Text>
              </View>
            </View>
          </View>

          <CategoriesPanel
            categories={categoriesWithTotals}
            onAdd={() => {
              setCategoryForm(getInitialCategoryForm());
              setCategoryDialogVisible(true);
            }}
            onSelect={(id) => navigation.navigate("Gastos", { categoriaId: id })}
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
        fabStyle={{
          backgroundColor: theme.colors.secondary,
          borderRadius: 18,
        }}
        actions={[
          {
            icon: "tag-plus-outline",
            label: "Nueva categoría",
            onPress: () => {
              setFabOpen(false);
              setCategoryForm(getInitialCategoryForm());
              setCategoryDialogVisible(true);
            },
          },
          {
            icon: "cash-plus",
            label: "Nuevo gasto",
            onPress: () => {
              setFabOpen(false);
              if (categories.length === 0) {
                showMessage("Primero creá una categoría.");
                setCategoryForm(getInitialCategoryForm());
                setCategoryDialogVisible(true);
                return;
              }
              setExpenseForm(getInitialExpenseForm(categories[0].id));
              setExpenseDialogVisible(true);
            },
          },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
        style={[styles.fabGroup, { bottom: fabBottomOffset, right: spacing }]}
      />

      <CategoryDialog
        visible={categoryDialogVisible}
        form={categoryForm}
        existingCategories={categories}
        onDismiss={() => setCategoryDialogVisible(false)}
        onChange={setCategoryForm}
        onSave={saveCategory}
      />

      <ExpenseDialog
        visible={expenseDialogVisible}
        categories={categories}
        form={expenseForm}
        onDismiss={() => setExpenseDialogVisible(false)}
        onChange={setExpenseForm}
        onSave={saveExpense}
      />

      <ConfirmDeleteDialog
        visible={Boolean(deleteCategoryId)}
        title="Eliminar categoría"
        message="También se eliminarán todos los gastos asociados a esta categoría."
        onDismiss={() => setDeleteCategoryId(null)}
        onConfirm={deleteCategory}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 160,
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
  fabGroup: {
    position: "absolute",
  },
});
