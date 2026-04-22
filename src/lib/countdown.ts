export function formatCountdown(targetIso: string): string {
  const diff = new Date(targetIso).getTime() - Date.now()
  if (diff <= 0) return 'any moment now'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return 'less than 1m'
}

export function executionTime(approvedAtIso: string, coolingOffHours: number): string {
  const approvedAt = new Date(approvedAtIso).getTime()
  return new Date(approvedAt + coolingOffHours * 3_600_000).toISOString()
}
