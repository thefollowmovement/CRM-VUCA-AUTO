import type { DefaultSession } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    role: Role;
    partenaireId: string | null;
  }
  interface Session {
    user: {
      id: string;
      role: Role;
      partenaireId: string | null;
    } & DefaultSession["user"];
  }
}
