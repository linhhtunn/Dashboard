"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  ChevronDown,
  Globe,
  LayoutDashboard,
  Users,
  Zap,
  FileText,
  Settings,
} from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";

export default function Navbar() {
  const { locale, setLocale } = useLocale();
  const pathname = usePathname();
  const navLinks =
    locale === "vi"
      ? [
          { href: "/", label: "Dashboard", icon: LayoutDashboard },
          { href: "/patients", label: "Bệnh nhân", icon: Users },
          { href: "/signals", label: "Tín hiệu", icon: Zap },
          { href: "/reports", label: "Báo cáo", icon: FileText },
        ]
      : [
          { href: "/", label: "Dashboard", icon: LayoutDashboard },
          { href: "/patients", label: "Patients", icon: Users },
          { href: "/signals", label: "Signals", icon: Zap },
          { href: "/reports", label: "Reports", icon: FileText },
        ];

  return (
    <header className="glass-nav sticky top-0 z-50 h-16">
      <div className="mx-auto flex h-full max-w-screen-2xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "var(--color-primary)" }}
          >
            <Activity size={16} strokeWidth={2} className="text-white" />
          </span>
          <span
            className="text-[15px] font-700 tracking-tight"
            style={{ color: "var(--color-text-strong)" }}
          >
            CareSignal
            <span style={{ color: "var(--color-primary)" }}> AI</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "flex items-center gap-1.5 rounded-[var(--radius-md)] px-3.5 py-2 text-[13px] font-[500] transition-colors",
                  active
                    ? "text-white"
                    : "text-[var(--color-text-body)] hover:bg-black/[0.04] hover:text-[var(--color-text-strong)]",
                ].join(" ")}
                style={
                  active
                    ? { background: "var(--color-primary)" }
                    : undefined
                }
              >
                <Icon size={15} strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
            className="flex h-9 items-center gap-2 rounded-[var(--radius-md)] px-3 transition-colors hover:bg-black/[0.05]"
            aria-label={locale === "vi" ? "Đổi ngôn ngữ" : "Switch language"}
          >
            <Globe size={16} strokeWidth={1.75} style={{ color: "var(--color-text-body)" }} />
            <span className="text-[12px] font-[600] text-[var(--color-text-strong)] uppercase">
              {locale}
            </span>
          </button>

          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] transition-colors hover:bg-black/[0.05]"
            aria-label={locale === "vi" ? "Thông báo" : "Notifications"}
          >
            <Bell size={17} strokeWidth={1.75} style={{ color: "var(--color-text-body)" }} />
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
              style={{ background: "var(--color-danger)" }}
            />
          </button>

          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] transition-colors hover:bg-black/[0.05]"
            aria-label={locale === "vi" ? "Cài đặt" : "Settings"}
          >
            <Settings size={17} strokeWidth={1.75} style={{ color: "var(--color-text-body)" }} />
          </Link>

          <button className="flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 transition-colors hover:bg-black/[0.05]">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-[600] text-white"
              style={{ background: "var(--color-secondary)" }}
            >
              CS
            </span>
            <span className="hidden text-[13px] font-[500] text-[var(--color-text-strong)] lg:block">
              Dr. Smith
            </span>
            <ChevronDown size={13} strokeWidth={2} style={{ color: "var(--color-text-body)" }} />
          </button>
        </div>
      </div>
    </header>
  );
}
