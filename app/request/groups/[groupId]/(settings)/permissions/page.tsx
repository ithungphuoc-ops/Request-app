"use client";

import { useParams } from "next/navigation";
import { BellRing, Eye, ListOrdered, ShieldCheck } from "lucide-react";
import RequireAdminRole from "@/components/request/RequireAdminRole";
import { useRequestContext } from "@/context/RequestContext";

const rules = [
  {
    icon: ShieldCheck,
    text: "Chỉ Owner hoặc App Admin được tạo và cấu hình nhóm ở mức toàn ứng dụng.",
  },
  {
    icon: Eye,
    text: 'Người dùng chỉ nhìn thấy hoặc tạo đề xuất trong nhóm nằm trong phạm vi "Sử dụng cho".',
  },
  {
    icon: ListOrdered,
    text: "Người duyệt chỉ thao tác khi đề xuất tới lượt của họ nếu dùng xử lý lần lượt.",
  },
  {
    icon: BellRing,
    text: "Người theo dõi được xem và nhận cập nhật nhưng không tự động có quyền duyệt.",
  },
];

export default function GroupPermissionsPage() {
  return (
    <RequireAdminRole>
      <GroupPermissionsPageInner />
    </RequireAdminRole>
  );
}

function GroupPermissionsPageInner() {
  const params = useParams<{ groupId: string }>();
  const { getGroupById } = useRequestContext();
  const group = getGroupById(params.groupId);

  if (!group) return null;

  return (
    <div className="max-w-[640px]">
      <h2 className="mb-1 text-[15px] font-semibold text-gray-800">Tùy chỉnh về phân quyền</h2>
      <p className="mb-4 text-[12px] text-gray-500">
        Quy tắc phân quyền tối thiểu áp dụng cho nhóm đề xuất này (§5.3).
      </p>

      <div className="flex flex-col gap-2.5">
        {rules.map((rule) => (
          <div
            key={rule.text}
            className="flex items-start gap-3 rounded-[3px] border border-[var(--color-border)] bg-white p-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[var(--color-action-blue)]">
              <rule.icon size={14} />
            </span>
            <p className="pt-1 text-[13px] text-gray-700">{rule.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-[3px] border border-[var(--color-border)] bg-white p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Phạm vi sử dụng
          </p>
          {group.usedFor.length === 0 ? (
            <p className="text-[13px] text-gray-600">Toàn công ty</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {group.usedFor.map((u) => (
                <span
                  key={u.id}
                  className="rounded-full bg-gray-100 px-2 py-1 text-[12px] text-gray-700"
                >
                  {u.name}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-gray-400">Chỉnh sửa ở tab &quot;Thiết lập chung&quot;.</p>
        </div>

        <div className="rounded-[3px] border border-[var(--color-border)] bg-white p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Người theo dõi mặc định
          </p>
          {group.followers.length === 0 ? (
            <p className="text-[13px] text-gray-400">Chưa có</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {group.followers.map((f) => (
                <span
                  key={f.id}
                  className="rounded-full bg-gray-100 px-2 py-1 text-[12px] text-gray-700"
                >
                  {f.name}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-gray-400">Chỉnh sửa ở tab &quot;Thiết lập chung&quot;.</p>
        </div>
      </div>
    </div>
  );
}
