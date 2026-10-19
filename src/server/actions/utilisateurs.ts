"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { journaliser } from "@/lib/journal";
import { genererMotDePasseTemporaire, hacherMotDePasse } from "@/lib/mot-de-passe";
import { avecDroits, ErreurMetier, ROLES_ADMIN, type UtilisateurCourant } from "@/lib/permissions";
import { erreurValidation } from "@/lib/validations/erreurs";
import {
  schemaChangementMotDePasse,
  schemaUtilisateur,
  type SaisieChangementMotDePasse,
  type SaisieUtilisateur,
} from "@/lib/validations/utilisateur";
import type { Role } from "@/generated/prisma/enums";

const TOUS_LES_ROLES: Role[] = ["ADMIN", "GESTIONNAIRE", "INVESTISSEUR_LECTURE"];

/** Vérifie que le partenaire choisi pour un compte investisseur est valide. */
async function verifierPartenaire(role: Role, partenaireId: string | null, utilisateurId?: string) {
  if (role !== "INVESTISSEUR_LECTURE") return null;
  const partenaire = await db.partenaire.findUnique({
    where: { id: partenaireId ?? "" },
    include: { utilisateur: { select: { id: true } } },
  });
  if (!partenaire || partenaire.type !== "INVESTISSEUR") throw new ErreurMetier("Investisseur introuvable.");
  if (partenaire.utilisateur && partenaire.utilisateur.id !== utilisateurId) {
    throw new ErreurMetier("Cet investisseur a déjà un compte.");
  }
  return partenaire.id;
}

export async function creerUtilisateur(saisie: SaisieUtilisateur) {
  return avecDroits<{ motDePasse: string }>(ROLES_ADMIN, async (u) => {
    const lecture = schemaUtilisateur.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const { partenaireId, ...donnees } = lecture.data;

    const motDePasse = genererMotDePasseTemporaire();
    const cree = await db.utilisateur.create({
      data: {
        ...donnees,
        partenaireId: await verifierPartenaire(donnees.role, partenaireId),
        motDePasseHash: await hacherMotDePasse(motDePasse),
        doitChangerMotDePasse: true,
      },
    });
    await journaliser({ utilisateurId: u.id, action: "CREATION", entite: "Utilisateur", entiteId: cree.id, apres: cree });
    revalidatePath("/reglages/utilisateurs");
    return { ok: true, message: "Compte créé.", donnees: { motDePasse } };
  });
}

/** Empêche de se bloquer soi-même ou de supprimer le dernier administrateur. */
async function verifierAdmins(courant: UtilisateurCourant, cibleId: string, role: Role, actif: boolean) {
  if (cibleId === courant.id && (role !== "ADMIN" || !actif)) {
    throw new ErreurMetier("Vous ne pouvez pas retirer vos propres droits d'administrateur.");
  }
  if (role !== "ADMIN" || !actif) {
    const autresAdmins = await db.utilisateur.count({
      where: { role: "ADMIN", actif: true, id: { not: cibleId } },
    });
    if (autresAdmins === 0) throw new ErreurMetier("Il doit rester au moins un administrateur actif.");
  }
}

export async function modifierUtilisateur(id: string, saisie: SaisieUtilisateur) {
  return avecDroits(ROLES_ADMIN, async (u) => {
    const lecture = schemaUtilisateur.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);
    const { partenaireId, ...donnees } = lecture.data;
    if (!TOUS_LES_ROLES.includes(donnees.role)) throw new ErreurMetier("Rôle invalide.");

    await verifierAdmins(u, id, donnees.role, donnees.actif);
    const avant = await db.utilisateur.findUnique({ where: { id } });
    if (!avant) throw new ErreurMetier("Utilisateur introuvable.");

    const apres = await db.utilisateur.update({
      where: { id },
      data: { ...donnees, partenaireId: await verifierPartenaire(donnees.role, partenaireId, id) },
    });
    await journaliser({ utilisateurId: u.id, action: "MODIFICATION", entite: "Utilisateur", entiteId: id, avant, apres });
    revalidatePath("/reglages/utilisateurs");
    return { ok: true, message: "Compte modifié." };
  });
}

export async function reinitialiserMotDePasse(id: string) {
  return avecDroits<{ motDePasse: string }>(ROLES_ADMIN, async (u) => {
    const motDePasse = genererMotDePasseTemporaire();
    await db.utilisateur.update({
      where: { id },
      data: { motDePasseHash: await hacherMotDePasse(motDePasse), doitChangerMotDePasse: true },
    });
    await journaliser({ utilisateurId: u.id, action: "MOT_DE_PASSE", entite: "Utilisateur", entiteId: id });
    return { ok: true, message: "Nouveau mot de passe temporaire généré.", donnees: { motDePasse } };
  });
}

/** Changement de son propre mot de passe (tous les rôles). */
export async function changerMonMotDePasse(saisie: SaisieChangementMotDePasse) {
  return avecDroits(TOUS_LES_ROLES, async (u) => {
    const lecture = schemaChangementMotDePasse.safeParse(saisie);
    if (!lecture.success) return erreurValidation(lecture.error);

    const compte = await db.utilisateur.findUniqueOrThrow({ where: { id: u.id } });
    const valide = await bcrypt.compare(lecture.data.actuel, compte.motDePasseHash);
    if (!valide) {
      return { ok: false, message: "Mot de passe actuel incorrect.", erreursChamps: { actuel: ["Mot de passe incorrect."] } };
    }
    await db.utilisateur.update({
      where: { id: u.id },
      data: { motDePasseHash: await hacherMotDePasse(lecture.data.nouveau), doitChangerMotDePasse: false },
    });
    await journaliser({ utilisateurId: u.id, action: "MOT_DE_PASSE", entite: "Utilisateur", entiteId: u.id });
    revalidatePath("/", "layout");
    return { ok: true, message: "Mot de passe modifié." };
  });
}
