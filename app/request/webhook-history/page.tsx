import SimplePagePlaceholder from "@/components/request/SimplePagePlaceholder";
import RequireAdminRole from "@/components/request/RequireAdminRole";

export default function WebhookHistoryPage() {
  return (
    <RequireAdminRole>
      <SimplePagePlaceholder
        title="Lịch sử Webhook"
        description="Ghi lại các sự kiện Webhook đã gửi đi. Nội dung không có trong đặc tả nên chưa dựng chi tiết."
      />
    </RequireAdminRole>
  );
}
