export default function GroupPermissionsPage() {
  const rules = [
    'Chỉ Owner hoặc App Admin được tạo và cấu hình nhóm ở mức toàn ứng dụng.',
    'Người dùng chỉ nhìn thấy hoặc tạo đề xuất trong nhóm nằm trong phạm vi "Sử dụng cho".',
    "Người duyệt chỉ thao tác khi đề xuất tới lượt của họ nếu dùng xử lý lần lượt.",
    "Người theo dõi được xem và nhận cập nhật nhưng không tự động có quyền duyệt.",
  ];

  return (
    <div className="max-w-[560px]">
      <h2 className="mb-4 text-[15px] font-semibold text-gray-800">Tùy chỉnh về phân quyền</h2>
      <p className="mb-3 text-[12px] text-gray-500">
        Quy tắc phân quyền tối thiểu áp dụng cho nhóm đề xuất này (§5.3):
      </p>
      <ul className="flex flex-col gap-2">
        {rules.map((rule) => (
          <li key={rule} className="flex items-start gap-2 text-[13px] text-gray-700">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-action-blue)]" />
            {rule}
          </li>
        ))}
      </ul>
    </div>
  );
}
