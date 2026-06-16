"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  ChevronDown,
  FlaskConical,
  Globe2,
  UserCog,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { useOperatorRole } from "@/lib/operator-role";
import { clinicalSummaryRepository } from "@/lib/repositories/clinical-summary.repository";

type ClinicalShellProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  viewportLocked?: boolean;
};

export function ClinicalShell({
  children,
  title,
  description,
  eyebrow,
  actions,
  viewportLocked = false,
}: ClinicalShellProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ClinicalNavbar />
      <main
        className={[
          "dashboard-scroll-area min-h-0 flex-1 overflow-y-auto",
          viewportLocked ? "overflow-hidden" : "",
        ].join(" ")}
      >
        <div
          className={[
            "mx-auto w-full max-w-[1600px] px-3 py-3 sm:px-5 sm:py-4 xl:px-6",
            viewportLocked ? "flex h-full min-h-0 flex-col py-2" : "",
          ].join(" ")}
        >
          {title ? (
            <header
              className={[
                "flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between",
                viewportLocked ? "mb-2 shrink-0" : "mb-4",
              ].join(" ")}
            >
              <div>
                {eyebrow ? (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--cs-teal)]">
                    {eyebrow}
                  </p>
                ) : null}
                <h1
                  className={[
                    "mt-1 font-semibold tracking-[-0.025em] text-[color:var(--cs-heading)]",
                    viewportLocked
                      ? "text-[1.2rem] sm:text-[1.35rem]"
                      : "text-[1.6rem] sm:text-[1.9rem]",
                  ].join(" ")}
                >
                  {title}
                </h1>
                {description ? (
                  <p
                    className={[
                      "max-w-3xl text-[color:var(--cs-text-soft)]",
                      viewportLocked
                        ? "mt-0.5 line-clamp-1 text-[12px] leading-4"
                        : "mt-1 text-[13px] leading-5",
                    ].join(" ")}
                  >
                    {description}
                  </p>
                ) : null}
              </div>
              {actions ? <div className="shrink-0">{actions}</div> : null}
            </header>
          ) : null}
          {viewportLocked ? <div className="min-h-0 flex-1">{children}</div> : children}
        </div>
      </main>
    </div>
  );
}

function ClinicalNavbar() {
  const pathname = usePathname();
  const { locale, setLocale } = useLocale();
  const ui = useClinicalUi();
  const { role, setRole, sessionName } = useOperatorRole();
  const [openAlertCount, setOpenAlertCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void clinicalSummaryRepository
      .get()
      .then((summary) => {
        if (!cancelled) setOpenAlertCount(summary.open_alert_count);
      })
      .catch(() => {
        if (!cancelled) setOpenAlertCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const navItems = [
    { href: "/patients", label: ui.nav.patients, icon: UsersRound },
    {
      href: "/alerts",
      label: ui.nav.alerts,
      icon: Bell,
      badge: openAlertCount !== null ? String(openAlertCount) : undefined,
    },
    { href: "/report", label: ui.nav.report, icon: BarChart3 },
    { href: "/staff", label: ui.nav.staff, icon: UserCog },
    { href: "/metrics", label: ui.nav.metrics, icon: FlaskConical, internal: true },
  ];

  const displayName = sessionName ?? (role === "doctor" ? ui.roles.doctor : ui.roles.coordinator);
  const dutyLabel =
    role === "doctor" ? ui.roles.dutyDoctor : ui.roles.dutyCoordinator;
  const initials = displayName
    .replace(/^(ĐD\.|YT\.|BS\.)\s*/, "")
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="dashboard-glass relative z-40 mx-3 mt-3 shrink-0 rounded-[1.15rem] border border-white/45 px-3 shadow-[0_22px_48px_rgba(15,23,42,0.08)] sm:mx-5 sm:px-5 xl:mx-6">
      <div className="mx-auto flex h-[60px] max-w-[1600px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-5">
          <Link href="/patients" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] bg-[linear-gradient(135deg,var(--cs-primary),var(--cs-teal))] text-white shadow-[0_12px_26px_rgba(13,71,161,0.22)]">
              <Activity className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <span className="hidden text-[1rem] font-semibold tracking-[-0.025em] text-[color:var(--cs-heading)] sm:block">
              {ui.appName}
              <span className="text-[color:var(--cs-teal)]"> {ui.appSuffix}</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {navItems.map(({ href, label, icon: Icon, badge, internal }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "flex h-9 shrink-0 items-center gap-2 rounded-[0.7rem] px-2.5 text-[12px] font-semibold transition sm:px-3 sm:text-[13px]",
                    active
                      ? "bg-[linear-gradient(135deg,rgba(13,71,161,0.14),rgba(0,150,136,0.1))] text-[color:var(--cs-primary)] shadow-[0_10px_24px_rgba(13,71,161,0.08)]"
                      : "text-[color:var(--cs-text)] hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.52),rgba(255,255,255,0.24))] hover:text-[color:var(--cs-heading)]",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden min-[520px]:inline">{label}</span>
                  {internal ? (
                    <span className="hidden rounded-full bg-[color:rgba(245,179,0,0.14)] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[color:#8a6100] lg:inline">
                      {ui.nav.internal}
                    </span>
                  ) : null}
                  {badge ? (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--cs-danger)] px-1 text-[9px] text-white">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value === "doctor" ? "doctor" : "coordinator")
            }
            className="dashboard-input hidden h-9 max-w-[170px] rounded-[0.7rem] px-2 text-[11px] font-semibold text-[color:var(--cs-text)] sm:block"
            aria-label={ui.roles.demoRoleLabel}
          >
            <option value="coordinator">{ui.roles.coordinator}</option>
            <option value="doctor">{ui.roles.doctor}</option>
          </select>
          <button
            type="button"
            onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
            className="dashboard-input flex h-9 items-center gap-1.5 rounded-[0.7rem] px-2 text-[12px] font-semibold text-[color:var(--cs-text)] transition hover:border-white/80 hover:bg-white/70"
            aria-label={ui.common.switchLanguage}
          >
            <Globe2 className="h-4 w-4 text-[color:var(--cs-teal)]" />
            {locale.toUpperCase()}
          </button>
          <div className="dashboard-input hidden items-center gap-2 rounded-[0.8rem] px-2 py-1.5 md:flex">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(13,71,161,0.14),rgba(0,150,136,0.12))] text-[10px] font-bold text-[color:var(--cs-primary)]">
              {initials}
            </span>
            <span className="leading-tight">
              <span className="block text-[12px] font-semibold text-[color:var(--cs-heading)]">
                {displayName}
              </span>
              <span className="block text-[10px] text-[color:var(--cs-teal)]">
                {dutyLabel}
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-[color:var(--cs-text-soft)]" />
          </div>
        </div>
      </div>
    </header>
  );
}
