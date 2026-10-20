import Link from "next/link";
import { PageProvisoire } from "@/components/site/page-provisoire";

export default function IntrouvableSite() {
  return (
    <PageProvisoire titre="Page introuvable." texte="Cette page n'existe pas ou a été déplacée.">
      <Link href="/" className="mt-10 inline-flex min-h-11 items-center rounded-full bg-[var(--site-accent)] px-6 font-medium text-white">
        Retour à l&apos;accueil
      </Link>
    </PageProvisoire>
  );
}
