export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export const DAY_LABELS = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

export const DEFAULT_BUSINESS_HOURS = {
  timezone: 'Asia/Ho_Chi_Minh',
  days: {
    mon: [['08:00', '12:00'], ['13:00', '17:00']],
    tue: [['08:00', '12:00'], ['13:00', '17:00']],
    wed: [['08:00', '12:00'], ['13:00', '17:00']],
    thu: [['08:00', '12:00'], ['13:00', '17:00']],
    fri: [['08:00', '12:00'], ['13:00', '17:00']],
    sat: [],
    sun: [],
  },
  holidays: [],
}

// Always returns a complete schedule with every day key and cloned intervals
export function normalizeSchedule(schedule) {
  const days = {}
  for (const key of DAY_KEYS) {
    const intervals = schedule && schedule.days && Array.isArray(schedule.days[key])
      ? schedule.days[key]
      : []
    days[key] = intervals.map((interval) => [String(interval[0]), String(interval[1])])
  }

  return {
    timezone:
      (schedule && schedule.timezone) || DEFAULT_BUSINESS_HOURS.timezone,
    days,
    holidays: Array.isArray(schedule && schedule.holidays)
      ? schedule.holidays.filter(Boolean).map(String)
      : [],
  }
}

export function scheduleSummary(schedule) {
  if (!schedule) return ''

  const activeDays = DAY_KEYS.filter(
    (key) => schedule.days && Array.isArray(schedule.days[key]) && schedule.days[key].length
  )

  if (!activeDays.length) return 'No working days configured'

  return activeDays
    .map((key) => {
      const intervals = schedule.days[key]
        .map(([start, end]) => `${start}–${end}`)
        .join(', ')
      return `${DAY_LABELS[key].slice(0, 3)} ${intervals}`
    })
    .join(' · ')
}
