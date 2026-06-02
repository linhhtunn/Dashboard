type SuggestedPromptListProps = {
  prompts: string[];
};

export function SuggestedPromptList({ prompts }: SuggestedPromptListProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[color:var(--cs-heading)]">
            Suggested prompts
          </p>
          <p className="text-xs text-[color:var(--cs-text-soft)]">
            Chon nhanh de bat dau hoi dap theo clinical workflow.
          </p>
        </div>

        <span className="rounded-full bg-[color:rgba(13,71,161,0.06)] px-2 py-1 text-[11px] font-medium text-[color:var(--cs-primary)]">
          Sprint 1
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="rounded-full border border-[color:rgba(13,71,161,0.16)] bg-white px-3 py-2 text-left text-sm text-[color:var(--cs-primary)] transition hover:border-[color:rgba(13,71,161,0.28)] hover:bg-[color:rgba(13,71,161,0.04)]"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
