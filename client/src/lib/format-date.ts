// The admin's date_format setting, e.g. 'MMM d, yyyy'. Supports yyyy yy MMMM MMM MM M dd d;
// every other character is printed as is.
const TOKENS = /yyyy|yy|MMMM|MMM|MM|M|dd|d/g

export function formatDate(date: Date, format: string, locale = 'en-US'): string {
  return format.replace(TOKENS, (token) => {
    switch (token) {
      case 'yyyy':
        return String(date.getFullYear())
      case 'yy':
        return String(date.getFullYear()).slice(-2)
      case 'MMMM':
        return date.toLocaleString(locale, { month: 'long' })
      case 'MMM':
        return date.toLocaleString(locale, { month: 'short' })
      case 'MM':
        return pad(date.getMonth() + 1)
      case 'M':
        return String(date.getMonth() + 1)
      case 'dd':
        return pad(date.getDate())
      default:
        return String(date.getDate())
    }
  })
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
