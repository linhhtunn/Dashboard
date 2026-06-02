import { History, Sparkles } from "lucide-react";

type ChatHistoryItem = {
  id: string;
  title: string;
  timestamp: string;
  note: string;
};

const historyItems: ChatHistoryItem[] = [
  {
    id: "overnight-summary",
    title: "Tom tat ca dem",
    timestamp: "Hom nay · 08:20",
    note: "AI uu tien xu huong SpO2 va huyet ap tam thu khi tong hop.",
  },
  {
    id: "medication-check",
    title: "Tac dong cua thuoc",
    timestamp: "Hom qua · 17:40",
    note: "Ngu canh hoi dap nghieng ve lich thuoc va thay doi trong 1 gio.",
  },
  {
    id: "risk-review",
    title: "Ra soat nguy co dien tien xau",
    timestamp: "Hom qua · 11:05",
    note: "AI uu tien cau hoi co huong hanh dong va tom tat ngan gon.",
  },
];

export function ChatHistoryPanel() {
  return (
    <details className="dashboard-details border-b dashboard-subtle-divider px-6 py-4">
      <summary className="flex cursor-pointer items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
            Lich su hoi dap
          </p>
          <p className="mt-1 text-xs text-[color:var(--cs-text-soft)]">
            Giup ca nhan hoa cach AI uu tien context va mau tom tat.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full bg-[color:rgba(13,71,161,0.06)] px-3 py-1 text-xs font-medium text-[color:var(--cs-primary)]">
          <History className="h-3.5 w-3.5" />
          3 phien gan day
        </span>
      </summary>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {historyItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className="dashboard-glass-soft rounded-[1.1rem] px-4 py-3 text-left transition hover:border-[color:rgba(13,71,161,0.24)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-[color:var(--cs-text-soft)]">
                  {item.timestamp}
                </p>
              </div>

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)]">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-[color:var(--cs-text-soft)]">
              {item.note}
            </p>
          </button>
        ))}
      </div>
    </details>
  );
}
