// Routage par nom de domaine, puis protection du CRM :
//  - vuca-auto.fr      → site vitrine (groupe app/(site)), sans connexion ni cookie ;
//  - crm.vuca-auto.fr  → CRM : connexion obligatoire, investisseurs cantonnés à leur portail ;
//  - alias (sslip.io…) → CRM, comme crm.vuca-auto.fr.
// Les règles sont dans lib/domaines.ts (testées) ; ici on ne fait que les appliquer.
import NextAuth from "next-auth";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { deciderRoutage, INTROUVABLE_SITE, lireConfigDomaines } from "@/lib/domaines";

const protectionCrm = NextAuth(authConfig).auth as unknown as (req: NextRequest, ev: NextFetchEvent) => Promise<Response>;

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const config = lireConfigDomaines(process.env);
  const decision = deciderRoutage(req.headers.get("host"), req.nextUrl.pathname, req.nextUrl.search, config);

  switch (decision.type) {
    case "crm":
      // Seul chemin où Auth.js intervient : le cookie de session n'existe que sur le domaine du CRM
      return protectionCrm(req, ev);
    case "libre":
      return NextResponse.next();
    case "site": {
      if (decision.chemin === req.nextUrl.pathname) return NextResponse.next();
      const url = req.nextUrl.clone();
      url.pathname = decision.chemin;
      return NextResponse.rewrite(url);
    }
    case "redirection":
      return NextResponse.redirect(decision.url, decision.statut);
    case "introuvable": {
      if (decision.api) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
      // Page 404 du site (statut 404, habillage du site, aucune trace du CRM)
      const url = req.nextUrl.clone();
      url.pathname = INTROUVABLE_SITE;
      url.search = "";
      return NextResponse.rewrite(url);
    }
  }
}

export const config = {
  // Tout passe par le routage par domaine, sauf les fichiers techniques de Next.js
  // (les fichiers de l'application installable sont triés dans lib/domaines.ts selon le domaine).
  matcher: ["/((?!_next/static|_next/image).*)"],
};
