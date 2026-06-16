"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

type RevealOnScrollProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
};

export function RevealOnScroll({
  children,
  className = "",
  delayMs = 0,
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delayMs > 0) {
            window.setTimeout(() => setVisible(true), delayMs);
          } else {
            setVisible(true);
          }
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [delayMs, reducedMotion]);

  return (
    <div
      ref={ref}
      className={[
        className,
        reducedMotion
          ? ""
          : visible
            ? "marketing-reveal-visible"
            : "marketing-reveal-hidden",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
