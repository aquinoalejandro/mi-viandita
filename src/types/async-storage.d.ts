declare module "@react-native-async-storage/async-storage" {
  type AsyncStorageValue = string | null;

  const AsyncStorage: {
    getItem(key: string): Promise<AsyncStorageValue>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    mergeItem?(key: string, value: string): Promise<void>;
    multiGet?(keys: string[]): Promise<[string, AsyncStorageValue][]>;
    multiSet?(keyValuePairs: [string, string][]): Promise<void>;
    multiRemove?(keys: string[]): Promise<void>;
  };

  export default AsyncStorage;
}
