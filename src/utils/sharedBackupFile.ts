import * as FileSystem from "expo-file-system/legacy";

const isFileUri = (uri: string) => uri.startsWith("file://");

export const resolveSharedFileUri = async (uri: string) => {
  if (!uri) {
    throw new Error("No se recibio un archivo valido.");
  }

  if (isFileUri(uri)) {
    return uri;
  }

  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error("No hay un directorio temporal disponible para leer el archivo.");
  }

  const tempUri = `${baseDir}mi-vianda-import-${Date.now()}.json`;
  await FileSystem.copyAsync({ from: uri, to: tempUri });
  return tempUri;
};
