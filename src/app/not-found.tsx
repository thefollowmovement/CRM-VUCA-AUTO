import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PageIntrouvable() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <h1 className="text-xl font-semibold">Page introuvable</h1>
      <p className="text-muted-foreground">Cette page n&apos;existe pas ou a été déplacée.</p>
      <Button asChild>
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </div>
  );
}
