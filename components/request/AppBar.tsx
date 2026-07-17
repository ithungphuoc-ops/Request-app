"use client";

import Link from "next/link";
import { BarChart3, Grid3x3, HelpCircle, Home, Search, Settings } from "lucide-react";
import NotificationBell from "@/components/request/NotificationBell";

const iconItems = [
  { key: "home", label: "Trang chủ", icon: Home, href: "/request" },
  { key: "search", label: "Tìm kiếm", icon: Search, href: "/request/search" },
  { key: "reports", label: "Báo cáo", icon: BarChart3, href: "/request/search" },
];

export default function AppBar() {
  return (
    <nav
      aria-label="Thanh ứng dụng"
      className="flex h-full w-[42px] shrink-0 flex-col items-center bg-[var(--color-appbar-bg)] py-3"
    >
      <Link
        href="/"
        aria-label="Base Request"
        className="mb-3 flex h-8 w-8 items-center justify-center rounded bg-[var(--color-action-blue)] text-[13px] font-bold text-white"
      >
        R
      </Link>

      <div className="flex flex-1 flex-col items-center gap-1">
        <Link
          href={iconItems[0].href}
          title={iconItems[0].label}
          aria-label={iconItems[0].label}
          className="flex h-9 w-9 items-center justify-center rounded text-[var(--color-appbar-text)] hover:bg-white/10 hover:text-[var(--color-appbar-text-active)]"
        >
          <Home size={18} strokeWidth={1.75} />
        </Link>

        <NotificationBell />

        {iconItems.slice(1).map((item) => (
          <Link
            key={item.key}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            className="flex h-9 w-9 items-center justify-center rounded text-[var(--color-appbar-text)] hover:bg-white/10 hover:text-[var(--color-appbar-text-active)]"
          >
            <item.icon size={18} strokeWidth={1.75} />
          </Link>
        ))}

        <Link
          href="/request/groups"
          title="Tùy chỉnh"
          aria-label="Tùy chỉnh"
          className="relative flex h-9 w-9 items-center justify-center rounded text-[var(--color-appbar-text)] hover:bg-white/10 hover:text-[var(--color-appbar-text-active)]"
        >
          <Settings size={18} strokeWidth={1.75} />
        </Link>

        <Link
          href="/"
          title="Ứng dụng khác"
          aria-label="Mở danh sách ứng dụng khác"
          className="flex h-9 w-9 items-center justify-center rounded text-[var(--color-appbar-text)] hover:bg-white/10 hover:text-[var(--color-appbar-text-active)]"
        >
          <Grid3x3 size={18} strokeWidth={1.75} />
        </Link>
      </div>

      <Link
        href="/"
        title="Trợ giúp"
        aria-label="Trợ giúp và hướng dẫn"
        className="flex h-9 w-9 items-center justify-center rounded text-[var(--color-appbar-text)] hover:bg-white/10 hover:text-[var(--color-appbar-text-active)]"
      >
        <HelpCircle size={18} strokeWidth={1.75} />
      </Link>
    </nav>
  );
}
