import { History } from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { SidebarHistoryItem } from "@/components/dashboard/DashboardExperience";

type ChatHistoryPanelProps = {
  collapsed?: boolean;
  disabled?: boolean;
  items: SidebarHistoryItem[];
};

function HistoryGroup({
  title,
  items,
  disabled,
  todayLabel,
}: {
  title: string;
  items: SidebarHistoryItem[];
  disabled: boolean;
  todayLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--cs-text-soft)]">
        {title}
      </p>

      <div className="space-y-1">
        {items.map((item, index) => {
          const active = title === todayLabel && index === 0;

          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              className={[
                "flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left transition-all duration-200",
                disabled
                  ? "cursor-default opacity-45"
                  : active
                    ? "bg-[linear-gradient(135deg,rgba(13,71,161,0.12),rgba(0,150,136,0.08))] text-[color:var(--cs-primary)]"
                    : "text-[color:var(--cs-text)] hover:bg-[linear-gradient(135deg,rgba(13,71,161,0.08),rgba(0,150,136,0.05))]",
              ].join(" ")}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-[color:var(--cs-text-soft)]">
                  <span>{item.timestamp}</span>
                  <span className="h-1 w-1 rounded-full bg-[color:var(--cs-border-strong)]" />
                  <span className="truncate">{item.issue}</span>
                </div>
              </div>

              {active ? (
                <span className="ml-3 h-2.5 w-2.5 shrink-0 rounded-full bg-[color:var(--cs-primary)]" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ChatHistoryPanel({
  collapsed = false,
  disabled = false,
  items,
}: ChatHistoryPanelProps) {
  const { locale } = useLocale();
  const todayLabel = locale === "vi" ? "Hôm nay" : "Today";
  const previousLabel = locale === "vi" ? "Trước đó" : "Earlier";
  const historyLabel = locale === "vi" ? "Lịch sử chat" : "Chat history";
  const sessionsLabel =
    locale === "vi" ? `${items.length} phiên` : `${items.length} session${items.length === 1 ? "" : "s"}`;
  const recentLabel =
    locale === "vi" ? "Lịch sử chat gần đây" : "Recent chat history";
  const todayItems = items.slice(0, 3);
  const previousItems = items.slice(3);

  if (collapsed) {
    return (
      <button
        type="button"
        disabled={disabled}
        className={[
          "flex w-full items-center justify-center rounded-2xl px-2 py-2.5 text-[color:var(--cs-text-soft)] transition",
          disabled
            ? "cursor-default opacity-45"
            : "hover:bg-[linear-gradient(135deg,rgba(13,71,161,0.12),rgba(0,150,136,0.08))] hover:text-[color:var(--cs-primary)]",
        ].join(" ")}
        aria-label={recentLabel}
        title={recentLabel}
      >
        <History className="h-4.5 w-4.5" />
      </button>
    );
  }

  return (
    <section className="flex min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between px-2">
        <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
          {historyLabel}
        </p>
        <span className="text-[11px] text-[color:var(--cs-text-soft)]">
          {sessionsLabel}
        </span>
      </div>

      <div className="space-y-4">
        <HistoryGroup
          title={todayLabel}
          items={todayItems}
          disabled={disabled}
          todayLabel={todayLabel}
        />
        {previousItems.length > 0 ? (
          <HistoryGroup
            title={previousLabel}
            items={previousItems}
            disabled={disabled}
            todayLabel={todayLabel}
          />
        ) : null}
      </div>
    </section>
  );
}
