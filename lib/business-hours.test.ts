import { describe, expect, it } from "vitest";
import { addBusinessHours } from "./business-hours";

/** Tìm ngày trong tuần (0=CN..6=T7) gần nhất >= from, để test không phụ
 * thuộc vào việc nhớ đúng thứ của 1 ngày cụ thể theo lịch thật. */
function nextWeekday(from: Date, targetDay: number): Date {
  const d = new Date(from);
  while (d.getDay() !== targetDay) d.setDate(d.getDate() + 1);
  return d;
}

function at(date: Date, hours: number, minutes: number): Date {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

const ANCHOR = new Date(2026, 0, 1); // mốc bất kỳ, chỉ dùng để dò ra Thứ 2/6/7 gần nhất
const MONDAY = nextWeekday(ANCHOR, 1);
const FRIDAY = nextWeekday(ANCHOR, 5);
const SATURDAY = nextWeekday(ANCHOR, 6);

describe("addBusinessHours", () => {
  it("cộng trong cùng 1 khung giờ (sáng)", () => {
    const result = addBusinessHours(at(MONDAY, 8, 0), 1);
    expect(result).toEqual(at(MONDAY, 9, 0));
  });

  it("cộng qua giờ nghỉ trưa trong cùng ngày", () => {
    // 11:30 + 1h: còn 30' tới 12:00, nhảy nghỉ trưa, cộng tiếp 30' từ 13:00 -> 13:30.
    const result = addBusinessHours(at(MONDAY, 11, 30), 1);
    expect(result).toEqual(at(MONDAY, 13, 30));
  });

  it("cộng qua ngày kế tiếp khi hết giờ hành chính trong ngày", () => {
    // 16:00 T2 + 2h: dùng hết 1h15 tới 17:15, còn 45' cộng từ 7:45 T3 -> 8:30 T3.
    const tuesday = new Date(MONDAY);
    tuesday.setDate(tuesday.getDate() + 1);
    const result = addBusinessHours(at(MONDAY, 16, 0), 2);
    expect(result).toEqual(at(tuesday, 8, 30));
  });

  it("gửi ngoài giờ hành chính (buổi tối) nhảy tới đầu giờ hành chính tiếp theo", () => {
    // 20:00 T6 + 1h -> nhảy tới 7:45 T7 (T7 vẫn là ngày làm việc), +1h -> 8:45 T7.
    const result = addBusinessHours(at(FRIDAY, 20, 0), 1);
    expect(result).toEqual(at(SATURDAY, 8, 45));
  });

  it("bỏ qua Chủ nhật khi cộng qua cuối tuần", () => {
    // 17:00 T7 + 1h: dùng hết 15' tới 17:15, còn 45' nhảy qua CN, cộng từ 7:45 T2 kế tiếp -> 8:30.
    const mondayAfter = new Date(SATURDAY);
    mondayAfter.setDate(mondayAfter.getDate() + 2); // T7 -> CN -> T2
    const result = addBusinessHours(at(SATURDAY, 17, 0), 1);
    expect(result).toEqual(at(mondayAfter, 8, 30));
  });

  it("gửi lúc đang nghỉ trưa (12:30) nhảy tới 13:00 rồi mới cộng", () => {
    const result = addBusinessHours(at(MONDAY, 12, 30), 1);
    expect(result).toEqual(at(MONDAY, 14, 0));
  });

  it("cộng nhiều ngày liên tiếp (20 giờ từ đầu ngày Thứ 2)", () => {
    // Mỗi ngày làm việc có 8h30 (4h15 sáng + 4h15 chiều).
    // T2: 8h30 dùng hết -> còn 11h30. T3: 8h30 -> còn 3h. T4 sáng: 3h vừa hết trong khung 7:45-12:00 -> 10:45.
    const wednesday = new Date(MONDAY);
    wednesday.setDate(wednesday.getDate() + 2);
    const result = addBusinessHours(at(MONDAY, 7, 45), 20);
    expect(result).toEqual(at(wednesday, 10, 45));
  });

  it("SLA 0 giờ trả về đúng thời điểm bắt đầu (đã dịch vào giờ hành chính nếu cần)", () => {
    const result = addBusinessHours(at(MONDAY, 9, 0), 0);
    expect(result).toEqual(at(MONDAY, 9, 0));
  });
});
