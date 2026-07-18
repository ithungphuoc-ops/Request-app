// Nguồn duy nhất cho danh sách ứng dụng HP Cons — do app tổng (account.hpcore.vn)
// quản lý, các app con (pkd_crm, KhoUNICE, base-request-app...) đều gọi chung.
export const HPCORE_APPS_API = "https://account.hpcore.vn/api/apps";
export const HPCORE_PROFILE_URL = "https://account.hpcore.vn/profile";
export const HPCORE_DASHBOARD_URL = "https://account.hpcore.vn/dashboard";

// Khoá nhận diện "app đang dùng" trong danh sách ứng dụng — khớp domain thật
// của base-request-app (request.hpcore.vn), theo đúng pattern app.href.includes(...)
// đã dùng ở pkd_crm-next/KhoUNICE_Web.
export const CURRENT_APP_HOST = "request.hpcore.vn";
