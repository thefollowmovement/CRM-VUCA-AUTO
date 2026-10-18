import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 font-bold tracking-tight", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
        V
      </span>
      {!compact && (
        <span>
          VUCA <span className="text-primary">AUTO</span>
        </span>
      )}
    </div>
  );
}
