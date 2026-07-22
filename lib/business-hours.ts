/**
 * Cộng dồn SLA CHỈ trong giờ hành chính thật của công ty — 7:45–12:00 và
 * 13:00–17:15, Thứ 2 đến Thứ 7 (Chủ nhật nghỉ hoàn toàn, không tính). Dùng
 * cho "SLA theo lịch làm việc" (ProposalGroup.slaByWorkCalendar) — xem
 * design.md của change add-base-vn-group-settings-parity, Decision #7.
 *
 * Không "server-only": thuần tính toán ngày giờ, không đụng Firestore/
 * credential, để test được trực tiếp bằng vitest.
 */

const MORNING_START = 7 * 60 + 45; // 7:45
const MORNING_END = 12 * 60; // 12:00
const AFTERNOON_START = 13 * 60; // 13:00
const AFTERNOON_END = 17 * 60 + 15; // 17:15
const SUNDAY = 0;

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function atMinutesOfDay(date: Date, minutes: number): Date {
  const next = new Date(date);
  next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return next;
}

function startOfNextDay(date: Date): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

/**
 * Dịch một thời điểm bất kỳ tới thời điểm HỢP LỆ gần nhất (>=) nằm trong 1
 * khung giờ hành chính — nếu đang ở ngoài giờ/nghỉ trưa/Chủ nhật thì nhảy
 * tới đầu khung giờ làm việc tiếp theo.
 */
function toNextBusinessMoment(date: Date): Date {
  let cursor = new Date(date);
  // Giới hạn vòng lặp để không treo nếu có lỗi logic — tối đa 14 ngày là dư sức.
  for (let guard = 0; guard < 14; guard += 1) {
    if (cursor.getDay() === SUNDAY) {
      cursor = atMinutesOfDay(startOfNextDay(cursor), MORNING_START);
      continue;
    }
    const m = minutesOfDay(cursor);
    if (m < MORNING_START) return atMinutesOfDay(cursor, MORNING_START);
    if (m >= MORNING_START && m < MORNING_END) return cursor;
    if (m >= MORNING_END && m < AFTERNOON_START) return atMinutesOfDay(cursor, AFTERNOON_START);
    if (m >= AFTERNOON_START && m < AFTERNOON_END) return cursor;
    // >= 17:15 -> sang ngày kế tiếp, đầu giờ sáng.
    cursor = atMinutesOfDay(startOfNextDay(cursor), MORNING_START);
  }
  return cursor;
}

/** Cộng `hours` giờ SLA vào `from`, chỉ tính trong giờ hành chính. */
export function addBusinessHours(from: Date, hours: number): Date {
  let remainingMinutes = Math.max(0, Math.round(hours * 60));
  let cursor = toNextBusinessMoment(from);

  while (remainingMinutes > 0) {
    const m = minutesOfDay(cursor);
    const windowEnd = m < MORNING_END ? MORNING_END : AFTERNOON_END;
    const availableInWindow = windowEnd - m;

    if (remainingMinutes <= availableInWindow) {
      cursor = atMinutesOfDay(cursor, m + remainingMinutes);
      remainingMinutes = 0;
    } else {
      remainingMinutes -= availableInWindow;
      cursor = toNextBusinessMoment(atMinutesOfDay(cursor, windowEnd));
    }
  }

  return cursor;
}
