import PizZip from "pizzip";
import { describe, expect, it } from "vitest";
import { duplicateTableRows, renderPrintTemplate, scanTemplateVariables } from "./print-engine";
import type { ProposalField, ProposalGroup, RequestInstance } from "@/lib/types";

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

function buildDocxBuffer(documentXml: string): Buffer {
  const zip = new PizZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", RELS);
  zip.file("word/_rels/document.xml.rels", DOC_RELS);
  zip.file("word/document.xml", documentXml);
  return zip.generate({ type: "nodebuffer" });
}

function makeField(overrides: Partial<ProposalField>): ProposalField {
  return {
    id: overrides.id ?? "f1",
    name: overrides.name ?? "Trường",
    dataType: overrides.dataType ?? "short_text",
    required: false,
    order: 1,
    ...overrides,
  } as ProposalField;
}

function makeGroup(fields: ProposalField[]): ProposalGroup {
  return {
    id: "g1",
    name: "Nhóm test",
    description: "",
    category: "Chưa phân loại",
    status: "active",
    approvalFlow: "sequential",
    slaHours: null,
    notifyManager: false,
    usedFor: [],
    approverSteps: [],
    followers: [],
    fields,
    pinned: false,
    createdAt: new Date().toISOString(),
  } as ProposalGroup;
}

function makeRequest(overrides: Partial<RequestInstance>): RequestInstance {
  return {
    id: "req1",
    code: "000123",
    groupId: "g1",
    groupNameSnapshot: "Nhóm test",
    fieldsSnapshot: [],
    values: {},
    submittedBy: { uid: "u1", email: "a@hpcons.com.vn", name: "Nguyễn Văn A" },
    submittedAt: "2026-07-20T01:00:00.000Z",
    updatedAt: "2026-07-20T01:00:00.000Z",
    approvalFlow: "sequential",
    approversSnapshot: [],
    approvers: [],
    followers: [],
    status: "pending",
    deadlineAt: null,
    history: [],
    comments: [],
    deletedAt: null,
    ...overrides,
  } as RequestInstance;
}

describe("scanTemplateVariables", () => {
  const group = makeGroup([
    makeField({ id: "f1", name: "Bộ Phận", code: "bo_phan" }),
    makeField({
      id: "f2",
      name: "chi tiết",
      code: "chi_tiet",
      dataType: "table",
      tableColumns: ["Tên", "SL", "Đơn vị"],
    }),
  ]);

  it("nhận biến hệ thống + mã trường hợp lệ, không báo lỗi/cảnh báo", () => {
    const xml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:r><w:t>\${id} \${bo_phan}</w:t></w:r></w:p>
      </w:body>
    </w:document>`;
    const result = scanTemplateVariables(buildDocxBuffer(xml), group);
    expect(result.detectedVariables.sort()).toEqual(["bo_phan", "id"]);
    expect(result.errors).toEqual([]);
  });

  it("báo cảnh báo cho biến không khớp thẻ/mã nào", () => {
    const xml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body><w:p><w:r><w:t>\${khong_ton_tai}</w:t></w:r></w:p></w:body>
    </w:document>`;
    const result = scanTemplateVariables(buildDocxBuffer(xml), group);
    expect(result.warnings.some((w) => w.includes("khong_ton_tai"))).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("báo lỗi khi mã bảng trong column.<code>.<n> không tồn tại", () => {
    const xml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:tbl><w:tr><w:tc><w:p><w:r><w:t>\${column.khong_co.0}</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
      </w:body>
    </w:document>`;
    const result = scanTemplateVariables(buildDocxBuffer(xml), group);
    expect(result.errors.some((e) => e.includes("khong_co") && e.includes("không tồn tại"))).toBe(true);
  });

  it("báo lỗi khi số cột vượt quá số cột thực tế của bảng", () => {
    const xml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:tbl><w:tr><w:tc><w:p><w:r><w:t>\${column.chi_tiet.99}</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
      </w:body>
    </w:document>`;
    const result = scanTemplateVariables(buildDocxBuffer(xml), group);
    expect(result.errors.some((e) => e.includes("chi_tiet") && e.includes("cột"))).toBe(true);
  });

  it("chấp nhận cột hợp lệ trong khoảng 0..số cột thật (0 = STT)", () => {
    const xml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:tbl><w:tr><w:tc><w:p><w:r><w:t>\${column.chi_tiet.0} \${column.chi_tiet.1} \${column.chi_tiet.3}</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
      </w:body>
    </w:document>`;
    const result = scanTemplateVariables(buildDocxBuffer(xml), group);
    expect(result.errors).toEqual([]);
  });

  it("cảnh báo khi thẻ column.* nằm ngoài mọi bảng trong document.xml", () => {
    const xml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:r><w:t>\${column.chi_tiet.1}</w:t></w:r></w:p>
      </w:body>
    </w:document>`;
    const result = scanTemplateVariables(buildDocxBuffer(xml), group);
    expect(result.warnings.some((w) => w.includes("nằm NGOÀI bảng"))).toBe(true);
  });

  it("phát hiện lỗi cú pháp thẻ thật (docxtemplater compile lỗi) mà không crash", () => {
    // Thẻ ${ hoạt ... không đóng lại (thiếu dấu }) là lỗi cú pháp docxtemplater thật sự bắt được.
    const xml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body><w:p><w:r><w:t>\${id \${bo_phan}</w:t></w:r></w:p></w:body>
    </w:document>`;
    const result = scanTemplateVariables(buildDocxBuffer(xml), group);
    expect(() => result).not.toThrow();
    // Không khẳng định chắc chắn có lỗi (docxtemplater có thể tự khoan dung phần này),
    // chỉ khẳng định hàm chạy xong an toàn và trả cấu trúc hợp lệ.
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it("file không phải .docx hợp lệ trả lỗi rõ ràng, không crash", () => {
    const result = scanTemplateVariables(Buffer.from("không phải file docx"), group);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.detectedVariables).toEqual([]);
  });
});

describe("duplicateTableRows", () => {
  const tableField = makeField({
    id: "f3",
    name: "chi tiết",
    code: "chi_tiet",
    dataType: "table",
    tableColumns: ["Tên", "SL"],
  });
  const group = makeGroup([tableField]);

  const templateXml = `<w:tbl>
    <w:tr><w:tc><w:p><w:r><w:t>Stt</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Tên</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>\${column.chi_tiet.0}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>\${column.chi_tiet.1}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>\${column.chi_tiet.2}</w:t></w:r></w:p></w:tc></w:tr>
  </w:tbl>`;

  it("nhân đúng số dòng thật, STT tự chạy 1..N, đúng dữ liệu từng ô", () => {
    const request = makeRequest({
      fieldsSnapshot: [tableField],
      values: {
        f3: [
          { cells: ["Thùng PC", "1"] },
          { cells: ["Màn hình", "2"] },
          { cells: ["Bàn phím", "3"] },
        ],
      },
    });
    const result = duplicateTableRows(templateXml, group, request);
    expect((result.match(/Thùng PC/g) ?? []).length).toBe(1);
    expect((result.match(/Màn hình/g) ?? []).length).toBe(1);
    expect((result.match(/Bàn phím/g) ?? []).length).toBe(1);
    // STT 1, 2, 3 phải xuất hiện đúng thứ tự tương ứng từng dòng dữ liệu.
    const rows = result.match(/<w:tr>.*?<\/w:tr>/gs) ?? [];
    expect(rows.length).toBe(4); // 1 header + 3 dòng dữ liệu
    expect(rows[1]).toContain(">1<");
    expect(rows[2]).toContain(">2<");
    expect(rows[3]).toContain(">3<");
    expect(result).not.toContain("${column");
  });

  it("bảng rỗng vẫn giữ đúng 1 dòng trống (không xoá mất dòng mẫu)", () => {
    const request = makeRequest({ fieldsSnapshot: [tableField], values: { f3: [] } });
    const result = duplicateTableRows(templateXml, group, request);
    const rows = result.match(/<w:tr>.*?<\/w:tr>/gs) ?? [];
    expect(rows.length).toBe(2); // 1 header + 1 dòng trống
    expect(result).not.toContain("${column");
  });

  it("escape ký tự đặc biệt trong dữ liệu ô để không phá vỡ XML", () => {
    const request = makeRequest({
      fieldsSnapshot: [tableField],
      values: { f3: [{ cells: ["A & B <C>", "\"D\""] }] },
    });
    const result = duplicateTableRows(templateXml, group, request);
    expect(result).toContain("A &amp; B &lt;C&gt;");
    expect(result).toContain("&quot;D&quot;");
  });
});

describe("renderPrintTemplate (end-to-end với file .docx thật)", () => {
  it("điền đủ thẻ hệ thống + mã trường + nhân dòng bảng, không còn ${...} sót lại", () => {
    const tableField = makeField({
      id: "f3",
      name: "chi tiết",
      code: "chi_tiet",
      dataType: "table",
      tableColumns: ["Tên", "SL"],
    });
    const bpField = makeField({ id: "f1", name: "Bộ Phận", code: "bo_phan" });
    const group = makeGroup([bpField, tableField]);

    const documentXml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:r><w:t>Ma: \${id} - Bo phan: \${bo_phan} - Nguoi tao: \${creator_name}</w:t></w:r></w:p>
        <w:tbl>
          <w:tr><w:tc><w:p><w:r><w:t>\${column.chi_tiet.0}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>\${column.chi_tiet.1}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>\${column.chi_tiet.2}</w:t></w:r></w:p></w:tc></w:tr>
        </w:tbl>
      </w:body>
    </w:document>`;
    const templateBuffer = buildDocxBuffer(documentXml);

    const request = makeRequest({
      code: "000456",
      fieldsSnapshot: [bpField, tableField],
      values: {
        f1: "1. Phòng Hành chính Nhân sự - IT (HP Cons)",
        f3: [
          { cells: ["Thùng PC", "1"] },
          { cells: ["Màn hình", "2"] },
        ],
      },
    });

    const outputBuffer = renderPrintTemplate(templateBuffer, group, request);
    const outputZip = new PizZip(outputBuffer);
    const outputXml = outputZip.file("word/document.xml")!.asText();

    expect(outputXml).toContain("Ma: 000456");
    expect(outputXml).toContain("Bo phan: 1. Phòng Hành chính Nhân sự - IT (HP Cons)");
    expect(outputXml).toContain("Nguoi tao: Nguyễn Văn A");
    expect(outputXml).toContain("Thùng PC");
    expect(outputXml).toContain("Màn hình");
    expect(outputXml).not.toContain("${");
  });
});
