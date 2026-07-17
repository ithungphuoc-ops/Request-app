import SimplePagePlaceholder from "@/components/request/SimplePagePlaceholder";
import RequireAdminRole from "@/components/request/RequireAdminRole";

export default function WebhookTracePage() {
  return (
    <RequireAdminRole>
      <SimplePagePlaceholder
        title="Dấu vết Webhook"
        description="Theo dõi chi tiết từng lần gọi Webhook để gỡ lỗi. Nội dung không có trong đặc tả nên chưa dựng chi tiết."
      />
    </RequireAdminRole>
  );
}
