// Shared by meetings' location_or_link display -- http/https values
// render as a clickable link, anything else as plain location text.
export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
