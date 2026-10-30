-- Site web public : annonces, réglages du site, avis, statistiques, photos publiques (ajouts uniquement)

-- CreateEnum
CREATE TYPE "SourceAvis" AS ENUM ('GOOGLE', 'LEBONCOIN', 'DIRECT');

-- CreateEnum
CREATE TYPE "TypeStatSite" AS ENUM ('VUE_SITE', 'VUE_ANNONCE', 'CLIC_WHATSAPP', 'CLIC_APPEL');

-- AlterEnum
ALTER TYPE "CategorieFichier" ADD VALUE 'IMAGE_SITE';

-- AlterTable
ALTER TABLE "Fichier" ADD COLUMN     "ordrePublic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "publique" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recadrage" JSONB;

-- CreateTable
CREATE TABLE "Annonce" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "publiee" BOOLEAN NOT NULL DEFAULT false,
    "publieeLe" TIMESTAMP(3),
    "depublieeLe" TIMESTAMP(3),
    "titre" TEXT NOT NULL,
    "prixAfficheCentimes" INTEGER,
    "prixNegociable" BOOLEAN NOT NULL DEFAULT false,
    "puissanceCh" INTEGER,
    "description" TEXT,
    "equipements" JSONB NOT NULL DEFAULT '{}',
    "ctAJour" BOOLEAN NOT NULL DEFAULT false,
    "ctDate" DATE,
    "carnetEntretien" BOOLEAN NOT NULL DEFAULT false,
    "rapportHistovec" BOOLEAN NOT NULL DEFAULT false,
    "nombreProprietaires" INTEGER,
    "premiereMain" BOOLEAN NOT NULL DEFAULT false,
    "garantieMois" INTEGER,
    "garantieTexte" TEXT,
    "nonFumeur" BOOLEAN NOT NULL DEFAULT false,
    "reviseAvantVente" BOOLEAN NOT NULL DEFAULT false,
    "travauxRealises" TEXT,
    "kilometrageVerifie" BOOLEAN NOT NULL DEFAULT false,
    "sourceKilometrage" TEXT,
    "couvertureId" TEXT,
    "misAJourLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Annonce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReglagesSite" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enLigne" BOOLEAN NOT NULL DEFAULT false,
    "nomAffiche" TEXT NOT NULL DEFAULT 'VUCA AUTO',
    "slogan" TEXT,
    "couleurAccent" TEXT NOT NULL DEFAULT '#0071E3',
    "logoClairId" TEXT,
    "logoFonceId" TEXT,
    "faviconId" TEXT,
    "whatsapp" TEXT,
    "messageWhatsappVehicule" TEXT NOT NULL DEFAULT 'Bonjour, je suis intéressé par la {marque} {modele} {annee} à {prix} ({lien}). Est-elle toujours disponible ?',
    "messageWhatsappGeneral" TEXT NOT NULL DEFAULT 'Bonjour, je souhaiterais avoir des informations sur vos véhicules.',
    "telephone" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "lienGoogleMaps" TEXT,
    "horaires" JSONB NOT NULL DEFAULT '[]',
    "delaiReponse" TEXT,
    "vendeurNom" TEXT,
    "vendeurPhotoId" TEXT,
    "siret" TEXT,
    "formeJuridique" TEXT,
    "adresseSiege" TEXT,
    "engagements" JSONB NOT NULL DEFAULT '[]',
    "moyensPaiement" JSONB NOT NULL DEFAULT '[]',
    "livraison" BOOLEAN NOT NULL DEFAULT false,
    "zoneLivraison" TEXT,
    "reprise" BOOLEAN NOT NULL DEFAULT false,
    "lienAvisGoogle" TEXT,
    "afficherVendus" BOOLEAN NOT NULL DEFAULT false,
    "joursVendus" INTEGER NOT NULL DEFAULT 60,
    "afficherNombreVendus" BOOLEAN NOT NULL DEFAULT false,
    "seuilNombreVendus" INTEGER NOT NULL DEFAULT 20,
    "anneeCreation" INTEGER,
    "immatriculationVisible" BOOLEAN NOT NULL DEFAULT false,
    "accueilTitre" TEXT,
    "accueilSousTitre" TEXT,
    "aProposTexte" TEXT,
    "aProposPhotoId" TEXT,
    "faq" JSONB NOT NULL DEFAULT '[]',
    "bandeau" TEXT,
    "reseaux" JSONB NOT NULL DEFAULT '{}',
    "seoTitre" TEXT,
    "seoDescription" TEXT,
    "imagePartageId" TEXT,
    "plausibleDomaine" TEXT,
    "googleAnalyticsId" TEXT,
    "mentionsLegales" TEXT,
    "confidentialite" TEXT,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReglagesSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvisClient" (
    "id" TEXT NOT NULL,
    "auteur" TEXT NOT NULL,
    "note" INTEGER NOT NULL,
    "texte" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "vehiculeAchete" TEXT,
    "source" "SourceAvis" NOT NULL DEFAULT 'DIRECT',
    "certifieAuthentique" BOOLEAN NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvisClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatistiqueSite" (
    "id" TEXT NOT NULL,
    "jour" DATE NOT NULL,
    "type" "TypeStatSite" NOT NULL,
    "cle" TEXT NOT NULL,
    "annonceId" TEXT,
    "compte" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StatistiqueSite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Annonce_vehiculeId_key" ON "Annonce"("vehiculeId");

-- CreateIndex
CREATE UNIQUE INDEX "Annonce_reference_key" ON "Annonce"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Annonce_slug_key" ON "Annonce"("slug");

-- CreateIndex
CREATE INDEX "Annonce_publiee_idx" ON "Annonce"("publiee");

-- CreateIndex
CREATE INDEX "StatistiqueSite_annonceId_jour_idx" ON "StatistiqueSite"("annonceId", "jour");

-- CreateIndex
CREATE UNIQUE INDEX "StatistiqueSite_jour_type_cle_key" ON "StatistiqueSite"("jour", "type", "cle");

-- AddForeignKey
ALTER TABLE "Annonce" ADD CONSTRAINT "Annonce_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatistiqueSite" ADD CONSTRAINT "StatistiqueSite_annonceId_fkey" FOREIGN KEY ("annonceId") REFERENCES "Annonce"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Garde-fous
ALTER TABLE "ReglagesSite" ADD CONSTRAINT "ReglagesSite_ligne_unique" CHECK ("id" = 1);
ALTER TABLE "AvisClient" ADD CONSTRAINT "AvisClient_note_1_a_5" CHECK ("note" BETWEEN 1 AND 5);
ALTER TABLE "AvisClient" ADD CONSTRAINT "AvisClient_authentique" CHECK ("certifieAuthentique" = true);
ALTER TABLE "Annonce" ADD CONSTRAINT "Annonce_prix_positif" CHECK ("prixAfficheCentimes" IS NULL OR "prixAfficheCentimes" >= 0);
ALTER TABLE "StatistiqueSite" ADD CONSTRAINT "StatistiqueSite_compte_positif" CHECK ("compte" >= 0);
