type SuggestedPromptListProps = {
  prompts: string[];
  onSelect?: (prompt: string) => void;
};

export function SuggestedPromptList({
  prompts,
  onSelect,
}: SuggestedPromptListProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onSelect?.(prompt)}
          className="rounded-full border border-[color:rgba(13,71,161,0.14)] bg-white/72 px-2.5 py-1 text-left text-[12px] text-[color:var(--cs-primary)] transition hover:border-[color:rgba(13,71,161,0.24)] hover:bg-[color:rgba(255,255,255,0.9)]"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
