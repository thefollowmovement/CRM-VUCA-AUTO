// Documents PDF (sans état) : reçu, facture, contrat, état des lieux, relevé de clôture.
import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import { COULEUR, date, dateHeure, EnTete, euros, Ligne, nombre, Pied, s, t, type Societe } from "./commun";

export type ImagePdf = { data: Buffer; format: "jpg" | "png" };
type Base = { societe: Societe; logo: ImagePdf | null };

const enTete = (b: Base, droite?: React.ReactNode) => <EnTete societe={b.societe} logo={b.logo} droite={droite} />;

function BlocDroite({ titre, lignes }: { titre: string; lignes: string[] }) {
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
//  Reçu de paiement
// ---------------------------------------------------------------------
export type DonneesRecu = Base & {
  numero: string;
  date: Date;
  montantCentimes: number;
  mode: string;
  nature: string;
  reference: string | null;
  client: string;
  contrat: string;
  vehicule: string;
  echeance: string | null;
  mention: string | null;
};

export function PdfRecu(d: DonneesRecu) {
  return (
    <Document title={`Reçu ${d.numero}`} author={d.societe.societeNom}>
      <Page size="A5" orientation="landscape" style={s.page}>
        {enTete(d, <BlocDroite titre="REÇU" lignes={[`N° ${d.numero}`, `Le ${date(d.date)}`]} />)}
        <Text style={{ marginBottom: 10 }}>
          {t(`${d.societe.societeNom} reconnaît avoir reçu de ${d.client} la somme de :`)}
        </Text>
        <Text style={{ fontSize: 22, fontFamily: "Helvetica-Bold", color: COULEUR, marginBottom: 12 }}>{euros(d.montantCentimes)}</Text>
        <View style={s.cadre}>
          <Ligne libelle="Objet" valeur={d.nature} />
          <Ligne libelle="Contrat de location" valeur={d.contrat} />
          <Ligne libelle="Véhicule" valeur={d.vehicule} />
          {d.echeance && <Ligne libelle="Échéance" valeur={d.echeance} />}
          <Ligne libelle="Mode de paiement" valeur={d.mode} />
          {d.reference && <Ligne libelle="Référence" valeur={d.reference} />}
        </View>
        {d.mention && <Text style={[s.petit, { marginTop: 10 }]}>{t(d.mention)}</Text>}
        <Pied texte={`${d.societe.societeNom} · reçu ${d.numero}`} />
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------
//  Facture simple sans TVA
// ---------------------------------------------------------------------
export type DonneesFacture = Base & {
  numero: string;
  dateEmission: Date;
  destinataireNom: string;
  destinataireAdresse: string | null;
  objet: string;
  lignes: { libelle: string; quantite: number; prixUnitaireCentimes: number; totalCentimes: number }[];
  totalCentimes: number;
  dejaPayeCentimes: number | null;
  mention: string | null;
  annulee: { le: Date; motif: string | null } | null;
};

export function PdfFacture(d: DonneesFacture) {
  return (
    <Document title={`Facture ${d.numero}`} author={d.societe.societeNom}>
      <Page size="A4" style={s.page}>
        {enTete(d, <BlocDroite titre="FACTURE" lignes={[`N° ${d.numero}`, `Date : ${date(d.dateEmission)}`]} />)}
        {d.annulee && (
          <View style={[s.cadre, { borderColor: "#dc2626", marginBottom: 12 }]}>
            <Text style={{ color: "#dc2626", fontFamily: "Helvetica-Bold" }}>{t(`FACTURE ANNULÉE le ${date(d.annulee.le)}${d.annulee.motif ? ` : ${d.annulee.motif}` : ""}`)}</Text>
          </View>
        )}
        <View style={[s.deuxColonnes, s.section]}>
          <View style={s.colonne}>
            <Text style={s.petit}>Objet</Text>
            <Text>{t(d.objet)}</Text>
          </View>
          <View style={[s.colonne, s.cadre]}>
            <Text style={s.petit}>Facturé à</Text>
            <Text style={s.gras}>{t(d.destinataireNom)}</Text>
            {d.destinataireAdresse && <Text>{t(d.destinataireAdresse)}</Text>}
          </View>
        </View>
        <View style={s.tableauEntete}>
          <Text style={{ flex: 1 }}>Désignation</Text>
          <Text style={{ width: 40, textAlign: "right" }}>Qté</Text>
          <Text style={{ width: 80, textAlign: "right" }}>Prix unitaire</Text>
          <Text style={{ width: 80, textAlign: "right" }}>Total</Text>
        </View>
        {d.lignes.map((l, i) => (
          <View key={i} style={s.tableauLigne} wrap={false}>
            <Text style={{ flex: 1 }}>{t(l.libelle)}</Text>
            <Text style={{ width: 40, textAlign: "right" }}>{l.quantite}</Text>
            <Text style={{ width: 80, textAlign: "right" }}>{euros(l.prixUnitaireCentimes)}</Text>
            <Text style={{ width: 80, textAlign: "right" }}>{euros(l.totalCentimes)}</Text>
          </View>
        ))}
        <View style={s.total}>
          <Text>{t(`Total à payer : ${euros(d.totalCentimes)}`)}</Text>
        </View>
        {d.dejaPayeCentimes !== null && d.dejaPayeCentimes > 0 && (
          <View style={{ alignItems: "flex-end", paddingHorizontal: 4 }}>
            <Text>{t(`Déjà réglé : ${euros(d.dejaPayeCentimes)} · Reste dû : ${euros(Math.max(0, d.totalCentimes - d.dejaPayeCentimes))}`)}</Text>
          </View>
        )}
        <Text style={[s.petit, { marginTop: 16 }]}>{t(d.mention ?? "Montants exprimés sans TVA.")}</Text>
        <Pied texte={`${d.societe.societeNom} · facture ${d.numero}`} />
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------
//  Contrat de location
// ---------------------------------------------------------------------
export type DonneesContratPdf = Base & {
  numero: string;
  type: string;
  creeLe: Date;
  client: { nom: string; adresse: string | null; telephone: string | null; email: string | null; naissance: string | null; permis: string | null; piece: string | null; entreprise: string | null };
  conducteurs: string[];
  vehicule: { nom: string; immatriculation: string | null; vin: string | null; km: number | null; carburant: string | null };
  depart: Date;
  retour: Date;
  lieuDepart: string | null;
  lieuRetour: string | null;
  lignesPrix: { libelle: string; montant: number }[];
  prixTotalCentimes: number;
  kilometrage: string;
  prixKmSup: number | null;
  caution: string;
  franchise: number | null;
  echeancier: { libelle: string; date: Date; montant: number }[];
  conditions: string | null;
  mentions: string | null;
  signatures: { client: ImagePdf | null; loueur: ImagePdf | null; nom: string | null; le: Date | null };
};

export function PdfContrat(d: DonneesContratPdf) {
  return (
    <Document title={`Contrat ${d.numero}`} author={d.societe.societeNom}>
      <Page size="A4" style={s.page}>
        {enTete(d, <BlocDroite titre="CONTRAT DE LOCATION" lignes={[`N° ${d.numero}`, `Location ${d.type.toLowerCase()}`, `Établi le ${date(d.creeLe)}`]} />)}
        <View style={[s.deuxColonnes, s.section]}>
          <View style={[s.colonne, s.cadre]}>
            <Text style={s.h2}>Le loueur</Text>
            <Text style={s.gras}>{t(d.societe.societeNom)}</Text>
            <Text>{t([d.societe.societeAdresse, [d.societe.societeCodePostal, d.societe.societeVille].filter(Boolean).join(" ")].filter(Boolean).join(", "))}</Text>
            {d.societe.societeSiret && <Text>{t(`SIRET ${d.societe.societeSiret}`)}</Text>}
          </View>
          <View style={[s.colonne, s.cadre]}>
            <Text style={s.h2}>Le locataire</Text>
            <Text style={s.gras}>{t(d.client.nom)}</Text>
            {d.client.entreprise && <Text>{t(d.client.entreprise)}</Text>}
            {d.client.adresse && <Text>{t(d.client.adresse)}</Text>}
            {d.client.naissance && <Text>{t(`Né(e) le ${d.client.naissance}`)}</Text>}
            {d.client.permis && <Text>{t(`Permis n° ${d.client.permis}`)}</Text>}
            {d.client.piece && <Text>{t(d.client.piece)}</Text>}
            <Text>{t([d.client.telephone, d.client.email].filter(Boolean).join(" · "))}</Text>
            {d.conducteurs.length > 0 && <Text>{t(`Conducteurs additionnels : ${d.conducteurs.join(", ")}`)}</Text>}
          </View>
        </View>
        <View style={s.section}>
          <Text style={s.h2}>Véhicule et durée</Text>
          <Ligne libelle="Véhicule" valeur={`${d.vehicule.nom}${d.vehicule.immatriculation ? ` · ${d.vehicule.immatriculation}` : ""}`} />
          {d.vehicule.vin && <Ligne libelle="VIN" valeur={d.vehicule.vin} />}
          {d.vehicule.km !== null && <Ligne libelle="Kilométrage au départ" valeur={`${nombre(d.vehicule.km)} km`} />}
          <Ligne libelle="Départ prévu" valeur={`${dateHeure(d.depart)}${d.lieuDepart ? ` · ${d.lieuDepart}` : ""}`} />
          <Ligne libelle="Retour prévu" valeur={`${dateHeure(d.retour)}${d.lieuRetour ? ` · ${d.lieuRetour}` : ""}`} />
          <Ligne libelle="Kilométrage" valeur={d.kilometrage} />
          {d.prixKmSup !== null && <Ligne libelle="Kilomètre supplémentaire" valeur={euros(d.prixKmSup)} />}
        </View>
        <View style={[s.deuxColonnes, s.section]}>
          <View style={s.colonne}>
            <Text style={s.h2}>Prix</Text>
            {d.lignesPrix.map((l, i) => (
              <Ligne key={i} libelle={l.libelle} valeur={euros(l.montant)} />
            ))}
            <Ligne libelle="Total" valeur={euros(d.prixTotalCentimes)} gras />
          </View>
          <View style={s.colonne}>
            <Text style={s.h2}>Garanties</Text>
            <Ligne libelle="Caution" valeur={d.caution} />
            {d.franchise !== null && <Ligne libelle="Franchise en cas de sinistre" valeur={euros(d.franchise)} />}
            {d.echeancier.length > 1 && (
              <>
                <Text style={[s.h2, { marginTop: 8 }]}>Échéancier</Text>
                {d.echeancier.map((e, i) => (
                  <Ligne key={i} libelle={`${date(e.date)} · ${e.libelle.replace(/ \(du .*\)$/, "")}`} valeur={euros(e.montant)} />
                ))}
              </>
            )}
          </View>
        </View>
        {d.mentions && <Text style={[s.petit, s.section]}>{t(d.mentions)}</Text>}
        <View style={s.section} wrap={false}>
          <Text style={s.h2}>Signatures</Text>
          <Text style={s.petit}>{t("Le locataire déclare avoir pris connaissance et accepter les conditions générales de location ci-après.")}</Text>
          <View style={[s.deuxColonnes, { marginTop: 6 }]}>
            {(
              [
                ["Le locataire", d.signatures.client, d.signatures.nom],
                ["Le loueur", d.signatures.loueur, d.societe.societeNom],
              ] as const
            ).map(([qui, image, nom]) => (
              <View key={qui} style={[s.colonne, s.cadre, { height: 90 }]}>
                <Text style={s.petit}>{t(`${qui}${nom ? ` : ${nom}` : ""}${d.signatures.le ? ` · signé le ${dateHeure(d.signatures.le)}` : ""}`)}</Text>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                {image && <Image src={image as never} style={{ height: 60, objectFit: "contain", marginTop: 4 }} />}
              </View>
            ))}
          </View>
        </View>
        {d.conditions && (
          <View break>
            <Text style={s.h2}>Conditions générales de location</Text>
            <Text style={{ fontSize: 8, textAlign: "justify" }}>{t(d.conditions)}</Text>
          </View>
        )}
        <Pied texte={`${d.societe.societeNom} · contrat ${d.numero}`} />
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------
//  État des lieux
// ---------------------------------------------------------------------
export type DonneesEdlPdf = Base & {
  type: "DEPART" | "RETOUR";
  numeroContrat: string;
  client: string;
  vehicule: string;
  signeLe: Date | null;
  realisePar: string | null;
  releves: [string, string][];
  checklist: { libelle: string; present: boolean; quantite: number | null }[];
  dommages: { numero: number; libelle: string; gravite: string; nouveau: boolean }[];
  photos: { libelle: string; image: ImagePdf }[];
  remarques: string | null;
  mentions: string | null;
  signatures: { client: ImagePdf | null; loueur: ImagePdf | null; nom: string | null };
};

export function PdfEtatDesLieux(d: DonneesEdlPdf) {
  const titre = d.type === "DEPART" ? "ÉTAT DES LIEUX DE DÉPART" : "ÉTAT DES LIEUX DE RETOUR";
  return (
    <Document title={`${titre} ${d.numeroContrat}`} author={d.societe.societeNom}>
      <Page size="A4" style={s.page}>
        {enTete(d, <BlocDroite titre={titre} lignes={[`Contrat ${d.numeroContrat}`, `Le ${dateHeure(d.signeLe)}`]} />)}
        <View style={s.section}>
          <Ligne libelle="Locataire" valeur={d.client} />
          <Ligne libelle="Véhicule" valeur={d.vehicule} />
          {d.realisePar && <Ligne libelle="Réalisé par" valeur={d.realisePar} />}
        </View>
        <View style={[s.deuxColonnes, s.section]}>
          <View style={s.colonne}>
            <Text style={s.h2}>Relevés</Text>
            {d.releves.map(([l, v]) => (
              <Ligne key={l} libelle={l} valeur={v} />
            ))}
          </View>
          <View style={s.colonne}>
            <Text style={s.h2}>Équipements</Text>
            {d.checklist.map((c) => (
              <Ligne key={c.libelle} libelle={c.libelle} valeur={c.present ? `Oui${c.quantite !== null ? ` (${c.quantite})` : ""}` : "MANQUANT"} />
            ))}
          </View>
        </View>
        <View style={s.section}>
          <Text style={s.h2}>Dommages ({d.dommages.length})</Text>
          {d.dommages.length === 0 && <Text>Aucun dommage constaté.</Text>}
          {d.dommages.map((dm) => (
            <Text key={dm.numero} style={dm.nouveau ? { color: "#dc2626" } : undefined}>
              {t(`${dm.numero}. ${dm.libelle} (${dm.gravite.toLowerCase()})${dm.nouveau ? " · NOUVEAU" : ""}`)}
            </Text>
          ))}
        </View>
        {d.remarques && (
          <View style={s.section}>
            <Text style={s.h2}>Remarques</Text>
            <Text>{t(d.remarques)}</Text>
          </View>
        )}
        <View style={s.section}>
          <Text style={s.h2}>Photos</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {d.photos.map((p, i) => (
              <View key={i} style={{ width: 120 }} wrap={false}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={p.image as never} style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 2 }} />
                <Text style={[s.petit, { textAlign: "center" }]}>{t(p.libelle)}</Text>
              </View>
            ))}
          </View>
        </View>
        {d.mentions && <Text style={[s.petit, s.section]}>{t(d.mentions)}</Text>}
        <View style={s.deuxColonnes} wrap={false}>
          {(
            [
              ["Le locataire", d.signatures.client, d.signatures.nom],
              ["Le loueur", d.signatures.loueur, d.societe.societeNom],
            ] as const
          ).map(([qui, image, nom]) => (
            <View key={qui} style={[s.colonne, s.cadre, { height: 90 }]}>
              <Text style={s.petit}>{t(`${qui}${nom ? ` : ${nom}` : ""}`)}</Text>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              {image && <Image src={image as never} style={{ height: 60, objectFit: "contain", marginTop: 4 }} />}
            </View>
          ))}
        </View>
        <Pied texte={`${d.societe.societeNom} · ${titre.toLowerCase()} · ${d.numeroContrat}`} />
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------
//  Relevé de clôture de location
// ---------------------------------------------------------------------
export type DonneesCloturePdf = Base & {
  numero: string;
  client: string;
  vehicule: string;
  departReel: Date | null;
  retourReel: Date | null;
  kmDepart: number | null;
  kmRetour: number | null;
  prixLocationCentimes: number;
  frais: { libelle: string; montant: number }[];
  paiements: { date: Date; libelle: string; montant: number }[];
  caution: { montant: number; statut: string; retenue: number; motif: string | null };
  totalDuCentimes: number;
  encaisseCentimes: number;
};

export function PdfCloture(d: DonneesCloturePdf) {
  const solde = d.totalDuCentimes - d.encaisseCentimes;
  return (
    <Document title={`Relevé de clôture ${d.numero}`} author={d.societe.societeNom}>
      <Page size="A4" style={s.page}>
        {enTete(d, <BlocDroite titre="RELEVÉ DE CLÔTURE" lignes={[`Contrat ${d.numero}`, `Édité le ${date(new Date())}`]} />)}
        <View style={s.section}>
          <Ligne libelle="Locataire" valeur={d.client} />
          <Ligne libelle="Véhicule" valeur={d.vehicule} />
          <Ligne libelle="Départ" valeur={dateHeure(d.departReel)} />
          <Ligne libelle="Retour" valeur={dateHeure(d.retourReel)} />
          {d.kmDepart !== null && d.kmRetour !== null && (
            <Ligne libelle="Kilométrage" valeur={`${nombre(d.kmDepart)} km -> ${nombre(d.kmRetour)} km (${nombre(d.kmRetour - d.kmDepart)} km parcourus)`} />
          )}
        </View>
        <View style={s.section}>
          <Text style={s.h2}>Montants dus</Text>
          <Ligne libelle="Location" valeur={euros(d.prixLocationCentimes)} />
          {d.frais.map((f, i) => (
            <Ligne key={i} libelle={f.libelle} valeur={euros(f.montant)} />
          ))}
          <Ligne libelle="Total dû" valeur={euros(d.totalDuCentimes)} gras />
        </View>
        <View style={s.section}>
          <Text style={s.h2}>Règlements</Text>
          {d.paiements.length === 0 && <Text>Aucun règlement.</Text>}
          {d.paiements.map((p, i) => (
            <Ligne key={i} libelle={`${date(p.date)} · ${p.libelle}`} valeur={euros(p.montant)} />
          ))}
          <Ligne libelle="Total réglé" valeur={euros(d.encaisseCentimes)} gras />
        </View>
        <View style={s.section}>
          <Text style={s.h2}>Caution</Text>
          <Ligne libelle="Montant" valeur={euros(d.caution.montant)} />
          <Ligne libelle="État" valeur={d.caution.statut} />
          {d.caution.retenue > 0 && <Ligne libelle={`Retenue${d.caution.motif ? ` (${d.caution.motif})` : ""}`} valeur={euros(d.caution.retenue)} />}
        </View>
        <View style={[s.cadre, { borderColor: COULEUR }]}>
          <Ligne libelle={solde > 0 ? "Reste à payer" : solde < 0 ? "Trop-perçu à rembourser" : "Solde"} valeur={euros(Math.abs(solde))} gras />
        </View>
        <Pied texte={`${d.societe.societeNom} · relevé de clôture ${d.numero}`} />
      </Page>
    </Document>
  );
}
