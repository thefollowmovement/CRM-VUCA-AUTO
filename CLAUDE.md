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

## Commandes utiles

_(à compléter en Phase 1)_
