import { useApp } from '../context/AppContext';

/**
 * Hook kiểm tra trạng thái Hydration (nạp dữ liệu từ AsyncStorage + MongoDB)
 * Theo chuẩn Bài Thực Hành Buổi 8: chỉ render giao diện hoặc cho phép useAutoPersist ghi
 * sau khi ready === true để tránh mất dữ liệu khi nhấn F5.
 */
export function usePersistence(): boolean {
  const { ready } = useApp();
  return ready;
}
