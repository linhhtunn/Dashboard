import { Bell, ChevronDown, Globe, Hospital } from "lucide-react";

export function DashboardTopBar() {
  return (
    <header className="dashboard-glass rounded-[1.6rem] px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <button
            type="button"
            className="dashboard-input flex items-center justify-between gap-3 rounded-2xl bg-white/90 px-3.5 py-2.5 text-sm text-[color:var(--cs-text)] transition hover:border-[color:var(--cs-border-strong)]"
          >
            <span className="flex items-center gap-2">
              <Hospital className="h-4 w-4 text-[color:var(--cs-primary)]" />
              <span>Vinmec International Hospital</span>
            </span>
            <ChevronDown className="h-4 w-4 text-[color:var(--cs-text-soft)]" />
          </button>

          <button
            type="button"
            className="dashboard-input flex items-center gap-2 rounded-2xl bg-white/90 px-3.5 py-2.5 text-sm text-[color:var(--cs-text)] transition hover:border-[color:var(--cs-border-strong)]"
          >
            <Globe className="h-4 w-4 text-[color:var(--cs-teal)]" />
            <span>VI</span>
            <ChevronDown className="h-4 w-4 text-[color:var(--cs-text-soft)]" />
          </button>

          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--cs-border)] bg-white/95 text-[color:var(--cs-text)] transition hover:border-[color:var(--cs-border-strong)]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[color:var(--cs-danger)] px-1 text-[11px] font-semibold text-white shadow-[0_8px_18px_rgba(229,72,77,0.28)]">
              3
            </span>
          </button>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--cs-primary-soft)] text-sm font-semibold text-[color:var(--cs-primary)]"
            aria-label="User menu"
          >
            DR
          </button>
        </div>
      </div>
    </header>
  );
}
