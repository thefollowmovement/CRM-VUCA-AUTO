// Configuration Prisma 7 : emplacement du schéma, des migrations, du seed
// et URL de connexion à la base (lue dans .env).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed/index.ts",
  },
  datasource: {
    // Valeur de secours pour que `prisma generate` fonctionne sans base (ex. build Docker).
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/placeholder",
  },
});
