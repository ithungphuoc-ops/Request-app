import SimplePagePlaceholder from "@/components/request/SimplePagePlaceholder";
import RequireAdminRole from "@/components/request/RequireAdminRole";

export default function GroupHistoryPage() {
  return (
    <RequireAdminRole>
      <SimplePagePlaceholder
        title="Lịch sử chỉnh sửa nhóm"
        description="Ghi lại người thực hiện, thời gian và giá trị trước/sau khi có thay đổi nhóm đề xuất (§8.4)."
      />
    </RequireAdminRole>
  );
}
