export function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value)
  }

  return value
    .toFixed(4)
    .replace(/0+$/, '')
    .replace(/\.$/, '')
}
