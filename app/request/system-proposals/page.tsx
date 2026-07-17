import SimplePagePlaceholder from "@/components/request/SimplePagePlaceholder";
import RequireAdminRole from "@/components/request/RequireAdminRole";

export default function SystemProposalsPage() {
  return (
    <RequireAdminRole>
      <SimplePagePlaceholder
        title="Tất cả đề xuất hệ thống"
        description="Danh sách toàn bộ đề xuất trong công ty, không phân biệt nhóm. Nội dung không có trong đặc tả nên chưa dựng chi tiết."
      />
    </RequireAdminRole>
  );
}
