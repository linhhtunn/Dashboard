type SuggestedPromptListProps = {
  prompts: string[];
};

export function SuggestedPromptList({ prompts }: SuggestedPromptListProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Suggested prompts</p>
          <p className="text-xs text-slate-500">
            Chon nhanh de bat dau hoi dap theo clinical workflow.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
          Sprint 1
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="rounded-full border border-[#0D47A1]/20 bg-[#0D47A1]/5 px-3 py-2 text-left text-sm text-[#0D47A1] transition hover:border-[#0D47A1]/30 hover:bg-[#0D47A1]/8"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
