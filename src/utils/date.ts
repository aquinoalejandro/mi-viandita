const parseLocalDate = (value: string) => new Date(`${value}T00:00:00`);

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Valida que una cadena tenga formato YYYY-MM-DD y represente una fecha real del calendario. */
export const isValidIsoDateString = (value: string): boolean => {
  if (!ISO_DATE_REGEX.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

export const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getTodayString = () => formatLocalDate(new Date());

const getWeekdayName = (day: number) => {
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

export const formatDateLong = (dateStr: string) => {
  if (!dateStr) return "";
  if (!isValidIsoDateString(dateStr)) return dateStr;
  const [year, month, day] = dateStr.split("-");
  const date = parseLocalDate(dateStr);
  const weekday = getWeekdayName(date.getDay());
  return `${weekday} ${day}-${month}-${year}`;
};
