"use client";

import { useEffect, useState } from "react";
import {
  AppWindow,
  BarChart3,
  Briefcase,
  CalendarClock,
  Clock,
  ClipboardCheck,
  FileCheck,
  Heart,
  LayoutGrid,
  Laptop,
  MapPin,
  PenTool,
  Receipt,
  Search,
  Send,
  Settings,
  Warehouse,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { CURRENT_APP_HOST, HPCORE_APPS_API, HPCORE_DASHBOARD_URL, HPCORE_PROFILE_URL } from "@/lib/constants";
import { useCurrentSession } from "@/lib/useCurrentSession";

// Cùng bộ khoá icon với hpcons-portal/lib/dashboardApps.ts — app nào chưa có
// trong danh sách này thì rơi về icon mặc định (AppWindow).
const ICONS: Record<string, LucideIcon> = {
  Clock,
  MapPin,
  FileCheck,
  Send,
  CalendarClock,
  BarChart3,
  Settings,
  Warehouse,
  PenTool,
  Briefcase,
  Receipt,
  Workflow,
  Heart,
  Laptop,
  ClipboardCheck,
};

type RemoteApp = {
  name: string;
  description?: string;
  iconKey?: string;
  color: string;
  image?: string | null;
  href?: string | null;
  comingSoon?: boolean;
};

const isBiz = (name: string) => name.startsWith("HPC ");

export default function AppLauncher({ onClose }: { onClose: () => void }) {
  const { session } = useCurrentSession();
  const [query, setQuery] = useState("");
  const [apps, setApps] = useState<RemoteApp[] | null>(null);

  useEffect(() => {
    let ok = true;
    fetch(HPCORE_APPS_API)
      .then((res) => res.json())
      .then((data) => {
        if (ok) setApps(Array.isArray(data.apps) ? data.apps : []);
      })
      .catch(() => {
        if (ok) setApps([]);
      });
    return () => {
      ok = false;
    };
  }, []);

  const q = query.trim().toLowerCase();
  const list = (apps ?? []).filter((a) => !q || a.name.toLowerCase().includes(q));
  const groups = [
    {
      title: "Nhân sự & Vận hành",
      subtitle: "Chấm công, đơn từ, đặt phòng, báo cáo...",
      apps: list.filter((a) => !isBiz(a.name)),
    },
    {
      title: "Ứng dụng nghiệp vụ",
      subtitle: "Kinh doanh, kho, tài sản, quy trình...",
      apps: list.filter((a) => isBiz(a.name)),
    },
  ].filter((g) => g.apps.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-[6px] border border-[var(--color-border)] bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-5 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold text-gray-900">
              {session?.name ?? "Đang tải..."}
            </p>
            <p className="text-[12px] text-gray-500">
              <a href={HPCORE_PROFILE_URL} className="text-[var(--color-action-blue)] hover:underline">
                Tài khoản
              </a>
            </p>
          </div>
          <div className="relative sm:ml-auto sm:w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              placeholder="Tìm kiếm ứng dụng"
              className="h-9 w-full rounded border border-[var(--color-border)] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[var(--color-action-blue)]"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 sm:flex"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-5">
          <a
            href={HPCORE_DASHBOARD_URL}
            className="inline-flex items-center gap-2 text-[13px] text-[var(--color-action-blue)] hover:underline"
          >
            <LayoutGrid size={15} /> Tổng quan HPCons App Tổng
          </a>

          {apps === null ? (
            <p className="py-8 text-center text-[13px] text-gray-400">Đang tải danh sách ứng dụng…</p>
          ) : groups.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-gray-400">Không có ứng dụng phù hợp</p>
          ) : (
            groups.map((g) => (
              <div key={g.title}>
                <p className="text-[13px] font-semibold text-gray-800">{g.title}</p>
                <p className="mb-3 text-[12px] text-gray-400">{g.subtitle}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {g.apps.map((app) => (
                    <Tile key={app.name} app={app} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ app }: { app: RemoteApp }) {
  const Icon = (app.iconKey && ICONS[app.iconKey]) || AppWindow;
  const current = !!app.href && app.href.includes(CURRENT_APP_HOST);

  const inner = (
    <>
      <div
        className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl transition-transform group-hover:scale-105 ${
          app.image ? "bg-white" : app.color
        } ${app.comingSoon ? "opacity-50" : ""}`}
      >
        {app.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={app.image} alt={app.name} className="h-full w-full scale-[1.15] object-cover" />
        ) : (
          <Icon size={22} className="text-white" aria-hidden />
        )}
      </div>
      <span className={`text-center text-[12px] font-medium leading-tight ${app.comingSoon ? "text-gray-300" : "text-gray-800"}`}>
        {app.name}
      </span>
      {current && (
        <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] text-[var(--color-action-blue)]">
          Đang dùng
        </span>
      )}
      {app.comingSoon && (
        <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[9px] text-orange-500">Sắp ra mắt</span>
      )}
    </>
  );

  const cls = "group flex flex-col items-center gap-2 rounded-xl p-3 transition-colors hover:bg-gray-50";

  if (app.comingSoon || !app.href) {
    return (
      <div className={`${cls} cursor-default`} title="Sắp ra mắt">
        {inner}
      </div>
    );
  }
  if (current) {
    return <div className={cls}>{inner}</div>;
  }
  return (
    <a href={app.href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  );
}
