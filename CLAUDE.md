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

## Véhicules (Phase 2)

- Lectures : `src/server/requetes/vehicules.ts` (`listerVehicules(filtres)` calcule coût de revient, marge, jours ; `obtenirVehicule`, `partenairesFinancement`). Actions : `src/server/actions/vehicules.ts`.
- Formulaire unique `components/vehicules/formulaire-vehicule.tsx` (création + modification) ; conversion véhicule → saisie dans `lib/vehicule-formulaire.ts` (fonctions appelées par les pages serveur : jamais dans un fichier `"use client"`).
- Référentiels et libellés : `lib/vehicule.ts` (statuts, couleurs, `STATUTS_MANUELS`, immatriculation, VIN). Échéances : `lib/calculs/echeances.ts`.
- Images : `lib/images.ts` (sharp) appelé par `enregistrerFichier` (sauf logo) ; `?taille=mini` sur `/api/fichiers/[id]` ; `detecterType` (octets magiques) avant toute acceptation.
- Tri par type de partenaire : l'enum Postgres suit l'ordre de déclaration (`SOCIETE` puis `INVESTISSEUR`) → `orderBy: { type: "asc" }` pour avoir VUCA AUTO en premier.
- Démo : `prisma/seed/demo.ts`, blocs `uneFois(db, "demo:…")`.

## Dépenses, rentabilité, vente (Phase 3)

- Calculs : `lib/calculs/repartition.ts` (`calculerInvestissements`, `repartirBenefice`, `diviserArrondi` BigInt) et `rentabilite.ts` (`calculerRentabilite`) — purs, utilisés côté serveur ET dans le simulateur / la page de vente (client).
- Bilan : `server/requetes/rentabilite.ts` → `bilanVehicule(id)` (avec noms), `bilansVehicules(where)` (3 requêtes pour N véhicules), `situationPartenaire`, `resumesPartenaires`. Revenus hors vente = paiements (REMBOURSEMENT négatif) + indemnités d'assurance.
- Dépenses : lectures `server/requetes/depenses.ts`, actions `server/actions/depenses.ts`, formulaire unique `components/depenses/formulaire-depense.tsx` (création : dépense puis envoi du justificatif), conversions `lib/depense-formulaire.ts` (`retourSur` n'accepte qu'un chemin interne).
- Composants finance : `components/finance/` (tableau-repartition sans état, carte-rentabilite, dialogue-repartition, simulateur-vente, formulaire-vente).
- Vente : `marquerVendu` / `annulerVente` dans `server/actions/vehicules.ts` ; page `/vehicules/[id]/vendre`.
- Tests navigateur : en-têtes de tableaux en majuscules CSS → comparer en minuscules ; attendre un texte après `router.refresh()`.

## Location (Phase 4)

- Dates/heures : `lib/dates.ts` (heure de Paris ↔ UTC, `saisieParisVersDate` pour les `datetime-local`, `ajouterMoisParis`…), pur et utilisable côté client.
- Prix : `lib/calculs/location.ts` (`calculerPrixLocation`, `decomposerDuree`, `kmInclusTotal`, `tauxOccupation`, `chevauche`). Contrat : `dureeFacturee` (unités du type) + `joursSupplementaires` + `tarifJournalierCentimes` figés.
- Clients : `server/requetes/clients.ts`, `server/actions/clients.ts`, `lib/calculs/clients.ts` (`alertesClient` : bloquant / attention), `lib/client-formulaire.ts`.
- Contrats : `server/requetes/contrats.ts` (liste, planning, vue Aujourd'hui, `conflits`, `occupationVehicule`), `server/actions/contrats.ts` (`preparer()` = contrôles + prix serveur ; numéro via `Compteur` `contrat:AAAA`), statuts dans `lib/contrat.ts` (`statutAffiche` calcule EN_RETARD), assistant `components/location/assistant-contrat.tsx`.
- Anti-chevauchement : contrainte `Contrat_sans_chevauchement` (EXCLUDE gist sur `tsrange(departPrevuLe, retourPrevuLe)`, statuts actifs, non archivés). `btree_gist` est une extension de confiance : le propriétaire de la base l'installe sans superutilisateur (rien à faire dans les scripts d'installation).
- Piège React : deux boutons à la même place dans un assistant (« Suivant » / « Créer ») → leur donner des `key` différentes, sinon le clic sur « Suivant » soumet le formulaire.

## États des lieux (Phase 5)

- Comparaison départ / retour + frais proposés : `lib/calculs/etat-des-lieux.ts` (`comparerEtatsDesLieux`, `montantRetenu`), testée.
- Schéma du véhicule : données `lib/schema-vehicule.ts` (vues, zones SVG, libellés ; vu de face, la gauche du véhicule est à droite de l'écran), composant `components/etat-des-lieux/schema-vehicule.tsx`.
- Brouillon : `brouillonEtatDesLieux()` (`server/requetes/etats-des-lieux.ts`) crée l'EDL non verrouillé à l'ouverture de l'assistant ; photos (`envoyerPhotoEdl`) et dommages (`ajouterDommage`) y sont rattachés tout de suite ; `validerEtatDesLieux(edlId, saisie, FormData signatures)` contrôle photos obligatoires + signatures puis verrouille et fait les transitions (contrat, véhicule, caution, frais).
- Photos obligatoires : `CATEGORIES_PHOTOS_OBLIGATOIRES` (compteur + 6 vues). Signatures = `Fichier` SIGNATURE (PNG non recompressé) rattaché à l'EDL.
- Pad de signature maison (`pad-signature.tsx`) : ne réinitialise le canevas que si sa largeur change (le défilement mobile déclenche `resize`) et conserve le dessin.
- Tests navigateur : centrer le canevas avant de signer (barre fixe du bas) ; les frais de retard dépendent de l'heure du test.

## Paiements, PV, sinistres, PDF (Phase 6)

- Échéancier : `lib/calculs/echeancier.ts` (`genererEcheancier`, `imputerPaiements` FIFO, `joursRetardEcheance`), testé. En base : `server/echeances.ts` (`synchroniserEcheances(tx, contratId)` à appeler après TOUTE modification de prix/dates d'un contrat, `recalculerImputation`, `totalEncaisse`, `prochainNumeroAnnuel(tx, "recu"|"facture", prefixe)` via `Compteur` `recu:AAAA` / `facture:AAAA`). Le seed crée l'échéancier des contrats qui n'en ont pas.
- Un fichier `"use server"` n'exporte QUE des Server Actions : les helpers qui prennent `tx` vont dans `src/server/*.ts`.
- Actions : `server/actions/paiements.ts` (encaisser, supprimer, prolonger), `amendes.ts` (`identifierConducteur` via `contratAuMoment`), `sinistres.ts` (franchise : frais DOMMAGES `note = "sinistre:<id>"`), `factures.ts`. Lectures : `server/requetes/paiements.ts` (`journalPaiements`, `impayes`), `amendes-sinistres.ts`.
- Factures : une seule active par contrat / vente (index uniques partiels) ; lignes de prix via `lib/calculs/lignes-contrat.ts` (pur).
- PDF : `server/pdf/` (`commun.tsx` styles + `t()` qui nettoie les espaces fines, `documents.tsx`, `generer.ts`), route `/api/pdf/[document]/[id]` (contrat, edl-depart, edl-retour, recu, facture, cloture ; `?telecharger=1`). `@react-pdf/renderer` est dans `serverExternalPackages` ; il ne se charge pas sous `tsx` → tester les PDF via le serveur Next.
- UI : `components/paiements/`, `components/documents/` (`BoutonPdf`, `Factures`), `components/incidents/`. `?encaisser=1` sur la fiche contrat ouvre l'encaissement.
- Tests navigateur : `waitForURL` d'une fiche créée → regex sur l'id (`c[a-z0-9]{20,}`), sinon `/nouvelle` correspond aussi.

## Dashboard, rapports, versements (Phase 7)

- Résultat par période : `lib/calculs/periode.ts` (`resultatPeriode` — chaque dépense dans un seul panier : vente pour ACHAT_REVENTE, charges datées pour LOCATION/MIXTE —, `bornesPeriode`, `derniersMois`), testé. Période depuis l'URL : `lib/periode-url.ts` (`periode`, `du`, `au`, `partenaire`).
- `server/requetes/analyse.ts` : `chargerAnalyse()` charge tous les véhicules une fois ; `analyserPeriode(vehicules, du, au, partenaireId?)` (lignes, totaux, dépenses par catégorie, bénéfice par partenaire via `repartirBenefice`), `bilanVente`, `occupationPeriode`. Dashboard : `tableau-de-bord.ts` ; alertes : `alertes.ts` (`vehiculesEnAlerte` sert aussi au filtre `?alerte=` de la liste des véhicules) ; rapports et relevés : `rapports.ts`.
- Graphiques : Recharts dans `components/analyse/graphiques.tsx` (`GraphiqueMensuel`, `Anneau` avec légende chiffrée, « Autres » au-delà de 5) ; couleurs `--serie-1…6` / `--serie-autre` dans `globals.css` (palette validée, ordre fixe). Filtre : `components/analyse/filtre-periode.tsx`.
- Exports : `/api/rapports/pdf|excel` (ExcelJS, `server/excel/rapport.ts`), `/api/pdf/releve/[partenaireId]?du&au`, `/api/export/paiements`. PDF d'analyse : `server/pdf/analyses.tsx` ; césure automatique désactivée (`Font.registerHyphenationCallback`), titres `minPresenceAhead`.
- Versements : `server/actions/versements.ts`, `lib/validations/finance.ts` (`schemaVersement`), `components/partenaires/versements.tsx` (+ `ReleveInvestisseur`). `resumesPartenaires()` inclut `verseCentimes` et déduit `versementsSansVehicule()` du reste dû.

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
- Phase 4 : `btree_gist` est créée par la migration elle-même (extension de confiance, le rôle `vuca_crm` propriétaire de la base suffit — vérifié avec un rôle non superutilisateur).
- Connecteur Hostinger (MCP) : lecture des VPS possible ; pas d'exécution de commandes ; Docker Manager indisponible sur le modèle HestiaCP.
- **Sur le KVM 2, c'est Caddy (service systemd, `/etc/caddy/Caddyfile`) qui tient les ports 80/443**, pas le nginx de Hestia (désactivé, ne démarre plus). Le CRM est servi via `/etc/caddy/vuca-crm.caddy` importé par le Caddyfile (`FRONT=caddy` dans le repère). Le site Hestia `thefollowmovement.cloud` (Apache 72.61.164.158:8080/8443) n'est pas servi par Caddy → hors ligne depuis le 17/10 ; toute réparation touche les projets de l'utilisateur → demander son accord.

### Notes pour l'environnement cloud de Claude
- PostgreSQL 16 local : `service postgresql start` ; utilisateur `vuca` / `vuca`, base `vuca_crm`.
- Prisma **refuse `migrate reset` lancé par un agent IA** sans consentement explicite de l'utilisateur : ne pas contourner. Pour tester sur une base vierge, créer une NOUVELLE base (`createdb`) + `prisma migrate deploy` + seed.
- `docker build` dans le bac à sable : les conteneurs ne passent pas par le proxy → pour tester, utiliser un Dockerfile de test hors dépôt (CA + proxy injectés, `--network host`). Le Dockerfile du dépôt reste standard.
- Tests navigateur : Playwright avec `executablePath: '/opt/pw-browsers/chromium'`.
