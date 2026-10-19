// Éléments communs des PDF (en-tête société, styles, formats).
// Police Helvetica intégrée aux lecteurs PDF : les espaces fines (« 1 234,56 € »
// en français) n'y existent pas → remplacées par des espaces normales.
import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDate, formatDateHeure, formatEuros, formatNombre } from "@/lib/format";

export const t = (s: string | null | undefined) => (s ?? "").replace(/[   ]/g, " ").replace(/[→]/g, "->");
export const euros = (c: number | null | undefined) => t(formatEuros(c));
export const date = (d: Date | null | undefined) => t(formatDate(d));
export const dateHeure = (d: Date | null | undefined) => t(formatDateHeure(d));
export const nombre = (n: number | null | undefined) => t(formatNombre(n));

export const COULEUR = "#1e40af";
export const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 54, paddingHorizontal: 40, fontSize: 9.5, fontFamily: "Helvetica", color: "#111827", lineHeight: 1.35 },
  entete: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: COULEUR },
  societe: { fontSize: 14, fontFamily: "Helvetica-Bold", color: COULEUR },
  petit: { fontSize: 8, color: "#4b5563" },
  titre: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  sousTitre: { fontSize: 10, color: "#4b5563", marginBottom: 14 },
  section: { marginBottom: 12 },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", color: COULEUR, marginBottom: 5, paddingBottom: 2, borderBottomWidth: 0.5, borderBottomColor: "#cbd5e1" },
  ligne: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  gras: { fontFamily: "Helvetica-Bold" },
  deuxColonnes: { flexDirection: "row", gap: 16 },
  colonne: { flex: 1 },
  tableauEntete: { flexDirection: "row", backgroundColor: "#eff6ff", paddingVertical: 4, paddingHorizontal: 4, fontFamily: "Helvetica-Bold" },
  tableauLigne: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  total: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 6, paddingHorizontal: 4, fontSize: 11, fontFamily: "Helvetica-Bold" },
  pied: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7.5, color: "#6b7280", textAlign: "center", borderTopWidth: 0.5, borderTopColor: "#e5e7eb", paddingTop: 4 },
  cadre: { borderWidth: 0.5, borderColor: "#cbd5e1", borderRadius: 4, padding: 8 },
});

export type Societe = {
  societeNom: string; societeAdresse: string | null; societeCodePostal: string | null; societeVille: string | null; societeSiret: string | null;
  societeTelephone: string | null; societeEmail: string | null;
};

export function EnTete({ societe, logo, droite }: { societe: Societe; logo: { data: Buffer; format: "jpg" | "png" } | null; droite?: React.ReactNode }) {
  return (
    <View style={s.entete} fixed>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        {logo && <Image src={logo as never} style={{ width: 48, height: 48, objectFit: "contain" }} />}
        <View>
          <Text style={s.societe}>{t(societe.societeNom)}</Text>
          {societe.societeAdresse && <Text style={s.petit}>{t(societe.societeAdresse)}</Text>}
          {(societe.societeCodePostal || societe.societeVille) && <Text style={s.petit}>{t([societe.societeCodePostal, societe.societeVille].filter(Boolean).join(" "))}</Text>}
          <Text style={s.petit}>{t([societe.societeTelephone, societe.societeEmail].filter(Boolean).join(" · "))}</Text>
          {societe.societeSiret && <Text style={s.petit}>SIRET {t(societe.societeSiret)}</Text>}
        </View>
      </View>
      {droite}
    </View>
  );
}

export function Pied({ texte }: { texte: string }) {
  return (
    <Text style={s.pied} fixed render={({ pageNumber, totalPages }) => `${t(texte)} · page ${pageNumber}/${totalPages}`} />
  );
}

export function Ligne({ libelle, valeur, gras }: { libelle: string; valeur: string; gras?: boolean }) {
  return (
    <View style={s.ligne}>
      <Text style={gras ? s.gras : undefined}>{t(libelle)}</Text>
      <Text style={gras ? s.gras : undefined}>{t(valeur)}</Text>
    </View>
  );
}
