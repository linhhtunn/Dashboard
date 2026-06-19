import { PanelCard } from "@/components/common/PanelCard";

type DashboardPanelPlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
  tone?: "primary" | "secondary";
};

export function DashboardPanelPlaceholder({
  eyebrow,
  title,
  description,
  items,
  tone = "primary",
}: DashboardPanelPlaceholderProps) {
  const accentClasses =
    tone === "primary"
      ? "from-[#0D47A1]/10 to-[#8ED3E6]/10 border-[#0D47A1]/20"
      : "from-[#009688]/10 to-white border-[#009688]/20";

  const dotClasses =
    tone === "primary" ? "bg-[#0D47A1]" : "bg-[#009688]";

  return (
    <PanelCard className="flex h-full min-h-[72vh] flex-col overflow-hidden">
      <div className={`border-b bg-gradient-to-br ${accentClasses} px-6 py-6`}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[#172554]">{title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-between px-6 py-6">
        <div>
          <p className="text-sm font-medium text-slate-800">
            Commit 1 scaffold scope
          </p>

          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                <span className={`mt-2 h-2 w-2 rounded-full ${dotClasses}`} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
          <p className="text-sm font-medium text-slate-700">Next in Commit 2</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Thay placeholder bằng panel thật: thread chat ở trái, patient context
            cards ở phải, giữ đúng nhịp AI-first clinical workflow.
          </p>
        </div>
      </div>
    </PanelCard>
  );
}