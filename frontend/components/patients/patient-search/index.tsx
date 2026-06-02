type PatientSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function PatientSearch({ value, onChange }: PatientSearchProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <label className="relative block min-w-0 flex-1">
        <span className="sr-only">Search patients</span>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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
          placeholder="Search by name, MRN, or ID..."
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-11 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        >
          <path d="M4 7h8" />
          <path d="M16 7h4" />
          <path d="M4 17h4" />
          <path d="M12 17h8" />
          <circle cx="14" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </svg>
      </label>

      <button
        type="button"
        className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/15"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        >
          <path d="M4 5h16" />
          <path d="M7 12h10" />
          <path d="M10 19h4" />
        </svg>
        Filters
      </button>
    </div>
  );
}
