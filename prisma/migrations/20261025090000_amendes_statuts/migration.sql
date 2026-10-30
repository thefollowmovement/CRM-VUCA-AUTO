-- Module Amendes (import des avis, lecture automatique, désignation ANTAI) — 1/2
-- Les nouvelles valeurs d'énumération doivent exister (validées) avant d'être utilisées :
-- elles sont donc ajoutées dans une migration séparée.

-- CreateEnum
CREATE TYPE "TypeAvis" AS ENUM ('CONTRAVENTION', 'AMENDE_FORFAITAIRE_DELICTUELLE', 'AMENDE_MAJOREE', 'AUTRE');

-- AlterEnum
ALTER TYPE "StatutAmende" ADD VALUE 'A_LIRE';
ALTER TYPE "StatutAmende" ADD VALUE 'A_VALIDER';
ALTER TYPE "StatutAmende" ADD VALUE 'A_DESIGNER';
ALTER TYPE "StatutAmende" ADD VALUE 'CONTESTE';
ALTER TYPE "StatutAmende" ADD VALUE 'IGNORE';
