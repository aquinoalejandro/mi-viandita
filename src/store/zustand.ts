import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import type {
  ExpenseCategory,
  ExpenseRecord,
  MiViandaStackParamList,
  MisGastosStackParamList,
} from "../types/types";
import { STORAGE_KEYS } from "../utils/storage";

type Store = {
  ubicacion: keyof MiViandaStackParamList;
  setUbi: (ruta: keyof MiViandaStackParamList) => void;
  misGastosUbicacion: keyof MisGastosStackParamList;
  setMisGastosUbi: (ruta: keyof MisGastosStackParamList) => void;
  misGastosCategories: ExpenseCategory[];
  misGastosExpenses: ExpenseRecord[];
  misGastosHydrated: boolean;
  misGastosHydrating: boolean;
  hydrateMisGastos: () => Promise<void>;
  persistMisGastosCategories: (nextCategories: ExpenseCategory[]) => Promise<void>;
  persistMisGastosExpenses: (nextExpenses: ExpenseRecord[]) => Promise<void>;
  replaceMisGastosData: (
    nextCategories: ExpenseCategory[],
    nextExpenses: ExpenseRecord[]
  ) => Promise<void>;
  clearMisGastosData: () => Promise<void>;
};

export const useStore = create<Store>((set, get) => ({
  ubicacion: "Clientes",
  setUbi: (ruta) => set({ ubicacion: ruta }),
  misGastosUbicacion: "Home",
  setMisGastosUbi: (ruta) => set({ misGastosUbicacion: ruta }),
  misGastosCategories: [],
  misGastosExpenses: [],
  misGastosHydrated: false,
  misGastosHydrating: false,
  hydrateMisGastos: async () => {
    const { misGastosHydrated, misGastosHydrating } = get();
    if (misGastosHydrated || misGastosHydrating) {
      return;
    }

    set({ misGastosHydrating: true });
    try {
      const [storedCategories, storedExpenses] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.GASTOS_CATEGORIAS),
        AsyncStorage.getItem(STORAGE_KEYS.GASTOS_REGISTROS),
      ]);

      const nextCategories = storedCategories
        ? (JSON.parse(storedCategories) as ExpenseCategory[])
        : [];
      const nextExpenses = storedExpenses ? (JSON.parse(storedExpenses) as ExpenseRecord[]) : [];

      set({
        misGastosCategories: nextCategories,
        misGastosExpenses: nextExpenses,
        misGastosHydrated: true,
      });
    } catch {
      set({
        misGastosCategories: [],
        misGastosExpenses: [],
        misGastosHydrated: true,
      });
    } finally {
      set({ misGastosHydrating: false });
    }
  },
  persistMisGastosCategories: async (nextCategories) => {
    set({ misGastosCategories: nextCategories, misGastosHydrated: true });
    await AsyncStorage.setItem(STORAGE_KEYS.GASTOS_CATEGORIAS, JSON.stringify(nextCategories));
  },
  persistMisGastosExpenses: async (nextExpenses) => {
    set({ misGastosExpenses: nextExpenses, misGastosHydrated: true });
    await AsyncStorage.setItem(STORAGE_KEYS.GASTOS_REGISTROS, JSON.stringify(nextExpenses));
  },
  replaceMisGastosData: async (nextCategories, nextExpenses) => {
    set({
      misGastosCategories: nextCategories,
      misGastosExpenses: nextExpenses,
      misGastosHydrated: true,
    });
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.GASTOS_CATEGORIAS, JSON.stringify(nextCategories)),
      AsyncStorage.setItem(STORAGE_KEYS.GASTOS_REGISTROS, JSON.stringify(nextExpenses)),
    ]);
  },
  clearMisGastosData: async () => {
    set({
      misGastosCategories: [],
      misGastosExpenses: [],
      misGastosHydrated: true,
    });
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.GASTOS_CATEGORIAS),
      AsyncStorage.removeItem(STORAGE_KEYS.GASTOS_REGISTROS),
    ]);
  },
}));
