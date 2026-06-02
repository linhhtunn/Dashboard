import clsx from "clsx";
import type { HTMLAttributes } from "react";

type PanelCardProps = HTMLAttributes<HTMLDivElement>;

export function PanelCard({ className, ...props }: PanelCardProps) {
  return (
    <div
      className={clsx("dashboard-surface rounded-[1.5rem]", className)}
      {...props}
    />
  );
}
