// Export CSV des PV « à désigner » (secours si l'extension ANTAI n'est pas disponible).
// Colonnes = champs de l'API de l'extension (format ANTAI), fiche du conducteur et société comprises.
import { COLONNES_CSV_ANTAI, ligneCsvAntai } from "@/lib/amendes-antai";
import { genererCsv, reponseCsv } from "@/lib/csv";
import { aujourdhuiISO } from "@/lib/format";
import { journaliser } from "@/lib/journal";
import { ROLES_GESTION, utilisateurCourant } from "@/lib/permissions";
import { amendesPourDesignation } from "@/server/amendes/pour-designation";

export async function GET() {
  const u = await utilisateurCourant();
  if (!u || !ROLES_GESTION.includes(u.role)) return new Response("Accès refusé", { status: 403 });
  const { societe, amendes } = await amendesPourDesignation();
  // Données personnelles exportées : on garde la trace de qui a exporté, sans leur contenu.
  await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "ExportAmendes", apres: { nombre: amendes.length } });
  const csv = genererCsv([...COLONNES_CSV_ANTAI], amendes.map((a) => ligneCsvAntai(a, societe)));
  return reponseCsv(`pv-a-designer-${aujourdhuiISO()}.csv`, csv);
}
