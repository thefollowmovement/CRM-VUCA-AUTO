-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GESTIONNAIRE', 'INVESTISSEUR_LECTURE');

-- CreateEnum
CREATE TYPE "TypePartenaire" AS ENUM ('SOCIETE', 'INVESTISSEUR');

-- CreateEnum
CREATE TYPE "TypeExploitation" AS ENUM ('ACHAT_REVENTE', 'LOCATION', 'MIXTE');

-- CreateEnum
CREATE TYPE "StatutVehicule" AS ENUM ('EN_PREPARATION', 'EN_VENTE', 'RESERVE', 'DISPONIBLE_LOCATION', 'EN_LOCATION', 'IMMOBILISE', 'VENDU', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "Carburant" AS ENUM ('ESSENCE', 'DIESEL', 'HYBRIDE', 'HYBRIDE_RECHARGEABLE', 'ELECTRIQUE', 'GPL', 'E85', 'AUTRE');

-- CreateEnum
CREATE TYPE "Boite" AS ENUM ('MANUELLE', 'AUTOMATIQUE');

-- CreateEnum
CREATE TYPE "CritAir" AS ENUM ('CRIT_AIR_0', 'CRIT_AIR_1', 'CRIT_AIR_2', 'CRIT_AIR_3', 'CRIT_AIR_4', 'CRIT_AIR_5', 'NON_CLASSE');

-- CreateEnum
CREATE TYPE "Provenance" AS ENUM ('PARTICULIER', 'PROFESSIONNEL', 'ENCHERES', 'IMPORT', 'REPRISE', 'AUTRE');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('ESPECES', 'CHEQUE', 'VIREMENT', 'CARTE_BANCAIRE', 'PRELEVEMENT', 'AUTRE');

-- CreateEnum
CREATE TYPE "ModeRepartition" AS ENUM ('PRORATA_INVESTISSEMENT', 'POURCENTAGE_FIXE');

-- CreateEnum
CREATE TYPE "Civilite" AS ENUM ('M', 'MME');

-- CreateEnum
CREATE TYPE "TypePieceIdentite" AS ENUM ('CARTE_IDENTITE', 'PASSEPORT', 'TITRE_SEJOUR', 'AUTRE');

-- CreateEnum
CREATE TYPE "TypeLocation" AS ENUM ('JOURNALIERE', 'HEBDOMADAIRE', 'MENSUELLE');

-- CreateEnum
CREATE TYPE "StatutContrat" AS ENUM ('RESERVATION', 'CONFIRMEE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "ModeCaution" AS ENUM ('EMPREINTE_CB', 'CHEQUE', 'ESPECES', 'VIREMENT');

-- CreateEnum
CREATE TYPE "StatutCaution" AS ENUM ('A_ENCAISSER', 'ENCAISSEE', 'RESTITUEE', 'RETENUE_PARTIELLE', 'RETENUE_TOTALE');

-- CreateEnum
CREATE TYPE "ModeTarifOption" AS ENUM ('PAR_JOUR', 'FORFAIT');

-- CreateEnum
CREATE TYPE "TypeEtatDesLieux" AS ENUM ('DEPART', 'RETOUR');

-- CreateEnum
CREATE TYPE "Proprete" AS ENUM ('PROPRE', 'CORRECT', 'SALE');

-- CreateEnum
CREATE TYPE "VueVehicule" AS ENUM ('DESSUS', 'AVANT', 'ARRIERE', 'COTE_GAUCHE', 'COTE_DROIT', 'INTERIEUR');

-- CreateEnum
CREATE TYPE "TypeDommage" AS ENUM ('RAYURE', 'BOSSE', 'IMPACT', 'ECLAT', 'JANTE_ABIMEE', 'VITRE', 'INTERIEUR', 'AUTRE');

-- CreateEnum
CREATE TYPE "GraviteDommage" AS ENUM ('LEGER', 'MOYEN', 'IMPORTANT');

-- CreateEnum
CREATE TYPE "TypeFraisSupplementaire" AS ENUM ('KM_SUPPLEMENTAIRES', 'CARBURANT', 'NETTOYAGE', 'DOMMAGES', 'RETARD', 'LIVRAISON', 'AMENDE_REFACTUREE', 'FRAIS_DOSSIER', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutEcheance" AS ENUM ('A_VENIR', 'PARTIELLE', 'PAYEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "NaturePaiement" AS ENUM ('LOCATION', 'FRAIS', 'CAUTION_RETENUE', 'REMBOURSEMENT');

-- CreateEnum
CREATE TYPE "StatutAmende" AS ENUM ('RECUE', 'CONDUCTEUR_DESIGNE', 'PAYEE', 'REFACTUREE');

-- CreateEnum
CREATE TYPE "StatutSinistre" AS ENUM ('DECLARE', 'EN_EXPERTISE', 'EN_REPARATION', 'CLOTURE');

-- CreateEnum
CREATE TYPE "TypeVersement" AS ENUM ('REMBOURSEMENT_CAPITAL', 'VERSEMENT_BENEFICE', 'APPORT_SUPPLEMENTAIRE');

-- CreateEnum
CREATE TYPE "TypeFacture" AS ENUM ('LOCATION', 'VENTE_VEHICULE', 'AUTRE');

-- CreateEnum
CREATE TYPE "CategorieFichier" AS ENUM ('PHOTO_VEHICULE', 'CARTE_GRISE', 'FACTURE_ACHAT', 'CONTROLE_TECHNIQUE', 'CERTIFICAT_CESSION', 'ATTESTATION_ASSURANCE', 'DOCUMENT_VEHICULE_AUTRE', 'JUSTIFICATIF_DEPENSE', 'PERMIS_RECTO', 'PERMIS_VERSO', 'PIECE_IDENTITE_RECTO', 'PIECE_IDENTITE_VERSO', 'JUSTIFICATIF_DOMICILE', 'DOCUMENT_CLIENT_AUTRE', 'EDL_AVANT', 'EDL_ARRIERE', 'EDL_COTE_GAUCHE', 'EDL_COTE_DROIT', 'EDL_INTERIEUR_AVANT', 'EDL_INTERIEUR_ARRIERE', 'EDL_COMPTEUR', 'EDL_LIBRE', 'SIGNATURE', 'PHOTO_DOMMAGE', 'PHOTO_SINISTRE', 'DOCUMENT_SINISTRE', 'AVIS_CONTRAVENTION', 'PDF_ARCHIVE', 'LOGO');

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'GESTIONNAIRE',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "doitChangerMotDePasse" BOOLEAN NOT NULL DEFAULT false,
    "derniereConnexionLe" TIMESTAMP(3),
    "partenaireId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalActivite" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT,
    "avant" JSONB,
    "apres" JSONB,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalActivite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partenaire" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "TypePartenaire" NOT NULL DEFAULT 'INVESTISSEUR',
    "estSysteme" BOOLEAN NOT NULL DEFAULT false,
    "telephone" TEXT,
    "email" TEXT,
    "iban" TEXT,
    "notes" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partenaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicule" (
    "id" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "version" TEXT,
    "immatriculation" TEXT,
    "vin" TEXT,
    "annee" INTEGER,
    "dateMiseEnCirculation" DATE,
    "carburant" "Carburant",
    "boite" "Boite",
    "couleur" TEXT,
    "nombrePlaces" INTEGER,
    "puissanceFiscale" INTEGER,
    "critAir" "CritAir",
    "kilometrageActuel" INTEGER,
    "kilometrageActuelLe" TIMESTAMP(3),
    "typeExploitation" "TypeExploitation" NOT NULL DEFAULT 'ACHAT_REVENTE',
    "statut" "StatutVehicule" NOT NULL DEFAULT 'EN_PREPARATION',
    "dateAchat" DATE NOT NULL,
    "prixAchatCentimes" INTEGER NOT NULL,
    "kilometrageAchat" INTEGER,
    "provenance" "Provenance",
    "nomVendeur" TEXT,
    "lienAnnonce" TEXT,
    "notesAchat" TEXT,
    "ecartFinancementAccepte" BOOLEAN NOT NULL DEFAULT false,
    "ecartFinancementMotif" TEXT,
    "prixCibleCentimes" INTEGER,
    "prixVenteCentimes" INTEGER,
    "dateVente" DATE,
    "kilometrageVente" INTEGER,
    "acheteurNom" TEXT,
    "acheteurTelephone" TEXT,
    "acheteurEmail" TEXT,
    "acheteurAdresse" TEXT,
    "modePaiementVente" "ModePaiement",
    "notesVente" TEXT,
    "tarifJournalierCentimes" INTEGER,
    "tarifHebdoCentimes" INTEGER,
    "tarifMensuelCentimes" INTEGER,
    "kmInclusParJour" INTEGER,
    "kmInclusParMois" INTEGER,
    "prixKmSupCentimes" INTEGER,
    "cautionDefautCentimes" INTEGER,
    "franchiseDefautCentimes" INTEGER,
    "dateMiseEnLocation" DATE,
    "dateProchainControleTechnique" DATE,
    "assureur" TEXT,
    "numeroPoliceAssurance" TEXT,
    "dateEcheanceAssurance" DATE,
    "dateProchaineVidange" DATE,
    "kmProchaineVidange" INTEGER,
    "dateProchaineRevision" DATE,
    "kmProchaineRevision" INTEGER,
    "modeRepartition" "ModeRepartition" NOT NULL DEFAULT 'PRORATA_INVESTISSEMENT',
    "commissionGestionBp" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "archiveLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriqueStatutVehicule" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "ancienStatut" "StatutVehicule",
    "nouveauStatut" "StatutVehicule" NOT NULL,
    "changeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motif" TEXT,
    "utilisateurId" TEXT,

    CONSTRAINT "HistoriqueStatutVehicule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimationValeur" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "montantCentimes" INTEGER NOT NULL,
    "estimeLe" DATE NOT NULL,
    "source" TEXT,
    "note" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimationValeur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participation" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "partenaireId" TEXT NOT NULL,
    "montantCentimes" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartBeneficeFixe" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "partenaireId" TEXT NOT NULL,
    "pourcentageBp" INTEGER NOT NULL,

    CONSTRAINT "PartBeneficeFixe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategorieDepense" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "nom" TEXT NOT NULL,
    "icone" TEXT,
    "couleur" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CategorieDepense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Depense" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "categorieId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "montantCentimes" INTEGER NOT NULL,
    "payeParId" TEXT NOT NULL,
    "payeSurRecettes" BOOLEAN NOT NULL DEFAULT false,
    "fournisseur" TEXT,
    "kilometrage" INTEGER,
    "note" TEXT,
    "sinistreId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Depense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "civilite" "Civilite",
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "dateNaissance" DATE,
    "lieuNaissance" TEXT,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "pays" TEXT DEFAULT 'France',
    "telephone" TEXT,
    "email" TEXT,
    "numeroPermis" TEXT,
    "dateObtentionPermis" DATE,
    "categoriePermis" TEXT DEFAULT 'B',
    "dateValiditePermis" DATE,
    "typePieceIdentite" "TypePieceIdentite",
    "numeroPieceIdentite" TEXT,
    "dateValiditePieceIdentite" DATE,
    "entreprise" TEXT,
    "siretEntreprise" TEXT,
    "listeNoire" BOOLEAN NOT NULL DEFAULT false,
    "motifListeNoire" TEXT,
    "notes" TEXT,
    "archiveLe" TIMESTAMP(3),
    "anonymiseLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratLocation" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "TypeLocation" NOT NULL,
    "statut" "StatutContrat" NOT NULL DEFAULT 'RESERVATION',
    "departPrevuLe" TIMESTAMP(3) NOT NULL,
    "retourPrevuLe" TIMESTAMP(3) NOT NULL,
    "departReelLe" TIMESTAMP(3),
    "retourReelLe" TIMESTAMP(3),
    "lieuDepart" TEXT,
    "lieuRetour" TEXT,
    "livraison" BOOLEAN NOT NULL DEFAULT false,
    "tarifCentimes" INTEGER NOT NULL,
    "dureeFacturee" INTEGER NOT NULL,
    "remiseCentimes" INTEGER NOT NULL DEFAULT 0,
    "fraisLivraisonCentimes" INTEGER NOT NULL DEFAULT 0,
    "prixTotalCentimes" INTEGER NOT NULL,
    "acompteCentimes" INTEGER,
    "jourEcheanceMensuelle" INTEGER,
    "kilometrageIllimite" BOOLEAN NOT NULL DEFAULT false,
    "kmInclusParUnite" INTEGER,
    "prixKmSupCentimes" INTEGER,
    "cautionCentimes" INTEGER NOT NULL DEFAULT 0,
    "modeCaution" "ModeCaution",
    "statutCaution" "StatutCaution" NOT NULL DEFAULT 'A_ENCAISSER',
    "cautionRetenueCentimes" INTEGER NOT NULL DEFAULT 0,
    "motifRetenueCaution" TEXT,
    "cautionEncaisseeLe" TIMESTAMP(3),
    "cautionRestitueeLe" TIMESTAMP(3),
    "franchiseCentimes" INTEGER,
    "conditionsGenerales" TEXT,
    "notes" TEXT,
    "annuleLe" TIMESTAMP(3),
    "motifAnnulation" TEXT,
    "archiveLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContratLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConducteurAdditionnel" (
    "id" TEXT NOT NULL,
    "contratId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "ConducteurAdditionnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionLocation" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "modeTarif" "ModeTarifOption" NOT NULL DEFAULT 'PAR_JOUR',
    "prixCentimes" INTEGER NOT NULL,
    "plafondCentimes" INTEGER,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OptionLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionContrat" (
    "id" TEXT NOT NULL,
    "contratId" TEXT NOT NULL,
    "optionId" TEXT,
    "libelle" TEXT NOT NULL,
    "modeTarif" "ModeTarifOption" NOT NULL,
    "prixCentimes" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "totalCentimes" INTEGER NOT NULL,

    CONSTRAINT "OptionContrat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtatDesLieux" (
    "id" TEXT NOT NULL,
    "contratId" TEXT NOT NULL,
    "type" "TypeEtatDesLieux" NOT NULL,
    "realiseLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "realiseParId" TEXT,
    "kilometrage" INTEGER NOT NULL,
    "niveauCarburantHuitiemes" INTEGER,
    "niveauBatteriePct" INTEGER,
    "propreteInterieure" "Proprete",
    "propreteExterieure" "Proprete",
    "remarques" TEXT,
    "signatureClientId" TEXT,
    "signatureLoueurId" TEXT,
    "nomSignataireClient" TEXT,
    "signeLe" TIMESTAMP(3),
    "verrouille" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtatDesLieux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElementChecklist" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "avecQuantite" BOOLEAN NOT NULL DEFAULT false,
    "electriqueUniquement" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ElementChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneChecklistEdl" (
    "id" TEXT NOT NULL,
    "etatDesLieuxId" TEXT NOT NULL,
    "elementId" TEXT,
    "libelle" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL,
    "quantite" INTEGER,
    "note" TEXT,

    CONSTRAINT "LigneChecklistEdl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dommage" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "vue" "VueVehicule" NOT NULL,
    "zone" TEXT NOT NULL,
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "type" "TypeDommage" NOT NULL,
    "gravite" "GraviteDommage" NOT NULL DEFAULT 'LEGER',
    "description" TEXT,
    "constateLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etatDesLieuxConstatationId" TEXT,
    "sinistreId" TEXT,
    "repareLe" TIMESTAMP(3),
    "depenseReparationId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dommage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraisSupplementaire" (
    "id" TEXT NOT NULL,
    "contratId" TEXT NOT NULL,
    "type" "TypeFraisSupplementaire" NOT NULL,
    "libelle" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prixUnitaireCentimes" INTEGER NOT NULL,
    "montantCentimes" INTEGER NOT NULL,
    "proposeAutomatiquement" BOOLEAN NOT NULL DEFAULT false,
    "dommageId" TEXT,
    "amendeId" TEXT,
    "note" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraisSupplementaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Echeance" (
    "id" TEXT NOT NULL,
    "contratId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,
    "dateEcheance" DATE NOT NULL,
    "periodeDebut" DATE,
    "periodeFin" DATE,
    "montantCentimes" INTEGER NOT NULL,
    "statut" "StatutEcheance" NOT NULL DEFAULT 'A_VENIR',

    CONSTRAINT "Echeance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "numeroRecu" TEXT,
    "contratId" TEXT NOT NULL,
    "echeanceId" TEXT,
    "nature" "NaturePaiement" NOT NULL DEFAULT 'LOCATION',
    "date" DATE NOT NULL,
    "montantCentimes" INTEGER NOT NULL,
    "mode" "ModePaiement" NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amende" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "infractionLe" TIMESTAMP(3) NOT NULL,
    "lieu" TEXT,
    "montantCentimes" INTEGER NOT NULL,
    "numeroAvis" TEXT,
    "dateReception" DATE,
    "dateLimite" DATE,
    "statut" "StatutAmende" NOT NULL DEFAULT 'RECUE',
    "contratId" TEXT,
    "clientId" TEXT,
    "identificationAuto" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Amende_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sinistre" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "contratId" TEXT,
    "survenuLe" TIMESTAMP(3) NOT NULL,
    "lieu" TEXT,
    "description" TEXT NOT NULL,
    "coutEstimeCentimes" INTEGER,
    "franchiseRefactureeCentimes" INTEGER,
    "declareAssurance" BOOLEAN NOT NULL DEFAULT false,
    "numeroDossierAssurance" TEXT,
    "indemniteAssuranceCentimes" INTEGER,
    "statut" "StatutSinistre" NOT NULL DEFAULT 'DECLARE',
    "note" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sinistre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "type" "TypeFacture" NOT NULL,
    "dateEmission" DATE NOT NULL,
    "contratId" TEXT,
    "vehiculeId" TEXT,
    "clientId" TEXT,
    "destinataireNom" TEXT NOT NULL,
    "destinataireAdresse" TEXT,
    "totalCentimes" INTEGER NOT NULL,
    "mention" TEXT,
    "annuleeLe" TIMESTAMP(3),
    "motifAnnulation" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneFacture" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "libelle" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prixUnitaireCentimes" INTEGER NOT NULL,
    "totalCentimes" INTEGER NOT NULL,

    CONSTRAINT "LigneFacture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Versement" (
    "id" TEXT NOT NULL,
    "partenaireId" TEXT NOT NULL,
    "vehiculeId" TEXT,
    "date" DATE NOT NULL,
    "montantCentimes" INTEGER NOT NULL,
    "type" "TypeVersement" NOT NULL,
    "mode" "ModePaiement",
    "reference" TEXT,
    "note" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Versement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fichier" (
    "id" TEXT NOT NULL,
    "categorie" "CategorieFichier" NOT NULL,
    "cleStockage" TEXT NOT NULL,
    "nomOriginal" TEXT NOT NULL,
    "typeMime" TEXT NOT NULL,
    "tailleOctets" INTEGER NOT NULL,
    "largeur" INTEGER,
    "hauteur" INTEGER,
    "libelle" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "estPrincipale" BOOLEAN NOT NULL DEFAULT false,
    "envoyeParId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehiculeId" TEXT,
    "depenseId" TEXT,
    "clientId" TEXT,
    "contratId" TEXT,
    "etatDesLieuxId" TEXT,
    "dommageId" TEXT,
    "sinistreId" TEXT,
    "amendeId" TEXT,

    CONSTRAINT "Fichier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reglages" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "societeNom" TEXT NOT NULL DEFAULT 'VUCA AUTO',
    "societeAdresse" TEXT,
    "societeCodePostal" TEXT,
    "societeVille" TEXT,
    "societeSiret" TEXT,
    "societeTelephone" TEXT,
    "societeEmail" TEXT,
    "logoId" TEXT,
    "conditionsGenerales" TEXT,
    "mentionFacture" TEXT,
    "mentionsContrat" TEXT,
    "mentionsEtatDesLieux" TEXT,
    "prefixeContrat" TEXT NOT NULL DEFAULT 'LOC',
    "prefixeFacture" TEXT NOT NULL DEFAULT 'FAC',
    "prefixeRecu" TEXT NOT NULL DEFAULT 'REC',
    "joursStockAlerte" INTEGER NOT NULL DEFAULT 90,
    "joursAvantEcheanceAlerte" INTEGER NOT NULL DEFAULT 30,
    "kmAvantVidangeAlerte" INTEGER NOT NULL DEFAULT 1000,
    "anciennetePermisMinAnnees" INTEGER NOT NULL DEFAULT 2,
    "toleranceRetardMinutes" INTEGER NOT NULL DEFAULT 60,
    "jourEcheanceMensuelleDefaut" INTEGER NOT NULL DEFAULT 1,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reglages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compteur" (
    "cle" TEXT NOT NULL,
    "valeur" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Compteur_pkey" PRIMARY KEY ("cle")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_partenaireId_key" ON "Utilisateur"("partenaireId");

-- CreateIndex
CREATE INDEX "JournalActivite_entite_entiteId_idx" ON "JournalActivite"("entite", "entiteId");

-- CreateIndex
CREATE INDEX "JournalActivite_creeLe_idx" ON "JournalActivite"("creeLe");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicule_immatriculation_key" ON "Vehicule"("immatriculation");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicule_vin_key" ON "Vehicule"("vin");

-- CreateIndex
CREATE INDEX "Vehicule_statut_idx" ON "Vehicule"("statut");

-- CreateIndex
CREATE INDEX "Vehicule_typeExploitation_idx" ON "Vehicule"("typeExploitation");

-- CreateIndex
CREATE INDEX "Vehicule_dateAchat_idx" ON "Vehicule"("dateAchat");

-- CreateIndex
CREATE INDEX "Vehicule_marque_idx" ON "Vehicule"("marque");

-- CreateIndex
CREATE INDEX "HistoriqueStatutVehicule_vehiculeId_changeLe_idx" ON "HistoriqueStatutVehicule"("vehiculeId", "changeLe");

-- CreateIndex
CREATE INDEX "EstimationValeur_vehiculeId_estimeLe_idx" ON "EstimationValeur"("vehiculeId", "estimeLe");

-- CreateIndex
CREATE INDEX "Participation_vehiculeId_idx" ON "Participation"("vehiculeId");

-- CreateIndex
CREATE INDEX "Participation_partenaireId_idx" ON "Participation"("partenaireId");

-- CreateIndex
CREATE UNIQUE INDEX "PartBeneficeFixe_vehiculeId_partenaireId_key" ON "PartBeneficeFixe"("vehiculeId", "partenaireId");

-- CreateIndex
CREATE UNIQUE INDEX "CategorieDepense_code_key" ON "CategorieDepense"("code");

-- CreateIndex
CREATE INDEX "Depense_vehiculeId_date_idx" ON "Depense"("vehiculeId", "date");

-- CreateIndex
CREATE INDEX "Depense_categorieId_idx" ON "Depense"("categorieId");

-- CreateIndex
CREATE INDEX "Depense_payeParId_idx" ON "Depense"("payeParId");

-- CreateIndex
CREATE INDEX "Depense_date_idx" ON "Depense"("date");

-- CreateIndex
CREATE INDEX "Client_nom_prenom_idx" ON "Client"("nom", "prenom");

-- CreateIndex
CREATE INDEX "Client_telephone_idx" ON "Client"("telephone");

-- CreateIndex
CREATE INDEX "Client_numeroPermis_idx" ON "Client"("numeroPermis");

-- CreateIndex
CREATE UNIQUE INDEX "ContratLocation_numero_key" ON "ContratLocation"("numero");

-- CreateIndex
CREATE INDEX "ContratLocation_vehiculeId_departPrevuLe_retourPrevuLe_idx" ON "ContratLocation"("vehiculeId", "departPrevuLe", "retourPrevuLe");

-- CreateIndex
CREATE INDEX "ContratLocation_clientId_idx" ON "ContratLocation"("clientId");

-- CreateIndex
CREATE INDEX "ContratLocation_statut_idx" ON "ContratLocation"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "ConducteurAdditionnel_contratId_clientId_key" ON "ConducteurAdditionnel"("contratId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "EtatDesLieux_signatureClientId_key" ON "EtatDesLieux"("signatureClientId");

-- CreateIndex
CREATE UNIQUE INDEX "EtatDesLieux_signatureLoueurId_key" ON "EtatDesLieux"("signatureLoueurId");

-- CreateIndex
CREATE UNIQUE INDEX "EtatDesLieux_contratId_type_key" ON "EtatDesLieux"("contratId", "type");

-- CreateIndex
CREATE INDEX "Dommage_vehiculeId_repareLe_idx" ON "Dommage"("vehiculeId", "repareLe");

-- CreateIndex
CREATE INDEX "FraisSupplementaire_contratId_idx" ON "FraisSupplementaire"("contratId");

-- CreateIndex
CREATE INDEX "Echeance_dateEcheance_statut_idx" ON "Echeance"("dateEcheance", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Echeance_contratId_numero_key" ON "Echeance"("contratId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_numeroRecu_key" ON "Paiement"("numeroRecu");

-- CreateIndex
CREATE INDEX "Paiement_contratId_idx" ON "Paiement"("contratId");

-- CreateIndex
CREATE INDEX "Paiement_date_idx" ON "Paiement"("date");

-- CreateIndex
CREATE INDEX "Amende_vehiculeId_infractionLe_idx" ON "Amende"("vehiculeId", "infractionLe");

-- CreateIndex
CREATE INDEX "Amende_statut_idx" ON "Amende"("statut");

-- CreateIndex
CREATE INDEX "Sinistre_vehiculeId_idx" ON "Sinistre"("vehiculeId");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_numero_key" ON "Facture"("numero");

-- CreateIndex
CREATE INDEX "Versement_partenaireId_date_idx" ON "Versement"("partenaireId", "date");

-- CreateIndex
CREATE INDEX "Versement_vehiculeId_idx" ON "Versement"("vehiculeId");

-- CreateIndex
CREATE UNIQUE INDEX "Fichier_cleStockage_key" ON "Fichier"("cleStockage");

-- CreateIndex
CREATE INDEX "Fichier_vehiculeId_categorie_idx" ON "Fichier"("vehiculeId", "categorie");

-- CreateIndex
CREATE INDEX "Fichier_clientId_idx" ON "Fichier"("clientId");

-- CreateIndex
CREATE INDEX "Fichier_depenseId_idx" ON "Fichier"("depenseId");

-- CreateIndex
CREATE INDEX "Fichier_etatDesLieuxId_idx" ON "Fichier"("etatDesLieuxId");

-- CreateIndex
CREATE UNIQUE INDEX "Reglages_logoId_key" ON "Reglages"("logoId");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "Partenaire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalActivite" ADD CONSTRAINT "JournalActivite_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueStatutVehicule" ADD CONSTRAINT "HistoriqueStatutVehicule_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueStatutVehicule" ADD CONSTRAINT "HistoriqueStatutVehicule_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimationValeur" ADD CONSTRAINT "EstimationValeur_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "Partenaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartBeneficeFixe" ADD CONSTRAINT "PartBeneficeFixe_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartBeneficeFixe" ADD CONSTRAINT "PartBeneficeFixe_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "Partenaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "CategorieDepense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_payeParId_fkey" FOREIGN KEY ("payeParId") REFERENCES "Partenaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_sinistreId_fkey" FOREIGN KEY ("sinistreId") REFERENCES "Sinistre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratLocation" ADD CONSTRAINT "ContratLocation_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratLocation" ADD CONSTRAINT "ContratLocation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConducteurAdditionnel" ADD CONSTRAINT "ConducteurAdditionnel_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "ContratLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConducteurAdditionnel" ADD CONSTRAINT "ConducteurAdditionnel_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionContrat" ADD CONSTRAINT "OptionContrat_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "ContratLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionContrat" ADD CONSTRAINT "OptionContrat_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "OptionLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtatDesLieux" ADD CONSTRAINT "EtatDesLieux_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "ContratLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtatDesLieux" ADD CONSTRAINT "EtatDesLieux_realiseParId_fkey" FOREIGN KEY ("realiseParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtatDesLieux" ADD CONSTRAINT "EtatDesLieux_signatureClientId_fkey" FOREIGN KEY ("signatureClientId") REFERENCES "Fichier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtatDesLieux" ADD CONSTRAINT "EtatDesLieux_signatureLoueurId_fkey" FOREIGN KEY ("signatureLoueurId") REFERENCES "Fichier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneChecklistEdl" ADD CONSTRAINT "LigneChecklistEdl_etatDesLieuxId_fkey" FOREIGN KEY ("etatDesLieuxId") REFERENCES "EtatDesLieux"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneChecklistEdl" ADD CONSTRAINT "LigneChecklistEdl_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "ElementChecklist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dommage" ADD CONSTRAINT "Dommage_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dommage" ADD CONSTRAINT "Dommage_etatDesLieuxConstatationId_fkey" FOREIGN KEY ("etatDesLieuxConstatationId") REFERENCES "EtatDesLieux"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dommage" ADD CONSTRAINT "Dommage_sinistreId_fkey" FOREIGN KEY ("sinistreId") REFERENCES "Sinistre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dommage" ADD CONSTRAINT "Dommage_depenseReparationId_fkey" FOREIGN KEY ("depenseReparationId") REFERENCES "Depense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraisSupplementaire" ADD CONSTRAINT "FraisSupplementaire_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "ContratLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraisSupplementaire" ADD CONSTRAINT "FraisSupplementaire_dommageId_fkey" FOREIGN KEY ("dommageId") REFERENCES "Dommage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraisSupplementaire" ADD CONSTRAINT "FraisSupplementaire_amendeId_fkey" FOREIGN KEY ("amendeId") REFERENCES "Amende"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Echeance" ADD CONSTRAINT "Echeance_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "ContratLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "ContratLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_echeanceId_fkey" FOREIGN KEY ("echeanceId") REFERENCES "Echeance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amende" ADD CONSTRAINT "Amende_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amende" ADD CONSTRAINT "Amende_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "ContratLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amende" ADD CONSTRAINT "Amende_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sinistre" ADD CONSTRAINT "Sinistre_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sinistre" ADD CONSTRAINT "Sinistre_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "ContratLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "ContratLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneFacture" ADD CONSTRAINT "LigneFacture_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Versement" ADD CONSTRAINT "Versement_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "Partenaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Versement" ADD CONSTRAINT "Versement_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fichier" ADD CONSTRAINT "Fichier_envoyeParId_fkey" FOREIGN KEY ("envoyeParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fichier" ADD CONSTRAINT "Fichier_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fichier" ADD CONSTRAINT "Fichier_depenseId_fkey" FOREIGN KEY ("depenseId") REFERENCES "Depense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fichier" ADD CONSTRAINT "Fichier_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fichier" ADD CONSTRAINT "Fichier_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "ContratLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fichier" ADD CONSTRAINT "Fichier_etatDesLieuxId_fkey" FOREIGN KEY ("etatDesLieuxId") REFERENCES "EtatDesLieux"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fichier" ADD CONSTRAINT "Fichier_dommageId_fkey" FOREIGN KEY ("dommageId") REFERENCES "Dommage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fichier" ADD CONSTRAINT "Fichier_sinistreId_fkey" FOREIGN KEY ("sinistreId") REFERENCES "Sinistre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fichier" ADD CONSTRAINT "Fichier_amendeId_fkey" FOREIGN KEY ("amendeId") REFERENCES "Amende"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reglages" ADD CONSTRAINT "Reglages_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "Fichier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
