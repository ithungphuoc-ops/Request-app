"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  FileClock,
  History,
  Home,
  Inbox,
  Layers,
  Plus,
  Search,
  Send,
  Settings,
  Star,
  Webhook,
} from "lucide-react";
import { useRequestContext } from "@/context/RequestContext";
import { useCurrentSession } from "@/lib/useCurrentSession";

const staticLinks = [
  { key: "home", label: "Trang chủ Request", href: "/request", icon: Home, exact: true, adminOnly: false },
  { key: "my-requests", label: "Đề xuất của tôi", href: "/request/my-requests", icon: Send, adminOnly: false },
  { key: "inbox", label: "Chờ tôi duyệt", href: "/request/inbox", icon: Inbox, adminOnly: false },
  { key: "search", label: "Tìm kiếm đề xuất", href: "/request/search", icon: Search, adminOnly: false },
  { key: "all-groups", label: "Tất cả nhóm đề xuất (Tùy chỉnh)", href: "/request/groups", icon: Settings, adminOnly: true },
  { key: "system-proposals", label: "Tất cả đề xuất hệ thống", href: "/request/system-proposals", icon: FileClock, adminOnly: true },
  { key: "webhook-history", label: "Lịch sử Webhook", href: "/request/webhook-history", icon: Webhook, adminOnly: true },
  { key: "webhook-trace", label: "Dấu vết Webhook", href: "/request/webhook-trace", icon: Webhook, adminOnly: true },
  { key: "group-history", label: "Lịch sử chỉnh sửa nhóm", href: "/request/group-history", icon: History, adminOnly: true },
];

export default function FuncBar() {
  const pathname = usePathname();
  const { categoryGroups, openCreateGroup } = useRequestContext();
  const { isAdmin } = useCurrentSession();

  const pinnedGroups = categoryGroups.flatMap((cat) => cat.groups).filter((g) => g.pinned);
  const visibleLinks = staticLinks.filter((item) => isAdmin || !item.adminOnly);

  return (
    <nav
      aria-label="Thanh chức năng Base Request"
      className="flex h-full w-[165px] shrink-0 flex-col overflow-y-auto border-r border-[var(--color-funcbar-border)] bg-[var(--color-funcbar-bg)] py-3"
    >
      <Link
        href="/"
        className="mx-2 mb-2 flex items-center gap-2 rounded px-2 py-2 text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-funcbar-active-bg)]"
      >
        <ChevronLeft size={14} />
        Trang chủ
      </Link>

      <div className="flex flex-col gap-0.5 px-2">
        {visibleLinks.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`relative flex items-center gap-2 rounded px-2 py-2 text-[13px] ${
                isActive
                  ? "bg-[var(--color-funcbar-active-bg)] font-medium text-[var(--color-action-blue)]"
                  : "text-gray-700 hover:bg-[var(--color-funcbar-active-bg)]"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[var(--color-action-blue)]" />
              )}
              <item.icon size={15} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {isAdmin && (
        <>
          <div className="mx-2 my-3 border-t border-[var(--color-funcbar-border)]" />

          <div className="flex flex-col gap-1.5 px-2">
            <Link
              href="/request/groups/from-template"
              className="flex items-center gap-2 rounded px-2 py-2 text-[13px] text-gray-700 hover:bg-[var(--color-funcbar-active-bg)]"
            >
              <Layers size={15} className="shrink-0" />
              Tạo nhóm từ mẫu
            </Link>
            <button
              type="button"
              onClick={openCreateGroup}
              className="flex items-center gap-2 rounded bg-[var(--color-action-blue)] px-2 py-2 text-[13px] font-medium text-white hover:brightness-95"
            >
              <Plus size={15} className="shrink-0" />
              Tạo nhóm đề xuất
            </button>
          </div>
        </>
      )}

      <div className="mx-2 my-3 border-t border-[var(--color-funcbar-border)]" />

      {pinnedGroups.length > 0 && (
        <div className="px-2">
          <p className="mb-1 flex items-center gap-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            <Star size={11} /> Quan trọng
          </p>
          <div className="flex flex-col gap-0.5">
            {pinnedGroups.map((g) => (
              <Link
                key={g.id}
                href={`/request/groups/${g.id}/submit`}
                className="truncate rounded px-2 py-1.5 text-[12px] text-gray-600 hover:bg-[var(--color-funcbar-active-bg)]"
                title={g.name}
              >
                {g.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 px-2">
        <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Nhóm đề xuất
        </p>
        <div className="flex flex-col gap-2">
          {categoryGroups.map((cat) => {
            const activeGroups = cat.groups.filter((g) => g.status === "active");
            if (activeGroups.length === 0) return null;
            return (
              <div key={cat.id}>
                <p className="truncate px-2 py-1 text-[11px] font-medium text-gray-400" title={cat.name}>
                  {cat.code} - {cat.name}
                </p>
                <div className="flex flex-col gap-0.5">
                  {activeGroups.map((g) => (
                    <Link
                      key={g.id}
                      href={`/request/groups/${g.id}/submit`}
                      className="truncate rounded px-2 py-1.5 text-[12px] text-gray-700 hover:bg-[var(--color-funcbar-active-bg)]"
                      title={g.description || g.name}
                    >
                      {g.name}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
