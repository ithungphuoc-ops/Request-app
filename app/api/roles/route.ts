import { NextResponse } from "next/server";

/**
 * Danh sách vai trò CỦA CHÍNH base-request-app — app tổng (account.hpcore.vn)
 * gọi endpoint này để dựng dropdown gán quyền, KHÔNG hard-code danh sách vai
 * trò ở phía app tổng. Public, CORS mở — không có dữ liệu nhạy cảm.
 */
const ROLES = {
  owner: "Chủ sở hữu",
  app_admin: "Quản trị ứng dụng",
  admin: "Quản trị nhóm",
  member: "Thành viên",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=300",
};

export function GET() {
  const roles = Object.entries(ROLES).map(([key, label]) => ({ key, label }));
  return NextResponse.json({ roles }, { headers: CORS });
}

export function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}
