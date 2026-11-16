const DAY_MS = 24 * 60 * 60 * 1000;

export function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

export function today(clock = () => new Date()) {
  return toDateString(clock());
}

export function addDays(dateString, days) {
  const base = new Date(`${dateString}T00:00:00.000Z`);
  return toDateString(new Date(base.getTime() + days * DAY_MS));
}

// A loan is overdue only once its due date has fully passed.
export function isOverdue(dueDate, now) {
  return dueDate <= now;
}

export function daysBetween(fromDate, toDate) {
  const from = new Date(`${fromDate}T00:00:00.000Z`).getTime();
  const to = new Date(`${toDate}T00:00:00.000Z`).getTime();
  return Math.round((to - from) / DAY_MS);
}
