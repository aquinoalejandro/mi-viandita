import * as React from "react";
import { Alert, DeviceEventEmitter, View } from "react-native";
import { PaperProvider } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
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
import MisGastosScreen from "./src/screens/MisGastos/MisGastosScreen";
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
  Client,
  ClientEvent,
  Holiday,
  PaymentCycle,
  Period,
  ViandaTipo,
  MiViandaStackParamList,
  MisGastosStackParamList,
  RootStackParamList,
} from "./src/types/types";
import { STORAGE_KEYS } from "./src/utils/storage";

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MiViandaStack = createNativeStackNavigator<MiViandaStackParamList>();
const MisGastosStack = createNativeStackNavigator<MisGastosStackParamList>();

const mapRouteToTab = (
  routeName?: string
): keyof MiViandaStackParamList | undefined => {
  if (!routeName) return undefined;
  if (routeName === "Nuevo Cliente") return "Clientes";
  if (routeName === "Tipos de vianda") return "Configuracion";
  if (routeName === "Feriados") return "Configuracion";
  if (routeName === "Estadisticas") return "Configuracion";
  if (routeName === "Respaldo") return "Configuracion";
  if (routeName === "Clientes") return "Clientes";
  if (routeName === "Cobros") return "Cobros";
  if (routeName === "Calendario") return "Calendario";
  if (routeName === "Configuracion") return "Configuracion";
  return undefined;
};

const getActiveRouteName = (
  state?: NavigationState | PartialState<NavigationState>
): string | undefined => {
  if (!state) return undefined;
  const route = state.routes[state.index ?? 0];
  if (!route) return undefined;
  if ("state" in route && route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }
  return route.name;
};

function MiViandaModule() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "MiVianda">>();

  return (
    <View style={{ flex: 1 }}>
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
          screenOptions={{
            headerShown: false,
            animation: 'none',
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
      <MisGastosHeader />
      <View style={{ flex: 1 }}>
        <MisGastosStack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            animation: 'none',
          }}
        >

          <MisGastosStack.Screen name="Home" component={MisGastosScreen} />
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

const importarRespaldoDesdeUri = async (uri: string) => {
  const content = await FileSystem.readAsStringAsync(uri);
  const parsed = JSON.parse(content) as Partial<{
    clientes: Client[];
    eventosCliente: ClientEvent[];
    periodos: Period[];
    feriados: Holiday[];
    tiposVianda: ViandaTipo[];
    ciclosPagos: PaymentCycle[];
  }>;

  const eventosFiltrados = (Array.isArray(parsed.eventosCliente) ? parsed.eventosCliente : []).filter(
    (ev) => ev?.tipo === "pago"
  );

  const dataCompat = {
    clientes: Array.isArray(parsed.clientes) ? parsed.clientes : [],
    eventosCliente: eventosFiltrados,
    periodos: Array.isArray(parsed.periodos) ? parsed.periodos : [],
    feriados: Array.isArray(parsed.feriados) ? parsed.feriados : [],
    tiposVianda: Array.isArray(parsed.tiposVianda) ? parsed.tiposVianda : [],
    ciclosPagos: Array.isArray(parsed.ciclosPagos) ? parsed.ciclosPagos : [],
  };

  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(dataCompat.clientes)),
    AsyncStorage.setItem(
      STORAGE_KEYS.EVENTOS_CLIENTE,
      JSON.stringify(dataCompat.eventosCliente)
    ),
    AsyncStorage.setItem(STORAGE_KEYS.PERIODOS, JSON.stringify(dataCompat.periodos)),
    AsyncStorage.setItem(STORAGE_KEYS.CICLOS_PAGOS, JSON.stringify(dataCompat.ciclosPagos)),
    AsyncStorage.setItem(STORAGE_KEYS.FERIADOS, JSON.stringify(dataCompat.feriados)),
    AsyncStorage.setItem(STORAGE_KEYS.VIANDAS_TIPOS, JSON.stringify(dataCompat.tiposVianda)),
  ]);
};

export default function App() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const setUbi = useStore((state) => state.setUbi);

  React.useEffect(() => {
    const listener = DeviceEventEmitter.addListener(
      "shareIntentReceived",
      async (payload: SharedBackupPayload) => {
        const uri = payload?.uri;

        if (!uri) {
          return;
        }

        Alert.alert(
          "Importar respaldo",
          "Se reemplazará toda la información actual de MiVianda con el respaldo compartido. ¿Deseas continuar?",
          [
            {
              text: "Cancelar",
              style: "cancel",
            },
            {
              text: "Importar",
              onPress: async () => {
                try {
                  await importarRespaldoDesdeUri(uri);
                  Alert.alert("Respaldo importado", "Los datos de MiVianda fueron actualizados.");
                } catch (error) {
                  Alert.alert("Error al importar", "No se pudo leer o importar el archivo compartido.");
                }
              },
            },
          ]
        );
      }
    );

    return () => listener.remove();
  }, []);

  return (
    <PaperProvider theme={appTheme}>
      <NavigationContainer
        ref={navigationRef}
        onStateChange={(state) => {
          const routeName = getActiveRouteName(state);
          const mapped = mapRouteToTab(routeName);
          if (mapped) {
            setUbi(mapped);
          }
        }}
      >
        <RootStack.Navigator initialRouteName="Bienvenida" screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Bienvenida" component={BienvenidaScreen} />
          <RootStack.Screen name="MiVianda" component={MiViandaModule} />
          <RootStack.Screen name="MisGastos" component={MisGastosModule} />
        </RootStack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
