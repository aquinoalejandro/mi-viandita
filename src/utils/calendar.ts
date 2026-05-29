import { Holiday } from "../types/types";
import { formatLocalDate } from "./date";

const toDateString = (date: Date) => formatLocalDate(date);

const parseLocalDate = (value: string) => new Date(`${value}T00:00:00`);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const isWeekend = (date: Date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

export const isBusinessDay = (date: Date, feriadosSet: Set<string>) => {
  const currentStr = toDateString(date);
  return !isWeekend(date) && !feriadosSet.has(currentStr);
};

export const buildMealCalendar = (
  startDate: string,
  count: number,
  feriados: Holiday[]
) => {
  const feriadosSet = new Set(feriados.map((f) => f.fecha));
  const result: string[] = [];

  let cursor = parseLocalDate(startDate);

  // Si el día de inicio es hábil, lo contamos como primera entrega del ciclo
  // (pago + entrega el mismo día → el ciclo termina un día antes)
  const startStr = toDateString(cursor);
  if (!isWeekend(cursor) && !feriadosSet.has(startStr)) {
    result.push(startStr);
  }

  while (result.length < count) {
    cursor = addDays(cursor, 1);
    const currentStr = toDateString(cursor);
    if (!isWeekend(cursor) && !feriadosSet.has(currentStr)) {
      result.push(currentStr);
    }
  }


  return result;
};

export const countBusinessDaysBetween = (
  startDate: string,
  endDate: string,
  feriados: Holiday[]
) => {
  if (endDate <= startDate) return 0;

  const feriadosSet = new Set(feriados.map((f) => f.fecha));
  const cursor = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  let count = 0;

  cursor.setDate(cursor.getDate() + 1);

  while (cursor <= end) {
    if (isBusinessDay(cursor, feriadosSet)) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
};

export const subtractBusinessDays = (
  dateStr: string,
  businessDays: number,
  feriados: Holiday[]
) => {
  if (businessDays <= 0) return dateStr;

  const feriadosSet = new Set(feriados.map((f) => f.fecha));
  const cursor = parseLocalDate(dateStr);
  let remaining = businessDays;

  while (remaining > 0) {
    cursor.setDate(cursor.getDate() - 1);
    if (isBusinessDay(cursor, feriadosSet)) {
      remaining -= 1;
    }
  }

  return toDateString(cursor);
};

export const isBeforeToday = (dateStr: string) => {
  const todayStr = toDateString(new Date());
  return dateStr < todayStr;
};

export const getNextBusinessDay = (dateStr: string, feriados: Holiday[]) => {
  const feriadosSet = new Set(feriados.map((f) => f.fecha));
  const cursor = parseLocalDate(dateStr);
  do {
    cursor.setDate(cursor.getDate() + 1);
  } while (!isBusinessDay(cursor, feriadosSet));
  return toDateString(cursor);
};

export const getWeekdayName = (dateStr: string) => {
  const date = parseLocalDate(dateStr);
  const day = date.getDay();
  switch (day) {
    case 0:
      return "Domingo";
    case 1:
      return "Lunes";
    case 2:
      return "Martes";
    case 3:
      return "Miércoles";
    case 4:
      return "Jueves";
    case 5:
      return "Viernes";
    case 6:
      return "Sábado";
    default:
      return "";
  }
};

export const getWeekStart = (dateStr: string) => {
  const date = parseLocalDate(dateStr);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = addDays(date, diff);
  return toDateString(monday);
};

export const getMonthLabel = (year: number, monthIndex: number) => {
  const date = new Date(year, monthIndex, 1);
  const month = date.toLocaleDateString("es-AR", { month: "long" });
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`;
};

export const addMonths = (year: number, monthIndex: number, diff: number) => {
  const date = new Date(year, monthIndex + diff, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
};

export type CalendarDay = {
  fecha: string;
  inMonth: boolean;
  isWeekend: boolean;
};

export const buildMonthGrid = (year: number, monthIndex: number) => {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const totalDays = last.getDate();

  const days: CalendarDay[] = [];

  // Days from previous month to fill the first week
  for (let i = 0; i < startDay; i += 1) {
    const date = new Date(year, monthIndex, -(startDay - 1 - i));
    days.push({
      fecha: toDateString(date),
      inMonth: false,
      isWeekend: isWeekend(date),
    });
  }

  // Days of current month
  for (let d = 1; d <= totalDays; d += 1) {
    const date = new Date(year, monthIndex, d);
    days.push({
      fecha: toDateString(date),
      inMonth: true,
      isWeekend: isWeekend(date),
    });
  }

  // Fill remaining cells to complete weeks
  while (days.length % 7 !== 0) {
    const nextIndex = days.length - (startDay + totalDays);
    const date = new Date(year, monthIndex + 1, nextIndex + 1);
    days.push({
      fecha: toDateString(date),
      inMonth: false,
      isWeekend: isWeekend(date),
    });
  }

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
};
