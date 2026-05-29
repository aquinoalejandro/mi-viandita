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
  isWithinInterval,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";

export type ViewMode = "inicio" | "respaldo";
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
  "#1f4d45",
  "#49776f",
  "#f4b740",
  "#c0392b",
  "#2563eb",
  "#7c3aed",
  "#0891b2",
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

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(amount);

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

export const parseExpenseDate = (fecha: string, hora: string) => {
  const parsed = parse(`${fecha} ${hora}`, "dd/MM/yyyy HH:mm", new Date());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: palette.surface,
  },
}).dialog;
