export function TopBar() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-panel/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-strong">
            CareSignal AI
          </p>
          <p className="truncate text-xs text-text-body">
            E2E Simulation for AI Health
          </p>
        </div>

        <div className="flex min-w-0 items-center gap-3 rounded-md border border-border bg-white px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-xs font-semibold text-secondary">
            DR
          </span>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-medium text-text-strong">
              Doctor Demo
            </p>
            <p className="truncate text-xs text-text-body">Mock user</p>
          </div>
        </div>
      </div>
    </header>
  );
}
