import React from "react";
import { Wallet } from "lucide-react-native";
import { View } from "react-native";
import { IconButton, Button, Surface, Text, useTheme } from "react-native-paper";

import type { ExpenseCategory } from "../../../types/types";
import { formatCurrency, iconMap } from "../misGastosShared";

type CategoryWithTotal = ExpenseCategory & { total: number };

type Props = {
  cardStyle: object;
  titleStyle: object;
  bodyStyle: object;
  emptyStateStyle: object;
  categoriesWrapStyle: object;
  categoryCardStyle: object;
  categoryTopStyle: object;
  categoryInfoStyle: object;
  iconWrapStyle: object;
  categoryNameStyle: object;
  expenseMetaStyle: object;
  inlineRowStyle: object;
  categories: CategoryWithTotal[];
  selectedCategoryId: string | null;
  onAdd: () => void;
  onSelect: (id: string) => void;
  onEdit: (category: ExpenseCategory) => void;
  onDelete: (id: string) => void;
};

function CategoriesPanel({
  cardStyle,
  titleStyle,
  bodyStyle,
  emptyStateStyle,
  categoriesWrapStyle,
  categoryCardStyle,
  categoryTopStyle,
  categoryInfoStyle,
  iconWrapStyle,
  categoryNameStyle,
  expenseMetaStyle,
  inlineRowStyle,
  categories,
  selectedCategoryId,
  onAdd,
  onSelect,
  onEdit,
  onDelete,
}: Props) {
  const theme = useTheme();

  const renderIcon = (iconName?: string, color?: string) => {
    const IconComponent = iconName ? iconMap[iconName] ?? Wallet : Wallet;
    return <IconComponent color={color ?? theme.colors.primary} size={20} strokeWidth={2.1} />;
  };

  return (
    <Surface style={cardStyle} elevation={0}>
      <View style={inlineRowStyle as object}>
        <Text style={titleStyle}>Categorias</Text>
        <Button mode="contained-tonal" onPress={onAdd}>
          Nueva categoria
        </Button>
      </View>

      {categories.length === 0 ? (
        <View style={emptyStateStyle as object}>
          <Text style={titleStyle}>Aun no hay categorias</Text>
          <Text style={bodyStyle}>Crea la primera categoria para empezar a cargar gastos.</Text>
        </View>
      ) : (
        <View style={categoriesWrapStyle as object}>
          {categories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            return (
              <Surface
                key={category.id}
                style={[
                  categoryCardStyle as object,
                  {
                    borderColor: isSelected
                      ? category.color ?? theme.colors.primary
                      : theme.colors.outline,
                    backgroundColor: isSelected
                      ? `${category.color ?? theme.colors.primary}12`
                      : theme.colors.surface,
                  },
                ]}
                elevation={0}
              >
                <View style={categoryTopStyle as object}>
                  <View style={categoryInfoStyle as object}>
                    <View
                      style={[
                        iconWrapStyle as object,
                        { backgroundColor: `${category.color ?? theme.colors.primary}20` },
                      ]}
                    >
                      {renderIcon(category.icono, category.color)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={categoryNameStyle}>{category.nombre}</Text>
                      <Text style={expenseMetaStyle}>{formatCurrency(category.total)}</Text>
                    </View>
                  </View>
                  <IconButton icon="pencil-outline" onPress={() => onEdit(category)} />
                </View>

                <Button mode={isSelected ? "contained" : "outlined"} onPress={() => onSelect(category.id)}>
                  {isSelected ? "Categoria activa" : "Ver gastos"}
                </Button>

                <Button mode="text" textColor={theme.colors.error} onPress={() => onDelete(category.id)}>
                  Eliminar categoria
                </Button>
              </Surface>
            );
          })}
        </View>
      )}
    </Surface>
  );
}

export default React.memo(CategoriesPanel);
