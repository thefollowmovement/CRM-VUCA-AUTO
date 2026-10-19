# CLAUDE.md — Mémoire permanente du projet VUCA AUTO CRM

> À lire au début de chaque session. Spécification complète : `docs/CAHIER_DES_CHARGES.md`.
> Avancement et décisions : `PROGRESS.md`.

## Contexte

Application web de gestion pour **VUCA AUTO** : achat-revente de véhicules + location (journalière, hebdomadaire, mensuelle).
- Un véhicule est financé par VUCA AUTO et/ou un ou plusieurs investisseurs (montants en €).
- Chaque dépense est payée par un partenaire précis → entre dans la répartition du bénéfice.
- **Aucune TVA.** Tous les montants sont « payés / encaissés ».

**Utilisateur** : sur Mac, pas à l'aise avec le terminal. Toujours donner les commandes exactes à copier-coller, expliquées pas à pas.

## Règles de travail

1. Travailler **par phases** (voir `docs/CAHIER_DES_CHARGES.md` §10). Fin de phase = résumé + comment tester + **attendre la validation**.
2. Tenir à jour `CLAUDE.md` et `PROGRESS.md`.
3. Interface **100 % en français** : `1 234,56 €`, `JJ/MM/AAAA`, fuseau `Europe/Paris`.
4. **Mobile-first** (EDL sur téléphone, au doigt).
5. Pas de sur-ingénierie. Code métier commenté en français.

## Stack

Next.js 15.5 (App Router) · TypeScript strict · PostgreSQL 17 · Prisma 7 (`prisma.config.ts`, client généré dans `src/generated/prisma`) · Tailwind 4 + shadcn/ui · lucide-react · React Hook Form + Zod (schémas partagés client/serveur) · Recharts · Auth.js v5 (credentials + bcrypt, sessions JWT) · @react-pdf/renderer · react-signature-canvas · Vitest · Docker Compose · PWA.

## Conventions

- **Montants : entiers en centimes**, champs suffixés `Centimes`. Jamais de `float` pour l'argent.
- **Pourcentages : entiers en points de base**, suffixe `Bp` (100 = 1 %, 10000 = 100 %).
- Dates calendaires en `@db.Date` ; dates/heures en UTC, affichées en Europe/Paris.
- **Suppression douce** : `archiveLe` (véhicules, clients, contrats). Confirmation avant toute suppression.
- Noms de modèles/champs **en français** (`Vehicule`, `prixAchatCentimes`, `creeLe`, `modifieLe`).
- Chaque écriture de montant → entrée dans `JournalActivite` (via `lib/journal.ts`).
- **Rôles vérifiés côté serveur** dans chaque Server Action / route (`lib/permissions.ts`), jamais seulement en masquant un bouton.
- Fichiers : uniquement via `lib/storage.ts` (abstraction /storage → S3/R2 plus tard) et servis par `/api/fichiers/[id]` après contrôle des droits.
- Statuts **calculés, non stockés** : contrat `EN_RETARD` (EN_COURS + retour prévu dépassé), échéance `EN_RETARD` (date dépassée, non payée).
- Copies figées sur les contrats (tarif, options, CGV) et factures (destinataire). Facture émise = jamais modifiée (annulation + nouvelle).
- Un `Dommage` appartient au véhicule (persiste jusqu'à `repareLe`).

## Règles de calcul (section 5 — fonctions pures dans `src/lib/calculs/`, testées avec Vitest)

### 5.1 Achat-revente
```
Coût de revient = Prix d'achat + Σ Dépenses
Revenus         = Prix de vente + Σ revenus de location encaissés (si MIXTE)
Bénéfice net    = Revenus − Coût de revient
Marge %         = Bénéfice net / Prix de vente × 100
ROI %           = Bénéfice net / Coût de revient × 100
Jours en stock  = Date de vente (ou aujourd'hui) − Date d'achat
```
Non vendu → bénéfice **prévisionnel** (prix cible, sinon valeur estimée), marqué « prévisionnel ».

### 5.2 Investissement
```
Investissement partenaire = Σ participations à l'achat + Σ dépenses qu'il a payées
Part %                    = Son investissement / Investissement total
```

### 5.3 Répartition du bénéfice
- `PRORATA_INVESTISSEMENT` (défaut) : bénéfice (ou perte) réparti selon la part %.
- `POURCENTAGE_FIXE` : % saisis à la main (total 100 %) ; le capital remboursé reste l'investissement de chacun.
- Commission de gestion VUCA AUTO (optionnelle) : prélevée d'abord sur le bénéfice **positif** uniquement, puis le reste est réparti.
- `À reverser = Investissement + Part du bénéfice` (part négative possible).
- Calcul en centimes ; **l'écart d'arrondi va à VUCA AUTO** pour que la somme tombe juste.

**Exemples de référence (tests obligatoires)** — Peugeot 208 achetée 8 000 € (VUCA 3 000 €, A 5 000 €), carte grise 300 € (VUCA), réparation 700 € (A), vendue 11 500 € :
- Coût de revient 9 000 € → bénéfice 2 500 €
- Investissements : VUCA 3 300 € (36,67 %) · A 5 700 € (63,33 %)
- Bénéfices : VUCA 916,67 € · A 1 583,33 € → À reverser : VUCA 4 216,67 € · A 7 283,33 € (total 11 500 €)
- Avec commission 20 % : commission 500 €, reste 2 000 € → VUCA 733,33 + 500 = 1 233,33 € · A 1 266,67 €
- Perte (vendue 8 100 €) : −900 € → VUCA −330,00 € · A −570,00 €
- Tests aussi : 100 % VUCA, 3 investisseurs, pourcentage fixe, dépenses sans achat cofinancé, arrondis à trois tiers.

### 5.4 Location
```
Revenus location        = Σ paiements encaissés (loyers + frais + cautions retenues − remboursements)
Charges                 = Σ dépenses du véhicule
Résultat d'exploitation = Revenus location − Charges
Valeur résiduelle       = Prix de vente si vendu, sinon valeur estimée actuelle
Bénéfice global         = Résultat d'exploitation + Valeur résiduelle − Prix d'achat
ROI global %            = Bénéfice global / (Prix d'achat + Charges) × 100
Taux d'occupation %     = Jours loués / Jours disponibles depuis mise en location × 100 (jours IMMOBILISE exclus)
Point mort              = date où revenus cumulés ≥ Prix d'achat + Charges (réelle ou projetée sur moyenne 3 derniers mois)
```
Cautions encaissées puis restituées ≠ revenus. Répartition partenaires = règles 5.3 appliquées au résultat de la période (relevé mensuel).

### 5.5 Prix d'une location
```
Durée facturée = jours (toute journée de 24 h entamée est due, tolérance paramétrable ex. 60 min) ou mois
Prix           = Tarif × Durée − Remise + Σ options + frais de livraison
Km sup         = max(0, km parcourus − km inclus × durée) × prix du km sup
```

## Architecture (mise en place en Phase 1)

- `src/auth.config.ts` (compatible edge, utilisé par `src/middleware.ts`) + `src/auth.ts` (Credentials + bcrypt). Investisseur cantonné à `/portail`, `/compte`, `/api/fichiers`.
- `src/lib/permissions.ts` : `utilisateurCourant()` relit l'utilisateur en base (compte désactivé = accès coupé immédiatement), `exigerRolePage()` pour les pages, `avecDroits(roles, fn)` pour CHAQUE Server Action (renvoie `ResultatAction`, jamais d'exception brute). `ErreurMetier` = message affichable.
- Groupes de routes : `(public)` connexion · `(app)` ADMIN+GESTIONNAIRE (redirige vers `/compte` si `doitChangerMotDePasse`) · `(compte)` tous rôles · `(portail)` investisseur (+ admin pour vérifier).
- Formulaires : `useFormulaire(schema, valeurs)` (RHF + Zod). On envoie au serveur les valeurs **saisies** (`getValues()`), le serveur revalide avec le même schéma. `traiterResultat()` affiche le toast et les erreurs par champ. Toujours `noValidate` sur les `<form>` RHF (messages Zod en français, pas les bulles du navigateur).
- Briques Zod : `src/lib/validations/communs.ts` (`montant()` → centimes, `texteOptionnel()` → null, `dateCalendaire()`…).
- Composants UI style shadcn écrits à la main dans `src/components/ui/` (le registre shadcn n'est pas accessible depuis l'environnement cloud). `SelectNatif` (liste native, idéale au doigt), `Confirmation` (AlertDialog), `Dialog` = panneau du bas sur mobile.
- Navigation : `src/components/layout/navigation.ts`. Le bouton « + » (`bouton-ajout.tsx`) a un drapeau `disponible` à passer à `true` quand la page existe. La recherche globale (`server/actions/recherche.ts`) est à compléter à chaque phase (véhicules, clients, contrats).
- Réglages : réservés à l'ADMIN. Ligne unique `Reglages` (id = 1), lue via `lireReglages()`.
- Partenaires : création/modification/archivage = ADMIN + GESTIONNAIRE ; suppression = ADMIN, seulement sans historique financier. VUCA AUTO (`estSysteme`) ni archivable ni supprimable.
- Mobile : vérifier l'absence de débordement horizontal (grilles : `grid-cols-[minmax(0,1fr)]`, `min-w-0`).

### Précisions validées en Phase 0 (prioritaires sur le cahier des charges)
- Dépense avec `payeSurRecettes = true` : comptée dans les charges / le coût, mais **pas** dans l'investissement de son payeur (5.2).
- `Sinistre.indemniteAssuranceCentimes` encaissée = revenu du véhicule.
- Commission de gestion VUCA AUTO : s'applique aussi au résultat de location positif.
- Hebdomadaire : semaines entières × tarif hebdo + jours restants × tarif journalier, plafonné au prix d'une semaine de plus (10 j = 1 sem + 3 j, ≤ 2 sem).
- Mensuelle : mois date à date ; dernier mois entamé au prorata = tarif mensuel ÷ 30 × jours.
- Pas de frais généraux hors véhicule en v1 (toute dépense a un `vehiculeId`).

## Commandes utiles

```bash
npm test                      # tests Vitest (src/**/*.test.ts)
npm run typecheck             # TypeScript strict
npm run build                 # build de production
npx prisma migrate dev --name <nom>   # nouvelle migration
npm run db:seed -- --demo     # seed (idempotent) + démo
docker compose up -d          # lancement complet (app + Postgres)
```

### Déploiement VPS
- `scripts/installer-vps.sh` (root, Ubuntu/Debian) : projet Compose `vuca-crm` dans `/opt/vuca-crm`, état dans `/opt/vuca-crm/.installation` (MODE caddy|traefik|nginx, DOMAINE, APP_PORT, BRANCHE). L'appli n'écoute que sur `127.0.0.1:APP_PORT` (`APP_ADRESSE`).
- Règle d'or : ne jamais modifier un fichier existant du serveur de l'utilisateur (d'autres projets y tournent) ; s'arrêter si la configuration n'est pas reconnue.
- Traefik : Docker 29 exige Traefik ≥ 3.6 (API Docker minimale 1.44).
- Claude n'a pas d'accès SSH sortant depuis l'environnement cloud : l'utilisateur lance le script via le terminal web Hostinger et renvoie la sortie.
- **Serveur réel : KVM 2 Hostinger (id 1075545, 72.61.164.158) sous HestiaCP** → `scripts/installer-hestia.sh` : pas de Docker ; Node privé `/opt/vuca-crm/node`, code `/opt/vuca-crm/app`, `.env` `/opt/vuca-crm/.env` (root:vuca-crm 640), fichiers `/var/lib/vuca-crm/storage`, service systemd `vuca-crm`, base PostgreSQL locale `vuca_crm`, domaine Hestia (utilisateur `admin`) avec modèle nginx `vuca-crm` (.tpl/.stpl) et SSL Let's Encrypt de Hestia. Repère `/opt/vuca-crm/.installation` (ETAT=en_cours|terminee). Journal d'installation `/var/log/vuca-crm-installation.log`.
- Phase 4 (contrainte anti-chevauchement) : l'extension `btree_gist` doit être créée par le superutilisateur PostgreSQL sur ce serveur (le rôle `vuca_crm` n'est pas superutilisateur) → prévoir l'étape dans `installer-hestia.sh`.
- Connecteur Hostinger (MCP) : lecture des VPS possible ; pas d'exécution de commandes ; Docker Manager indisponible sur le modèle HestiaCP.

### Notes pour l'environnement cloud de Claude
- PostgreSQL 16 local : `service postgresql start` ; utilisateur `vuca` / `vuca`, base `vuca_crm`.
- Prisma **refuse `migrate reset` lancé par un agent IA** sans consentement explicite de l'utilisateur : ne pas contourner. Pour tester sur une base vierge, créer une NOUVELLE base (`createdb`) + `prisma migrate deploy` + seed.
- `docker build` dans le bac à sable : les conteneurs ne passent pas par le proxy → pour tester, utiliser un Dockerfile de test hors dépôt (CA + proxy injectés, `--network host`). Le Dockerfile du dépôt reste standard.
- Tests navigateur : Playwright avec `executablePath: '/opt/pw-browsers/chromium'`.
