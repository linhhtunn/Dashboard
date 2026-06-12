import { pageSurface } from "@/lib/page-layout";

type PageStateProps = {
  variant: "loading" | "error";
  message: string;
  fill?: boolean;
  className?: string;
};

export function PageState({
  variant,
  message,
  fill = false,
  className = "",
}: PageStateProps) {
  return (
    <div
      className={[
        pageSurface,
        "px-4 py-8 text-center text-[13px]",
        variant === "error"
          ? "text-[color:var(--cs-danger)]"
          : "text-[color:var(--cs-text-soft)]",
        fill ? "flex flex-1 items-center justify-center" : "",
        className,
      ].join(" ")}
    >
      {message}
    </div>
  );
}
