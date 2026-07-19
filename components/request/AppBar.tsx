"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BarChart3, Grid3x3, HelpCircle, Home, Search, Settings } from "lucide-react";
import AppLauncher from "@/components/request/AppLauncher";
import NotificationBell from "@/components/request/NotificationBell";
import { useCurrentSession } from "@/lib/useCurrentSession";

const iconItems = [
  { key: "home", label: "Trang chủ", icon: Home, href: "/request" },
  { key: "search", label: "Tìm kiếm", icon: Search, href: "/request/search" },
];

export default function AppBar() {
  const { isAdmin } = useCurrentSession();
  const [launcherOpen, setLauncherOpen] = useState(false);

  return (
    <nav
      aria-label="Thanh ứng dụng"
      className="flex h-full w-20 shrink-0 flex-col items-center bg-[var(--color-appbar-bg)] py-3"
    >
      <button
        type="button"
        onClick={() => setLauncherOpen(true)}
        aria-label="Mở danh sách ứng dụng HPCons"
        title="Mở danh sách ứng dụng"
        className="mb-2 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white"
      >
        <Image src="/logo.png" alt="HPCons" width={40} height={40} className="h-full w-full object-contain" />
      </button>

      <div className="flex flex-1 flex-col items-center gap-1.5">
        <Link
          href={iconItems[0].href}
          title={iconItems[0].label}
          aria-label={iconItems[0].label}
          className="flex h-12 w-12 items-center justify-center rounded-xl text-[var(--color-appbar-text)] hover:bg-white/10 hover:text-[var(--color-appbar-text-active)]"
        >
          <Home size={22} strokeWidth={1.75} />
        </Link>

        <NotificationBell />

        {iconItems.slice(1).map((item) => (
          <Link
            key={item.key}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            className="flex h-12 w-12 items-center justify-center rounded-xl text-[var(--color-appbar-text)] hover:bg-white/10 hover:text-[var(--color-appbar-text-active)]"
          >
            <item.icon size={22} strokeWidth={1.75} />
          </Link>
        ))}

        {isAdmin && (
          <>
            <Link
              href="/request/reports"
              title="Báo cáo"
              aria-label="Báo cáo"
              className="flex h-12 w-12 items-center justify-center rounded-xl text-[var(--color-appbar-text)] hover:bg-white/10 hover:text-[var(--color-appbar-text-active)]"
            >
              <BarChart3 size={22} strokeWidth={1.75} />
            </Link>
            <Link
              href="/request/groups"
              title="Tùy chỉnh"
              aria-label="Tùy chỉnh"
              className="relative flex h-12 w-12 items-center justify-center rounded-xl text-[var(--color-appbar-text)] hover:bg-white/10 hover:text-[var(--color-appbar-text-active)]"
            >
              <Settings size={22} strokeWidth={1.75} />
            </Link>
          </>
        )}

        <button
          type="button"
          onClick={() => setLauncherOpen(true)}
          title="Ứng dụng khác"
          aria-label="Mở danh sách ứng dụng khác"
          className="flex h-12 w-12 items-center justify-center rounded-xl text-[var(--color-appbar-text)] hover:bg-white/10 hover:text-[var(--color-appbar-text-active)]"
        >
          <Grid3x3 size={22} strokeWidth={1.75} />
        </button>
      </div>

      <Link
        href="/"
        title="Trợ giúp"
        aria-label="Trợ giúp và hướng dẫn"
        className="flex h-12 w-12 items-center justify-center rounded-xl text-[var(--color-appbar-text)] hover:bg-white/10 hover:text-[var(--color-appbar-text-active)]"
      >
        <HelpCircle size={22} strokeWidth={1.75} />
      </Link>

      {launcherOpen && <AppLauncher onClose={() => setLauncherOpen(false)} />}
    </nav>
  );
}
