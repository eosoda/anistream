export function formatOpeningTime(seconds?: number | null) {
  if (seconds == null || !Number.isFinite(seconds)) return '';
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds - minutes * 60;
  const formattedSeconds = Number.isInteger(remaining) ? String(remaining).padStart(2, '0') : remaining.toFixed(2).padStart(5, '0').replace(/0+$/, '').replace(/\.$/, '');
  return `${String(minutes).padStart(2, '0')}:${formattedSeconds}`;
}

export function parseOpeningTime(value: string) {
  const parts = value.trim().split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  if (parts.length === 2 && parts[1] < 60) return parts[0] * 60 + parts[1];
  if (parts.length === 3 && parts[1] < 60 && parts[2] < 60) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}
