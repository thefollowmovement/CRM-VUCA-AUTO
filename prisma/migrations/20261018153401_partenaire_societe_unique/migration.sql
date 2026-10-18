-- Un seul partenaire de type SOCIETE (VUCA AUTO) peut exister.
CREATE UNIQUE INDEX "Partenaire_une_seule_societe" ON "Partenaire" ("type") WHERE "type" = 'SOCIETE';

-- Les montants ne peuvent pas être négatifs.
ALTER TABLE "Vehicule" ADD CONSTRAINT "Vehicule_prixAchat_positif" CHECK ("prixAchatCentimes" >= 0);
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_montant_positif" CHECK ("montantCentimes" >= 0);
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_montant_positif" CHECK ("montantCentimes" >= 0);
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_montant_positif" CHECK ("montantCentimes" >= 0);
ALTER TABLE "Versement" ADD CONSTRAINT "Versement_montant_positif" CHECK ("montantCentimes" >= 0);

-- Réglages : une seule ligne (id = 1).
ALTER TABLE "Reglages" ADD CONSTRAINT "Reglages_ligne_unique" CHECK ("id" = 1);
