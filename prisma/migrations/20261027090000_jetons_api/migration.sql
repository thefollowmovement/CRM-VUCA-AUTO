-- Module Amendes (A3) : jetons d'accès de l'extension Chrome « Désignation ANTAI » (empreinte SHA-256 seulement).
-- CreateTable
CREATE TABLE "JetonApi" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "empreinte" TEXT NOT NULL,
    "apercu" TEXT NOT NULL,
    "creeParId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dernierUsageLe" TIMESTAMP(3),
    "revoqueLe" TIMESTAMP(3),

    CONSTRAINT "JetonApi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JetonApi_empreinte_key" ON "JetonApi"("empreinte");

-- AddForeignKey
ALTER TABLE "JetonApi" ADD CONSTRAINT "JetonApi_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
