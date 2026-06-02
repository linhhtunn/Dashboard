import { Activity, Bot, Dot } from "lucide-react";

export function AIWorkspaceHeader() {
  return (
    <div className="border-b border-slate-200 bg-gradient-to-br from-[#0D47A1]/8 via-white to-[#8ED3E6]/12 px-5 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0D47A1] text-white shadow-[0_10px_30px_rgba(13,71,161,0.18)]">
            <Bot className="h-5 w-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-[#172554]">
                AI Clinical Assistant
              </h2>
              <span className="rounded-full bg-[#0D47A1]/8 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0D47A1]">
                AI-first
              </span>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Khong gian hoi thoai de dat cau hoi, xem giai thich ngan gon, va
              doi chieu voi evidence truoc khi ra quyet dinh lam sang.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
          <Dot className="h-5 w-5" />
          <span className="-ml-1 font-medium">Online</span>
          <Activity className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
