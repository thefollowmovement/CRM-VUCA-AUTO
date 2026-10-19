"use client";

import { AlertDialog } from "radix-ui";
import * as React from "react";
import { Button } from "@/components/ui/button";

/**
 * Demande de confirmation avant une action importante (suppression…).
 * Usage : <Confirmation titre="…" onConfirmer={…}><Button>Supprimer</Button></Confirmation>
 */
export function Confirmation({
  titre,
  description,
  libelleConfirmer = "Confirmer",
  destructif = true,
  onConfirmer,
  children,
}: {
  titre: string;
  description?: React.ReactNode;
  libelleConfirmer?: string;
  destructif?: boolean;
  onConfirmer: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{children}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <AlertDialog.Content className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-lg md:left-1/2 md:right-auto md:w-full md:max-w-md md:-translate-x-1/2">
          <AlertDialog.Title className="text-lg font-semibold">{titre}</AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
              {description}
            </AlertDialog.Description>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
            <AlertDialog.Cancel asChild>
              <Button variant="outline">Annuler</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant={destructif ? "destructive" : "default"} onClick={() => void onConfirmer()}>
                {libelleConfirmer}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
