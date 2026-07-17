"use client";

import { useParams } from "next/navigation";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { FileSpreadsheet, Plus } from "lucide-react";
import { useRequestContext } from "@/context/RequestContext";
import FieldListItem from "@/components/request/FieldListItem";

export default function ProposalFormPage() {
  const params = useParams<{ groupId: string }>();
  const { getGroupById, reorderFields, updateGroup, openAddFieldModal } = useRequestContext();
  const group = getGroupById(params.groupId);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  if (!group) return null;

  const sortedFields = [...group.fields].sort((a, b) => a.order - b.order);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedFields.findIndex((f) => f.id === active.id);
    const newIndex = sortedFields.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortedFields, oldIndex, newIndex);
    reorderFields(group.id, reordered.map((f) => f.id));
  };

  const handleToggleRequired = (fieldId: string, required: boolean) => {
    updateGroup(group.id, {
      fields: group.fields.map((f) => (f.id === fieldId ? { ...f, required } : f)),
    });
  };

  const handleRemove = (fieldId: string) => {
    updateGroup(group.id, {
      fields: group.fields.filter((f) => f.id !== fieldId),
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-gray-800">Mẫu biểu đề xuất</h2>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-gray-500">
            <FileSpreadsheet size={14} className="text-green-600" />
            Kéo thả tệp Excel để nhập trường dữ liệu tùy chỉnh, hoặc{" "}
            <button type="button" className="text-[var(--color-action-blue)] hover:underline">
              tải tệp mẫu
            </button>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAddFieldModal(group.id)}
          className="flex h-[34px] shrink-0 items-center gap-1.5 rounded bg-[var(--color-action-blue)] px-3 text-[13px] font-medium text-white hover:brightness-95"
        >
          <Plus size={15} /> Thêm
        </button>
      </div>

      <div className="overflow-hidden rounded-[3px] border border-[var(--color-border)]">
        {sortedFields.length === 0 ? (
          <div className="flex min-h-[140px] items-center justify-center text-[13px] text-gray-400">
            Chưa có trường dữ liệu nào. Nhấn &quot;Thêm&quot; để tạo trường đầu tiên.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              {sortedFields.map((field) => (
                <FieldListItem
                  key={field.id}
                  field={field}
                  onToggleRequired={handleToggleRequired}
                  onRemove={handleRemove}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
