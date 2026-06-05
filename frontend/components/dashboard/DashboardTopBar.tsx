"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Globe, Hospital } from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";

function useOutsideClose<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!ref.current) return;
      if (ref.current.contains(event.target as Node)) return;
      onClose();
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return ref;
}

export function DashboardTopBar() {
  const { locale, setLocale } = useLocale();
  const [hospitalOpen, setHospitalOpen] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const hospitalRef = useOutsideClose<HTMLDivElement>(() => setHospitalOpen(false));
  const localeRef = useOutsideClose<HTMLDivElement>(() => setLocaleOpen(false));
  const notificationsRef = useOutsideClose<HTMLDivElement>(() =>
    setNotificationsOpen(false),
  );
  const profileRef = useOutsideClose<HTMLDivElement>(() => setProfileOpen(false));

  const copy =
    locale === "vi"
      ? {
          hospitals: [
            "Vinmec International Hospital",
            "Chợ Rẫy Satellite Unit",
          ],
          onDuty: "Đang trực",
          notifications: "Thông báo",
          profile: "Hồ sơ bác sĩ",
          profileMenu: ["Hồ sơ cá nhân", "Tùy chọn hiển thị"],
          notificationItems: [
            "SpO₂ của Bệnh nhân A thấp hơn baseline.",
            "Đến giờ dùng Aspirin 81 mg.",
            "Nhịp tim tăng nhẹ trong 15 phút gần nhất.",
          ],
        }
      : {
          hospitals: [
            "Vinmec International Hospital",
            "Cho Ray Satellite Unit",
          ],
          onDuty: "On duty",
          notifications: "Notifications",
          profile: "Doctor profile",
          profileMenu: ["Personal profile", "Display preferences"],
          notificationItems: [
            "Patient A's SpO₂ is below baseline.",
            "It is time to administer Aspirin 81 mg.",
            "Heart rate has increased slightly in the last 15 minutes.",
          ],
        };

  return (
    <header className="dashboard-glass relative z-30 rounded-[1rem] border border-white/40 bg-white/50 px-2.5 py-1.5 backdrop-blur-[22px]">
      <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-end">
        <div className="flex flex-col gap-1.5 md:flex-row md:items-center">
          <div ref={hospitalRef} className="relative">
            <button
              type="button"
              onClick={() => setHospitalOpen((current) => !current)}
              className="dashboard-input flex items-center justify-between gap-2.5 rounded-xl bg-white/80 px-3 py-1.5 text-[13px] text-[color:var(--cs-text)] transition hover:border-[color:var(--cs-border-strong)]"
            >
              <span className="flex items-center gap-2">
                <Hospital className="h-4 w-4 text-[color:var(--cs-primary)]" />
                <span>{copy.hospitals[0]}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-[color:var(--cs-text-soft)]" />
            </button>

            {hospitalOpen ? (
              <div className="dashboard-glass absolute right-0 top-[calc(100%+6px)] w-[260px] rounded-xl p-1.5">
                {copy.hospitals.map((hospital, index) => (
                  <button
                    key={hospital}
                    type="button"
                    className={[
                      "flex w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-white/70",
                      index === 0
                        ? "text-[color:var(--cs-heading)]"
                        : "text-[color:var(--cs-text-soft)]",
                    ].join(" ")}
                  >
                    {hospital}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div ref={localeRef} className="relative">
            <button
              type="button"
              onClick={() => setLocaleOpen((current) => !current)}
              className="dashboard-input flex items-center gap-2 rounded-xl bg-white/80 px-3 py-1.5 text-[13px] text-[color:var(--cs-text)] transition hover:border-[color:var(--cs-border-strong)]"
            >
              <Globe className="h-4 w-4 text-[color:var(--cs-teal)]" />
              <span>{locale.toUpperCase()}</span>
              <ChevronDown className="h-4 w-4 text-[color:var(--cs-text-soft)]" />
            </button>

            {localeOpen ? (
              <div className="dashboard-glass absolute right-0 top-[calc(100%+6px)] w-[104px] rounded-xl p-1.5">
                {(["vi", "en"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setLocale(item);
                      setLocaleOpen(false);
                    }}
                    className={[
                      "flex w-full rounded-lg px-3 py-2 text-left text-[13px] uppercase transition",
                      locale === item
                        ? "bg-[color:rgba(13,71,161,0.08)] text-[color:var(--cs-primary)]"
                        : "text-[color:var(--cs-heading)] hover:bg-white/70",
                    ].join(" ")}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="group relative flex items-center justify-center">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:rgba(0,150,136,0.16)] bg-white/82"
              aria-label={copy.onDuty}
              title={copy.onDuty}
            >
              <span className="relative flex h-3 w-3 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:rgba(0,150,136,0.45)]" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[color:var(--cs-teal)] ring-4 ring-[color:rgba(0,150,136,0.12)]" />
              </span>
            </button>

            <div className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 rounded-full bg-[color:var(--cs-heading)] px-3 py-1 text-[10px] font-medium text-white opacity-0 shadow-[0_10px_24px_rgba(15,23,42,0.24)] transition duration-150 group-hover:opacity-100">
              {copy.onDuty}
            </div>
          </div>

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen((current) => !current)}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--cs-border)] bg-white text-[color:var(--cs-text)] transition hover:border-[color:var(--cs-border-strong)]"
              aria-label={copy.notifications}
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[color:var(--cs-danger)] px-1 text-[9px] font-semibold text-white shadow-[0_8px_18px_rgba(229,72,77,0.28)]">
                3
              </span>
            </button>

            {notificationsOpen ? (
              <div className="dashboard-glass absolute right-0 top-[calc(100%+6px)] w-[240px] rounded-xl p-1.5">
                {copy.notificationItems.map((item) => (
                  <div
                    key={item}
                    className="rounded-lg px-3 py-2 text-[13px] text-[color:var(--cs-heading)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((current) => !current)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--cs-primary-soft)] text-[13px] font-semibold text-[color:var(--cs-primary)]"
              aria-label={copy.profile}
            >
              DR
            </button>

            {profileOpen ? (
              <div className="dashboard-glass absolute right-0 top-[calc(100%+6px)] w-[170px] rounded-xl p-1.5">
                {copy.profileMenu.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="flex w-full rounded-lg px-3 py-2 text-left text-[13px] text-[color:var(--cs-heading)] hover:bg-white/70"
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
