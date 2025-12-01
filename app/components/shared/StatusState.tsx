import { MoveLeft, RefreshCcw } from "lucide-react";
import Link from "next/link";

interface StatusStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onRetry?: () => void;
  code?: string;
}

export function StatusState({
  title,
  message,
  actionLabel = "Back to Home",
  actionHref = "/",
  onRetry,
  code,
}: StatusStateProps) {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center px-4 text-center">
      {/* Large Decorator Number - Faded out for style */}
      {code && (
        <h1 className="select-none text-[8rem] font-bold leading-none tracking-tighter opacity-5 md:text-[14rem] dark:opacity-10">
          {code}
        </h1>
      )}

      <div className="-mt-12 space-y-6 md:-mt-20">
        <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
          {title}
        </h2>
        <p className="mx-auto max-w-[500px] text-muted-foreground md:text-lg">
          {message}
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          {onRetry && (
            <button
              onClick={onRetry}
              className="group flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 hover:shadow-md"
            >
              <RefreshCcw className="h-4 w-4 transition-transform group-hover:rotate-180" />
              Try Again
            </button>
          )}

          {actionHref && (
            <Link
              href={actionHref}
              className="group flex items-center gap-2 rounded-full border border-input bg-background px-8 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <MoveLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              {actionLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
