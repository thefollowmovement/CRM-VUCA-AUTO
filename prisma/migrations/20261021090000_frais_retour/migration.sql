-- Phase 5 : frais proposés au retour d'une location (réglages).
ALTER TABLE "Reglages" ADD COLUMN "fraisNettoyageCentimes" INTEGER NOT NULL DEFAULT 5000;
ALTER TABLE "Reglages" ADD COLUMN "prixHuitiemeCarburantCentimes" INTEGER NOT NULL DEFAULT 1500;
ALTER TABLE "Reglages" ADD COLUMN "prixPourcentBatterieCentimes" INTEGER NOT NULL DEFAULT 50;

-- Un seul état des lieux de chaque type par contrat (déjà unique), niveaux bornés.
ALTER TABLE "EtatDesLieux" ADD CONSTRAINT "Edl_niveaux_valides"
  CHECK (("niveauCarburantHuitiemes" IS NULL OR "niveauCarburantHuitiemes" BETWEEN 0 AND 8)
     AND ("niveauBatteriePct" IS NULL OR "niveauBatteriePct" BETWEEN 0 AND 100)
     AND "kilometrage" >= 0);
ALTER TABLE "FraisSupplementaire" ADD CONSTRAINT "Frais_montant_positif" CHECK ("montantCentimes" >= 0);
