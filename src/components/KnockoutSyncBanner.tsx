"use client";

import { useSimulation } from "@/lib/store";

export function KnockoutSyncBanner() {
  const notice = useSimulation((s) => s.knockoutSyncNotice);
  const dismiss = useSimulation((s) => s.dismissKnockoutSyncNotice);

  if (!notice?.pending) return null;

  return (
    <div className="shrink-0 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100">
      <span className="mt-0.5 text-base leading-none" aria-hidden>
        ↻
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">Knockout đã cập nhật theo BXH mới</p>
        <p className="mt-0.5 text-amber-200/80">
          {notice.picksRemoved > 0
            ? `${notice.picksRemoved} dự đoán không còn hợp lệ đã được xóa. Các dự đoán còn lại được giữ nguyên.`
            : "Đội vào các trận vòng loại trực tiếp đã thay đổi theo kết quả vòng bảng."}
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-amber-200/90 hover:bg-amber-500/20 transition-colors"
      >
        Đóng
      </button>
    </div>
  );
}