import { Bell, ChevronDown, Globe, Hospital, Search } from "lucide-react";

export function DashboardTopBar() {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-[0_10px_30px_rgba(13,71,161,0.06)] backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0D47A1] to-[#009688] text-sm font-bold text-white">
            CS
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#009688]">
              CareSignal AI
            </p>
            <h1 className="truncate text-xl font-semibold text-[#172554]">
              Clinical Dashboard
            </h1>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="flex min-w-[240px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            <Search className="h-4 w-4" />
            <span className="truncate">Tìm bệnh nhân, MRN, cảnh báo...</span>
          </label>

          <button
            type="button"
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300"
          >
            <span className="flex items-center gap-2">
              <Hospital className="h-4 w-4 text-[#0D47A1]" />
              <span>Vinmec International Hospital</span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300"
          >
            <Globe className="h-4 w-4 text-[#009688]" />
            <span>VI</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#E5484D] px-1 text-[11px] font-semibold text-white">
              3
            </span>
          </button>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E8EEF9] text-sm font-semibold text-[#0D47A1]"
            aria-label="User menu"
          >
            DR
          </button>
        </div>
      </div>
    </header>
  );
}