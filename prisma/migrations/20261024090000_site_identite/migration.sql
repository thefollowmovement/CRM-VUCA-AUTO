-- Nouvelle identité du site (S7) : jaune par défaut.
ALTER TABLE "ReglagesSite" ALTER COLUMN "couleurAccent" SET DEFAULT '#FFD60A';
-- L'ancien bleu par défaut, jamais modifié, devient le jaune de la nouvelle identité.
UPDATE "ReglagesSite" SET "couleurAccent" = '#FFD60A' WHERE upper("couleurAccent") = '#0071E3';
