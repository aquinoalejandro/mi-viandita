import { StyleSheet } from "react-native";
import { palette } from "../../theme/appTheme";
import {
  Banknote,
  Briefcase,
  Bus,
  Car,
  Dumbbell,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  House,
  PiggyBank,
  Plane,
  Receipt,
  Shirt,
  ShoppingCart,
  Smartphone,
  UtensilsCrossed,
  Wallet,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  isSameMonth,
  isSameWeek,
  isSameYear,
  isWithinInterval,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";

export type FilterMode = "dia" | "semana" | "mes" | "anio" | "historico";

export type CategoryFormState = {
  id?: string;
  nombre: string;
  icono?: string;
  color?: string;
};

export type ExpenseFormState = {
  id?: string;
  categoriaId: string;
  monto: string;
  fecha: string;
  hora: string;
  referencia: string;
};

export const categoryColors = [
  "#1d4f91",
  "#2563eb",
  "#0891b2",
  "#7c3aed",
  "#2f855a",
  "#f4b740",
  "#c0392b",
  "#9a3412",
];

export const iconOptions: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: "Wallet", label: "General", Icon: Wallet },
  { key: "ShoppingCart", label: "Compras", Icon: ShoppingCart },
  { key: "Bus", label: "Colectivo", Icon: Bus },
  { key: "Car", label: "Auto", Icon: Car },
  { key: "House", label: "Casa", Icon: House },
  { key: "UtensilsCrossed", label: "Comida", Icon: UtensilsCrossed },
  { key: "HeartPulse", label: "Salud", Icon: HeartPulse },
  { key: "Banknote", label: "Facturas", Icon: Banknote },
  { key: "Receipt", label: "Servicios", Icon: Receipt },
  { key: "Shirt", label: "Ropa", Icon: Shirt },
  { key: "GraduationCap", label: "Estudio", Icon: GraduationCap },
  { key: "Gamepad2", label: "Ocio", Icon: Gamepad2 },
  { key: "Plane", label: "Viajes", Icon: Plane },
  { key: "Dumbbell", label: "Deporte", Icon: Dumbbell },
  { key: "Briefcase", label: "Trabajo", Icon: Briefcase },
  { key: "Smartphone", label: "Tecnología", Icon: Smartphone },
  { key: "PiggyBank", label: "Ahorro", Icon: PiggyBank },
];

export const iconMap = iconOptions.reduce<Record<string, LucideIcon>>((acc, item) => {
  acc[item.key] = item.Icon;
  return acc;
}, {});

export const buildId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const getInitialCategoryForm = (): CategoryFormState => ({
  nombre: "",
  icono: undefined,
  color: undefined,
});

export const getInitialExpenseForm = (categoriaId = ""): ExpenseFormState => {
  const now = new Date();
  return {
    categoriaId,
    monto: "",
    fecha: format(now, "dd/MM/yyyy"),
    hora: format(now, "HH:mm"),
    referencia: "",
  };
};

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

export const formatCurrency = (amount: number) => currencyFormatter.format(amount);

const monthYearFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
});

export const formatMonthYearLabel = (date: Date) =>
  monthYearFormatter
    .format(date)
    .replace(/^\w/, (char) => char.toUpperCase())
    .replace(/\bde\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Parsea importes soportando formato argentino ("1.500,50", "1500,50") y estándar ("1500.50", "1,500.50").
 * Retorna null si el importe es inválido o <= 0.
 */
export const parseAmountInput = (raw: string): number | null => {
  const cleaned = raw.replace(/\$/g, "").replace(/\s+/g, "").trim();
  if (!cleaned) return null;
  if (/[^0-9.,]/.test(cleaned)) return null;

  const commaCount = (cleaned.match(/,/g) ?? []).length;
  const dotCount = (cleaned.match(/\./g) ?? []).length;

  let normalized = cleaned;

  if (commaCount > 0 && dotCount > 0) {
    // El último separador indica el decimal
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      // Ej: 1.500,50
      if (commaCount > 1) return null;
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // Ej: 1,500.50
      if (dotCount > 1) return null;
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (commaCount > 0) {
    if (commaCount > 1) {
      // Solo podría ser separador de miles si todos los grupos tras la primera coma tienen 3 dígitos
      const parts = cleaned.split(",");
      if (parts.slice(1).every((p) => p.length === 3)) {
        normalized = cleaned.replace(/,/g, "");
      } else {
        return null;
      }
    } else {
      normalized = cleaned.replace(",", ".");
    }
  } else if (dotCount > 1) {
    const parts = cleaned.split(".");
    if (parts.slice(1).every((p) => p.length === 3)) {
      normalized = cleaned.replace(/\./g, "");
    } else {
      return null;
    }
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const num = Number(normalized);
  if (!Number.isFinite(num) || num <= 0) return null;

  return Math.round(num * 100) / 100;
};

/**
 * Formatea dígitos mientras se escribe a dd/MM/yyyy sin impedir borrar.
 */
export const formatDateInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

/**
 * Formatea dígitos mientras se escribe a HH:mm sin impedir borrar.
 */
export const formatTimeInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

/**
 * Valida estrictamente dd/MM/yyyy y HH:mm (incluyendo años bisiestos y horas 00..23 / 00..59).
 */
export const parseExpenseDate = (fecha: string, hora: string): Date | null => {
  const fechaClean = fecha.trim();
  const horaClean = hora.trim();

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fechaClean)) return null;
  if (!/^\d{2}:\d{2}$/.test(horaClean)) return null;

  const parsed = parse(`${fechaClean} ${horaClean}`, "dd/MM/yyyy HH:mm", new Date());
  if (Number.isNaN(parsed.getTime())) return null;

  if (
    format(parsed, "dd/MM/yyyy") !== fechaClean ||
    format(parsed, "HH:mm") !== horaClean
  ) {
    return null;
  }

  return parsed;
};

export const getFilterLabel = (mode: FilterMode, referenceDate: Date) => {
  if (mode === "historico") return "Histórico completo";
  if (mode === "dia") return format(referenceDate, "dd/MM/yyyy");
  if (mode === "semana") {
    const start = startOfWeek(referenceDate, { weekStartsOn: 1 });
    const end = endOfWeek(referenceDate, { weekStartsOn: 1 });
    return `${format(start, "dd/MM")} - ${format(end, "dd/MM")}`;
  }
  if (mode === "mes") return formatMonthYearLabel(referenceDate);
  return format(referenceDate, "yyyy");
};

export const isSamePeriod = (dateA: Date, dateB: Date, mode: FilterMode): boolean => {
  if (mode === "historico") return true;
  if (mode === "dia") return isSameDay(dateA, dateB);
  if (mode === "semana") return isSameWeek(dateA, dateB, { weekStartsOn: 1 });
  if (mode === "mes") return isSameMonth(dateA, dateB);
  return isSameYear(dateA, dateB);
};

export const getResetPeriodLabel = (mode: FilterMode): string => {
  if (mode === "dia") return "Hoy";
  if (mode === "semana") return "Esta semana";
  if (mode === "mes") return "Este mes";
  if (mode === "anio") return "Este año";
  return "Actual";
};

export const isExpenseInFilter = (
  expenseDate: Date,
  filterMode: FilterMode,
  referenceDate: Date
) => {
  if (filterMode === "historico") return true;

  let start: Date;
  let end: Date;

  if (filterMode === "dia") {
    start = startOfDay(referenceDate);
    end = endOfDay(referenceDate);
  } else if (filterMode === "semana") {
    start = startOfWeek(referenceDate, { weekStartsOn: 1 });
    end = endOfWeek(referenceDate, { weekStartsOn: 1 });
  } else if (filterMode === "mes") {
    start = startOfMonth(referenceDate);
    end = endOfMonth(referenceDate);
  } else {
    start = startOfYear(referenceDate);
    end = endOfYear(referenceDate);
  }

  return isWithinInterval(expenseDate, { start, end });
};

export const shiftReferenceDate = (
  referenceDate: Date,
  filterMode: FilterMode,
  direction: -1 | 1
) => {
  if (filterMode === "dia") return addDays(referenceDate, direction);
  if (filterMode === "semana") return addWeeks(referenceDate, direction);
  if (filterMode === "mes") return addMonths(referenceDate, direction);
  if (filterMode === "anio") return addYears(referenceDate, direction);
  return referenceDate;
};

export const misGastosDialogStyle = StyleSheet.create({
  dialog: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: palette.surface,
  },
}).dialog;
