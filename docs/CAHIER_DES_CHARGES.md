# CAHIER DES CHARGES — CRM VUCA AUTO

> Copie de référence du prompt initial (fourni le 18/10/2026). C'est la source de vérité fonctionnelle.
> Les décisions prises ensuite sont consignées dans `PROGRESS.md` et `CLAUDE.md`.

---

## 0. RÔLE ET CONTEXTE

Tu es un développeur full-stack senior. Tu vas construire **VUCA AUTO CRM**, une application web de gestion pour une activité d'**achat-revente de véhicules** et de **location de voitures** (journalière et mensuelle).

Particularités métier :
- Un véhicule peut être financé **par la société VUCA AUTO seule**, **par un ou plusieurs investisseurs**, ou **par un mélange des deux**, chacun à hauteur d'un montant en euros.
- Chaque dépense sur un véhicule est payée par **une personne précise** (la société ou un investisseur), ce qui entre dans le calcul de la répartition du bénéfice.
- Certains véhicules sont achetés pour être **revendus**, d'autres pour être **mis en location**, d'autres font les deux (location puis revente).
- **Aucun calcul de TVA.** Tous les montants sont saisis tels quels (montant payé / encaissé). Calculs simples et lisibles.

L'utilisateur principal travaille sur Mac et **n'est pas à l'aise avec le terminal** : chaque fois que tu lui demandes d'exécuter une commande, explique-la pas à pas et donne la commande exacte à copier-coller.

---

## 1. RÈGLES DE TRAVAIL

1. **Travaille par phases** (section 10). À la fin de chaque phase : résumé de ce qui a été fait, comment le tester, et attends ma validation avant la phase suivante.
2. Crée et tiens à jour à la racine :
   - `CLAUDE.md` : contexte du projet, stack, conventions, règles de calcul (section 5) — c'est ta mémoire permanente.
   - `PROGRESS.md` : phases terminées, en cours, à faire, décisions prises, bugs connus.
3. Toute l'interface est **en français** (libellés, messages d'erreur, formats `1 234,56 €`, dates `JJ/MM/AAAA`, fuseau Europe/Paris).
4. **Les montants sont stockés en centimes (entiers)** en base pour éviter les erreurs d'arrondi. Affichage en euros.
5. Toutes les règles de calcul sont dans des **fonctions pures isolées** (`/lib/calculs/`) et **couvertes par des tests unitaires** (Vitest), avec les exemples chiffrés de la section 5.
6. **Mobile-first** : l'état des lieux de location se fera sur téléphone, sur le parking. Toutes les pages doivent être utilisables au doigt.
7. Pas de sur-ingénierie : code clair, commenté en français sur les parties métier.

---

## 2. STACK TECHNIQUE

- **Next.js 15** (App Router) + **TypeScript** strict
- **PostgreSQL** + **Prisma** (migrations versionnées, seed)
- **Tailwind CSS** + **shadcn/ui** (composants), **lucide-react** (icônes)
- **React Hook Form** + **Zod** (validation côté client ET serveur, schémas partagés)
- **Recharts** (graphiques du dashboard)
- **Auth.js (NextAuth v5)** — connexion email + mot de passe (bcrypt), sessions
- **@react-pdf/renderer** pour les PDF (contrat, état des lieux, reçus, relevés investisseurs)
- **react-signature-canvas** pour les signatures tactiles
- Stockage des fichiers (photos, justificatifs, scans permis) : dossier local `/storage` monté en volume Docker, derrière une couche d'abstraction (`/lib/storage.ts`) pour pouvoir passer plus tard sur S3 / R2 sans toucher au reste. Compression des photos côté client avant upload (max ~1600 px).
- **Docker + docker-compose** (app + Postgres) pour lancer tout en une commande, en local comme sur un serveur interne.
- **Vitest** pour les tests des calculs.
- PWA installable sur téléphone (manifest + icône).

---

## 3. MODÈLE DE DONNÉES (Prisma)

Adapte les noms si besoin, mais conserve toutes les informations.

### 3.1 Utilisateurs & audit
- **Utilisateur** : nom, email, mot de passe hashé, rôle (`ADMIN`, `GESTIONNAIRE`, `INVESTISSEUR_LECTURE`), actif, lien optionnel vers un `Partenaire` (pour le rôle investisseur).
- **JournalActivite** : utilisateur, action, entité, id entité, avant/après (JSON), date. Chaque création / modification / suppression de montant est tracée.

### 3.2 Partenaires (qui met l'argent)
- **Partenaire** : nom, type (`SOCIETE` | `INVESTISSEUR`), téléphone, email, IBAN (optionnel, affiché masqué), notes, actif.
- Au seed : créer le partenaire **« VUCA AUTO »** (type `SOCIETE`), non supprimable.

### 3.3 Véhicule
- Identité : marque, modèle, version/finition, immatriculation (unique, format FR `AA-123-AA` ou ancien format accepté), VIN, année, date de 1re mise en circulation, carburant (essence, diesel, hybride, électrique, GPL…), boîte (manuelle/auto), couleur, nombre de places, puissance fiscale, Crit'Air.
- Exploitation : `type` (`ACHAT_REVENTE` | `LOCATION` | `MIXTE`).
- Statut : `EN_PREPARATION`, `EN_VENTE`, `RESERVE`, `DISPONIBLE_LOCATION`, `EN_LOCATION`, `IMMOBILISE` (garage/sinistre), `VENDU`, `ARCHIVE`. Historique des changements de statut horodaté.
- Achat : date, prix d'achat, kilométrage à l'achat, provenance (`PARTICULIER`, `PROFESSIONNEL`, `ENCHERES`, `IMPORT`, `REPRISE`, `AUTRE`), nom du vendeur, lien de l'annonce, notes.
- Vente : prix affiché / cible, prix de vente réel, date de vente, kilométrage à la vente, acheteur (nom, téléphone, email), mode de paiement, notes.
- Location : tarif journalier par défaut, tarif hebdo, tarif mensuel, km inclus par jour / par mois, prix du km supplémentaire, montant de caution par défaut, date de mise en location.
- Valeur estimée actuelle (saisie manuelle, datée) — utilisée pour la rentabilité des véhicules non vendus.
- Échéances : date du prochain contrôle technique, échéance assurance (assureur, n° de police), prochaine vidange (date et/ou km), prochaine révision.
- Photos (galerie, une photo principale) et documents (carte grise, facture d'achat, CT, certificat de cession…).
- Paramètres de répartition (voir 5.3) : `modeRepartition`, `commissionGestionPct`.

### 3.4 Financement de l'achat
- **Participation** : véhicule, partenaire, montant (€), date, note.
- Le formulaire d'ajout de véhicule contient une section « **Qui finance l'achat ?** » : lignes dynamiques (partenaire + montant), bouton « Ajouter un investisseur », et un indicateur en direct : *Total financé / Prix d'achat / Reste à financer*. Bouton rapide « 100 % VUCA AUTO ».
- Validation : la somme des participations doit être égale au prix d'achat (avertissement bloquant, avec possibilité explicite de forcer et d'enregistrer un écart si l'utilisateur le confirme).
- Le pourcentage de chacun est affiché automatiquement.

### 3.5 Dépenses
- **Depense** : véhicule, date, catégorie, libellé, montant, **payé par** (partenaire — obligatoire, VUCA AUTO présélectionné), fournisseur/garage, justificatif (photo/PDF), kilométrage (optionnel), note.
- **Catégories** (table paramétrable, avec icône/couleur) : Carte grise, Réparation mécanique, Carrosserie, Pneus, Pièces, Contrôle technique, Entretien/vidange, Nettoyage/préparation esthétique, Transport/convoyage, Assurance, Parking/stockage, Publicité/annonces, Frais d'enchères, Carburant, Amende non refacturée, Autre.
- Saisie rapide depuis le téléphone (photo du ticket → montant → catégorie → payé par).

### 3.6 Location
- **Client** : civilité, nom, prénom, date et lieu de naissance, adresse, téléphone, email, n° de permis, date d'obtention, catégorie, date de validité, pièce d'identité (type, n°, validité), scans (permis recto/verso, pièce d'identité, justificatif de domicile), entreprise (optionnel), **liste noire** (booléen + motif), notes. Alerte si le permis a moins de N années (paramétrable) ou s'il est expiré.
- **Contrat de location** :
  - Numéro automatique `LOC-AAAA-0001`.
  - Véhicule, client, conducteurs additionnels (liste de clients).
  - Type : `JOURNALIERE`, `HEBDOMADAIRE`, `MENSUELLE`.
  - Dates/heures de départ et retour **prévues** et **réelles**, lieux de départ et de retour (livraison possible + frais).
  - Tarif appliqué (prérempli depuis le véhicule, modifiable), remise éventuelle.
  - Kilométrage inclus (ou illimité), prix du km supplémentaire.
  - Caution : montant, mode (empreinte CB, chèque, espèces, virement), statut (`A_ENCAISSER`, `ENCAISSEE`, `RESTITUEE`, `RETENUE_PARTIELLE`, `RETENUE_TOTALE`) + montant retenu + motif.
  - Franchise en cas de sinistre (montant).
  - Options (table paramétrable) : conducteur additionnel, siège bébé, GPS, livraison, kilométrage illimité… avec prix par jour ou forfait.
  - Statut : `RESERVATION`, `CONFIRMEE`, `EN_COURS`, `EN_RETARD` (automatique si date de retour dépassée), `TERMINEE`, `ANNULEE`.
  - **Contrôle de disponibilité** : impossible de créer deux contrats qui se chevauchent sur le même véhicule, ni de louer un véhicule `IMMOBILISE` ou `VENDU`.
- **État des lieux** (un au départ, un au retour, lié au contrat) :
  - Date/heure, kilométrage (photo du compteur obligatoire), niveau de carburant (jauge 0 à 8/8) ou % de batterie.
  - Propreté intérieure et extérieure (propre / correct / sale).
  - Check-list : nombre de clés, carte grise, attestation d'assurance, roue de secours / kit anti-crevaison, cric, triangle, gilet, câble de recharge, tapis, autres équipements (liste paramétrable).
  - **Schéma du véhicule cliquable** (vues dessus, avant, arrière, côtés en SVG) : l'utilisateur touche une zone, choisit le type de dommage (rayure, bosse, impact, éclat, jante abîmée, vitre, intérieur), la gravité, et ajoute une photo. Les dommages déjà connus du véhicule sont reportés automatiquement au départ suivant.
  - Photos obligatoires guidées : avant, arrière, côté gauche, côté droit, intérieur avant, intérieur arrière, compteur, + photos libres.
  - Remarques, **signature du client et du loueur** sur l'écran.
  - Génération d'un **PDF** de l'état des lieux, envoyable par email ou partageable.
  - **Comparaison automatique départ / retour** : km parcourus, km supplémentaires facturables, carburant manquant, nouveaux dommages (mis en évidence), retard en heures/jours. L'application **propose** les frais correspondants que l'utilisateur valide ou modifie.
- **Frais supplémentaires** (lignes sur le contrat) : km supplémentaires, carburant, nettoyage, dommages, retard, frais de livraison, amende refacturée, frais de dossier, autre.
- **Échéancier et paiements** :
  - Location mensuelle : génération automatique des échéances (une par mois, date d'échéance paramétrable), prolongation possible du contrat.
  - Location courte : paiement total ou acompte + solde.
  - **Paiement** : contrat, échéance (optionnelle), date, montant, mode, référence, note. Paiements partiels acceptés.
  - Statuts d'échéance : `A_VENIR`, `PAYEE`, `PARTIELLE`, `EN_RETARD`. Liste des impayés avec nombre de jours de retard.
- **Amendes / PV** : véhicule, date et heure de l'infraction, lieu, montant, n° d'avis, statut (`RECUE`, `CONDUCTEUR_DESIGNE`, `PAYEE`, `REFACTUREE`). L'application **identifie automatiquement le contrat et le client** qui avaient le véhicule à cette date/heure.
- **Sinistres** : véhicule, contrat éventuel, date, description, photos, coût, franchise refacturée, statut, déclaration assurance.
- **Documents PDF** : contrat de location (avec conditions générales paramétrables dans les réglages), état des lieux départ/retour, reçu de paiement, facture simple **sans TVA** (mention paramétrable dans les réglages), relevé de clôture de location.

### 3.7 Mouvements investisseurs
- **Versement** : partenaire, véhicule (optionnel), date, montant, type (`REMBOURSEMENT_CAPITAL`, `VERSEMENT_BENEFICE`, `APPORT_SUPPLEMENTAIRE`), mode, note. Permet de suivre **ce qui a déjà été reversé** et **ce qui reste dû** à chaque investisseur.

### 3.8 Réglages
- Infos société VUCA AUTO (nom, adresse, SIRET, téléphone, email, logo) utilisées dans les PDF.
- Conditions générales de location, mentions des documents, numérotation, catégories de dépenses, options de location, éléments de check-list, seuils d'alertes (jours en stock, jours avant échéance CT/assurance, ancienneté minimale du permis).

---

## 4. ÉCRANS

### 4.1 Navigation
Barre latérale (desktop) / barre du bas (mobile) : **Dashboard · Véhicules · Location · Clients · Dépenses · Investisseurs · Rapports · Réglages**.
Recherche globale (immatriculation, VIN, client, n° de contrat) toujours accessible.
Bouton flottant « + » : ajouter véhicule / dépense / location / paiement.

### 4.2 Véhicules
- Liste en **tableau ET en cartes** (photo, marque modèle, immat, statut coloré, prix d'achat, coût de revient, prix cible, marge prévisionnelle, jours en stock). Filtres : statut, type, financeur, marque, période d'achat. Tri sur toutes les colonnes. Export CSV/Excel.
- **Fiche véhicule** avec onglets :
  1. **Résumé** : photos, infos, statut, et carte « Rentabilité » (coût de revient, revenus, bénéfice, marge %, ROI %, jours en stock).
  2. **Financement** : participations, pourcentages, et tableau de **répartition du bénéfice** par partenaire (investi, part %, bénéfice, total à reverser, déjà versé, reste dû).
  3. **Dépenses** : liste, totaux par catégorie et par payeur, ajout rapide.
  4. **Location** (si type LOCATION/MIXTE) : contrats, calendrier du véhicule, taux d'occupation, revenus.
  5. **Dommages** : dommages connus actuels sur le schéma, historique.
  6. **Entretien & échéances** : CT, assurance, vidanges, révisions, alertes.
  7. **Documents**.
  8. **Historique** : changements de statut et journal d'activité.
- Action **« Marquer comme vendu »** : formulaire de vente → calcul final → répartition → statut VENDU.
- **Simulateur de prix de vente** sur la fiche : « si je vends à X €, bénéfice = …, part de chacun = … ».

### 4.3 Location
- **Planning** (vue Gantt) : une ligne par véhicule louable, contrats en barres colorées par statut, navigation semaine/mois, clic sur un créneau vide = nouvelle réservation.
- Liste des contrats avec filtres (statut, véhicule, client, période).
- **Assistant de création de contrat** en étapes : client (recherche ou création rapide, avec scan du permis) → véhicule et dates (seuls les véhicules disponibles sont proposés) → tarif, options, caution → récapitulatif du prix → génération du contrat.
- **Assistant de départ** (mobile) : état des lieux guidé écran par écran → signatures → PDF → statut EN_COURS.
- **Assistant de retour** (mobile) : état des lieux de retour → comparaison → frais proposés → caution (restituer / retenir) → solde → statut TERMINEE.
- Vue « **Aujourd'hui** » : départs et retours du jour et du lendemain, contrats en retard, échéances impayées.

### 4.4 Clients
Liste, fiche client (infos, documents, historique des locations, total payé, impayés, PV, liste noire).

### 4.5 Dépenses
Liste globale de toutes les dépenses (tous véhicules), filtres par véhicule, catégorie, payeur, période. Totaux. Export.

### 4.6 Investisseurs
- Liste des partenaires avec : capital actuellement engagé, nombre de véhicules en cours, bénéfices réalisés, total déjà versé, **reste dû**.
- Fiche partenaire : véhicules financés (en cours / clôturés), détail par véhicule, versements, et bouton **« Générer le relevé PDF »** sur une période.
- Rôle `INVESTISSEUR_LECTURE` : l'investisseur connecté ne voit **que** ses véhicules et ses chiffres, en lecture seule.

### 4.7 Rapports
Bilan par période (mois, trimestre, année, personnalisée) : véhicules achetés / vendus, CA ventes, revenus location, dépenses par catégorie, bénéfice net, bénéfice par partenaire. Export PDF et Excel.

---

## 5. RÈGLES DE CALCUL (CRITIQUES — À TESTER)

### 5.1 Achat-revente
```
Coût de revient   = Prix d'achat + Σ Dépenses
Revenus           = Prix de vente + Σ Revenus de location encaissés (si véhicule MIXTE)
Bénéfice net      = Revenus − Coût de revient
Marge %           = Bénéfice net / Prix de vente × 100
ROI %             = Bénéfice net / Coût de revient × 100
Jours en stock    = Date de vente (ou aujourd'hui) − Date d'achat
```
Pour un véhicule non vendu, afficher un **bénéfice prévisionnel** basé sur le prix cible (ou la valeur estimée), clairement marqué « prévisionnel ».

### 5.2 Investissement de chaque partenaire
```
Investissement d'un partenaire = Σ ses participations à l'achat + Σ dépenses qu'il a payées
Part %                         = Son investissement / Investissement total
```

### 5.3 Répartition du bénéfice (paramétrable par véhicule)
- **Mode par défaut `PRORATA_INVESTISSEMENT`** : le bénéfice (ou la perte) est réparti selon la part % ci-dessus.
- **Mode `POURCENTAGE_FIXE`** : l'utilisateur saisit manuellement les % de partage du bénéfice (total = 100 %), indépendamment des montants investis (ex. 50/50 alors qu'un seul a financé). Le remboursement du capital reste toujours égal à ce que chacun a investi.
- **Commission de gestion VUCA AUTO (optionnelle)** : un % du bénéfice positif est d'abord attribué à VUCA AUTO (rémunération du travail : recherche, préparation, vente), puis le reste est réparti selon le mode choisi. Aucune commission si bénéfice ≤ 0.
- Pour chaque partenaire : `À reverser = Son investissement + Sa part du bénéfice` (sa part peut être négative en cas de perte).
- Arrondis : calcul en centimes, l'écart d'arrondi éventuel est affecté à VUCA AUTO pour que la somme tombe juste.

**Exemple de référence (test obligatoire)**
Peugeot 208 achetée **8 000 €** : VUCA AUTO 3 000 €, Investisseur A 5 000 €.
Dépenses : carte grise 300 € (payée par VUCA AUTO), réparation 700 € (payée par A). Vendue **11 500 €**.
- Coût de revient = 9 000 € → Bénéfice = 2 500 €
- Investissements : VUCA 3 300 € (36,67 %) · A 5 700 € (63,33 %)
- Bénéfices : VUCA 916,67 € · A 1 583,33 €
- À reverser : VUCA 4 216,67 € · A 7 283,33 € → total 11 500 € ✔

**Même exemple avec commission de gestion 20 %** : commission VUCA = 500 €, reste 2 000 € réparti → VUCA 733,33 € + 500 € = 1 233,33 € · A 1 266,67 €.

**Cas de perte** : vendue 8 100 € → perte 900 € → VUCA −330,00 € · A −570,00 €.

Écris aussi les tests pour : 100 % VUCA AUTO, 3 investisseurs, mode pourcentage fixe, dépenses sans achat cofinancé, arrondis à trois tiers.

### 5.4 Location et rentabilité d'un véhicule de location
```
Revenus location      = Σ paiements encaissés (loyers + frais supplémentaires + cautions retenues)
Charges               = Σ dépenses du véhicule
Résultat d'exploitation = Revenus location − Charges
Valeur résiduelle     = Prix de vente si vendu, sinon valeur estimée actuelle
Bénéfice global       = Résultat d'exploitation + Valeur résiduelle − Prix d'achat
ROI global %          = Bénéfice global / (Prix d'achat + Charges) × 100
Taux d'occupation %   = Jours loués / Jours disponibles depuis la mise en location × 100
                        (jours IMMOBILISE exclus des jours disponibles)
Revenu moyen / jour loué, revenu moyen / mois, coût par km parcouru
Point mort            = date (réelle ou projetée sur la moyenne des 3 derniers mois)
                        à laquelle Revenus location cumulés ≥ Prix d'achat + Charges
```
Les cautions encaissées puis restituées ne sont **pas** des revenus. La répartition entre partenaires d'un véhicule de location utilise les mêmes règles qu'en 5.3, appliquées au résultat sur la période, avec un **relevé mensuel** par partenaire.

### 5.5 Prix d'une location
```
Durée facturée = jours (location courte, toute journée de 24 h entamée est due, tolérance paramétrable, ex. 1 h)
                 ou mois (location mensuelle)
Prix = Tarif × Durée − Remise + Σ options + frais de livraison
Km supplémentaires = max(0, km parcourus − km inclus × durée) × prix du km sup
```

---

## 6. DASHBOARD

Filtre de période global (ce mois, mois dernier, trimestre, année, personnalisée) et filtre par partenaire.

**Indicateurs (cartes)** : bénéfice net de la période · CA ventes · revenus location · dépenses totales · véhicules vendus · véhicules en stock · **capital immobilisé** (coût de revient du stock) · marge moyenne par véhicule vendu · durée moyenne de revente (jours) · taux d'occupation de la flotte · véhicules actuellement loués / disponibles · impayés location (montant et nombre).

**Graphiques** : évolution mensuelle du bénéfice (ventes vs location, 12 mois) · dépenses par catégorie (donut) · top 5 véhicules les plus rentables et 5 les moins rentables · taux d'occupation par véhicule · répartition du capital investi par partenaire.

**Alertes (à traiter)** : véhicules en stock depuis plus de X jours · contrats en retard · retours prévus aujourd'hui / demain · échéances impayées · CT ou assurance qui expirent sous 30 jours · vidange/révision proche · permis client expiré · participations qui ne correspondent pas au prix d'achat · PV non traités.

Chaque carte et chaque alerte est cliquable vers la liste filtrée correspondante.

---

## 7. QUALITÉ, SÉCURITÉ, DONNÉES

- Validation Zod partout (montants ≥ 0, dates cohérentes, immatriculation unique, km retour ≥ km départ…).
- Confirmation avant toute suppression ; **suppression douce** (archivage) pour véhicules, clients, contrats.
- Contrôle des rôles côté serveur sur chaque action (pas seulement en masquant les boutons).
- Les fichiers ne sont servis qu'aux utilisateurs connectés et autorisés.
- **Sauvegarde automatique quotidienne** de la base et du dossier `/storage` (script + cron dans docker-compose), avec conservation de 30 jours et procédure de restauration documentée.
- Données personnelles clients : bouton d'export et de suppression/anonymisation d'un client (RGPD).
- États vides soignés, chargements, messages de succès/erreur (toasts), mode sombre.

---

## 8. DONNÉES DE DÉMO (seed)

Crée un seed réaliste : VUCA AUTO + 3 investisseurs, 12 véhicules (vendus, en stock, en location, mixtes, un en perte), dépenses variées payées par différents partenaires, 6 clients, 10 contrats (journaliers et mensuels, un en retard, un avec dommages au retour), paiements et échéances dont un impayé, 2 PV. Un compte admin : `admin@vucaauto.fr` / mot de passe affiché une seule fois dans le terminal. Commande pour vider et recharger la démo.

---

## 9. LIVRABLES

- Code source complet, `README.md` en français avec : installation pas à pas pour un débutant sur Mac (installer Docker Desktop, lancer, accéder à l'app), commandes utiles, sauvegarde/restauration, déploiement sur un serveur.
- `.env.example` commenté.
- Tests des calculs qui passent (`npm test`).
- Lancement complet en une commande : `docker compose up -d`.

---

## 10. PHASES

| Phase | Contenu |
|---|---|
| **0** | Proposer l'arborescence et le schéma Prisma complet → **attendre ma validation** |
| **1** | Socle : projet, Docker, base, auth, rôles, layout, navigation, réglages, partenaires, seed |
| **2** | Véhicules : CRUD, photos, documents, financement (participations), statuts |
| **3** | Dépenses + **moteur de calcul** (section 5) + tests + onglets rentabilité/répartition + vente |
| **4** | Location : clients, contrats, disponibilités, planning, tarification |
| **5** | État des lieux mobile (schéma dommages, photos, signatures), comparaison retour, frais, caution |
| **6** | Paiements, échéancier, impayés, PV, sinistres, PDF (contrat, EDL, reçus, factures) |
| **7** | Dashboard, alertes, rapports, exports, relevés investisseurs, versements |
| **8** | Portail investisseur lecture seule, PWA, sauvegardes, finitions, README |
