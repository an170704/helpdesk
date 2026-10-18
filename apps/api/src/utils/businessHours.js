const AppError = require('./AppError');

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Default working schedule: Mon-Fri, 08:00-12:00 and 13:00-17:00 (Vietnam time)
const DEFAULT_BUSINESS_HOURS = {
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
};

function isValidTimezone(timezone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function validateBusinessHours(schedule) {
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
    throw new AppError(400, 'business_hours must be an object');
  }

  if (!schedule.timezone || !isValidTimezone(String(schedule.timezone))) {
    throw new AppError(400, 'business_hours.timezone is invalid');
  }

  if (!schedule.days || typeof schedule.days !== 'object' || Array.isArray(schedule.days)) {
    throw new AppError(400, 'business_hours.days must be an object');
  }

  for (const [day, intervals] of Object.entries(schedule.days)) {
    if (!DAY_KEYS.includes(day)) {
      throw new AppError(400, `Unknown day key "${day}" (use sun..sat)`);
    }
    if (!Array.isArray(intervals)) {
      throw new AppError(400, `business_hours.days.${day} must be an array`);
    }

    for (const interval of intervals) {
      if (!Array.isArray(interval) || interval.length !== 2) {
        throw new AppError(400, `Each interval on ${day} must be ["HH:MM", "HH:MM"]`);
      }
      const [start, end] = interval.map(String);
      if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) {
        throw new AppError(400, `Invalid time on ${day} (use HH:MM)`);
      }
      if (start >= end) {
        throw new AppError(400, `Start time must be before end time on ${day}`);
      }
    }
  }

  if (schedule.holidays !== undefined) {
    if (!Array.isArray(schedule.holidays)) {
      throw new AppError(400, 'business_hours.holidays must be an array');
    }
    for (const holiday of schedule.holidays) {
      if (!DATE_PATTERN.test(String(holiday))) {
        throw new AppError(400, 'Holidays must use YYYY-MM-DD');
      }
      const parsed = new Date(`${holiday}T00:00:00Z`);
      if (Number.isNaN(parsed.getTime())) {
        throw new AppError(400, `Invalid holiday date: ${holiday}`);
      }
    }
  }

  return schedule;
}

function resolveSchedule(schedule) {
  return schedule && schedule.timezone ? schedule : DEFAULT_BUSINESS_HOURS;
}

// Checks whether a moment falls inside the working schedule (day + intervals, holidays excluded)
function isWithinBusinessHours(schedule, now = new Date()) {
  const effective = resolveSchedule(schedule);
  if (!isValidTimezone(effective.timezone)) return false;

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: effective.timezone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const get = (type) => (parts.find((part) => part.type === type) || {}).value;
  const dayKey = String(get('weekday')).toLowerCase().slice(0, 3);
  const hhmm = `${get('hour')}:${get('minute')}`;
  const dateKey = `${get('year')}-${get('month')}-${get('day')}`;

  const holidays = Array.isArray(effective.holidays) ? effective.holidays : [];
  if (holidays.includes(dateKey)) return false;

  const intervals = (effective.days && effective.days[dayKey]) || [];
  return intervals.some(([start, end]) => hhmm >= start && hhmm < end);
}

module.exports = {
  DAY_KEYS,
  DEFAULT_BUSINESS_HOURS,
  validateBusinessHours,
  resolveSchedule,
  isWithinBusinessHours,
};
