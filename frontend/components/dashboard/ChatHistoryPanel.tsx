import { History, Sparkles } from "lucide-react";

type ChatHistoryItem = {
  id: string;
  title: string;
  timestamp: string;
  issue: string;
};

const historyItems: ChatHistoryItem[] = [
  {
    id: "overnight-summary",
    title: "Tóm tắt ca đêm",
    timestamp: "Hôm nay · 08:20",
    issue: "SpO₂ thấp",
  },
  {
    id: "medication-check",
    title: "Tác động của thuốc",
    timestamp: "Hôm qua · 17:40",
    issue: "Huyết áp",
  },
  {
    id: "risk-review",
    title: "Rà soát nguy cơ diễn tiến xấu",
    timestamp: "Hôm qua · 11:05",
    issue: "HRV - RMSSD",
  },
];

export function ChatHistoryPanel() {
  return (
    <section className="mt-8 min-h-0">
      <div className="flex items-center justify-between gap-3 px-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
            Lịch sử chat
          </p>
          <p className="mt-1 text-xs text-[color:var(--cs-text-soft)]">
            Gợi nhớ ngữ cảnh gần đây để cá nhân hóa câu trả lời.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:rgba(13,71,161,0.06)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--cs-primary)]">
          <History className="h-3.5 w-3.5" />
          3 phiên
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {historyItems.map((item, index) => {
          const active = index === 0;

          return (
            <button
              key={item.id}
              type="button"
              className={[
                "group w-full rounded-[1.15rem] border px-3.5 py-3 text-left transition",
                active
                  ? "border-[color:rgba(13,71,161,0.16)] bg-white/85 shadow-[0_10px_24px_rgba(13,71,161,0.08)]"
                  : "border-transparent bg-white/55 hover:border-[color:rgba(13,71,161,0.12)] hover:bg-white/80",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[color:var(--cs-heading)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--cs-text-soft)]">
                    {item.timestamp}
                  </p>
                </div>

                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)]">
                  <Sparkles className="h-4 w-4" />
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="inline-flex max-w-full truncate rounded-full border border-[color:rgba(0,150,136,0.16)] bg-[color:rgba(0,150,136,0.08)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--cs-teal)]">
                  {item.issue}
                </span>
                {active ? (
                  <span className="text-[11px] font-medium text-[color:var(--cs-primary)]">
                    Đang xem
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="mt-3 px-2 text-xs font-medium text-[color:var(--cs-primary)] transition hover:text-[color:var(--cs-primary-strong)]"
      >
        Xem thêm lịch sử
      </button>
    </section>
  );
}
