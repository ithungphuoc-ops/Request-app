"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { TaggedUser } from "@/lib/types";

interface TagUserInputProps {
  value: TaggedUser[];
  onChange: (users: TaggedUser[]) => void;
  placeholder?: string;
}

export default function TagUserInput({
  value,
  onChange,
  placeholder = "Gõ @ để tìm người dùng",
}: TagUserInputProps) {
  const [query, setQuery] = useState("");
  const [directory, setDirectory] = useState<TaggedUser[]>([]);
  const [results, setResults] = useState<TaggedUser[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/directory")
      .then((res) => (res.ok ? res.json() : { directory: [] }))
      .then((data: { directory: TaggedUser[] }) => {
        if (!cancelled) setDirectory(data.directory ?? []);
      })
      .catch(() => {
        if (!cancelled) setDirectory([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const term = query.replace("@", "").trim().toLowerCase();
    if (!term) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      const selectedIds = new Set(value.map((u) => u.id));
      const matches = directory.filter(
        (u) =>
          !selectedIds.has(u.id) &&
          (u.name.toLowerCase().includes(term) ||
            u.username.toLowerCase().includes(term)),
      );
      setResults(matches);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, value, directory]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectUser = (user: TaggedUser) => {
    onChange([...value, user]);
    setQuery("");
    setResults([]);
  };

  const removeUser = (id: string) => {
    onChange(value.filter((u) => u.id !== id));
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex min-h-[36px] flex-wrap items-center gap-1.5 rounded border border-[var(--color-border)] px-2 py-1.5 focus-within:border-[var(--color-action-blue)]">
        {value.map((u) => (
          <span
            key={u.id}
            className="flex items-center gap-1 rounded-full bg-gray-100 py-0.5 pl-1 pr-1.5 text-[12px] text-gray-700"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-action-blue)] text-[9px] font-semibold text-white">
              {u.avatarInitial}
            </span>
            {u.name}
            <button
              type="button"
              onClick={() => removeUser(u.id)}
              aria-label={`Bỏ chọn ${u.name}`}
              className="text-gray-400 hover:text-[var(--color-danger-red)]"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[100px] flex-1 text-[13px] outline-none"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-[180px] overflow-y-auto rounded border border-[var(--color-border)] bg-white shadow-lg">
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => selectUser(u)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-gray-50"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-action-blue)] text-[11px] font-semibold text-white">
                {u.avatarInitial}
              </span>
              <span>
                {u.name} <span className="text-gray-400">@{u.username}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
