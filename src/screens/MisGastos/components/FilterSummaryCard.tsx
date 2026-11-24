import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { IconButton, Surface, Text, useTheme } from "react-native-paper";
import { Calendar, RotateCcw } from "lucide-react-native";

import type { FilterMode } from "../misGastosShared";
import {
  formatCurrency,
  getFilterLabel,
  getResetPeriodLabel,
  isSamePeriod,
  shiftReferenceDate,
} from "../misGastosShared";

type Props = {
  filterMode: FilterMode;
  referenceDate: Date;
  total: number;
  expenseCount?: number;
  selectedCategoryName?: string;
  onChangeFilter: (value: FilterMode) => void;
  onChangeReferenceDate: (value: Date) => void;
};

function FilterSummaryCard({
  filterMode,
  referenceDate,
  total,
  expenseCount,
  selectedCategoryName,
  onChangeFilter,
  onChangeReferenceDate,
}: Props) {
  const theme = useTheme();

  const isCurrentPeriod =
    filterMode !== "historico" && isSamePeriod(referenceDate, new Date(), filterMode);

  const filterTabs = [
    { value: "dia", label: "Día" },
    { value: "semana", label: "Semana" },
    { value: "mes", label: "Mes" },
    { value: "anio", label: "Año" },
    { value: "historico", label: "Todo" },
  ] as const;

  return (
    <Surface
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}
      elevation={1}
    >
      {/* Selector de modo de filtro */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {filterTabs.map((item) => {
            const active = filterMode === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => onChangeFilter(item.value)}
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: active
                      ? theme.colors.primary
                      : theme.colors.surfaceVariant,
                    borderColor: active ? theme.colors.primary : theme.colors.outline,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
                      fontWeight: active ? "700" : "600",
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Barra de navegación de fecha */}
      {filterMode !== "historico" && (
        <View
          style={[
            styles.navBar,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <IconButton
            icon="chevron-left"
            size={22}
            iconColor={theme.colors.primary}
            style={styles.navButton}
            onPress={() =>
              onChangeReferenceDate(shiftReferenceDate(referenceDate, filterMode, -1))
            }
            accessibilityLabel="Período anterior"
          />

          <View style={styles.periodBadge}>
            <Calendar size={15} color={theme.colors.primary} strokeWidth={2.2} />
            <Text style={[styles.periodText, { color: theme.colors.onSurface }]}>
              {getFilterLabel(filterMode, referenceDate)}
            </Text>
          </View>

          <IconButton
            icon="chevron-right"
            size={22}
            iconColor={theme.colors.primary}
            style={styles.navButton}
            onPress={() =>
              onChangeReferenceDate(shiftReferenceDate(referenceDate, filterMode, 1))
            }
            accessibilityLabel="Período siguiente"
          />

          {!isCurrentPeriod && (
            <Pressable
              style={[
                styles.resetButton,
                { backgroundColor: theme.colors.primaryContainer },
              ]}
              onPress={() => onChangeReferenceDate(new Date())}
              accessibilityRole="button"
              accessibilityLabel={`Volver a ${getResetPeriodLabel(filterMode).toLowerCase()}`}
            >
              <RotateCcw size={13} color={theme.colors.primary} strokeWidth={2.4} />
              <Text style={[styles.resetText, { color: theme.colors.primary }]}>
                {getResetPeriodLabel(filterMode)}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Hero Metric Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroTop}>
          <Text style={[styles.heroEyebrow, { color: theme.colors.onSurfaceVariant }]}>
            {selectedCategoryName
              ? `GASTOS EN ${selectedCategoryName.toUpperCase()}`
              : "TOTAL DE GASTOS"}
          </Text>
          {expenseCount !== undefined && (
            <View
              style={[
                styles.countBadge,
                {
                  backgroundColor: theme.colors.primaryContainer,
                  borderColor: `${theme.colors.primary}30`,
                },
              ]}
            >
              <Text style={[styles.countText, { color: theme.colors.primary }]}>
                {expenseCount} {expenseCount === 1 ? "gasto" : "gastos"}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.heroAmount, { color: theme.colors.onSurface }]}>
          {formatCurrency(total)}
        </Text>

        <Text style={[styles.heroFootnote, { color: theme.colors.onSurfaceVariant }]}>
          {selectedCategoryName
            ? `Registros filtrados para ${selectedCategoryName}.`
            : "Total consolidado de todos los rubros en el período."}
        </Text>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  tabContainer: {
    width: "100%",
  },
  tabScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 13,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
  },
  navButton: {
    margin: 0,
  },
  periodBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  periodText: {
    fontSize: 14,
    fontWeight: "700",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  resetText: {
    fontSize: 11,
    fontWeight: "700",
  },
  heroSection: {
    paddingTop: 4,
    gap: 4,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  heroEyebrow: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginVertical: 2,
  },
  heroFootnote: {
    fontSize: 13,
  },
});

export default React.memo(FilterSummaryCard);
