import { describe, expect, it } from "vitest";
import { evaluateCondition, filterApplicableSteps, mergeFollowers } from "./conditions";
import type { ApproverStepDef, ProposalField, TaggedUser } from "@/lib/types";

const tinhTrang: ProposalField = {
  id: "f1",
  name: "Tình trạng",
  code: "tinh_trang",
  dataType: "single_choice",
  required: true,
  order: 1,
  options: ["Khẩn cấp", "Bình thường"],
};

const thietBi: ProposalField = {
  id: "f2",
  name: "Thiết bị văn phòng",
  code: "thiet_bi_van_phong",
  dataType: "multiple_choice",
  required: false,
  order: 2,
  options: ["Máy in", "Bàn ghế"],
};

const fields = [tinhTrang, thietBi];

describe("evaluateCondition", () => {
  it("equals đúng khi giá trị field khớp", () => {
    const result = evaluateCondition(
      { fieldCode: "tinh_trang", operator: "equals", value: "Khẩn cấp" },
      { f1: "Khẩn cấp" },
      fields,
    );
    expect(result).toBe(true);
  });

  it("equals sai khi giá trị field khác", () => {
    const result = evaluateCondition(
      { fieldCode: "tinh_trang", operator: "equals", value: "Khẩn cấp" },
      { f1: "Bình thường" },
      fields,
    );
    expect(result).toBe(false);
  });

  it("equals sai khi field chưa có giá trị", () => {
    const result = evaluateCondition(
      { fieldCode: "tinh_trang", operator: "equals", value: "Khẩn cấp" },
      {},
      fields,
    );
    expect(result).toBe(false);
  });

  it("not_equals đúng khi giá trị field khác", () => {
    const result = evaluateCondition(
      { fieldCode: "tinh_trang", operator: "not_equals", value: "Khẩn cấp" },
      { f1: "Bình thường" },
      fields,
    );
    expect(result).toBe(true);
  });

  it("not_equals sai khi giá trị field khớp", () => {
    const result = evaluateCondition(
      { fieldCode: "tinh_trang", operator: "not_equals", value: "Khẩn cấp" },
      { f1: "Khẩn cấp" },
      fields,
    );
    expect(result).toBe(false);
  });

  it("includes đúng khi giá trị nằm trong mảng multiple_choice", () => {
    const result = evaluateCondition(
      { fieldCode: "thiet_bi_van_phong", operator: "includes", value: "Máy in" },
      { f2: ["Máy in", "Bàn ghế"] },
      fields,
    );
    expect(result).toBe(true);
  });

  it("includes sai khi giá trị không nằm trong mảng", () => {
    const result = evaluateCondition(
      { fieldCode: "thiet_bi_van_phong", operator: "includes", value: "Máy chiếu" },
      { f2: ["Máy in"] },
      fields,
    );
    expect(result).toBe(false);
  });

  it("includes sai khi giá trị field không phải mảng", () => {
    const result = evaluateCondition(
      { fieldCode: "thiet_bi_van_phong", operator: "includes", value: "Máy in" },
      { f2: "Máy in" },
      fields,
    );
    expect(result).toBe(false);
  });

  it("trả false, không throw, khi field không tồn tại trong nhóm", () => {
    const result = evaluateCondition(
      { fieldCode: "khong_ton_tai", operator: "equals", value: "x" },
      { f1: "Khẩn cấp" },
      fields,
    );
    expect(result).toBe(false);
  });
});

const truongPhong: TaggedUser = {
  id: "u1",
  name: "Trưởng phòng Kỹ thuật Thi công Khối 2",
  username: "truongphongkythuat",
  avatarInitial: "T",
};

describe("filterApplicableSteps", () => {
  it("giữ nguyên bước duyệt không có điều kiện", () => {
    const steps: ApproverStepDef[] = [{ kind: "submitter_manager", code: "quan_ly_truc_tiep" }];
    expect(filterApplicableSteps(steps, {}, fields)).toEqual(steps);
  });

  it("giữ bước duyệt có điều kiện khi điều kiện thoả mãn", () => {
    const steps: ApproverStepDef[] = [
      {
        kind: "fixed",
        user: truongPhong,
        code: "truong_phong",
        condition: { fieldCode: "tinh_trang", operator: "equals", value: "Khẩn cấp" },
      },
    ];
    expect(filterApplicableSteps(steps, { f1: "Khẩn cấp" }, fields)).toEqual(steps);
  });

  it("loại bỏ bước duyệt có điều kiện khi điều kiện không thoả mãn", () => {
    const steps: ApproverStepDef[] = [
      {
        kind: "fixed",
        user: truongPhong,
        code: "truong_phong",
        condition: { fieldCode: "tinh_trang", operator: "equals", value: "Khẩn cấp" },
      },
    ];
    expect(filterApplicableSteps(steps, { f1: "Bình thường" }, fields)).toEqual([]);
  });

  it("giữ bước không điều kiện, loại bước có điều kiện không thoả, trong cùng danh sách", () => {
    const steps: ApproverStepDef[] = [
      { kind: "submitter_manager", code: "quan_ly_truc_tiep" },
      {
        kind: "fixed",
        user: truongPhong,
        code: "truong_phong",
        condition: { fieldCode: "tinh_trang", operator: "equals", value: "Khẩn cấp" },
      },
    ];
    const result = filterApplicableSteps(steps, { f1: "Bình thường" }, fields);
    expect(result).toEqual([steps[0]]);
  });
});

const userA: TaggedUser = { id: "a", name: "A", username: "a", avatarInitial: "A" };
const userB: TaggedUser = { id: "b", name: "B", username: "b", avatarInitial: "B" };
const userC: TaggedUser = { id: "c", name: "C", username: "c", avatarInitial: "C" };

describe("mergeFollowers", () => {
  it("hợp 3 nguồn, loại trùng theo id", () => {
    const result = mergeFollowers([userA], [userA, userB], [], {}, fields);
    expect(result.map((u) => u.id)).toEqual(["a", "b"]);
  });

  it("thêm người theo dõi theo điều kiện khi điều kiện thoả mãn", () => {
    const result = mergeFollowers(
      [userA],
      [userA],
      [{ condition: { fieldCode: "tinh_trang", operator: "equals", value: "Khẩn cấp" }, users: [userC] }],
      { f1: "Khẩn cấp" },
      fields,
    );
    expect(result.map((u) => u.id)).toEqual(["a", "c"]);
  });

  it("không thêm người theo dõi theo điều kiện khi điều kiện không thoả mãn", () => {
    const result = mergeFollowers(
      [userA],
      [userA],
      [{ condition: { fieldCode: "tinh_trang", operator: "equals", value: "Khẩn cấp" }, users: [userC] }],
      { f1: "Bình thường" },
      fields,
    );
    expect(result.map((u) => u.id)).toEqual(["a"]);
  });

  it("không trùng lặp khi cùng 1 người xuất hiện ở nhiều nguồn", () => {
    const result = mergeFollowers(
      [userA],
      [userA, userB],
      [{ condition: { fieldCode: "tinh_trang", operator: "equals", value: "Khẩn cấp" }, users: [userB] }],
      { f1: "Khẩn cấp" },
      fields,
    );
    expect(result.map((u) => u.id)).toEqual(["a", "b"]);
  });
});
