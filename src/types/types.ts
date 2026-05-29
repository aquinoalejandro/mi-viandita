import type { NavigatorScreenParams } from "@react-navigation/native";

export type MealSelection = {
  id: string;
  tipo: string;
  cantidad: number;
};

export type ViandaTipo = {
  id: string;
  nombre: string;
};

export type Client = {
  id: string;
  nombre: string;
  viandas: MealSelection[];
  detalleEspecifico?: string;
  direccion?: string;
  telefono?: string;
  creadoEn: string;
  diasPagadosAcumulados?: number;
  diasConsumidosEnPeriodo: number;
  diasReponer?: number;
  ajusteDiasPeriodo?: number;
  ultimoPago?: string;
  fechaInicioCiclo?: string;
  totalComidas?: number;
  comidasReponer?: number;
};

export type ClientEvent = {
  id: string;
  clienteId: string;
  tipo: "pago";
  fecha: string;
  detalle?: string;
};

export type Period = {
  id: string;
  clienteId: string;
  tipo: "periodo";
  estado: "pagado" | "impago";
  inicio: string;
  fin: string;
  pagoId?: string;
  detalle?: string;
};

export type PaymentCycle = {
  id: string;
  clienteId: string;
  pagoId: string;                           // Referencia al evento de pago que inicia el ciclo
  fechaDesde: string;                       // YYYY-MM-DD
  fechaHasta: string;                       // YYYY-MM-DD (último día hábil)
  diasHabiles: string[];                    // Array de todos los días hábiles en orden
  diasConsumidos: number;                   // Días ya utilizados del ciclo
  estado: 'completado' | 'activo' | 'futuro'; // Estado relativo a hoy
  creadoEn: string;                         // Timestamp ISO
};

export type Holiday = {
  id: string;
  fecha: string;
  motivo?: string;
};

export type ExpenseCategory = {
  id: string;
  nombre: string;
  icono?: string;
  color?: string;
  creadoEn: string;
};

export type ExpenseRecord = {
  id: string;
  categoriaId: string;
  monto: number;
  fecha: string;
  referencia?: string;
  creadoEn: string;
  actualizadoEn: string;
};

export type MiViandaStackParamList = {
  Clientes: undefined;
  "Nuevo Cliente": undefined;
  Cobros: { clienteId?: string; abrir?: "viandas" | "pagos" } | undefined;
  Calendario: undefined;
  Configuracion: undefined;
  "Tipos de vianda": undefined;
  Feriados: undefined;
  Estadisticas: undefined;
  Respaldo: undefined;
};

export type MisGastosStackParamList = {
  Home: undefined;
  Resumen: undefined;
  Categorias: undefined;
  Gastos: undefined;
  Respaldo: undefined;
};

export type RootStackParamList = {
  Bienvenida: undefined;
  MiVianda: NavigatorScreenParams<MiViandaStackParamList> | undefined;
  MisGastos: NavigatorScreenParams<MisGastosStackParamList>;
};