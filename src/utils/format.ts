export function formatDateTime(isoOrRelative?: string | null): string {
  if (!isoOrRelative) return 'Vừa xong';
  const date = new Date(isoOrRelative);
  if (isNaN(date.getTime())) {
    return isoOrRelative;
  }
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function formatNumber(n?: number | null): string {
  if (!n || n < 0) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function formatPrice(price?: number | null): string {
  return (price || 0).toLocaleString('vi-VN') + ' đ';
}
