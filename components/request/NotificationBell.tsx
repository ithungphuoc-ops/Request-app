"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import type { RequestInstance } from "@/lib/types";

interface NotificationItem {
  id: string;
  requestId: string;
  text: string;
  at: string;
}

function buildNotifications(inbox: RequestInstance[], mine: RequestInstance[]): NotificationItem[] {
  const items: NotificationItem[] = [];

  for (const r of inbox) {
    const lastEntry = r.history[r.history.length - 1];
    const forwardedToMe = lastEntry?.action === "Đã chuyển tiếp";
    items.push({
      id: `inbox-${r.id}`,
      requestId: r.id,
      text: forwardedToMe
        ? `Bạn được chuyển tiếp đề xuất "${r.groupNameSnapshot}"`
        : `"${r.groupNameSnapshot}" đang chờ bạn duyệt`,
      at: lastEntry?.at ?? r.submittedAt,
    });
  }

  for (const r of mine) {
    if (r.status !== "approved" && r.status !== "rejected") continue;
    const lastEntry = r.history[r.history.length - 1];
    items.push({
      id: `mine-${r.id}`,
      requestId: r.id,
      text: `Đề xuất "${r.groupNameSnapshot}" của bạn đã ${
        r.status === "approved" ? "được chấp thuận" : "bị từ chối"
      }`,
      at: lastEntry?.at ?? r.submittedAt,
    });
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8);
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/requests?scope=inbox").then((res) => (res.ok ? res.json() : { requests: [] })),
      fetch("/api/requests?scope=mine").then((res) => (res.ok ? res.json() : { requests: [] })),
    ])
      .then(([inboxData, mineData]: [{ requests: RequestInstance[] }, { requests: RequestInstance[] }]) => {
        setPendingCount(inboxData.requests?.length ?? 0);
        setItems(buildNotifications(inboxData.requests ?? [], mineData.requests ?? []));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Thông báo"
        aria-label="Thông báo"
        className="relative flex h-12 w-12 items-center justify-center rounded-xl text-[var(--color-appbar-text)] hover:bg-white/10 hover:text-[var(--color-appbar-text-active)]"
      >
        <Bell size={22} strokeWidth={1.75} />
        {pendingCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--color-danger-red)] px-0.5 text-[9px] font-semibold text-white">
            {pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full top-0 z-20 ml-2 w-[300px] rounded border border-[var(--color-border)] bg-white shadow-lg">
          <div className="border-b border-gray-100 px-3 py-2 text-[13px] font-semibold text-gray-700">
            Thông báo
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-[12px] text-gray-400">Chưa có thông báo nào.</p>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={`/request/requests/${item.requestId}`}
                  onClick={() => setOpen(false)}
                  className="block border-b border-gray-50 px-3 py-2.5 text-[12px] text-gray-700 last:border-0 hover:bg-gray-50"
                >
                  <p>{item.text}</p>
                  <p className="mt-0.5 text-gray-400">{new Date(item.at).toLocaleString("vi-VN")}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
