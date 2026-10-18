// Client Prisma unique pour toute l'application (Prisma 7 + adaptateur pg).
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalPourPrisma = globalThis as unknown as { prisma?: PrismaClient };

function creerClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// En développement, Next.js recharge les modules : on réutilise le même client
// pour ne pas ouvrir une nouvelle connexion à chaque modification.
export const db = globalPourPrisma.prisma ?? creerClient();
if (process.env.NODE_ENV !== "production") globalPourPrisma.prisma = db;
