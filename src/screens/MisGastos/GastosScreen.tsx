import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { FAB, Searchbar, Snackbar, Surface, Text, useTheme } from "react-native-paper";
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { format } from "date-fns";
import {
  Calculator,
  Layers,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  Wallet,
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
import ConfirmDeleteDialog from "./components/ConfirmDeleteDialog";
import ExpenseDialog from "./components/ExpenseDialog";
import ExpensesPanel from "./components/ExpensesPanel";
import FilterSummaryCard from "./components/FilterSummaryCard";
import {
  buildId,
  formatCurrency,
  getInitialCategoryForm,
  getInitialExpenseForm,
  iconMap,
  isExpenseInFilter,
  parseAmountInput,
  parseExpenseDate,
  type CategoryFormState,
  type ExpenseFormState,
  type FilterMode,
} from "./misGastosShared";

type GastosRouteProp = RouteProp<MisGastosStackParamList, "Gastos">;
type GastosNavProp = NativeStackNavigationProp<MisGastosStackParamList, "Gastos">;

export default function GastosScreen() {
  const navigation = useNavigation<GastosNavProp>();
  const route = useRoute<GastosRouteProp>();

  const setMisGastosUbi = useStore((state) => state.setMisGastosUbi);
  const categories = useStore((state) => state.misGastosCategories);
  const expenses = useStore((state) => state.misGastosExpenses);
  const saveMisGastosCategory = useStore((state) => state.saveMisGastosCategory);
  const deleteMisGastosCategory = useStore((state) => state.deleteMisGastosCategory);
  const saveMisGastosExpense = useStore((state) => state.saveMisGastosExpense);
  const deleteMisGastosExpense = useStore((state) => state.deleteMisGastosExpense);

  const theme = useTheme();
  const { width } = useWindowDimensions();
  const spacing = getSpacing(width);
  const fabBottomOffset = getFabBottomOffset();
  const titleSize = getFontSize(width, 24);
  const bodySize = getFontSize(width, 15);

  const [filterMode, setFilterMode] = useState<FilterMode>("mes");
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);
  const [expenseDialogVisible, setExpenseDialogVisible] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(getInitialCategoryForm());
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(getInitialExpenseForm());
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [fabOpen, setFabOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setMisGastosUbi("Gastos");
      const params = route.params;
      if (!params) return;

      if (params.categoriaId !== undefined) {
        setSelectedCategoryId(params.categoriaId);
      }
      if (params.filterMode) {
        setFilterMode(params.filterMode);
      }
      if (params.referenceDateIso) {
        const parsed = new Date(params.referenceDateIso);
        if (!Number.isNaN(parsed.getTime())) {
          setReferenceDate(parsed);
        }
      }

      navigation.setParams({
        categoriaId: undefined,
        filterMode: undefined,
        referenceDateIso: undefined,
      });
    }, [navigation, route.params, setMisGastosUbi])
  );

  useEffect(() => {
    if (
      selectedCategoryId !== null &&
      !categories.some((category) => category.id === selectedCategoryId)
    ) {
      setSelectedCategoryId(null);
    }
  }, [categories, selectedCategoryId]);

  const showMessage = (message: string) => {
    setSnackbarMsg(message);
    setSnackbarVisible(true);
  };

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((cat) => map.set(cat.id, cat.nombre.toLowerCase()));
    return map;
  }, [categories]);

  const selectedCategory = useMemo(
    () => (selectedCategoryId ? categories.find((c) => c.id === selectedCategoryId) ?? null : null),
    [categories, selectedCategoryId]
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => {
          if (selectedCategory && expense.categoriaId !== selectedCategory.id) return false;
          const expenseDate = new Date(expense.fecha);
          if (Number.isNaN(expenseDate.getTime())) return false;
          if (!isExpenseInFilter(expenseDate, filterMode, referenceDate)) return false;

          if (normalizedSearch.length > 0) {
            const ref = (expense.referencia ?? "").toLowerCase();
            const catName = categoryNameMap.get(expense.categoriaId) ?? "";
            if (!ref.includes(normalizedSearch) && !catName.includes(normalizedSearch)) {
              return false;
            }
          }

          return true;
        })
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [
      categoryNameMap,
      expenses,
      filterMode,
      normalizedSearch,
      referenceDate,
      selectedCategory,
    ]
  );

  const totalFiltered = useMemo(
    () => filteredExpenses.reduce((acc, expense) => acc + expense.monto, 0),
    [filteredExpenses]
  );

  const averageExpense = useMemo(
    () => (filteredExpenses.length > 0 ? totalFiltered / filteredExpenses.length : 0),
    [filteredExpenses.length, totalFiltered]
  );

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
    setSelectedCategoryId(newCategory.id);
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
      creadoEn: expenseForm.id
        ? expenses.find((expense) => expense.id === expenseForm.id)?.creadoEn ?? nowIso
        : nowIso,
      actualizadoEn: nowIso,
    };

    await saveMisGastosExpense(newExpense);
    setExpenseDialogVisible(false);
    setFabOpen(false);
    const insideFilter = isExpenseInFilter(expenseDate, filterMode, referenceDate);
    if (expenseForm.id) {
      showMessage("Gasto actualizado.");
    } else {
      showMessage(
        insideFilter
          ? "Gasto guardado."
          : "Gasto guardado (corresponde a otro período de filtro)."
      );
    }
  };

  const deleteCategory = async () => {
    if (!deleteCategoryId) return;
    await deleteMisGastosCategory(deleteCategoryId);
    setDeleteCategoryId(null);
    setSelectedCategoryId(null);
    showMessage("Categoría eliminada.");
  };

  const deleteExpense = async () => {
    if (!deleteExpenseId) return;
    await deleteMisGastosExpense(deleteExpenseId);
    setDeleteExpenseId(null);
    showMessage("Gasto eliminado.");
  };

  const openNewExpenseDialog = () => {
    setFabOpen(false);
    if (categories.length === 0) {
      showMessage("Primero creá una categoría.");
      setCategoryForm(getInitialCategoryForm());
      setCategoryDialogVisible(true);
      return;
    }
    const defaultCatId = selectedCategory?.id ?? categories[0]?.id;
    setExpenseForm(getInitialExpenseForm(defaultCatId));
    setExpenseDialogVisible(true);
  };

  const renderCategoryIcon = (iconName?: string, color?: string) => {
    const IconComponent = iconName ? iconMap[iconName] ?? Wallet : Wallet;
    return <IconComponent color={color ?? theme.colors.primary} size={16} strokeWidth={2.2} />;
  };

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
                <Receipt color={theme.colors.primary} size={22} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: theme.colors.onSurface, fontSize: titleSize }]}>
                  Registro de Gastos
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { color: theme.colors.onSurfaceVariant, fontSize: bodySize },
                  ]}
                >
                  Filtrá por categoría o período y gestioná tus consumos
                </Text>
              </View>
            </View>
          </View>

          <Searchbar
            placeholder="Buscar por descripción o categoría..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[
              styles.searchbar,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
            elevation={0}
          />

          <Surface
            style={[
              styles.categoryBarCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
            elevation={0}
          >
            <View style={styles.categoryBarHeader}>
              <Text style={[styles.categoryBarTitle, { color: theme.colors.onSurfaceVariant }]}>
                Filtrar por categoría
              </Text>
              {selectedCategory ? (
                <View style={styles.categoryActionsInline}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.categoryMiniAction,
                      {
                        backgroundColor: `${theme.colors.primary}15`,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                    onPress={() => {
                      setCategoryForm({
                        id: selectedCategory.id,
                        nombre: selectedCategory.nombre,
                        icono: selectedCategory.icono,
                        color: selectedCategory.color,
                      });
                      setCategoryDialogVisible(true);
                    }}
                  >
                    <Pencil size={13} color={theme.colors.primary} strokeWidth={2.4} />
                    <Text style={[styles.categoryMiniActionText, { color: theme.colors.primary }]}>
                      Editar
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.categoryMiniAction,
                      {
                        backgroundColor: `${theme.colors.error}15`,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                    onPress={() => setDeleteCategoryId(selectedCategory.id)}
                  >
                    <Trash2 size={13} color={theme.colors.error} strokeWidth={2.4} />
                    <Text style={[styles.categoryMiniActionText, { color: theme.colors.error }]}>
                      Eliminar
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.categoryPill,
                  selectedCategoryId === null
                    ? {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.primary,
                      }
                    : {
                        backgroundColor: theme.colors.surfaceVariant,
                        borderColor: theme.colors.outline,
                      },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setSelectedCategoryId(null)}
              >
                <Layers
                  size={15}
                  color={
                    selectedCategoryId === null
                      ? theme.colors.onPrimary
                      : theme.colors.onSurfaceVariant
                  }
                  strokeWidth={2.3}
                />
                <Text
                  style={[
                    styles.categoryPillLabel,
                    {
                      color:
                        selectedCategoryId === null
                          ? theme.colors.onPrimary
                          : theme.colors.onSurface,
                    },
                  ]}
                >
                  Todas ({categories.length})
                </Text>
              </Pressable>

              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                const catColor = cat.color ?? theme.colors.primary;
                return (
                  <Pressable
                    key={cat.id}
                    style={({ pressed }) => [
                      styles.categoryPill,
                      isSelected
                        ? {
                            backgroundColor: `${catColor}20`,
                            borderColor: catColor,
                          }
                        : {
                            backgroundColor: theme.colors.surfaceVariant,
                            borderColor: theme.colors.outline,
                          },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => setSelectedCategoryId(cat.id)}
                  >
                    <View style={[styles.catPillDot, { backgroundColor: catColor }]} />
                    {renderCategoryIcon(cat.icono, catColor)}
                    <Text
                      style={[
                        styles.categoryPillLabel,
                        {
                          color: isSelected ? catColor : theme.colors.onSurface,
                          fontWeight: isSelected ? "700" : "600",
                        },
                      ]}
                    >
                      {cat.nombre}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                style={({ pressed }) => [
                  styles.categoryPillAdd,
                  {
                    borderColor: theme.colors.outline,
                    backgroundColor: "transparent",
                  },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => {
                  setCategoryForm(getInitialCategoryForm());
                  setCategoryDialogVisible(true);
                }}
              >
                <Plus size={14} color={theme.colors.primary} strokeWidth={2.5} />
                <Text style={[styles.categoryPillAddText, { color: theme.colors.primary }]}>
                  Nueva
                </Text>
              </Pressable>
            </ScrollView>
          </Surface>

          <FilterSummaryCard
            filterMode={filterMode}
            referenceDate={referenceDate}
            total={totalFiltered}
            expenseCount={filteredExpenses.length}
            selectedCategoryName={selectedCategory?.nombre}
            onChangeFilter={setFilterMode}
            onChangeReferenceDate={setReferenceDate}
          />

          {filteredExpenses.length > 0 ? (
            <View style={styles.metricsRow}>
              <Surface
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                  },
                ]}
                elevation={0}
              >
                <View style={styles.metricTop}>
                  <Calculator size={15} color={theme.colors.primary} strokeWidth={2.2} />
                  <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Promedio
                  </Text>
                </View>
                <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>
                  {formatCurrency(averageExpense)}
                </Text>
              </Surface>

              <Surface
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                  },
                ]}
                elevation={0}
              >
                <View style={styles.metricTop}>
                  <Receipt size={15} color={theme.colors.secondary} strokeWidth={2.2} />
                  <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Operaciones
                  </Text>
                </View>
                <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>
                  {filteredExpenses.length}{" "}
                  {filteredExpenses.length === 1 ? "gasto" : "gastos"}
                </Text>
              </Surface>
            </View>
          ) : null}

          <ExpensesPanel
            selectedCategoryName={selectedCategory?.nombre}
            selectedCategoryId={selectedCategoryId}
            categories={categories}
            expenses={filteredExpenses}
            hasSearchFilter={normalizedSearch.length > 0}
            onAdd={openNewExpenseDialog}
            onEdit={(expense) => {
              const expenseDate = new Date(expense.fecha);
              const safeDate = Number.isNaN(expenseDate.getTime()) ? new Date() : expenseDate;
              setExpenseForm({
                id: expense.id,
                categoriaId: expense.categoriaId,
                monto: String(expense.monto).replace(".", ","),
                fecha: format(safeDate, "dd/MM/yyyy"),
                hora: format(safeDate, "HH:mm"),
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
        fabStyle={{
          backgroundColor: theme.colors.secondary,
          borderRadius: 18,
        }}
        actions={[
          {
            icon: "cash-plus",
            label: "Nuevo gasto",
            onPress: openNewExpenseDialog,
          },
          {
            icon: "tag-plus-outline",
            label: "Nueva categoría",
            onPress: () => {
              setFabOpen(false);
              setCategoryForm(getInitialCategoryForm());
              setCategoryDialogVisible(true);
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
  searchbar: {
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryBarCard: {
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  categoryBarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryBarTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  categoryActionsInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryMiniAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryMiniActionText: {
    fontSize: 11,
    fontWeight: "700",
  },
  categoryScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  catPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryPillLabel: {
    fontSize: 13,
    letterSpacing: -0.1,
  },
  categoryPillAdd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  categoryPillAddText: {
    fontSize: 13,
    fontWeight: "700",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
  },
  metricTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  fabGroup: {
    position: "absolute",
  },
});
