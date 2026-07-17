"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Layers, Plus, Search } from "lucide-react";
import { useRequestContext, type StatusFilter } from "@/context/RequestContext";
import GroupCategoryCard from "@/components/request/GroupCategoryCard";
import Link from "next/link";

const filterTabs: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang khả dụng" },
  { key: "closed", label: "Đang tạm đóng" },
];

export default function GroupsPage() {
  const {
    filteredCategoryGroups,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    openCreateGroup,
  } = useRequestContext();
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!createMenuOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setCreateMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [createMenuOpen]);

  return (
    <div className="px-8 py-6">
      <div className="mb-1 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[23px] font-bold text-gray-900">Quản lý nhóm đề xuất</h1>
          <div className="mt-3 flex items-center gap-5">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`pb-2 text-[13px] ${
                  statusFilter === tab.key
                    ? "border-b-2 border-[var(--color-action-blue)] font-semibold text-[var(--color-action-blue)]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm nhóm đề xuất"
              className="h-[36px] w-[230px] rounded border border-[var(--color-border)] bg-white pl-8 pr-3 text-[13px] outline-none focus:border-[var(--color-action-blue)]"
            />
          </div>

          <div className="relative" ref={createMenuRef}>
            <div className="flex h-[36px] items-stretch overflow-hidden rounded bg-[var(--color-action-blue)] text-white">
              <button
                type="button"
                onClick={openCreateGroup}
                className="flex items-center gap-1.5 pl-4 pr-3 text-[13px] font-medium hover:brightness-95"
              >
                <Plus size={15} />
                Tạo nhóm đề xuất
              </button>
              <button
                type="button"
                onClick={() => setCreateMenuOpen((v) => !v)}
                aria-label="Xem thêm lựa chọn tạo nhóm"
                aria-expanded={createMenuOpen}
                className="flex items-center border-l border-white/30 px-2 hover:brightness-95"
              >
                <ChevronDown size={14} />
              </button>
            </div>

            {createMenuOpen && (
              <div className="absolute right-0 top-[42px] z-10 w-[200px] rounded border border-[var(--color-border)] bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    openCreateGroup();
                    setCreateMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-gray-50"
                >
                  <Plus size={14} /> Tạo nhóm đề xuất
                </button>
                <Link
                  href="/request/groups/from-template"
                  onClick={() => setCreateMenuOpen(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-gray-50"
                >
                  <Layers size={14} /> Tạo nhóm từ mẫu
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        {filteredCategoryGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[3px] border border-dashed border-[var(--color-border)] bg-white py-16">
            <p className="text-[13px] text-gray-400">
              Không tìm thấy nhóm đề xuất nào phù hợp.
            </p>
            <button
              type="button"
              onClick={openCreateGroup}
              className="flex h-[36px] items-center gap-1.5 rounded bg-[var(--color-action-blue)] px-4 text-[13px] font-medium text-white hover:brightness-95"
            >
              <Plus size={15} /> Tạo nhóm đề xuất
            </button>
          </div>
        ) : (
          filteredCategoryGroups.map((category) => (
            <GroupCategoryCard key={category.id} category={category} />
          ))
        )}
      </div>
    </div>
  );
}
