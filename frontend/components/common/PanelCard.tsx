import clsx from "clsx";
import type { HTMLAttributes } from "react";

type PanelCardProps = HTMLAttributes<HTMLDivElement>;

export function PanelCard({ className, ...props }: PanelCardProps) {
  return (
    <div
      className={clsx(
        "dashboard-surface relative overflow-hidden rounded-[1.5rem] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(135deg,rgba(255,255,255,0.2),transparent_42%,transparent)] before:opacity-90",
        className,
      )}
      {...props}
    />
  );
}
