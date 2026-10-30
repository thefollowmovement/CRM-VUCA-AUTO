-- Phase 6 : paiements, échéances, factures, PV, sinistres.

-- Une seule facture active (non annulée) par contrat et par vente de véhicule.
-- Pour corriger une facture : on l'annule puis on en émet une nouvelle.
CREATE UNIQUE INDEX "Facture_une_active_par_contrat" ON "Facture" ("contratId") WHERE "annuleeLe" IS NULL AND "contratId" IS NOT NULL;
CREATE UNIQUE INDEX "Facture_une_active_par_vente" ON "Facture" ("vehiculeId") WHERE "annuleeLe" IS NULL AND "type" = 'VENTE_VEHICULE';

-- Montants positifs
ALTER TABLE "Echeance" ADD CONSTRAINT "Echeance_montant_positif" CHECK ("montantCentimes" >= 0);
ALTER TABLE "Amende" ADD CONSTRAINT "Amende_montant_positif" CHECK ("montantCentimes" >= 0);
ALTER TABLE "Sinistre" ADD CONSTRAINT "Sinistre_montants_positifs"
  CHECK (("coutEstimeCentimes" IS NULL OR "coutEstimeCentimes" >= 0)
     AND ("franchiseRefactureeCentimes" IS NULL OR "franchiseRefactureeCentimes" >= 0)
     AND ("indemniteAssuranceCentimes" IS NULL OR "indemniteAssuranceCentimes" >= 0));
