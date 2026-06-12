"use client";

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
  activeThreadId?: string;
  collapsed?: boolean;
  historyItems: SidebarHistoryItem[];
  historyDisabled?: boolean;
  onCreateNewChat: () => void;
  onSelectThread: (threadId: string) => void;
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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(255,255,255,0.56))] shadow-[0_16px_32px_rgba(13,71,161,0.14)] ring-1 ring-[color:rgba(13,71,161,0.08)] backdrop-blur-[20px]">
        <ShieldPlus className="h-4.5 w-4.5 text-[color:var(--cs-primary)]" />
      </div>

      {!collapsed ? (
        <div className="min-w-0">
          <p className="truncate text-[1.55rem] font-semibold leading-none text-[color:var(--cs-heading)]">
            CareSignal<span className="text-[color:var(--cs-teal)]">AI</span>
          </p>
          <p className="mt-0.5 text-[10px] text-[color:var(--cs-text-soft)]">
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
    <nav className="mt-4 shrink-0 space-y-1">
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
                ? "justify-center px-0 py-1"
                : "items-center justify-between px-2.5 py-2",
              active
                ? "bg-[linear-gradient(135deg,rgba(13,71,161,0.98),rgba(0,150,136,0.74))] text-white shadow-[0_18px_36px_rgba(13,71,161,0.24)]"
                : "text-[color:var(--cs-heading)] hover:bg-[linear-gradient(135deg,rgba(13,71,161,0.16),rgba(0,150,136,0.12))] hover:text-[color:var(--cs-primary)]",
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
                  "relative flex h-8 w-8 items-center justify-center rounded-xl border transition-all duration-200",
                  active
                    ? "border-white/12 bg-white/12 text-white"
                    : "border-white/70 bg-white/66 text-[color:var(--cs-primary)] group-hover:border-white/80 group-hover:bg-white/82 group-hover:text-[color:var(--cs-primary-strong)]",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {collapsed && item.badge ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[color:var(--cs-danger)] px-1 text-[9px] font-semibold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </span>

              {!collapsed ? (
                <span className="text-[14px] font-medium">{item.label}</span>
              ) : null}
            </span>

            {!collapsed && item.badge ? (
              <span
                className={[
                  "flex h-5.5 min-w-[22px] items-center justify-center rounded-full px-2 text-[10px] font-semibold",
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
  activeThreadId,
  collapsed = false,
  historyItems,
  historyDisabled = false,
  onCreateNewChat,
  onSelectThread,
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
        "dashboard-glass hidden h-full min-h-0 flex-col overflow-hidden border-r border-white/35 lg:flex",
        collapsed ? "px-2 py-2.5" : "px-2.5 py-3",
      ].join(" ")}
    >
      <div
        className={[
          "flex w-full shrink-0 items-center",
          collapsed ? "flex-col justify-center gap-2.5" : "justify-between",
        ].join(" ")}
      >
        <BrandLockup collapsed={collapsed} subtitle={copy.subtitle} />

        <button
          type="button"
          onClick={onToggle}
          className="dashboard-input flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[color:var(--cs-primary)] transition hover:border-white/80 hover:bg-white/76"
          aria-label={collapsed ? copy.expand : copy.collapse}
          title={collapsed ? copy.expand : copy.collapse}
        >
          <ToggleIcon className="h-4 w-4" />
        </button>
      </div>

      {activeItem === "dashboard" ? (
        <button
          type="button"
          onClick={onCreateNewChat}
          className={[
            "dashboard-input mt-3 flex rounded-xl text-[color:var(--cs-primary)] transition-all duration-200 hover:border-white/80 hover:bg-[linear-gradient(135deg,rgba(13,71,161,0.14),rgba(0,150,136,0.1))] hover:text-[color:var(--cs-primary-strong)]",
            collapsed
              ? "items-center justify-center px-0 py-2"
              : "items-center gap-2 px-3 py-2",
          ].join(" ")}
        >
          <Plus className="h-4 w-4" />
          {!collapsed ? (
            <span className="text-[13px] font-medium">{copy.newChat}</span>
          ) : null}
        </button>
      ) : null}

      <SidebarNav
        activeItem={activeItem}
        collapsed={collapsed}
        items={copy.navItems}
      />

      {activeItem === "dashboard" ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          {!collapsed ? (
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--cs-text-soft)]">
              {copy.recentChats}
            </p>
          ) : null}

          <div className="dashboard-scroll-area min-h-0 flex-1 overflow-y-auto pr-1">
            <ChatHistoryPanel
              activeThreadId={activeThreadId}
              collapsed={collapsed}
              disabled={historyDisabled}
              items={historyItems}
              onSelectThread={onSelectThread}
            />
          </div>
        </div>
      ) : null}
    </aside>
  );
}
