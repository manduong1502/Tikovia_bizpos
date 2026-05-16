export function parseFlexibleDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;

  const str = String(dateInput).trim();
  if (!str) return null;

  const dmmyyyyMatch = str.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
  );
  if (dmmyyyyMatch) {
    const day = Number(dmmyyyyMatch[1]);
    const month = Number(dmmyyyyMatch[2]) - 1;
    const year = Number(dmmyyyyMatch[3]);
    const hour = Number(dmmyyyyMatch[4] || 0);
    const minute = Number(dmmyyyyMatch[5] || 0);
    const second = Number(dmmyyyyMatch[6] || 0);
    const d = new Date(year, month, day, hour, minute, second);
    return isNaN(d.getTime()) ? null : d;
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeekMonday(d) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0: CN, 1: T2, ...
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  return x;
}

function endOfWeekMonday(d) {
  const s = startOfWeekMonday(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return endOfDay(e);
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function quarterOfMonth(monthIndex) {
  return Math.floor(monthIndex / 3);
}

function startOfQuarter(d) {
  const q = quarterOfMonth(d.getMonth());
  return new Date(d.getFullYear(), q * 3, 1, 0, 0, 0, 0);
}

function endOfQuarter(d) {
  const q = quarterOfMonth(d.getMonth());
  return new Date(d.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
}

function startOfYear(d) {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function endOfYear(d) {
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
}

export function getRangeByCreatedLabel(label, nowInput = new Date()) {
  const now = new Date(nowInput);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (label) {
    case 'Hôm nay':
      return { start: todayStart, end: todayEnd };
    case 'Hôm qua': {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - 1);
      return { start: startOfDay(d), end: endOfDay(d) };
    }
    case '7 ngày qua': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 6);
      return { start, end: todayEnd };
    }
    case '30 ngày qua': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 29);
      return { start, end: todayEnd };
    }
    case 'Tuần này':
      return { start: startOfWeekMonday(now), end: endOfWeekMonday(now) };
    case 'Tuần trước': {
      const currentWeekStart = startOfWeekMonday(now);
      const prevWeekStart = new Date(currentWeekStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      return { start: startOfDay(prevWeekStart), end: endOfWeekMonday(prevWeekStart) };
    }
    case 'Tháng này':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'Tháng trước': {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { start: startOfMonth(d), end: endOfMonth(d) };
    }
    case 'Quý này':
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case 'Quý trước': {
      const d = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      return { start: startOfQuarter(d), end: endOfQuarter(d) };
    }
    case 'Năm nay':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'Năm trước': {
      const d = new Date(now.getFullYear() - 1, 0, 1);
      return { start: startOfYear(d), end: endOfYear(d) };
    }
    default:
      return null;
  }
}

export function getRangeByExpectedLabel(label, nowInput = new Date()) {
  const now = new Date(nowInput);
  const todayStart = startOfDay(now);

  switch (label) {
    case 'Ngày mai': {
      const d = new Date(todayStart);
      d.setDate(d.getDate() + 1);
      return { start: startOfDay(d), end: endOfDay(d) };
    }
    case 'Ngày kia': {
      const d = new Date(todayStart);
      d.setDate(d.getDate() + 2);
      return { start: startOfDay(d), end: endOfDay(d) };
    }
    case '3 ngày tới': {
      const end = new Date(todayStart);
      end.setDate(end.getDate() + 3);
      return { start: todayStart, end: endOfDay(end) };
    }
    case '5 ngày tới': {
      const end = new Date(todayStart);
      end.setDate(end.getDate() + 5);
      return { start: todayStart, end: endOfDay(end) };
    }
    case '7 ngày tới': {
      const end = new Date(todayStart);
      end.setDate(end.getDate() + 7);
      return { start: todayStart, end: endOfDay(end) };
    }
    case 'Tuần này':
      return { start: startOfWeekMonday(now), end: endOfWeekMonday(now) };
    case 'Tuần tới': {
      const currentWeekStart = startOfWeekMonday(now);
      const nextWeekStart = new Date(currentWeekStart);
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      return { start: startOfDay(nextWeekStart), end: endOfWeekMonday(nextWeekStart) };
    }
    case '2 tuần tới': {
      const end = new Date(todayStart);
      end.setDate(end.getDate() + 14);
      return { start: todayStart, end: endOfDay(end) };
    }
    case 'Tháng này':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'Tháng tới': {
      const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { start: startOfMonth(d), end: endOfMonth(d) };
    }
    case '30 ngày tới': {
      const end = new Date(todayStart);
      end.setDate(end.getDate() + 30);
      return { start: todayStart, end: endOfDay(end) };
    }
    case '2 tháng tới': {
      const end = new Date(todayStart);
      end.setMonth(end.getMonth() + 2);
      return { start: todayStart, end: endOfDay(end) };
    }
    case '3 tháng tới': {
      const end = new Date(todayStart);
      end.setMonth(end.getMonth() + 3);
      return { start: todayStart, end: endOfDay(end) };
    }
    default:
      return null;
  }
}

export function inDateRange(dateInput, range) {
  if (!range || !range.start || !range.end) return true;
  const d = parseFlexibleDate(dateInput);
  if (!d) return false;
  return d >= range.start && d <= range.end;
}

export function buildCustomRange(startInput, endInput) {
  if (!startInput) return null;
  const start = startOfDay(new Date(startInput));
  const end = endOfDay(new Date(endInput || startInput));
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  return { start, end };
}
