// PDF d'analyse : relevé investisseur et rapport de période.
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { formatPourcentageBp } from "@/lib/format";
import type { DonneesRapport, DonneesReleve } from "@/server/requetes/rapports";
import { COULEUR, date, EnTete, euros, Pied, s, t, type Societe } from "./commun";

type Base = { societe: Societe; logo: { data: Buffer; format: "jpg" | "png" } | null };
type Colonne = { titre: string; flex: number; droite?: boolean };

const dateIso = (iso: string) => date(new Date(`${iso}T12:00:00Z`));

/** Tableau simple : en-tête répété sur chaque page, ligne de total facultative. */
function Tableau({ colonnes, lignes, total, vide }: { colonnes: Colonne[]; lignes: string[][]; total?: string[]; vide?: string }) {
  if (lignes.length === 0) return <Text style={[s.petit, { marginBottom: 6 }]}>{t(vide ?? "Aucune ligne.")}</Text>;
  const cellule = (c: Colonne, v: string, i: number, gras = false) => (
    <Text key={i} style={[{ flex: c.flex, textAlign: c.droite ? "right" : "left", paddingRight: 4 }, gras ? s.gras : {}]}>
      {t(v)}
    </Text>
  );
  return (
    <View style={{ marginBottom: 6 }}>
      <View style={s.tableauEntete} fixed>
        {colonnes.map((c, i) => cellule(c, c.titre, i))}
      </View>
      {lignes.map((l, j) => (
        <View key={j} style={s.tableauLigne} wrap={false}>
          {colonnes.map((c, i) => cellule(c, l[i] ?? "", i))}
        </View>
      ))}
      {total && (
        <View style={[s.tableauLigne, { borderBottomWidth: 0, backgroundColor: "#f8fafc" }]} wrap={false}>
          {colonnes.map((c, i) => cellule(c, total[i] ?? "", i, true))}
        </View>
      )}
    </View>
  );
}

function Indicateurs({ elements }: { elements: { libelle: string; valeur: string }[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
      {elements.map((e) => (
        <View key={e.libelle} style={[s.cadre, { width: "32%" }]}>
          <Text style={s.petit}>{t(e.libelle)}</Text>
          <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: COULEUR }}>{t(e.valeur)}</Text>
        </View>
      ))}
    </View>
  );
}

function Droite({ titre, lignes }: { titre: string; lignes: string[] }) {
  return (
    <View style={{ alignItems: "flex-end" }}>
      <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold" }}>{t(titre)}</Text>
      {lignes.map((l) => (
        <Text key={l} style={s.petit}>
          {t(l)}
        </Text>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------
//  Relevé investisseur
// ---------------------------------------------------------------------
export function PdfReleve(d: Base & { releve: DonneesReleve; editeLe: Date }) {
  const r = d.releve;
  const periode = `Du ${dateIso(r.du)} au ${dateIso(r.au)}`;
  return (
    <Document title={`Relevé ${r.partenaire.nom}`} author={d.societe.societeNom}>
      <Page size="A4" style={s.page}>
        <EnTete societe={d.societe} logo={d.logo} droite={<Droite titre="RELEVÉ INVESTISSEUR" lignes={[periode, `Édité le ${date(d.editeLe)}`]} />} />
        <Text style={s.titre}>{t(r.partenaire.nom)}</Text>
        <Text style={s.sousTitre}>{t([r.partenaire.telephone, r.partenaire.email, r.partenaire.iban && `IBAN ${r.partenaire.iban}`].filter(Boolean).join(" · ") || " ")}</Text>

        <Indicateurs
          elements={[
            { libelle: "Capital engagé aujourd'hui", valeur: euros(r.resume.capitalEngageCentimes) },
            { libelle: "Résultat de la période (votre part)", valeur: euros(r.resume.resultatPeriodeCentimes) },
            { libelle: "Versé sur la période", valeur: euros(r.resume.verseSurPeriodeCentimes) },
            { libelle: "Véhicules en cours", valeur: String(r.resume.vehiculesEnCours) },
            { libelle: "Total déjà versé", valeur: euros(r.resume.totalVerseCentimes) },
            ...(r.partenaire.estSociete ? [] : [{ libelle: "Reste dû aujourd'hui", valeur: euros(r.resume.resteDuCentimes) }]),
          ]}
        />

        <View style={s.section}>
          <Text style={s.h2} minPresenceAhead={60}>Véhicules financés et résultat de la période</Text>
          <Tableau
            colonnes={[
              { titre: "Véhicule", flex: 3.2 },
              { titre: "Statut", flex: 1.4 },
              { titre: "Investi", flex: 1.3, droite: true },
              { titre: "Part", flex: 0.8, droite: true },
              { titre: "Résultat période", flex: 1.4, droite: true },
              { titre: "Votre part", flex: 1.3, droite: true },
            ]}
            lignes={r.vehicules.map((v) => [v.vehicule, v.statut, euros(v.investiCentimes), formatPourcentageBp(v.partBp), euros(v.resultatPeriodeCentimes), euros(v.partPeriodeCentimes)])}
            total={["Total", "", euros(r.vehicules.reduce((a, v) => a + v.investiCentimes, 0)), "", euros(r.vehicules.reduce((a, v) => a + v.resultatPeriodeCentimes, 0)), euros(r.resume.resultatPeriodeCentimes)]}
            vide="Aucun véhicule financé."
          />
          <Text style={s.petit}>
            {t(
              "Résultat de la période : bénéfice des ventes réalisées sur la période et, pour la location, loyers encaissés moins charges payées. Votre part suit les règles de répartition de chaque véhicule (commission de gestion comprise).",
            )}
          </Text>
        </View>

        {r.vendus.length > 0 && (
          <View style={s.section}>
            <Text style={s.h2} minPresenceAhead={60}>Véhicules vendus : ce qui vous revient</Text>
            <Tableau
              colonnes={[
                { titre: "Véhicule", flex: 3.4 },
                { titre: "Vendu le", flex: 1.2 },
                { titre: "À reverser", flex: 1.4, droite: true },
                { titre: "Déjà versé", flex: 1.4, droite: true },
                { titre: "Reste dû", flex: 1.4, droite: true },
              ]}
              lignes={r.vendus.map((v) => [v.vehicule, date(v.dateVente), euros(v.aReverserCentimes), euros(v.verseCentimes), euros(v.resteDuCentimes)])}
              total={[
                "Total",
                "",
                euros(r.vendus.reduce((a, v) => a + v.aReverserCentimes, 0)),
                euros(r.vendus.reduce((a, v) => a + v.verseCentimes, 0)),
                euros(r.vendus.reduce((a, v) => a + v.resteDuCentimes, 0)),
              ]}
            />
            <Text style={s.petit}>{t("À reverser = votre investissement + votre part du bénéfice du véhicule.")}</Text>
          </View>
        )}

        <View style={s.section}>
          <Text style={s.h2} minPresenceAhead={60}>Versements de la période</Text>
          <Tableau
            colonnes={[
              { titre: "Date", flex: 1 },
              { titre: "Type", flex: 2 },
              { titre: "Véhicule", flex: 3 },
              { titre: "Montant", flex: 1.3, droite: true },
            ]}
            lignes={r.versements.map((v) => [date(v.date), v.type, v.vehicule, `${v.apport ? "+" : ""}${euros(v.montantCentimes)}`])}
            vide="Aucun versement sur la période."
          />
        </View>
        <Pied texte={`${d.societe.societeNom} · relevé ${r.partenaire.nom} · ${periode}`} />
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------
//  Rapport de période
// ---------------------------------------------------------------------
export function PdfRapport(d: Base & { rapport: DonneesRapport; editeLe: Date }) {
  const r = d.rapport;
  const tot = r.totaux;
  const periode = `Du ${dateIso(r.du)} au ${dateIso(r.au)}`;
  return (
    <Document title={`Rapport ${r.du} - ${r.au}`} author={d.societe.societeNom}>
      <Page size="A4" style={s.page}>
        <EnTete societe={d.societe} logo={d.logo} droite={<Droite titre="BILAN DE LA PÉRIODE" lignes={[periode, `Édité le ${date(d.editeLe)}`]} />} />
        <Text style={s.titre}>{t("Bilan de la période")}</Text>
        <Text style={s.sousTitre}>{t(r.partenaire ? `${periode} · véhicules financés par ${r.partenaire.nom}` : periode)}</Text>
        <Indicateurs
          elements={[
            { libelle: "Bénéfice net", valeur: euros(tot.beneficeNetCentimes) },
            { libelle: "CA ventes", valeur: euros(tot.caVenteCentimes) },
            { libelle: "Bénéfice des ventes", valeur: euros(tot.beneficeVenteCentimes) },
            { libelle: "Revenus location", valeur: euros(tot.revenusLocationCentimes) },
            { libelle: "Charges location", valeur: euros(tot.chargesLocationCentimes) },
            { libelle: "Dépenses payées", valeur: euros(tot.depensesCentimes) },
          ]}
        />

        <View style={s.section}>
          <Text style={s.h2} minPresenceAhead={60}>{t(`Véhicules vendus (${r.vendus.length})`)}</Text>
          <Tableau
            colonnes={[
              { titre: "Véhicule", flex: 3 },
              { titre: "Vendu le", flex: 1.1 },
              { titre: "Prix de vente", flex: 1.3, droite: true },
              { titre: "Coût de revient", flex: 1.3, droite: true },
              { titre: "Bénéfice", flex: 1.2, droite: true },
              { titre: "Jours", flex: 0.7, droite: true },
            ]}
            lignes={r.vendus.map((v) => [v.vehicule, dateIso(v.dateVente), euros(v.prixVenteCentimes), euros(v.coutRevientCentimes), euros(v.beneficeCentimes), String(v.jours)])}
            total={["Total", "", euros(tot.caVenteCentimes), euros(r.vendus.reduce((a, v) => a + v.coutRevientCentimes, 0)), euros(r.vendus.reduce((a, v) => a + v.beneficeCentimes, 0)), ""]}
            vide="Aucune vente sur la période."
          />
        </View>

        <View style={s.section}>
          <Text style={s.h2} minPresenceAhead={60}>{t(`Véhicules achetés (${r.achetes.length})`)}</Text>
          <Tableau
            colonnes={[
              { titre: "Véhicule", flex: 4 },
              { titre: "Acheté le", flex: 1.2 },
              { titre: "Prix d'achat", flex: 1.4, droite: true },
            ]}
            lignes={r.achetes.map((v) => [v.vehicule, dateIso(v.dateAchat), euros(v.prixAchatCentimes)])}
            total={["Total", "", euros(r.achetes.reduce((a, v) => a + v.prixAchatCentimes, 0))]}
            vide="Aucun achat sur la période."
          />
        </View>

        <View style={s.section}>
          <Text style={s.h2} minPresenceAhead={60}>Location</Text>
          <Tableau
            colonnes={[
              { titre: "Véhicule", flex: 3.5 },
              { titre: "Revenus", flex: 1.3, droite: true },
              { titre: "Charges", flex: 1.3, droite: true },
              { titre: "Résultat", flex: 1.3, droite: true },
            ]}
            lignes={r.location.map((v) => [v.vehicule, euros(v.revenusCentimes), euros(v.chargesCentimes), euros(v.resultatCentimes)])}
            total={["Total", euros(tot.revenusLocationCentimes), euros(tot.chargesLocationCentimes), euros(tot.revenusLocationCentimes - tot.chargesLocationCentimes)]}
            vide="Aucune activité de location sur la période."
          />
        </View>

        <View style={s.deuxColonnes} wrap={false}>
          <View style={s.colonne}>
            <Text style={s.h2} minPresenceAhead={60}>Dépenses par catégorie</Text>
            <Tableau
              colonnes={[
                { titre: "Catégorie", flex: 2.5 },
                { titre: "Montant", flex: 1.3, droite: true },
              ]}
              lignes={r.depensesParCategorie.map((c) => [c.categorie, euros(c.montantCentimes)])}
              total={["Total", euros(tot.depensesCentimes)]}
              vide="Aucune dépense."
            />
          </View>
          <View style={s.colonne}>
            <Text style={s.h2} minPresenceAhead={60}>Bénéfice par partenaire</Text>
            <Tableau
              colonnes={[
                { titre: "Partenaire", flex: 2.5 },
                { titre: "Bénéfice", flex: 1.3, droite: true },
              ]}
              lignes={r.parPartenaire.map((p) => [p.nom, euros(p.montantCentimes)])}
              total={["Total", euros(r.parPartenaire.reduce((a, p) => a + p.montantCentimes, 0))]}
              vide="Aucun bénéfice à répartir."
            />
          </View>
        </View>
        <Text style={[s.petit, { marginTop: 8 }]}>
          {t(
            "Achat-revente : bénéfice compté le jour de la vente (prix de vente − prix d'achat − dépenses). Location : loyers encaissés − charges payées sur la période ; à la vente, prix de vente − prix d'achat. Montants payés / encaissés, sans TVA.",
          )}
        </Text>
        <Pied texte={`${d.societe.societeNom} · bilan ${periode}`} />
      </Page>
    </Document>
  );
}
