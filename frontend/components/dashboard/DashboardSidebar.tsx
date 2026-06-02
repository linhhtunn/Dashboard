import Link from "next/link";
import {
  Bell,
  LayoutGrid,
  Settings,
  ShieldPlus,
  UserRound,
} from "lucide-react";

type DashboardSidebarProps = {
  activeItem?: "dashboard" | "patients" | "alerts" | "settings";
};

type NavItem = {
  key: "dashboard" | "patients" | "alerts" | "settings";
  label: string;
  href: string;
  icon: typeof LayoutGrid;
  badge?: string;
};

const navItems: NavItem[] = [
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
];

function BrandLockup() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="flex h-12 w-12 items-center justify-center rounded-[1.4rem] bg-white shadow-[0_12px_30px_rgba(13,71,161,0.14)] ring-1 ring-[color:var(--cs-border)]">
        <ShieldPlus className="h-6 w-6 text-[color:var(--cs-primary)]" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-[2rem] font-semibold leading-none text-[color:var(--cs-heading)]">
          CareSignal<span className="text-[color:var(--cs-teal)]">AI</span>
        </p>
        <p className="mt-1 text-xs text-[color:var(--cs-text-soft)]">
          Clinical monitoring workspace
        </p>
      </div>
    </div>
  );
}

function SidebarNav({ activeItem = "dashboard" }: DashboardSidebarProps) {
  return (
    <nav className="mt-8 space-y-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.key === activeItem;

        return (
          <Link
            key={item.key}
            href={item.href}
            className={[
              "group flex items-center justify-between rounded-[1.2rem] px-4 py-3.5 transition",
              active
                ? "bg-[color:var(--cs-primary)] text-white shadow-[0_14px_32px_rgba(13,71,161,0.2)]"
                : "text-[color:var(--cs-heading)] hover:bg-white/75 hover:text-[color:var(--cs-primary)]",
            ].join(" ")}
          >
            <span className="flex items-center gap-3">
              <span
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-2xl transition",
                  active
                    ? "bg-white/12 text-white"
                    : "bg-white/70 text-[color:var(--cs-primary)] group-hover:bg-white",
                ].join(" ")}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-base font-medium">{item.label}</span>
            </span>

            {item.badge ? (
              <span
                className={[
                  "flex h-7 min-w-[28px] items-center justify-center rounded-full px-2 text-xs font-semibold",
                  active
                    ? "bg-white text-[color:var(--cs-danger)]"
                    : "bg-[color:var(--cs-danger)] text-white shadow-[0_10px_24px_rgba(229,72,77,0.22)]",
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

function DoctorStatusCard() {
  return (
    <div className="dashboard-surface mt-auto rounded-[1.6rem] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0D47A1_0%,#8ED3E6_100%)] text-base font-semibold text-white">
          LN
        </div>

        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-[color:var(--cs-heading)]">
            Dr. Linh Nguyen
          </p>
          <p className="text-sm text-[color:var(--cs-text-soft)]">Cardiology</p>
        </div>
      </div>

      <div className="mt-4 rounded-[1rem] border border-[color:rgba(0,150,136,0.18)] bg-[color:rgba(0,150,136,0.08)] px-3 py-3 text-sm text-[color:var(--cs-text)]">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--cs-teal)]" />
          <span className="font-medium text-[color:var(--cs-heading)]">On Duty</span>
        </div>
        <p className="mt-2 leading-6 text-[color:var(--cs-text-soft)]">
          Monitoring current patients and reviewing AI summaries.
        </p>
      </div>
    </div>
  );
}

export function DashboardSidebar({ activeItem }: DashboardSidebarProps) {
  return (
    <aside className="dashboard-glass hidden min-h-[calc(100vh-3rem)] flex-col rounded-[2rem] p-5 lg:flex">
      <BrandLockup />
      <SidebarNav activeItem={activeItem} />
      <DoctorStatusCard />
    </aside>
  );
}
