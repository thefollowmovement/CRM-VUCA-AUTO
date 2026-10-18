import * as React from "react";
import { cn } from "@/lib/utils";

export function CaseACocher({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <input
      type="checkbox"
      className={cn("size-5 shrink-0 cursor-pointer rounded border-input accent-primary md:size-4", className)}
      {...props}
    />
  );
}
