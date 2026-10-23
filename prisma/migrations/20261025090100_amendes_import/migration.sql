-- Module Amendes (import des avis, lecture automatique, désignation ANTAI) — 2/2

-- DropForeignKey
ALTER TABLE "Amende" DROP CONSTRAINT "Amende_vehiculeId_fkey";

-- AlterTable
ALTER TABLE "Amende" ADD COLUMN     "champsVerifies" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "creeParId" TEXT,
ADD COLUMN     "dateAvis" DATE,
ADD COLUMN     "dateDesignation" TIMESTAMP(3),
ADD COLUMN     "doublonDeId" TEXT,
ADD COLUMN     "fichierPage" INTEGER,
ADD COLUMN     "fraisGestionCentimes" INTEGER,
ADD COLUMN     "heureInconnue" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "immatriculationLue" TEXT,
ADD COLUMN     "lotImportId" TEXT,
ADD COLUMN     "luLe" TIMESTAMP(3),
ADD COLUMN     "nature" TEXT,
ADD COLUMN     "ocrBrut" JSONB,
ADD COLUMN     "ocrConfiance" JSONB,
ADD COLUMN     "ocrEnCoursLe" TIMESTAMP(3),
ADD COLUMN     "ocrModele" TEXT,
ADD COLUMN     "ocrTentatives" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ocrTokensEntree" INTEGER,
ADD COLUMN     "ocrTokensSortie" INTEGER,
ADD COLUMN     "raisonsVerification" JSONB,
ADD COLUMN     "typeAvis" "TypeAvis",
ALTER COLUMN "vehiculeId" DROP NOT NULL,
ALTER COLUMN "infractionLe" DROP NOT NULL,
ALTER COLUMN "montantCentimes" DROP NOT NULL,
ALTER COLUMN "statut" SET DEFAULT 'A_VALIDER';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "adresseComplement" TEXT,
ADD COLUMN     "dateDelivrancePermis" DATE,
ADD COLUMN     "paysDelivrancePermis" TEXT DEFAULT 'France',
ADD COLUMN     "paysNaissance" TEXT;

-- AlterTable
ALTER TABLE "Reglages" ADD COLUMN     "amendesAdresse" TEXT,
ADD COLUMN     "amendesAdresseComplement" TEXT,
ADD COLUMN     "amendesCodePostal" TEXT,
ADD COLUMN     "amendesEmail" TEXT,
ADD COLUMN     "amendesFraisGestionCentimes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "amendesModele" TEXT NOT NULL DEFAULT 'claude-haiku-5-5',
ADD COLUMN     "amendesRaisonSociale" TEXT,
ADD COLUMN     "amendesVille" TEXT;

-- CreateTable
CREATE TABLE "LotImportAmendes" (
    "id" TEXT NOT NULL,
    "nbFichiers" INTEGER NOT NULL DEFAULT 0,
    "nbPages" INTEGER NOT NULL DEFAULT 0,
    "creeParId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotImportAmendes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Amende_dateLimite_idx" ON "Amende"("dateLimite");

-- CreateIndex
CREATE INDEX "Amende_clientId_idx" ON "Amende"("clientId");

-- CreateIndex
CREATE INDEX "Amende_contratId_idx" ON "Amende"("contratId");

-- CreateIndex
CREATE INDEX "Amende_numeroAvis_idx" ON "Amende"("numeroAvis");

-- CreateIndex
CREATE INDEX "Amende_lotImportId_idx" ON "Amende"("lotImportId");

-- AddForeignKey
ALTER TABLE "Amende" ADD CONSTRAINT "Amende_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amende" ADD CONSTRAINT "Amende_lotImportId_fkey" FOREIGN KEY ("lotImportId") REFERENCES "LotImportAmendes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amende" ADD CONSTRAINT "Amende_doublonDeId_fkey" FOREIGN KEY ("doublonDeId") REFERENCES "Amende"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amende" ADD CONSTRAINT "Amende_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotImportAmendes" ADD CONSTRAINT "LotImportAmendes_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Reprise : les PV saisis à la main avant le module (statut « reçue ») entrent dans le circuit
-- « à valider » ; le rapprochement avec les locations est recalculé par l'application au démarrage.
UPDATE "Amende" SET "statut" = 'A_VALIDER' WHERE "statut" = 'RECUE';
-- Date limite de désignation : 45 jours après la date de l'avis (ici inconnue : on garde l'existante).
