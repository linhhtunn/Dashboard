import { Dot, Sparkles } from "lucide-react";

export function AIWorkspaceHeader() {
  return (
    <div className="border-b dashboard-subtle-divider bg-gradient-to-br from-[color:rgba(13,71,161,0.03)] via-white to-[color:rgba(142,211,230,0.1)] px-5 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)] ring-1 ring-[color:rgba(13,71,161,0.08)]">
            <Sparkles className="h-4.5 w-4.5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[1.65rem] font-semibold leading-none text-[color:var(--cs-heading)]">
                CareSignal Bot
              </h2>
            </div>
            <p className="mt-1.5 text-sm text-[color:var(--cs-text-soft)]">
              Trả lời ngắn gọn, ưu tiên summary và điều hướng phác đồ liên quan.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-full border border-[color:rgba(0,150,136,0.18)] bg-[color:rgba(0,150,136,0.06)] px-3 py-1.5 text-sm text-[color:var(--cs-teal)]">
          <Dot className="h-5 w-5" />
          <span className="-ml-1 font-medium">Đang hoạt động</span>
        </div>
      </div>
    </div>
  );
}
