import { SendHorizonal } from "lucide-react";

export function AIComposer() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        Ask CareSignal AI
      </label>

      <div className="flex items-end gap-3">
        <textarea
          rows={3}
          placeholder="Dat cau hoi ve tinh trang benh nhan, alert, xu huong 15 phut gan day..."
          className="min-h-[88px] flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0D47A1] focus:ring-2 focus:ring-[#0D47A1]/15"
        />

        <button
          type="button"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0D47A1] text-white shadow-[0_10px_25px_rgba(13,71,161,0.18)] transition hover:bg-[#0A3A84]"
          aria-label="Send prompt"
        >
          <SendHorizonal className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
