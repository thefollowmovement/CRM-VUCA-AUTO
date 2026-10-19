# Phase 0 — Proposition : arborescence, schéma de données, questions

> Statut : **en attente de validation**. Le schéma complet est dans `prisma/schema.prisma` (validé par l'outil Prisma 7.10.1 : 30 tables, 30 listes de valeurs).

---

## 1. Versions retenues

| Outil | Version | Remarque |
|---|---|---|
| Next.js | 15.5 (App Router) | comme demandé |
| TypeScript | 5.x, mode strict | |
| Prisma | 7.10 (dernière stable) | la 8 est encore en pré-version |
| PostgreSQL | 17 (image Docker officielle) | |
| Auth.js | v5 | sessions JWT (seul mode possible avec email + mot de passe) |
| Tailwind / shadcn/ui | Tailwind 4 + shadcn/ui | |
| Vitest | dernière stable | tests des calculs |

---

## 2. Arborescence du projet

```
CRM-VUCA-AUTO/
├── CLAUDE.md                     # mémoire permanente du projet (règles, conventions)
├── PROGRESS.md                   # avancement, décisions, bugs connus
├── README.md                     # installation pas à pas (Mac débutant), commandes, sauvegardes
├── .env.example                  # variables d'environnement commentées
├── docker-compose.yml            # app + Postgres + sauvegarde quotidienne
├── Dockerfile
├── prisma.config.ts              # config Prisma 7 (URL de la base)
├── vitest.config.ts
├── docs/
│   ├── CAHIER_DES_CHARGES.md     # le prompt initial (source de vérité fonctionnelle)
│   ├── PHASE0_PROPOSITION.md     # ce document
│   └── SAUVEGARDE_RESTAURATION.md
├── prisma/
│   ├── schema.prisma             # schéma de la base
│   ├── migrations/               # migrations versionnées (+ SQL brut : anti-chevauchement…)
│   └── seed/
│       ├── index.ts              # point d'entrée : réglages, VUCA AUTO, catégories, admin
│       └── demo.ts               # données de démo (12 véhicules, 6 clients, 10 contrats…)
├── scripts/
│   ├── sauvegarde.sh             # dump Postgres + archive /storage, rotation 30 jours
│   ├── restauration.sh
│   └── reinitialiser-demo.sh     # vider et recharger la démo
├── storage/                      # fichiers envoyés (ignoré par git, volume Docker)
├── public/
│   ├── manifest.webmanifest      # PWA
│   └── icones/
└── src/
    ├── app/
    │   ├── (public)/connexion/page.tsx
    │   ├── (app)/                          # zone connectée ADMIN / GESTIONNAIRE
    │   │   ├── layout.tsx                  # barre latérale / barre du bas, recherche, bouton « + »
    │   │   ├── dashboard/
    │   │   ├── vehicules/
    │   │   │   ├── page.tsx                # liste tableau + cartes, filtres, export
    │   │   │   ├── nouveau/
    │   │   │   └── [id]/
    │   │   │       ├── layout.tsx          # en-tête + onglets
    │   │   │       ├── page.tsx            # Résumé + rentabilité + simulateur
    │   │   │       ├── financement/  depenses/  location/  dommages/
    │   │   │       ├── entretien/  documents/  historique/
    │   │   │       └── vendre/             # « Marquer comme vendu »
    │   │   ├── location/
    │   │   │   ├── page.tsx                # vue « Aujourd'hui »
    │   │   │   ├── planning/               # Gantt
    │   │   │   ├── contrats/  contrats/nouveau/  contrats/[id]/
    │   │   │   ├── contrats/[id]/depart/   # assistant mobile
    │   │   │   ├── contrats/[id]/retour/   # assistant mobile
    │   │   │   ├── amendes/
    │   │   │   └── sinistres/
    │   │   ├── clients/  clients/[id]/
    │   │   ├── depenses/  depenses/nouvelle/   # saisie rapide mobile
    │   │   ├── investisseurs/  investisseurs/[id]/
    │   │   ├── rapports/
    │   │   └── reglages/                   # société, documents, catégories, options,
    │   │                                   # check-list, alertes, utilisateurs
    │   ├── (portail)/portail/              # INVESTISSEUR_LECTURE : ses véhicules, ses chiffres
    │   └── api/
    │       ├── auth/[...nextauth]/route.ts
    │       ├── fichiers/[id]/route.ts      # sert les fichiers APRÈS contrôle des droits
    │       ├── pdf/[type]/[id]/route.ts    # contrat, EDL, reçu, facture, relevé
    │       └── export/[type]/route.ts      # CSV / Excel
    ├── components/
    │   ├── ui/                             # shadcn/ui
    │   ├── layout/                         # navigation, recherche globale, bouton « + »
    │   ├── formulaires/                    # champs montant €, date FR, immatriculation…
    │   ├── vehicules/  location/  depenses/  investisseurs/
    │   ├── edl/                            # SchemaVehicule (SVG), JaugeCarburant,
    │   │                                   # PhotoGuidee, Signature, Checklist
    │   └── graphiques/                     # Recharts
    ├── lib/
    │   ├── calculs/                        # ★ FONCTIONS PURES + TESTS (section 5)
    │   │   ├── argent.ts                   # centimes, arrondis, répartition sans perte
    │   │   ├── rentabilite.ts              # 5.1 achat-revente
    │   │   ├── repartition.ts              # 5.2 + 5.3 investissements et partage
    │   │   ├── location-prix.ts            # 5.5 durée facturée, prix, km sup
    │   │   ├── location-rentabilite.ts     # 5.4 occupation, point mort…
    │   │   ├── comparaison-edl.ts          # départ / retour → frais proposés
    │   │   ├── echeancier.ts               # échéances mensuelles, statuts, retards
    │   │   ├── disponibilite.ts            # chevauchements de contrats
    │   │   └── __tests__/
    │   ├── validations/                    # schémas Zod partagés client / serveur
    │   ├── pdf/                            # modèles @react-pdf/renderer
    │   ├── auth.ts  permissions.ts         # rôles, vérifiés côté serveur
    │   ├── db.ts  storage.ts  journal.ts
    │   ├── format.ts                       # 1 234,56 € · JJ/MM/AAAA · Europe/Paris
    │   └── numerotation.ts                 # LOC-2026-0001, FAC-…, REC-…
    ├── server/
    │   ├── actions/                        # Server Actions par domaine (écriture)
    │   └── requetes/                       # lectures (filtrées par rôle)
    └── generated/prisma/                   # client Prisma généré (ignoré par git)
```

---

## 3. Le schéma de données en un coup d'œil

Fichier complet et commenté : **`prisma/schema.prisma`**.

| Domaine | Tables |
|---|---|
| Utilisateurs & audit | `Utilisateur`, `JournalActivite` |
| Partenaires | `Partenaire` (VUCA AUTO = `estSysteme`, non supprimable) |
| Véhicule | `Vehicule`, `HistoriqueStatutVehicule`, `EstimationValeur` |
| Financement | `Participation`, `PartBeneficeFixe` (mode pourcentage fixe) |
| Dépenses | `CategorieDepense`, `Depense` |
| Clients | `Client`, `ConducteurAdditionnel` |
| Contrats | `ContratLocation`, `OptionLocation` (catalogue), `OptionContrat` |
| État des lieux | `EtatDesLieux`, `ElementChecklist` (catalogue), `LigneChecklistEdl`, `Dommage` |
| Argent location | `FraisSupplementaire`, `Echeance`, `Paiement` |
| Incidents | `Amende`, `Sinistre` |
| Facturation | `Facture`, `LigneFacture` |
| Investisseurs | `Versement` |
| Fichiers | `Fichier` (photos, justificatifs, scans, signatures, PDF archivés) |
| Réglages | `Reglages` (ligne unique), `Compteur` (numérotation) |

---

## 4. Décisions techniques proposées

1. **Montants en centimes** (`prixAchatCentimes = 800000` → 8 000,00 €) et **pourcentages en points de base** (`2000` = 20 %). Tout reste en nombres entiers : aucun arrondi caché.
2. **`EN_RETARD` est calculé, pas enregistré** (contrat en cours dont la date de retour est passée ; échéance dépassée non payée). Pas de tâche planifiée qui pourrait tomber en panne : l'info est toujours juste.
3. **Une seule table `Fichier`** pour toutes les pièces jointes, chacune rattachée à un seul « propriétaire » (véhicule, dépense, client, EDL…). Fichiers servis uniquement après contrôle des droits.
4. **Un dommage appartient au véhicule**, pas à la location : il reste visible d'une location à l'autre jusqu'à sa réparation. C'est ce qui permet de reporter automatiquement les dommages connus au départ suivant et de repérer les nouveaux au retour.
5. **Copies figées** : un contrat garde le tarif, les options et les conditions générales du jour de la signature ; une facture garde le nom et l'adresse du client. Modifier un tarif ou les CGV plus tard ne change pas les anciens documents.
6. **Au départ, une seule signature du client** vaut acceptation du contrat ET de l'état des lieux de départ (évite de faire signer deux fois sur le parking).
7. **Double protection contre les chevauchements** de location : contrôle dans l'application + contrainte dans la base PostgreSQL (impossible à contourner, même par erreur).
8. **Numérotation continue** (`LOC-2026-0001`, `FAC-…`, `REC-…`) gérée par une table de compteurs. **Une facture émise n'est jamais modifiée** : on l'annule et on en émet une nouvelle.
9. **Location courte : acompte + solde = 2 échéances.** Les impayés se gèrent alors de la même façon en courte et en longue durée.
10. **Un paiement est rattaché à une seule échéance** (un virement qui couvre 2 mois est découpé automatiquement en 2 paiements).
11. **Caution retenue → un paiement « caution retenue »** est créé automatiquement : il compte comme revenu. Une caution encaissée puis rendue n'est jamais un revenu.
12. **Immatriculation facultative** (véhicule importé pas encore immatriculé), mais unique quand elle est renseignée.
13. **Toutes les dépenses sont rattachées à un véhicule** (voir question 1).

---

## 5. Questions

Pour chaque question, ma recommandation est en **gras**. Tu peux répondre simplement « OK pour tout » ou « 1 OK, 2 B, … ».

1. **Frais généraux hors véhicule** (local, logiciel, comptable, assurance flotte) : faut-il pouvoir les saisir ?
   **Recommandation : pas en version 1** — toutes les dépenses sont rattachées à un véhicule. On pourra ajouter une rubrique « Frais généraux » plus tard (comptée dans le bénéfice global, pas dans la répartition par véhicule).

2. **Charges courantes des véhicules en location** (assurance, entretien) : si VUCA AUTO les paie avec l'argent des loyers, la règle 5.2 augmente la part de VUCA AUTO chaque mois, ce qui peut paraître injuste pour les investisseurs.
   **Recommandation : sur la fiche d'une dépense, case « Payée avec les recettes du véhicule »** : la dépense réduit le résultat mais ne compte comme investissement pour personne. Sans la case, la règle 5.2 s'applique normalement.

3. **Indemnité d'assurance** après un sinistre : la compter comme revenu du véhicule ?
   **Recommandation : oui** (elle compense une dépense de réparation).

4. **Commission de gestion VUCA AUTO sur la location** : appliquer le même % que pour la revente au résultat de location ?
   **Recommandation : oui**, même réglage par véhicule.

5. **Location hebdomadaire de 10 jours** : comment facturer ?
   **Recommandation : 1 semaine + 3 jours au tarif journalier, sans dépasser le prix de 2 semaines.**

6. **Location mensuelle** : un mois va de date à date (15/10 → 14/11). Pour un mois entamé à la fin du contrat ?
   **Recommandation : dernier mois au prorata des jours** (tarif mensuel ÷ 30 × nombre de jours). Alternative : mois entamé = mois dû.

7. **Envoi des PDF** (contrat, état des lieux, reçu) :
   **Recommandation : en version 1, bouton « Partager » du téléphone** (mail, WhatsApp, SMS) + téléchargement. L'envoi automatique par email depuis l'application pourra être ajouté si tu as une adresse d'envoi (Gmail, OVH, Brevo…).

8. **Où tournera l'application ?** C'est important pour l'état des lieux sur le parking :
   - A. Sur ton Mac uniquement → le téléphone doit être sur le même Wi-Fi.
   - **B. Sur un petit serveur en ligne (≈ 5 à 10 €/mois)** → accessible partout depuis le téléphone, en HTTPS. **Recommandé.**
   On développe et teste d'abord sur ton Mac dans tous les cas.

9. **Ancienneté minimale du permis** pour louer (alerte, pas blocage) :
   **Recommandation : 2 ans par défaut**, modifiable dans les réglages.

10. **Facture de vente d'un véhicule** pour l'acheteur :
    **Recommandation : oui**, même modèle simple que la facture de location. Le certificat de cession officiel (Cerfa) n'est pas généré : on stocke simplement son scan.

> ⚠️ La **mention « sans TVA »** sur les factures dépend de ton statut (ex. micro-entreprise, régime de la marge pour les véhicules d'occasion). Elle sera modifiable dans les réglages ; fais valider le texte par ton comptable.
