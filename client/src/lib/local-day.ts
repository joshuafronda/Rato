// A date as 'YYYY-MM-DD' in the laptop's own time zone (not UTC), matching the server's days.
export function localDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// 'YYYY-MM-DD' as a readable date, e.g. 'Sun, Oct 18'.
export function dayLabel(day: string): string {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year, month - 1, date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
