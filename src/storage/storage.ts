import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Lỗi ghi AsyncStorage [${key}]:`, err);
  }
}

export async function loadJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    console.warn(`Lỗi đọc AsyncStorage [${key}]:`, err);
    return null;
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (err) {
    console.warn(`Lỗi xóa AsyncStorage [${key}]:`, err);
  }
}
