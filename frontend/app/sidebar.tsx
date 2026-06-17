"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/overview", label: "Overview", icon: "O" },
  { href: "/patients", label: "Patients", icon: "P" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-border bg-panel md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="flex h-full flex-col gap-4 px-4 py-4">
        <Link
          href="/overview"
          className="flex items-center gap-3 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary/25"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-white">
            CS
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-text-strong">
              CareSignal AI
            </span>
            <span className="block truncate text-xs text-text-body">
              Clinical portal
            </span>
          </span>
        </Link>

        <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex min-h-11 items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/25",
                  isActive
                    ? "border-primary/15 bg-primary/10 text-primary"
                    : "border-transparent text-text-body hover:border-border hover:bg-surface hover:text-text-strong",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-xs font-semibold",
                    isActive ? "bg-primary text-white" : "bg-surface text-text-body",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
