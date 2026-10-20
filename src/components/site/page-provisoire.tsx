import Link from "next/link";

/** Mise en page sobre des pages provisoires du site (accueil en préparation, 404). */
export function PageProvisoire({ titre, texte, children }: { titre: string; texte: string; children?: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <Link href="/" className="mb-10 text-[21px] font-semibold tracking-tight">
        VUCA AUTO
      </Link>
      <h1 className="text-[40px] leading-tight font-semibold md:text-[56px]">{titre}</h1>
      <p className="mt-4 text-[21px] text-[var(--site-texte-2)]">{texte}</p>
      {children}
    </main>
  );
}
