"use client";

import { History } from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { SidebarHistoryItem } from "@/components/dashboard/DashboardExperience";

type ChatHistoryPanelProps = {
  activeThreadId?: string;
  collapsed?: boolean;
  disabled?: boolean;
  items: SidebarHistoryItem[];
  onSelectThread: (threadId: string) => void;
};

function HistoryGroup({
  title,
  items,
  activeThreadId,
  disabled,
  onSelectThread,
}: {
  title: string;
  items: SidebarHistoryItem[];
  activeThreadId?: string;
  disabled: boolean;
  onSelectThread: (threadId: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--cs-text-soft)]">
        {title}
      </p>

      <div className="space-y-0.5">
        {items.map((item) => {
          const active = item.id === activeThreadId;

          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectThread(item.id)}
              className={[
                "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition-all duration-200",
                disabled
                  ? "cursor-default opacity-45"
                  : active
                    ? "border border-white/55 bg-[linear-gradient(135deg,rgba(255,255,255,0.56),rgba(255,255,255,0.32))] text-[color:var(--cs-primary)] shadow-[0_12px_28px_rgba(13,71,161,0.08)]"
                    : "text-[color:var(--cs-text)] hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.48),rgba(255,255,255,0.24))] hover:shadow-[0_10px_24px_rgba(15,23,42,0.05)]",
              ].join(" ")}
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{item.title}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[color:var(--cs-text-soft)]">
                  <span>{item.timestamp}</span>
                  <span className="h-1 w-1 rounded-full bg-[color:var(--cs-border-strong)]" />
                  <span className="truncate">{item.issue}</span>
                </div>
              </div>

              {active ? (
                <span className="ml-2.5 h-2 w-2 shrink-0 rounded-full bg-[color:var(--cs-primary)]" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ChatHistoryPanel({
  activeThreadId,
  collapsed = false,
  disabled = false,
  items,
  onSelectThread,
}: ChatHistoryPanelProps) {
  const { locale } = useLocale();
  const todayLabel = locale === "vi" ? "Hôm nay" : "Today";
  const previousLabel = locale === "vi" ? "Trước đó" : "Earlier";
  const historyLabel = locale === "vi" ? "Lịch sử chat" : "Chat history";
  const sessionsLabel =
    locale === "vi"
      ? `${items.length} phiên`
      : `${items.length} session${items.length === 1 ? "" : "s"}`;
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
          "flex w-full items-center justify-center rounded-xl px-2 py-2 text-[color:var(--cs-text-soft)] transition",
          disabled
            ? "cursor-default opacity-45"
            : "hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.5),rgba(255,255,255,0.26))] hover:text-[color:var(--cs-primary)]",
        ].join(" ")}
        aria-label={recentLabel}
        title={recentLabel}
      >
        <History className="h-4 w-4" />
      </button>
    );
  }

  return (
    <section className="flex min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="text-[13px] font-semibold text-[color:var(--cs-heading)]">
          {historyLabel}
        </p>
        <span className="text-[10px] text-[color:var(--cs-text-soft)]">
          {sessionsLabel}
        </span>
      </div>

      <div className="space-y-3">
        <HistoryGroup
          title={todayLabel}
          items={todayItems}
          activeThreadId={activeThreadId}
          disabled={disabled}
          onSelectThread={onSelectThread}
        />
        {previousItems.length > 0 ? (
          <HistoryGroup
            title={previousLabel}
            items={previousItems}
            activeThreadId={activeThreadId}
            disabled={disabled}
            onSelectThread={onSelectThread}
          />
        ) : null}
      </div>
    </section>
  );
}
