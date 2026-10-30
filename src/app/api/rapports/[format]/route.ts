// Export du bilan de période : PDF ou Excel (.xlsx). Mêmes paramètres que la page Rapports.
import { ROLES_GESTION, utilisateurCourant } from "@/lib/permissions";
import { lirePeriode } from "@/lib/periode-url";
import { rapportExcel } from "@/server/excel/rapport";
import { genererRapport } from "@/server/pdf/generer";
import { donneesRapport } from "@/server/requetes/rapports";

export async function GET(requete: Request, { params }: { params: Promise<{ format: string }> }) {
  const u = await utilisateurCourant();
  if (!u || !ROLES_GESTION.includes(u.role)) return new Response("Accès refusé", { status: 403 });
  const { format } = await params;
  const { du, au, partenaire } = lirePeriode(Object.fromEntries(new URL(requete.url).searchParams));
  if (format === "pdf") {
    const pdf = await genererRapport(du, au, partenaire);
    return new Response(new Uint8Array(pdf.contenu), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${pdf.nom}"`, "Cache-Control": "private, no-store" },
    });
  }
  if (format === "excel") {
    const contenu = await rapportExcel(await donneesRapport(du, au, partenaire));
    return new Response(new Uint8Array(contenu), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="bilan-${du}-${au}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  }
  return new Response("Format inconnu", { status: 404 });
}
