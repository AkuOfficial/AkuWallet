export function computeDateRange(timeSpan: string): { start?: string; end?: string } {
  const now = new Date()
  const iso = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
  const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0)

  switch (timeSpan) {
    case 'current_month': {
      const s = startOfMonth(now)
      const e = endOfMonth(now)
      return { start: iso(s), end: iso(e) }
    }
    case 'last_month': {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const s = startOfMonth(d)
      const e = endOfMonth(d)
      return { start: iso(s), end: iso(e) }
    }
    case 'last_6_months': {
      const s = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const e = endOfMonth(now)
      return { start: iso(s), end: iso(e) }
    }
    case 'last_year': {
      const s = new Date(now.getFullYear() - 1, now.getMonth(), 1)
      const e = endOfMonth(now)
      return { start: iso(s), end: iso(e) }
    }
    case 'max': {
      return { start: undefined, end: undefined }
    }
    default: {
      const s = startOfMonth(now)
      const e = endOfMonth(now)
      return { start: iso(s), end: iso(e) }
    }
  }
}

