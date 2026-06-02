import { SendHorizonal } from "lucide-react";

export function AIComposer() {
  return (
    <div className="rounded-[1.35rem] border border-[color:var(--cs-border)] bg-[color:rgba(248,250,252,0.75)] p-3">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--cs-text-soft)]">
        Ask CareSignal AI
      </label>

      <div className="flex items-end gap-3">
        <textarea
          rows={3}
          placeholder="Dat cau hoi ve tinh trang benh nhan, alert, xu huong 15 phut gan day..."
          className="dashboard-input min-h-[82px] flex-1 resize-none rounded-[1.15rem] bg-white px-4 py-3 text-sm text-[color:var(--cs-text)] outline-none transition placeholder:text-[color:var(--cs-text-soft)]"
        />

        <button
          type="button"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--cs-teal)_0%,var(--cs-primary)_100%)] text-white shadow-[0_12px_24px_rgba(13,71,161,0.2)] transition hover:scale-[1.02]"
          aria-label="Send prompt"
        >
          <SendHorizonal className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
