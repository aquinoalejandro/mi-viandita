import * as React from "react";
import { Alert, DeviceEventEmitter, View } from "react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { registerTranslation, es } from "react-native-paper-dates";
import {
  NavigationContainer,
  CommonActions,
  type NavigationState,
  type PartialState,
  useNavigation,
  useNavigationContainerRef,
} from "@react-navigation/native";
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from "@react-navigation/native-stack";

import BienvenidaScreen from "./src/screens/BienvenidaScreen";
import ResumenScreen from "./src/screens/MisGastos/ResumenScreen";
import CategoriasScreen from "./src/screens/MisGastos/CategoriasScreen";
import GastosScreen from "./src/screens/MisGastos/GastosScreen";
import RespaldoMisGastosScreen from "./src/screens/MisGastos/RespaldoMisGastosScreen";
import MisGastosHeader from "./src/components/MisGastos/Header";
import MisGastosScreenSelector from "./src/components/MisGastos/ScreenSelector";
import ClientesScreen from "./src/screens/MiVianda/ClientesScreen";
import NuevoClienteScreen from "./src/screens/MiVianda/NuevoClienteScreen";
import CobrosScreen from "./src/screens/MiVianda/CobrosScreen";
import CalendarioScreen from "./src/screens/MiVianda/CalendarioScreen";
import ConfiguracionScreen from "./src/screens/MiVianda/ConfiguracionScreen";
import TiposViandaScreen from "./src/screens/MiVianda/TiposViandaScreen";
import FeriadosScreen from "./src/screens/MiVianda/FeriadosScreen";
import EstadisticasScreen from "./src/screens/MiVianda/EstadisticasScreen";
import RespaldoScreen from "./src/screens/MiVianda/RespaldoScreen";
import Header from "./src/components/MiVianda/Header";
import MiViandaScreenSelector from "./src/components/MiVianda/ScreenSelector";
import { appTheme } from "./src/theme/appTheme";
import { useStore } from "./src/store/zustand";
import {
  MiViandaStackParamList,
  MisGastosStackParamList,
  RootStackParamList,
} from "./src/types/types";
import { readSharedFileText } from "./src/utils/sharedBackupFile";
import { detectSharedBackup } from "./src/utils/backup";

registerTranslation("es", es);

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MiViandaStack = createNativeStackNavigator<MiViandaStackParamList>();
const MisGastosStack = createNativeStackNavigator<MisGastosStackParamList>();

const mapMiViandaRouteToTab = (
  routeName?: string
): keyof MiViandaStackParamList | undefined => {
  if (!routeName) return undefined;
  if (routeName === "Nuevo Cliente" || routeName === "Clientes") return "Clientes";
  if (
    routeName === "Tipos de vianda" ||
    routeName === "Feriados" ||
    routeName === "Estadisticas" ||
    routeName === "Respaldo" ||
    routeName === "Configuracion"
  ) {
    return "Configuracion";
  }
  if (routeName === "Cobros") return "Cobros";
  if (routeName === "Calendario") return "Calendario";
  return undefined;
};

const mapMisGastosRouteToTab = (
  routeName?: string
): keyof MisGastosStackParamList | undefined => {
  if (!routeName) return undefined;
  if (
    routeName === "Resumen" ||
    routeName === "Gastos" ||
    routeName === "Categorias" ||
    routeName === "Respaldo"
  ) {
    return routeName;
  }
  return undefined;
};

function MiViandaModule() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "MiVianda">>();
  const hydrateMiVianda = useStore((state) => state.hydrateMiVianda);

  React.useEffect(() => {
    void hydrateMiVianda();
  }, [hydrateMiVianda]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Header
        onHomePress={() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Bienvenida" }],
            })
          );
        }}
      />
      <View style={{ flex: 1 }}>
        <MiViandaStack.Navigator
          initialRouteName="Clientes"
          screenOptions={{
            headerShown: false,
            animation: "none",
          }}
        >
          <MiViandaStack.Screen name="Clientes" component={ClientesScreen} />
          <MiViandaStack.Screen name="Nuevo Cliente" component={NuevoClienteScreen} />
          <MiViandaStack.Screen name="Cobros" component={CobrosScreen} />
          <MiViandaStack.Screen name="Calendario" component={CalendarioScreen} />
          <MiViandaStack.Screen name="Configuracion" component={ConfiguracionScreen} />
          <MiViandaStack.Screen name="Tipos de vianda" component={TiposViandaScreen} />
          <MiViandaStack.Screen name="Feriados" component={FeriadosScreen} />
          <MiViandaStack.Screen name="Estadisticas" component={EstadisticasScreen} />
          <MiViandaStack.Screen name="Respaldo" component={RespaldoScreen} />
        </MiViandaStack.Navigator>
      </View>
      <MiViandaScreenSelector />
    </View>
  );
}

function MisGastosModule() {
  const hydrateMisGastos = useStore((state) => state.hydrateMisGastos);

  React.useEffect(() => {
    void hydrateMisGastos();
  }, [hydrateMisGastos]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <MisGastosHeader />
      <View style={{ flex: 1 }}>
        <MisGastosStack.Navigator
          initialRouteName="Resumen"
          screenOptions={{
            headerShown: false,
            animation: "none",
          }}
        >
          <MisGastosStack.Screen name="Resumen" component={ResumenScreen} />
          <MisGastosStack.Screen name="Categorias" component={CategoriasScreen} />
          <MisGastosStack.Screen name="Gastos" component={GastosScreen} />
          <MisGastosStack.Screen name="Respaldo" component={RespaldoMisGastosScreen} />
        </MisGastosStack.Navigator>
      </View>
      <MisGastosScreenSelector />
    </View>
  );
}

type SharedBackupPayload = {
  uri?: string;
  mimeType?: string;
};

export default function App() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const setUbi = useStore((state) => state.setUbi);
  const setMisGastosUbi = useStore((state) => state.setMisGastosUbi);
  const handlingShareRef = React.useRef(false);
  const lastHandledUriRef = React.useRef<{ uri: string; time: number } | null>(null);

  React.useEffect(() => {
    const listener = DeviceEventEmitter.addListener(
      "shareIntentReceived",
      async (payload: SharedBackupPayload) => {
        const uri = payload?.uri;
        if (!uri) return;

        const now = Date.now();
        if (
          handlingShareRef.current ||
          (lastHandledUriRef.current &&
            lastHandledUriRef.current.uri === uri &&
            now - lastHandledUriRef.current.time < 3000)
        ) {
          return;
        }

        handlingShareRef.current = true;
        lastHandledUriRef.current = { uri, time: now };

        try {
          const content = await readSharedFileText(uri);
          const detected = detectSharedBackup(content);

          if (detected.kind === "invalid") {
            handlingShareRef.current = false;
            Alert.alert("Archivo no compatible", detected.reason);
            return;
          }

          if (detected.kind === "mivianda") {
            const { clientes, eventosCliente, feriados } = detected.data;
            Alert.alert(
              "Importar respaldo de MiVianda",
              `Se detectaron ${clientes.length} cliente(s), ${eventosCliente.length} pago(s) y ${feriados.length} feriado(s).\n\nSe reemplazará la información actual de MiVianda. ¿Deseás continuar?`,
              [
                {
                  text: "Cancelar",
                  style: "cancel",
                  onPress: () => {
                    handlingShareRef.current = false;
                  },
                },
                {
                  text: "Importar",
                  onPress: async () => {
                    try {
                      await useStore.getState().replaceMiViandaData(detected.data);
                      Alert.alert("Respaldo importado", "Los datos de MiVianda fueron actualizados.");
                    } catch {
                      Alert.alert("Error al importar", "No se pudieron guardar los datos de MiVianda.");
                    } finally {
                      handlingShareRef.current = false;
                    }
                  },
                },
              ],
              {
                onDismiss: () => {
                  handlingShareRef.current = false;
                },
              }
            );
            return;
          }

          const { categorias, gastos } = detected.data;
          Alert.alert(
            "Importar respaldo de MisGastos",
            `Se detectaron ${categorias.length} categoría(s) y ${gastos.length} gasto(s).\n\nSe reemplazará la información actual de MisGastos. ¿Deseás continuar?`,
            [
              {
                text: "Cancelar",
                style: "cancel",
                onPress: () => {
                  handlingShareRef.current = false;
                },
              },
              {
                text: "Importar",
                onPress: async () => {
                  try {
                    await useStore.getState().replaceMisGastosData(categorias, gastos);
                    Alert.alert("Respaldo importado", "Los datos de MisGastos fueron actualizados.");
                  } catch {
                    Alert.alert("Error al importar", "No se pudieron guardar los datos de MisGastos.");
                  } finally {
                    handlingShareRef.current = false;
                  }
                },
              },
            ],
            {
              onDismiss: () => {
                handlingShareRef.current = false;
              },
            }
          );
        } catch {
          handlingShareRef.current = false;
          Alert.alert("Error al importar", "No se pudo leer el archivo compartido.");
        }
      }
    );

    return () => listener.remove();
  }, []);

  const handleStateChange = (state?: NavigationState | PartialState<NavigationState>) => {
    if (!state) return;
    const rootRoute = state.routes[state.index ?? 0];
    if (!rootRoute) return;

    const nestedState =
      "state" in rootRoute
        ? (rootRoute.state as NavigationState | PartialState<NavigationState> | undefined)
        : undefined;
    const nestedRoute = nestedState?.routes?.[nestedState.index ?? 0];
    const nestedName = nestedRoute?.name;

    if (rootRoute.name === "MiVianda") {
      const mapped = mapMiViandaRouteToTab(nestedName ?? "Clientes");
      if (mapped) setUbi(mapped);
    } else if (rootRoute.name === "MisGastos") {
      const mapped = mapMisGastosRouteToTab(nestedName ?? "Resumen");
      if (mapped) setMisGastosUbi(mapped);
    }
  };

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <StatusBar style="dark" />
        <NavigationContainer ref={navigationRef} onStateChange={handleStateChange}>
          <RootStack.Navigator initialRouteName="Bienvenida" screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="Bienvenida" component={BienvenidaScreen} />
            <RootStack.Screen name="MiVianda" component={MiViandaModule} />
            <RootStack.Screen name="MisGastos" component={MisGastosModule} />
          </RootStack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
