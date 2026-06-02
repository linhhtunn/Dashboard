import clsx from "clsx";
import type { HTMLAttributes } from "react";

type PanelCardProps = HTMLAttributes<HTMLDivElement>;

export function PanelCard({ className, ...props }: PanelCardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(13,71,161,0.08)]",
        className,
      )}
      {...props}
    />
  );
}