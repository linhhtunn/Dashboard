type AuthDividerProps = {
  label: string;
};

export function AuthDivider({ label }: AuthDividerProps) {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-white/50" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-[color:var(--cs-surface)] px-3 text-[11px] font-medium uppercase tracking-wide text-[color:var(--cs-text-soft)]">
          {label}
        </span>
      </div>
    </div>
  );
}
