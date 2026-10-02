import type { ComponentProps, ReactNode } from "react";

import { cn } from "../../lib/cn";

/*
 * Kobra's skeleton: a muted block with one soft sweep of light crossing it
 * (skeleton-shimmer), or a slow breath of opacity for blocks too small for a
 * sweep to read. Reduced motion leaves it still.
 */
export function Skeleton({
  className,
  animation = "shimmer",
  ...props
}: ComponentProps<"div"> & { animation?: "shimmer" | "pulse" | "none" }) {
  return (
    <div
      data-slot="skeleton"
      data-animation={animation}
      aria-hidden="true"
      className={cn("kit-skeleton", animation === "shimmer" && "skeleton-shimmer", className)}
      {...props}
    />
  );
}

/*
 * The reveal (kit.css's t-skel): the placeholder and the content share one
 * place, and when the content arrives the two cross over with a slight blur,
 * so the page resolves rather than pops. `pulse` gives the placeholder one
 * breath first, Kobra's cue that something is about to land.
 */
export function SkeletonReveal({
  loading,
  skeleton,
  children,
  pulse = false,
  className,
}: {
  /** True while the content is still on its way. */
  loading: boolean;
  /** What stands in for the content meanwhile, usually Skeleton blocks. */
  skeleton: ReactNode;
  children: ReactNode;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("kit-skel t-skel", !loading && "is-revealed", className)} aria-busy={loading}>
      <div className={cn("t-skel-skeleton", pulse && "is-pulsing")} aria-hidden="true">
        {skeleton}
      </div>
      <div className="t-skel-content" aria-hidden={loading}>
        {children}
      </div>
    </div>
  );
}
