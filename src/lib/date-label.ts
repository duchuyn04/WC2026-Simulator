export function formatDateLabel(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dStr = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
  const todayStr = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(today);
  const tomorrowStr = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(tomorrow);

  if (dStr === todayStr) return `HÔM NAY · ${dStr}`;
  if (dStr === tomorrowStr) return `NGÀY MAI · ${dStr}`;
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
  });
}
