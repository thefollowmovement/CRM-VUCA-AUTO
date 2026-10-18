import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Libellé + champ + message d'erreur / d'aide. */
export function Champ({
  label,
  htmlFor,
  erreur,
  aide,
  obligatoire,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  erreur?: string;
  aide?: React.ReactNode;
  obligatoire?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {obligatoire && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {erreur ? (
        <p className="text-sm text-destructive" role="alert">
          {erreur}
        </p>
      ) : aide ? (
        <p className="text-xs text-muted-foreground">{aide}</p>
      ) : null}
    </div>
  );
}
