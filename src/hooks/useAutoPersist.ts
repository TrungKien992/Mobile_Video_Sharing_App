import { useEffect } from 'react';
import { saveJSON } from '../storage/storage';

// Hook ghi tự động: chỉ ghi vào AsyncStorage sau khi dữ liệu ban đầu đã được nạp xong (ready === true)
// giúp tránh ghi đè dữ liệu rỗng khi bấm F5 tải lại trang.
export function useAutoPersist<T>(key: string, value: T, ready: boolean) {
  useEffect(() => {
    if (ready) {
      saveJSON(key, value);
    }
  }, [key, value, ready]);
}
