/** Birthdays are kept as day + month only; Feb 29 is celebrated on Feb 28 in other years. */

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

function birthdayIn(year: number, month: number, day: number) {
  const d = month === 2 && day === 29 && !isLeap(year) ? 28 : day
  return new Date(year, month - 1, d)
}

export function isBirthdayToday(b: { month: number; day: number } | undefined, now = new Date()) {
  if (!b) return false
  const today = birthdayIn(now.getFullYear(), b.month, b.day)
  return today.getMonth() === now.getMonth() && today.getDate() === now.getDate()
}

/** Start of their next birthday (today's if it's today). */
export function nextBirthday(b: { month: number; day: number }, now = new Date()) {
  const thisYear = birthdayIn(now.getFullYear(), b.month, b.day)
  if (isBirthdayToday(b, now)) return thisYear
  return thisYear.getTime() > now.getTime() ? thisYear : birthdayIn(now.getFullYear() + 1, b.month, b.day)
}

/** Calendar countdown to the next birthday: months, days, hours, minutes, seconds. */
export function birthdayCountdown(b: { month: number; day: number }, now = new Date()) {
  const target = nextBirthday(b, now)
  let months = 0
  const cursor = new Date(now)
  // Whole months first (calendar months, like "3 months 5 days")
  for (;;) {
    const next = new Date(cursor)
    next.setMonth(next.getMonth() + 1)
    if (next.getTime() > target.getTime()) break
    cursor.setTime(next.getTime())
    months++
  }
  let rest = Math.max(0, target.getTime() - cursor.getTime())
  const days = Math.floor(rest / 86_400_000)
  rest -= days * 86_400_000
  const hours = Math.floor(rest / 3_600_000)
  rest -= hours * 3_600_000
  const minutes = Math.floor(rest / 60_000)
  const seconds = Math.floor((rest - minutes * 60_000) / 1000)
  return { months, days, hours, minutes, seconds, target }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "14 Feb" */
export const formatBirthday = (b: { month: number; day: number }) => `${b.day} ${MONTHS[b.month - 1]}`
