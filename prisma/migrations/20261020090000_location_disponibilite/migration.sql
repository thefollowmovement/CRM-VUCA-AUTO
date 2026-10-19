-- Phase 4 : tarification figée des contrats et anti-chevauchement.

-- Jours facturés en plus des unités (hebdomadaire / mensuel) et tarif journalier figé.
ALTER TABLE "ContratLocation" ADD COLUMN "joursSupplementaires" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ContratLocation" ADD COLUMN "tarifJournalierCentimes" INTEGER;

-- Montants positifs, retour après le départ.
ALTER TABLE "ContratLocation" ADD CONSTRAINT "Contrat_montants_positifs"
  CHECK ("tarifCentimes" >= 0 AND "prixTotalCentimes" >= 0 AND "remiseCentimes" >= 0
         AND "fraisLivraisonCentimes" >= 0 AND "cautionCentimes" >= 0);
ALTER TABLE "ContratLocation" ADD CONSTRAINT "Contrat_retour_apres_depart"
  CHECK ("retourPrevuLe" > "departPrevuLe");

-- Deux contrats actifs ne peuvent pas se chevaucher sur le même véhicule.
-- btree_gist est une extension « de confiance » (PostgreSQL ≥ 13) : le
-- propriétaire de la base peut l'activer sans être superutilisateur.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "ContratLocation" ADD CONSTRAINT "Contrat_sans_chevauchement"
  EXCLUDE USING gist (
    "vehiculeId" WITH =,
    tsrange("departPrevuLe", "retourPrevuLe", '[)') WITH &&
  ) WHERE ("statut" IN ('RESERVATION', 'CONFIRMEE', 'EN_COURS') AND "archiveLe" IS NULL);
