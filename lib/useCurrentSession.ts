"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/lib/permissions";

export interface CurrentSession {
  uid: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
}

/** Phiên hiện tại phía client — dùng để ẩn/hiện UI theo vai trò (server vẫn là nơi chặn thật). */
export function useCurrentSession() {
  const [session, setSession] = useState<CurrentSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CurrentSession | null) => {
        if (!cancelled) setSession(data);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { session, loaded, isAdmin: session?.role === "owner" || session?.role === "admin" };
}
