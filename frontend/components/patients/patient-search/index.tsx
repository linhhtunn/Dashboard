import { useLocale } from "@/components/providers/LocaleProvider";

type PatientSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function PatientSearch({ value, onChange }: PatientSearchProps) {
  const { locale } = useLocale();

  return (
    <label className="dashboard-input flex h-12 items-center gap-3 rounded-full bg-white/72 px-4">
      <svg
        aria-hidden="true"
        className="h-4.5 w-4.5 shrink-0 text-[color:var(--cs-text-soft)]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      >
        <path d="m21 21-4.3-4.3" />
        <circle cx="11" cy="11" r="7" />
      </svg>

      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={
          locale === "vi"
            ? "Tìm theo tên bệnh nhân, MRN hoặc mã hồ sơ"
            : "Search by patient name, MRN, or record ID"
        }
        className="h-full w-full bg-transparent text-sm text-[color:var(--cs-heading)] outline-none placeholder:text-[color:var(--cs-text-soft)]"
      />
    </label>
  );
}
