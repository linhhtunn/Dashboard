import Link from "next/link";
import {
  Bell,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  Plus,
  Settings,
  ShieldPlus,
  UserRound,
} from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { ChatHistoryPanel } from "@/components/dashboard/ChatHistoryPanel";
import type { SidebarHistoryItem } from "@/components/dashboard/DashboardExperience";

type DashboardSidebarProps = {
  activeItem?: "dashboard" | "patients" | "alerts" | "settings";
  collapsed?: boolean;
  historyItems: SidebarHistoryItem[];
  historyDisabled?: boolean;
  onCreateNewChat: () => void;
  onToggle?: () => void;
};

type NavItem = {
  key: "dashboard" | "patients" | "alerts" | "settings";
  label: string;
  href: string;
  icon: typeof LayoutGrid;
  badge?: string;
};

function BrandLockup({
  collapsed = false,
  subtitle,
}: {
  collapsed?: boolean;
  subtitle: string;
}) {
  return (
    <div
      className={[
        "flex items-center",
        collapsed ? "justify-center" : "gap-3 px-2",
      ].join(" ")}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.15rem] bg-white shadow-[0_10px_28px_rgba(13,71,161,0.12)] ring-1 ring-[color:rgba(13,71,161,0.08)]">
        <ShieldPlus className="h-5 w-5 text-[color:var(--cs-primary)]" />
      </div>

      {!collapsed ? (
        <div className="min-w-0">
          <p className="truncate text-[1.8rem] font-semibold leading-none text-[color:var(--cs-heading)]">
            CareSignal<span className="text-[color:var(--cs-teal)]">AI</span>
          </p>
          <p className="mt-1 text-[11px] text-[color:var(--cs-text-soft)]">
            {subtitle}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SidebarNav({
  activeItem = "dashboard",
  collapsed = false,
  items,
}: Pick<DashboardSidebarProps, "activeItem" | "collapsed"> & {
  items: NavItem[];
}) {
  return (
    <nav className="mt-5 shrink-0 space-y-1.5">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.key === activeItem;

        return (
          <Link
            key={item.key}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            className={[
              "group flex rounded-2xl transition-all duration-200",
              collapsed
                ? "justify-center px-0 py-1.5"
                : "items-center justify-between px-3 py-2.5",
              active
                ? "bg-[linear-gradient(135deg,rgba(13,71,161,0.96),rgba(0,150,136,0.72))] text-white shadow-[0_14px_32px_rgba(13,71,161,0.22)]"
                : "text-[color:var(--cs-heading)] hover:bg-[linear-gradient(135deg,rgba(13,71,161,0.14),rgba(0,150,136,0.1))] hover:text-[color:var(--cs-primary)]",
            ].join(" ")}
          >
            <span
              className={[
                "flex items-center",
                collapsed ? "justify-center" : "gap-3",
              ].join(" ")}
            >
              <span
                className={[
                  "relative flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-200",
                  active
                    ? "bg-white/12 text-white"
                    : "bg-white/78 text-[color:var(--cs-primary)] group-hover:bg-white/90 group-hover:text-[color:var(--cs-primary-strong)]",
                ].join(" ")}
              >
                <Icon className="h-4.5 w-4.5" />
                {collapsed && item.badge ? (
                  <span className="absolute -right-1 -top-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[color:var(--cs-danger)] px-1 text-[10px] font-semibold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </span>

              {!collapsed ? (
                <span className="text-[15px] font-medium">{item.label}</span>
              ) : null}
            </span>

            {!collapsed && item.badge ? (
              <span
                className={[
                  "flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-[11px] font-semibold",
                  active
                    ? "bg-white text-[color:var(--cs-danger)]"
                    : "bg-[color:var(--cs-danger)] text-white",
                ].join(" ")}
              >
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardSidebar({
  activeItem,
  collapsed = false,
  historyItems,
  historyDisabled = false,
  onCreateNewChat,
  onToggle,
}: DashboardSidebarProps) {
  const { locale } = useLocale();
  const ToggleIcon = collapsed ? ChevronsRight : ChevronsLeft;
  const copy =
    locale === "vi"
      ? {
          subtitle: "Giám sát lâm sàng",
          expand: "Mở rộng sidebar",
          collapse: "Thu gọn sidebar",
          newChat: "Đoạn chat mới",
          recentChats: "Trò chuyện gần đây",
          navItems: [
            {
              key: "dashboard",
              label: "Tổng quan",
              href: "/dashboard",
              icon: LayoutGrid,
            },
            {
              key: "patients",
              label: "Bệnh nhân",
              href: "/patients",
              icon: UserRound,
            },
            {
              key: "alerts",
              label: "Cảnh báo",
              href: "/alerts",
              icon: Bell,
              badge: "3",
            },
            {
              key: "settings",
              label: "Cài đặt",
              href: "/settings",
              icon: Settings,
            },
          ] satisfies NavItem[],
        }
      : {
          subtitle: "Clinical monitoring",
          expand: "Expand sidebar",
          collapse: "Collapse sidebar",
          newChat: "New chat",
          recentChats: "Recent chats",
          navItems: [
            {
              key: "dashboard",
              label: "Dashboard",
              href: "/dashboard",
              icon: LayoutGrid,
            },
            {
              key: "patients",
              label: "Patients",
              href: "/patients",
              icon: UserRound,
            },
            {
              key: "alerts",
              label: "Alerts",
              href: "/alerts",
              icon: Bell,
              badge: "3",
            },
            {
              key: "settings",
              label: "Settings",
              href: "/settings",
              icon: Settings,
            },
          ] satisfies NavItem[],
        };

  return (
    <aside
      className={[
        "hidden h-full min-h-0 flex-col overflow-hidden border-r border-[color:rgba(217,226,236,0.64)] bg-white/22 lg:flex",
        collapsed ? "px-2 py-3" : "px-3 py-4",
      ].join(" ")}
    >
      <div
        className={[
          "flex w-full shrink-0 items-center",
          collapsed ? "flex-col justify-center gap-3" : "justify-between",
        ].join(" ")}
      >
        <BrandLockup collapsed={collapsed} subtitle={copy.subtitle} />

        <button
          type="button"
          onClick={onToggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[color:rgba(13,71,161,0.12)] bg-white/76 text-[color:var(--cs-primary)] transition hover:border-[color:rgba(13,71,161,0.2)] hover:bg-[linear-gradient(135deg,rgba(13,71,161,0.1),rgba(0,150,136,0.08))]"
          aria-label={collapsed ? copy.expand : copy.collapse}
          title={collapsed ? copy.expand : copy.collapse}
        >
          <ToggleIcon className="h-4.5 w-4.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={onCreateNewChat}
        className={[
          "mt-4 flex rounded-2xl border border-[color:rgba(13,71,161,0.12)] bg-white/76 text-[color:var(--cs-primary)] transition-all duration-200 hover:border-[color:rgba(13,71,161,0.2)] hover:bg-[linear-gradient(135deg,rgba(13,71,161,0.14),rgba(0,150,136,0.1))] hover:text-[color:var(--cs-primary-strong)]",
          collapsed
            ? "items-center justify-center px-0 py-2.5"
            : "items-center gap-2 px-3.5 py-2.5",
        ].join(" ")}
      >
        <Plus className="h-4.5 w-4.5" />
        {!collapsed ? <span className="text-sm font-medium">{copy.newChat}</span> : null}
      </button>

      <SidebarNav
        activeItem={activeItem}
        collapsed={collapsed}
        items={copy.navItems}
      />

      {activeItem === "dashboard" ? (
        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          {!collapsed ? (
            <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--cs-text-soft)]">
              {copy.recentChats}
            </p>
          ) : null}

          <div className="dashboard-scroll-area min-h-0 flex-1 overflow-y-auto pr-1">
            <ChatHistoryPanel
              collapsed={collapsed}
              disabled={historyDisabled}
              items={historyItems}
            />
          </div>
        </div>
      ) : null}
    </aside>
  );
}
