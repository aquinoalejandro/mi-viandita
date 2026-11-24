import * as FileSystem from "expo-file-system/legacy";

const isFileUri = (uri: string) => uri.startsWith("file://");

export const resolveSharedFileUri = async (uri: string) => {
  if (!uri) {
    throw new Error("No se recibió un archivo válido.");
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

/**
 * Lee el contenido de un archivo local o content:// URI y limpia el archivo temporal si se copió.
 */
export const readSharedFileText = async (uri: string): Promise<string> => {
  const readableUri = await resolveSharedFileUri(uri);
  const createdTemp = !isFileUri(uri) && readableUri !== uri;

  try {
    return await FileSystem.readAsStringAsync(readableUri);
  } finally {
    if (createdTemp) {
      await FileSystem.deleteAsync(readableUri, { idempotent: true }).catch(() => undefined);
    }
  }
};
