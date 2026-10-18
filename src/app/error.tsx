"use client";

import { Button } from "@/components/ui/button";

export default function Erreur({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Une erreur s&apos;est produite</h1>
      <p className="text-muted-foreground">Réessayez. Si le problème persiste, contactez l&apos;administrateur.</p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
