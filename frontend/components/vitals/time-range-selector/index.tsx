const ranges = [
  { label: "15m", active: true },
  { label: "1h", active: false },
  { label: "6h", active: false },
  { label: "24h", active: false },
];

export function TimeRangeSelector() {
  return (
    <div
      className="inline-flex rounded-md border border-border bg-panel p-1"
      aria-label="Time range"
    >
      {ranges.map((range) => (
        <button
          key={range.label}
          type="button"
          disabled={!range.active}
          aria-pressed={range.active}
          className={[
            "h-9 min-w-12 rounded-sm px-3 text-sm font-medium transition-colors",
            range.active
              ? "bg-primary text-white"
              : "cursor-not-allowed text-text-body opacity-45",
          ].join(" ")}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
