"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useRequestContext } from "@/context/RequestContext";
import GroupDetailNav from "@/components/request/GroupDetailNav";

export default function GroupDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ groupId: string }>();
  const router = useRouter();
  const { getGroupById } = useRequestContext();
  const group = getGroupById(params.groupId);

  if (!group) {
    return (
      <div className="px-8 py-6">
        <p className="text-[13px] text-gray-400">
          Không tìm thấy nhóm đề xuất này. Nhóm có thể đã bị xóa hoặc bạn không có quyền xem.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start gap-3 border-b border-gray-100 px-8 py-5">
        <button
          type="button"
          onClick={() => router.push("/request/groups")}
          aria-label="Quay lại danh sách nhóm đề xuất"
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900">{group.name}</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">{group.description || "Chưa có mô tả."}</p>
        </div>
      </div>

      <div className="flex px-8 py-4">
        <GroupDetailNav groupId={group.id} />
        <div className="min-w-0 flex-1 pl-6">{children}</div>
      </div>
    </div>
  );
}
