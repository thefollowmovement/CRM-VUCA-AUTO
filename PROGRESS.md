# PROGRESS — VUCA AUTO CRM

## Phases

| Phase | Contenu | Statut |
|---|---|---|
| 0 | Arborescence + schéma Prisma complet | ✅ Validée le 18/10/2026 |
| 1 | Socle : projet, Docker, base, auth, rôles, layout, navigation, réglages, partenaires, seed | ✅ Validée le 19/10/2026 (déployée sur le KVM 2) |
| 2 | Véhicules : CRUD, photos, documents, financement, statuts | ✅ Validée le 19/10/2026 |
| 3 | Dépenses + moteur de calcul + tests + rentabilité/répartition + vente | ✅ Validée le 19/10/2026 |
| 4 | Location : clients, contrats, disponibilités, planning, tarification | ✅ Validée le 19/10/2026 |
| 5 | État des lieux mobile, comparaison retour, frais, caution | ✅ Validée le 19/10/2026 |
| 6 | Paiements, échéancier, impayés, PV, sinistres, PDF | ✅ Validée le 20/10/2026 |
| 7 | Dashboard, alertes, rapports, exports, relevés investisseurs, versements | ✅ Validée le 20/10/2026 |
| 8 | Portail investisseur, PWA, sauvegardes, finitions, README | ✅ Validée le 20/10/2026 |

## Site web public (projet 2)

Objectif : site public des véhicules à vendre, contact WhatsApp, piloté depuis le CRM (onglet « Site web »). Proposition détaillée : [`docs/SITE_PHASE0.md`](docs/SITE_PHASE0.md).

| Phase | Contenu | Statut |
|---|---|---|
| S0 | Routage site / CRM, champs Prisma, arborescence | ✅ Validée (routage par domaine + choix : vendeur unique, immatriculation masquée, site en maintenance par défaut) |
| S1 | CRM : onglet « Annonce », onglet « Site web », `toPublicVehicle()` + tests | ✅ Validée le 20/10/2026 |
| S2 | Système de design + page `/site-preview` | ✅ Validée le 20/10/2026 |
| S3 | Pages publiques : accueil, liste + filtres, fiche, galerie | ✅ Validée le 21/10/2026 |
| S4 | WhatsApp, compteurs, statistiques | ✅ Validée le 21/10/2026 |
| S5 | SEO, images de partage, pages légales, performance, accessibilité, e2e | ✅ Validée le 21/10/2026 |
| S6 | Déploiement, domaine, README, GUIDE_SITE.md | ✅ Validée le 21/10/2026 (domaine branché : vuca-auto.fr 200, www 301, CRM 200) |
| S7 | Refonte visuelle « Showroom + Route » (direction A + C), identité, animations | ✅ Validée le 21/10/2026 |
| S8 | Voiture 3D stylisée sur l'accueil (ordinateur) | 🟡 Livrée le 21/10/2026, en attente de validation |

**Routage par domaine (20/10/2026)** — `vuca-auto.fr` = site public seul (groupe `app/(site)`, accueil provisoire « Notre site arrive bientôt »), `crm.vuca-auto.fr` + alias sslip.io = CRM. Sur le site : aucune page du CRM (404), aucune API hors `/api/site` (404 JSON), jamais l'écran de connexion, aucun cookie ; `www` redirigé. Sur le CRM : pages du site redirigées vers vuca-auto.fr, `/site-preview` (aperçu, connexion exigée). `robots.txt`, `sitemap.xml`, manifeste selon le domaine. `AUTH_URL` retirée (une connexion par domaine). Tests : 16 tests unitaires du routage + parcours HTTP/Chromium (≈ 60 vérifications : chaque domaine, connexion sur crm et sur l'alias, cookie limité à son domaine) ; non-régression CRM. Déploiement : `scripts/configurer-domaines.sh`.

## Phase S8 — livré (voiture 3D)

- **Votre modèle 3D** (fourni le 21/10/2026) remplace la voiture dessinée sur ordinateur, à l'accueil et sur la page « bientôt en ligne » : carrosserie argent vernie, reflets de studio, étriers jaunes, roues qui tournent. Elle arrive en roulant, se balance légèrement et suit la souris.
- Fichier préparé : 20 Mo → 2,3 Mo (compression sans perte visible), blasons, lettrages, plaques d'immatriculation et marquage des pneus retirés.
- **Licence CC BY-SA 4.0** (auteur Karol Miklas) : usage commercial autorisé à condition de créditer l'auteur → petit crédit « Modèle 3D : Karol Miklas, adapté · CC BY-SA 4.0 » en bas de la scène quand la 3D est affichée ; le fichier modifié reste sous la même licence (`src/components/site/modeles/LICENCE-voiture.txt`).
- **Ordinateur uniquement** (grand écran + souris, animations acceptées, pas d'« économie de données »), chargée après la page, en fondu ; sur téléphone ou si la 3D est impossible, la voiture dessinée reste. Pause automatique hors écran / onglet caché.
- Performance mobile inchangée (Lighthouse accueil 93–95 ; 100 en accessibilité, bonnes pratiques, SEO ; aucun fichier 3D téléchargé sur téléphone). Accessibilité sur ordinateur avec la 3D affichée : aucune erreur. Tests : 190 tests unitaires, S3 et S5 verts.

## Phase S7 — livré (refonte visuelle)

- **Identité VUCA AUTO** (pas de logo existant) : icône jaune avec un « V » en forme de route et traits de vitesse, nom en lettres condensées (« AUTO » en jaune), couleurs nuit / jaune / blanc, vert réservé à WhatsApp ; utilisée automatiquement tant qu'aucun logo n'est envoyé (aussi pour l'icône d'onglet et les images de partage). Maquettes validées : direction A (showroom sombre) + C (route, jaune, énergique).
- **Tout le site public refait** : accueil (titre géant « Petits prix. Grandes occasions. » modifiable, voiture animée qui roule, pastille « Dès … € » calculée sur les annonces, bandeau jaune défilant avec uniquement des faits, boutons de budget « Moins de X € », cartes à étiquette de prix jaune, étapes, grand bloc « Une question ? Un message. »), liste, fiche, contact, à propos, pages légales, 404, page « bientôt en ligne » animée, images de partage.
- **Animations** légères en CSS (aucun script ajouté), coupées automatiquement pour les visiteurs qui réduisent les animations.
- Couleur d'accent toujours réglable (Site web → Général), jaune par défaut ; l'ancien bleu jamais modifié passe au jaune (migration).
- Performance : animations réécrites pour la carte graphique (route, roues, onde : aucun « repeint » continu), police des titres réduite à 24 Ko (graisse 900, largeurs 70–86 %). Lighthouse mobile : accueil 91–95, liste 91, fiche 91, contact 98 ; 100 en accessibilité, bonnes pratiques et SEO.
- Tests : 190 tests unitaires (dont règles de l'accueil) ; accessibilité WCAG 2.1 AA sans erreur (axe, 8 pages, ordinateur et téléphone) ; parcours S1 à S6 (S2 et S3 adaptés au nouveau style : titres en majuscules, fond nuit, étiquette de prix), domaines, phases 7–8 et test du dépôt verts.

**Projet 2 terminé (S0–S6).** Le site est en maintenance (« Notre site arrive bientôt ») jusqu'à son ouverture par l'utilisateur : marche à suivre dans [`GUIDE_SITE.md`](GUIDE_SITE.md), partie 1 (sauvegarde, retrait de la démonstration, informations, publication, « Site en ligne »).

## Phase S6 — livré

- **Retrait sûr de la démonstration** (Réglages → Démonstration, administrateur) : aperçu exact de ce qui sera supprimé (17 véhicules d'exemple et tout ce qui leur est rattaché, clients et investisseurs fictifs, visites fictives, numéro WhatsApp / horaires / moyens de paiement d'exemple), confirmation en tapant « RETIRER », une seule transaction. Les fiches d'exemple réutilisées par de vraies données sont conservées (encadré « Conservés ») ; vos véhicules, clients, investisseurs et réglages modifiés ne sont jamais touchés. Numérotation recalée, photos supprimées du disque, action tracée dans le journal ; la démo n'est plus jamais rechargée par les mises à jour.
- **Mise en ligne protégée** : « Site en ligne » refusé tant que la démo est présente. Carte **« Avant la mise en ligne »** (Site web → Général) : démo retirée, numéro WhatsApp, coordonnées, mentions légales, première voiture publiée, logo — avec un lien vers chaque réglage ; devient « Le site est en ligne ».
- **Domaine** : DNS déjà correct chez Hostinger (A `@`, `www`, `crm` → 72.61.164.158). README complété (tableau DNS, script `configurer-domaines.sh`, commande de vérification, ouverture au public).
- **[GUIDE_SITE.md](GUIDE_SITE.md)** : mettre le site en ligne (sauvegarde, démo, informations, Google Search Console), publier une voiture en 1 minute, réservée / vendue, changer le numéro WhatsApp, ajouter un avis, photos, aperçu, statistiques, référencement, maintenance, dépannage.
- Serveur (21/10/2026) : `configurer-domaines.sh` lancé (SITE_DOMAIN / CRM_DOMAIN ajoutés, AUTH_URL désactivée) ; vérification : vuca-auto.fr 200, www 301, crm 200.
- Correction : l'icône d'onglet n'apparaît plus en double (elle reste dans Site web → Général).
- Tests : 186 tests unitaires (dont reconnaissance stricte de la démo, cohérence avec le seed, recalage des compteurs) ; parcours S6 (≈ 40 vérifications : vraies données mélangées à la démo, aperçu, confirmation, contenu exact de la base et du disque après retrait, seed qui ne recharge rien, pages du CRM, mise en ligne, téléphone) ; S1 à S5, domaines, phases 7 et 8 toujours verts.

## Phase S5 — livré

- **Référencement** : titre et description de l'accueil réglables (Site web → Référencement, aperçu Google) ; chaque fiche a son titre « Peugeot 208 … 2020 – 64 350 km – 11 500 € | VUCA AUTO » et sa description ; adresses canoniques https://vuca-auto.fr/… ; plan du site et robots.txt (S3) ; rien n'est indexé en maintenance ni dans l'aperçu.
- **Données structurées Google** : fiche entreprise `AutoDealer` sur l'accueil (nom, téléphone, adresse, horaires, logo) et `Car` + `Offer` sur chaque fiche (prix en €, kilométrage, année, carburant, boîte, photos ; « vendu » = SoldOut sans prix). Construites uniquement depuis les données publiques.
- **Images de partage** (WhatsApp, Facebook…) 1200 × 630 : générées automatiquement pour le site (logo, nom, slogan) et pour chaque voiture (photo de couverture, titre, km, prix ou « Vendu », logo) ; image du site remplaçable dans le CRM. Nouvelle **icône d'onglet** réglable (Site web → Référencement).
- **Mesure d'audience facultative** : Plausible (sans cookie) ou Google Analytics, chargé seulement après accord dans un bandeau (Refuser / Accepter au même niveau, lien « Cookies » pour changer d'avis). Politique de confidentialité générée en conséquence.
- **Accessibilité** : couleur d'accent ajustée automatiquement pour rester lisible (texte 4,5:1, en clair comme en sombre ; message du CRM adapté), ordre des titres corrigé, cibles ≥ 44 px, textes alternatifs, clavier et focus visibles. axe-core (WCAG 2.1 AA) : aucune erreur sur 8 pages en clair, sombre et téléphone.
- **Performance (Lighthouse mobile)** : accueil 96 · liste 92 · fiche 92 · contact 98 · à propos 98 en performance ; 100 en accessibilité, bonnes pratiques et SEO.
- **Test de bout en bout dans le dépôt** : `npm run test:e2e:site` (accueil → liste → filtre → fiche → lien WhatsApp avec le bon numéro et le bon message, barre du bas sur téléphone, aucun cookie).
- Tests : 182 tests unitaires (dont données structurées, accent lisible) ; parcours S5 (≈ 40 vérifications : maintenance, métadonnées, JSON-LD sans donnée interne, images de partage, icône, Plausible, accord Google Analytics, accessibilité) ; S1 à S4, domaines, phases 7 et 8 toujours verts.

## Phase S4 — livré

- **Compteurs du site** : routes `POST /api/site/vue` (visite, vue d'annonce) et `POST /api/site/clic` (« Écrire sur WhatsApp », « Appeler »), envoyées par `navigator.sendBeacon` sans jamais bloquer la navigation ni l'ouverture de WhatsApp. Un seul composant (`components/site/mesure.tsx`) compte toutes les pages et tous les liens wa.me / tel:, où qu'ils soient ; un clic sur une fiche est rattaché à son annonce.
- **Limitation de débit et doublons** (en mémoire, `lib/site/limiteur.ts`) : une visite par visiteur toutes les 30 min, une vue par annonce et par visiteur toutes les 30 min, double clic ignoré (10 s), 60 requêtes/min au plus (429 au-delà). Robots, aperçus de liens et navigateurs automatiques ignorés ; requêtes venues d'un autre site ignorées ; rien n'est compté en maintenance ni dans l'aperçu du CRM.
- **Aucune donnée personnelle** : seuls des totaux par jour sont enregistrés ; l'adresse IP ne sert qu'à une empreinte non réversible gardée quelques minutes en mémoire (politique de confidentialité générée mise à jour).
- **Site web → Statistiques** : période 7 / 30 / 90 jours ; tuiles Visites, Vues d'annonces, Clics WhatsApp, Clics « Appeler », Taux de contact, avec l'évolution vs la période précédente ; graphiques « Visites par jour » et « Clics WhatsApp par jour » (infobulles, chiffres en tableau) ; détail par annonce (vues, WhatsApp, appels, taux de contact). Lien depuis l'onglet Annonce ; tuile « Site web (7 jours) » sur le dashboard.
- Tests : 177 tests unitaires (dont limiteur, agrégation des statistiques) ; parcours S4 (≈ 35 vérifications : maintenance, contrôles des routes, robots, autre site, débit, visiteurs réels ordinateur et téléphone, doublons, clics WhatsApp/Appeler, aperçu non compté, statistiques et graphiques du CRM, mobile) ; S1, S3, domaines, phases 7 et 8 toujours verts.

## Correctif du 20/10/2026 — aperçu en erreur 500 sur le serveur

- Symptôme : `crm.vuca-auto.fr/apercu-site` → « Internal Server Error » (journal : `Failed to proxy https://localhost:3100/…`). Concernait aussi l'accueil de vuca-auto.fr.
- Cause : le service lançait `next start -H 127.0.0.1` ; Next.js prend alors ses réécritures internes pour des adresses externes.
- 1re mise à jour sans effet sur le service : le script de mise à jour exécutait sa propre ancienne version (copie) ; il se relance désormais avec la version téléchargée.
- Correction : service lancé avec `-H localhost` + `NODE_OPTIONS=--dns-result-order=ipv4first` (toujours joignable uniquement depuis le serveur) ; l'unité systemd est réécrite à chaque mise à jour. Reproduit puis vérifié en local derrière un relais HTTPS ; tests S3 verts avec ce lancement.

## Phase S3 — livré

- **Pages publiques de vuca-auto.fr** (groupe `app/(site)`, rendues à chaque demande) :
  - **Accueil** : hero (titre, sous-titre, « Voir les voitures » / « Écrire sur WhatsApp »), bande de 3 engagements activés, 6 à 9 dernières voitures + « Voir toutes les voitures (N) », « Pourquoi nous faire confiance » (engagements + chiffres réels : ventes au-delà du seuil, années d'activité), 3 étapes, avis réels (masqués s'il n'y en a pas) + lien Google, FAQ, contact (WhatsApp, téléphone, horaires, adresse, lien Google Maps — pas de carte intégrée : aucun traceur tiers).
  - **/voitures** : grille de cartes, filtres (marque, prix max, km max, année min, carburant, boîte) et tri (plus récentes, prix ↑↓, km) gardés dans l'adresse ; feuille du bas sur téléphone ; puces des filtres actifs ; état vide avec « Dites-nous ce que vous cherchez » ; section « Récemment vendues » (réglage).
  - **Fiche /voitures/[slug]** : titre « Peugeot 208 Allure 2020 – 64 350 km – 11 500 € | VUCA AUTO », galerie (défilement au doigt, flèches, vignettes, compteur, plein écran avec zoom et clavier), prix + « négociable », badge Réservé, tuiles de caractéristiques, « Ce qui a été vérifié », description, équipements repliables, travaux réalisés, bloc « Vous avez une question ? » (prénom/photo/délai), WhatsApp avec message pré-rempli (marque, modèle, année, prix, lien), Appeler, Partager, « Annonce mise à jour le … · Réf. VA-0001 », 3 véhicules similaires, barre collante prix + WhatsApp sur téléphone. Vendu : page conservée avec bandeau, sans prix ni contact.
  - **À propos, Contact, Mentions légales, Confidentialité** (texte du CRM ou modèle généré), **404** sobre.
- **Photos publiques** `/photos/[id]/[largeur]` : uniquement les photos « publiques » d'une annonce visible (ou les images du site choisies dans les réglages) ; recadrage 4:3 du CRM, jamais agrandies, AVIF/WebP selon le navigateur, aucune métadonnée (EXIF/GPS), cache disque + cache navigateur d'un an (adresse versionnée par le recadrage).
- **Maintenance** (réglage par défaut) : toutes les pages affichent « Notre site arrive bientôt » (non indexé, plan du site vide, rien du véhicule même dans le titre de l'onglet) ; la 404 reste une 404.
- **Aperçu du vrai site depuis le CRM** : `crm.vuca-auto.fr/apercu-site/…` (connexion exigée), même en maintenance ; boutons « Aperçu du site » (onglet Site web) et « Aperçu » (onglet Annonce). L'en-tête interne d'aperçu est retiré de toute requête venue de l'extérieur.
- Plan du site : accueil, liste, annonces visibles (date de mise à jour), pages fixes.
- Tests : 169 tests unitaires (dont filtres, similaires, routage de l'aperçu) ; parcours navigateur S3 (≈ 100 vérifications : maintenance, photos et sécurité, aperçu, accueil → liste → filtre → tri → fiche → galerie → lien WhatsApp exact, vendu, annonce retirée → 404, aucune donnée interne dans la page, aucun cookie, mobile, sombre) ; S1, S2, domaines et phase 8 toujours verts.

## Phase S2 — livré

- **Jetons de design** (`app/(site)/site.css` + utilitaires Tailwind dans `globals.css`) : blanc / #F5F5F7, texte #1D1D1F / #6E6E73, séparateurs #D2D2D7, accent réglable (défaut #0071E3, texte blanc ou foncé choisi automatiquement), vert WhatsApp #25D366 réservé aux boutons WhatsApp (texte foncé pour un contraste AA), Réservé orange doux, Vendu gris ; rayons 18 / 14 px, boutons en pilule, ombre légère ; typographie 56/40/28/21/17/14 px, titres serrés, chiffres alignés ; mode sombre automatique (fond noir, cartes #1C1C1E) ; transitions 250 ms, apparition douce au défilement, tout coupé si « réduire les animations ».
- **Police** : pile système Apple (SF Pro) puis Inter auto-hébergée (`components/site/polices/`, 48 Ko, licence OFL) : aucun appel externe.
- **Composants** (`components/site/`) : Bouton (principal, secondaire « › », contour, WhatsApp, discret), navigation translucide + menu mobile, pied de page (SIRET), carte véhicule (photo 4:3, badges, prix), badges, prix, tuiles de caractéristiques, contrôle segmenté (clavier), puces de filtres, feuille du bas (filtres), apparition, engagements, 3 étapes, carte d'avis, FAQ, horaires, état vide, bouton WhatsApp flottant, barre collante mobile de la fiche.
- **Lectures publiques** (`server/site/public.ts`) : `reglagesPublics`, `annoncesPubliees` (liste blanche + `toPublicVehicle`), `avisPublics`, `nombreAnnoncesPubliees`.
- **Page `/site-preview`** (CRM, connexion exigée, bouton « Composants » de l'onglet Site web) : tous les composants avec les vraies annonces de démo, choix Automatique / Clair / Sombre ; les exemples (engagements, avis, FAQ) sont signalés comme tels et n'apparaissent jamais sur le site. Liens de navigation vers https://vuca-auto.fr.
- CRM : avertissement si la couleur d'accent choisie est trop claire pour être lisible.
- Tests : 161 tests unitaires (dont contrastes AA des couleurs) ; parcours navigateur S2 (≈ 40 vérifications : accès protégé, couleurs, police locale, sombre, clavier, mobile, zones tactiles ≥ 44 px, animations réduites, 404 sur vuca-auto.fr) ; S1, domaines et phase 8 toujours verts.

## Phase S1 — livré

- **Base** : migration `site_public` (Annonce, ReglagesSite ligne unique, AvisClient, StatistiqueSite ; photos `publique` / `ordrePublic` / `recadrage`). Contraintes SQL : note 1–5, avis certifié obligatoire, prix et compteurs ≥ 0.
- **Sécurité** : `toPublicVehicle()` (`src/lib/site/vehicule-public.ts`) construit l'objet public champ par champ (liste blanche) ; tests : aucun champ interne (prix d'achat, dépenses, marge, partenaires, VIN, notes, provenance…), immatriculation masquée par défaut, vendu = sans prix. Test « garde-fou » : aucun fichier du site public n'importe Prisma, la base ou les requêtes du CRM.
- **Onglet « Annonce »** (fiche véhicule) : interrupteur « Publier sur le site » (seulement En vente / Réservé, prix et ≥ 1 photo publique exigés), avertissements (< 8 photos, site en maintenance), référence VA-0001, « mise à jour le », lien « Voir l'annonce sur le site », statistiques vues / clics WhatsApp 7 et 30 jours ; photos : choix des publiques, ordre par glisser-déposer ou flèches, couverture, recadrage 4:3 (cadre déplaçable au doigt + zoom) ; titre, prix affiché + négociable, puissance, description (gras, listes, aperçu, bouton « Générer une description » factuel), équipements par catégorie + libres, points de confiance (CT, carnet, Histovec, propriétaires, garantie, non-fumeur, révision, kilométrage vérifié).
- **Dépublication automatique** quand le véhicule n'est plus En vente / Réservé (vendu, archivé, immobilisé…) ; pas de republication automatique. Adresse (slug) figée à la 1re publication.
- **Onglet « Site web »** (ADMIN + GESTIONNAIRE) : Général (en ligne / maintenance, nom, slogan, couleur, logos, favicon), Contact & WhatsApp (numéro validé et affiché lisiblement, messages avec variables + aperçu façon WhatsApp, horaires 7 jours, délai de réponse, interlocuteur + photo), Confiance (SIRET, forme, siège, engagements activables, paiements, livraison, reprise, avis Google, vendus récents, compteur de ventes avec seuil, immatriculation), Avis (réels uniquement : case « Je certifie… » obligatoire), Contenu (accueil, à propos + photo, FAQ, bandeau, réseaux), Référencement (titre / description + aperçu Google, image de partage, Plausible / GA), Légal (modèles générés depuis les réglages, informations manquantes signalées), Statistiques (compteurs 7 / 30 jours, annonces les plus vues). Chaque modification est tracée dans le journal et met à jour le site.
- **Démo** (`demo:site`) : 5 véhicules en vente de plus, 8 annonces publiées (5 à 9 photos d'illustration neutres), 3 annonces de véhicules vendus, statistiques sur 30 jours, numéro WhatsApp fictif (+33 6 39 98 00 00, réservé aux fictions). **Aucun avis.**
- Tests : 159 tests unitaires ; parcours navigateur S1 (≈ 60 vérifications, ordinateur + téléphone) ; non-régression des parcours des phases 3 à 8.

## Phase 1 — livré

- Projet Next.js 15.5 + TypeScript strict + Tailwind 4 + composants style shadcn/ui, mode sombre, toasts.
- Base PostgreSQL + Prisma 7 : 2 migrations (schéma complet ; contraintes SQL : un seul partenaire SOCIETE, montants ≥ 0, réglages ligne unique).
- Connexion email + mot de passe (Auth.js v5, bcrypt, sessions JWT 14 jours), changement de mot de passe obligatoire à la 1re connexion, page « Mon compte ».
- Rôles vérifiés côté serveur (pages, Server Actions, route des fichiers) ; investisseur limité à son portail.
- Layout : barre latérale (ordinateur), barre du bas + menu « Plus » (téléphone), recherche globale (Ctrl/⌘ K), bouton flottant « + ».
- Investisseurs : liste (cartes sur téléphone, tableau sur ordinateur), actifs/archivés, création, fiche, modification, archivage, suppression (admin, sans historique). IBAN masqué.
- Réglages (admin) : société + logo, textes des documents (CGV modèle, mention sans TVA), numérotation & seuils d'alerte, catégories de dépenses, options de location, check-list EDL, utilisateurs (mot de passe temporaire affiché une fois, réinitialisation, protection du dernier admin), journal d'activité.
- Stockage des fichiers derrière `lib/storage.ts`, servis par `/api/fichiers/[id]` après contrôle des droits.
- Journal d'activité sur chaque création / modification / suppression.
- Seed idempotent : réglages, VUCA AUTO, 16 catégories, 5 options, 10 éléments de check-list, admin (mot de passe affiché une seule fois), démo (3 investisseurs).
- Docker : `Dockerfile`, `docker-compose.yml` (app + Postgres 17, volumes persistants), démarrage automatique (migrations + seed + clé secrète générée si absente).
- README débutant Mac, `.env.example` commenté.
- Tests : 21 tests unitaires (formats € / dates / IBAN). Parcours complet testé dans Chromium (ordinateur + iPhone, 3 rôles) et lancement Docker testé de bout en bout.

## Phase 2 — livré

- **Liste des véhicules** : onglets En stock / Vendus / Archivés / Tous, recherche (marque, modèle, immatriculation, VIN), filtres (statut, exploitation, financeur, marque, période d'achat), tri sur toutes les colonnes, affichage cartes ou tableau (cartes par défaut sur téléphone), coût de revient, marge (prévisionnelle marquée *), jours en stock, alerte si le financement ≠ prix d'achat. **Export CSV** lisible par Excel FR.
- **Création / modification** : formulaire mobile-first en sections (identité, exploitation, achat, financement, location si LOCATION/MIXTE, échéances, notes), barre « Enregistrer » toujours visible. Immatriculation normalisée (SIV `AB-123-CD` ou FNI `1234 AB 56`), VIN contrôlé, doublons refusés avec message clair.
- **« Qui finance l'achat ? »** : lignes dynamiques, bouton « 100 % VUCA AUTO », « Ajouter un investisseur », total financé / prix d'achat / reste à financer et parts en direct ; écart bloquant, sauf case « Enregistrer avec cet écart » + motif obligatoire.
- **Fiche véhicule** : en-tête (photo, immat, statut, type, écart), onglets Résumé (galerie, identité, achat, location, rentabilité prévisionnelle, valeur estimée datée), Financement, Entretien & échéances (états dépassée / proche / à jour selon les seuils des réglages, mise à jour rapide du km), Documents, Historique (statuts + journal) ; Dépenses (Phase 3), Location (Phase 4), Dommages (Phase 5) en attente.
- **Statuts** : changement avec motif et historique horodaté ; archivage / restauration (retour au statut précédent) ; suppression définitive réservée à l'admin et seulement sans historique.
- **Photos** : envoi multiple, compression dans le navigateur, puis côté serveur (sharp) : orientation corrigée, 1600 px max, **métadonnées et position GPS supprimées** ; miniatures 480 px générées à la demande et mises en cache ; photo principale.
- **Documents** : carte grise, facture, CT, certificat de cession, assurance, autre ; PDF ou photo ; **type réel vérifié d'après le contenu** (un faux PDF est refusé).
- Liens : recherche globale (véhicules), bouton « + » → nouveau véhicule, fiche investisseur (véhicules financés, capital engagé), tableau de bord (véhicules en stock).
- Démo : 12 véhicules (vendus dont un à perte, en stock, en location, mixte, immobilisé, 3 financeurs à parts égales, écart de financement accepté, exemple Peugeot 208) avec illustrations.
- Tests : 52 tests unitaires (répartition sans perte, financement, immatriculation, VIN, échéances, CSV…) ; parcours complet dans Chromium (ordinateur + iPhone).

## Phase 3 — livré

- **Moteur de calcul** (`src/lib/calculs/repartition.ts`, `rentabilite.ts`, fonctions pures en centimes) : investissement de chaque partenaire (achat + dépenses payées, hors dépenses « payées avec les recettes »), coût de revient, revenus, bénéfice, marge %, ROI %, répartition au prorata ou en pourcentages fixes, commission de gestion VUCA AUTO sur bénéfice positif, écart d'arrondi à VUCA AUTO. Tous les exemples de référence du cahier des charges sont testés (Peugeot 208, commission 20 %, perte, 100 % VUCA, 3 tiers, 4 partenaires, % fixe, perte + commission, dépenses sans achat cofinancé…).
- **Dépenses** : liste globale (filtres véhicule / catégorie / payeur / période, totaux par catégorie et par payeur, export Excel), saisie rapide pensée pour le téléphone (photo du ticket → montant → catégorie en grille d'icônes → payé par, VUCA AUTO présélectionné → véhicule), « Enregistrer et en saisir une autre », justificatifs (photo ou PDF, type vérifié), modification, suppression avec confirmation. Un kilométrage saisi plus élevé met à jour le compteur du véhicule.
- **Fiche véhicule** : onglet Dépenses (liste + totaux, ajout prérempli) ; Résumé avec carte Rentabilité (réelle ou prévisionnelle sur prix cible / valeur estimée) et carte Vente ; Entretien avec l'historique des entretiens et réparations ; Financement avec le tableau de répartition (achat, dépenses, investi, part, bénéfice dont commission, à reverser, déjà versé, reste dû), les règles de partage (prorata / % fixes avec contrôle du total, commission) et un simulateur « et si je vends à… ».
- **Vente** : page « Marquer comme vendu » (prix prérempli avec le prix cible, date, km, acheteur, mode de paiement) avec calcul final et répartition en direct ; « Annuler la vente » (retour au statut précédent, tracé dans l'historique).
- **Investisseurs** : capital engagé, véhicules en cours, bénéfices réalisés et reste dû dans la liste ; fiche avec la situation véhicule par véhicule.
- Bouton « + » → Dépense disponible.
- Démo : 20 dépenses (dont l'exemple 208 : carte grise 300 € VUCA, embrayage 700 € Karim), assurances payées sur recettes, C3 avec commission 15 %, Golf en % fixes 40/30/30 + commission 10 %, versements partiels (reste dû Sophie 255,76 €, Karim 49,12 €).
- Tests : 71 tests unitaires ; parcours complet dans Chromium (ordinateur + iPhone, sans débordement horizontal ni erreur console).

## Phase 4 — livré

- **Clients** : liste (recherche nom / téléphone / email / permis, filtres actifs / liste noire / archivés), fiche complète (identité, coordonnées, permis, pièce d'identité, entreprise, liste noire avec motif, notes), scans (permis recto/verso, pièce d'identité, justificatif de domicile — type réel vérifié), historique des locations. **Alertes** : liste noire et permis expiré (bloquants), permis plus récent que le seuil des réglages, pièce d'identité expirée, permis non renseigné. Archivage / restauration ; suppression (admin, sans historique) ; **RGPD** : export JSON et anonymisation (admin : données personnelles et scans effacés, journal nettoyé, contrats et montants conservés).
- **Tarification** (`lib/calculs/location.ts`, 16 tests) : journée de 24 h entamée due avec tolérance, hebdomadaire semaines + jours au tarif journalier plafonné à une semaine de plus, mensuel date à date + prorata ÷ 30, options par jour (plafonnées) ou forfait, remise, livraison ; km inclus sur la durée, km supplémentaires ; changement d'heure géré (heure de Paris).
- **Contrats** : assistant en 4 étapes (client existant ou création rapide + conducteurs additionnels → type, dates et véhicule avec disponibilité en direct → tarif prérempli, km, options, lieux / livraison, caution, franchise, acompte ou jour d'échéance → récapitulatif du prix et statut Réservation / Confirmée). Numéro automatique `LOC-AAAA-0001`. Prix toujours recalculé côté serveur, options et conditions générales figées. Fiche contrat (client, véhicule, dates, conditions, détail du prix), modification tant que le véhicule n'est pas parti, confirmation, annulation avec motif, archivage, suppression (admin, erreur de saisie).
- **Disponibilité** : un véhicule vendu, archivé ou immobilisé ne peut pas être loué ; deux contrats actifs ne peuvent pas se chevaucher — contrôlé dans l'application ET garanti par une contrainte PostgreSQL (`btree_gist`). Vente et archivage d'un véhicule refusés tant qu'une location est réservée ou en cours.
- **Location** : vue « Aujourd'hui » (départs et retours du jour et du lendemain, locations en retard, réservations à confirmer, appel en un geste), **planning Gantt** semaine / mois (barres colorées par statut, « En retard » calculé, une case libre = nouvelle réservation ce jour-là), liste des contrats filtrable (statut dont « En retard », véhicule, période, recherche).
- **Fiche véhicule → Location** : calendrier sur 6 semaines, taux d'occupation depuis la mise en location (jours immobilisés exclus), jours loués, revenus encaissés, contrats.
- Recherche globale : clients et numéros de contrat. Bouton « + » → Location.
- Démo : 6 clients (dont un en liste noire, un jeune permis, une pièce d'identité expirée) et 10 contrats (mensuels et journaliers, un en retard, terminés, réservés, un annulé).
- Tests : 91 tests unitaires ; parcours complet dans Chromium (42 vérifications, ordinateur + iPhone, sans débordement horizontal ni erreur console) ; non-régression Phase 3.

## Phase 5 — livré

- **Assistant de départ** (téléphone, écran par écran) : photo du compteur obligatoire + kilométrage (prérempli), jauge carburant 0–8/8 ou batterie en % (selon le carburant du véhicule), propreté intérieure / extérieure, check-list paramétrable (quantité pour les clés, éléments « électrique » seulement si besoin), **schéma du véhicule cliquable** (côtés, avant, arrière, dessus, intérieur : on touche la zone, on choisit le type, la gravité, une photo), dommages déjà connus reportés automatiquement, **6 photos guidées obligatoires** + photos libres (envoyées au fil de l'eau, métadonnées GPS retirées), remarques, caution reçue, **signatures du client et du loueur au doigt**. Validation → état des lieux verrouillé, contrat « En cours », véhicule « En location », kilométrage du véhicule mis à jour.
- **Assistant de retour** : mêmes étapes, puis **comparaison automatique** (km parcourus / inclus / supplémentaires, carburant ou batterie manquant, retard au-delà de la tolérance, véhicule rendu sale, nouveaux dommages mis en évidence, équipements manquants) et **frais proposés** modifiables (km, carburant, retard, nettoyage, un frais à chiffrer par nouveau dommage, éléments manquants, ajout libre). **Caution** : restituer, retenir une partie (montant proposé = total des frais) ou tout retenir, avec motif ; la part retenue est enregistrée comme un encaissement (revenu du véhicule). Validation → contrat « Terminé », véhicule remis dans son statut d'avant le départ.
- Brouillon : on peut quitter un état des lieux et le reprendre (photos et dommages déjà enregistrés).
- **Consultation** d'un état des lieux signé (relevés, check-list, schéma des dommages présents à cette date, photos, signatures).
- **Fiche contrat** : boutons « Faire le départ » / « Faire le retour », résumés des états des lieux, km parcourus, frais supplémentaires (ajout / retrait, ex. amende refacturée), reste à payer, état de la caution.
- **Onglet Dommages** du véhicule : schéma des dommages actuels, ajout hors état des lieux (ex. constaté à l'achat), « Réparé » (disparaît des états des lieux suivants), historique.
- Vue « Aujourd'hui » : boutons Départ / Retour directs. Départ refusé tant que le véhicule n'est pas revenu de la location précédente.
- Réglages : frais de nettoyage, prix d'un 1/8 de carburant, prix d'un % de batterie.
- Démo : états des lieux des locations en cours et terminées, un retour avec nouveau dommage, frais et caution retenue en partie.
- Tests : 98 tests unitaires (dont la comparaison départ / retour) ; parcours complet dans Chromium (34 vérifications : départ au téléphone, retour au bureau, dommages, frais, caution) ; non-régression Phases 3 et 4.

## Phase 6 — livré

- **Échéancier automatique** à la création / modification / prolongation d'un contrat : mensuel = un loyer par mois (1er au départ, les suivants au jour d'échéance choisi qui suit le début de la période, dernier mois au prorata), courte durée = acompte + solde ou une seule échéance. Statuts À venir / Partielle / Payée ; « En retard » calculé (date dépassée, non soldée) avec le nombre de jours.
- **Paiements** : encaissement depuis la fiche contrat (montant proposé = reste de la prochaine échéance, sinon frais restants, sinon remboursement d'un trop-perçu), paiements partiels imputés sur l'échéance la plus ancienne, **reçu numéroté** `REC-AAAA-0001` (PDF A5), suppression réservée à l'admin. Journal des paiements filtrable (période, mode) avec totaux ; « + » → Paiement.
- **Impayés** : échéances en retard (jours de retard, appel, encaisser) et locations terminées non soldées ; section « Échéances impayées » dans la vue Aujourd'hui ; fiche client : total facturé, encaissé, reste à payer, impayés en retard, PV.
- **Prolongation** d'une location réservée ou en cours : contrôle de disponibilité, prix recalculé (même tarif, options plafonnées), échéancier complété.
- **PV** : saisie (véhicule + date/heure) → **conducteur retrouvé automatiquement** (location en cours à ce moment-là) avec ses informations pour la désignation ANTAI, avis scanné, statuts Reçu / Conducteur désigné / Payé / Refacturé, **refacturation** en un clic (frais ajouté à la location).
- **Sinistres** : déclaration (location du moment proposée), coût estimé, franchise **refacturée** en un clic, assurance (n° de dossier, indemnité = revenu du véhicule), photos et documents, statuts ; liste dans l'onglet Location et dans l'onglet Dommages du véhicule.
- **Factures** `FAC-AAAA-0001` : location (prix + frais) et vente de véhicule, destinataire figé, mention sans TVA des réglages ; une facture émise n'est jamais modifiée : annulation avec motif (elle reste visible) puis nouvelle facture. Une seule facture active par location / vente (garanti en base). Vente impossible à annuler tant que sa facture est active.
- **PDF** (générés sur le serveur, logo de la société) : contrat de location (conditions, prix, CGV, signatures du départ), états des lieux départ / retour (relevés, check-list, dommages, photos, signatures), clôture (frais, caution, solde), reçus, factures. Boutons « Ouvrir » et « Partager » (feuille de partage du téléphone, sinon téléchargement).
- Recherche globale : factures, reçus, n° d'avis de PV.
- Mise à jour du serveur : l'échéancier des locations déjà saisies est créé automatiquement (une fois).
- Démo : paiements et reçus, un impayé (versement partiel), une franchise non payée, 2 PV (un refacturé, un reçu), un sinistre avec indemnité, une facture.
- Tests : 105 tests unitaires (dont échéancier et imputation) ; parcours complet dans Chromium (47 vérifications : encaissement + reçu, prolongation, factures émises / annulées, PV identifié + refacturé, sinistre + franchise + photo, facture de vente, 8 PDF, recherche, iPhone sans débordement) ; non-régression Phases 3, 4 et 5.

## Phase 7 — livré

- **Dashboard** : filtre de période (ce mois, mois dernier, trimestre, année, personnalisée) et filtre par partenaire (véhicules qu'il finance + sa part du bénéfice). 12 indicateurs cliquables : bénéfice net, CA ventes, revenus location, dépenses, stock, capital immobilisé, marge moyenne par vente, durée moyenne de revente, taux d'occupation de la flotte, loués / disponibles, impayés, investisseurs. Graphiques : bénéfice mensuel sur 12 mois (ventes / location, infobulle au survol), dépenses par catégorie (anneau + légende chiffrée), véhicules les plus et les moins rentables, occupation par véhicule, capital investi par partenaire.
- **Alertes « À traiter »** (chacune ouvre la liste filtrée) : locations en retard, échéances impayées, retours aujourd'hui / demain, CT ou assurance à renouveler, vidange / révision proche, stock ancien (seuil des réglages, hors flotte de location), participations ≠ prix d'achat, permis client expiré, PV non traités. Nouveaux filtres : véhicules `?alerte=` et vendus sur une période, clients « Permis expiré ».
- **Rapports** : bilan d'une période (même filtre) — véhicules vendus (bénéfice, marge, jours) et achetés, location par véhicule, dépenses par catégorie, bénéfice par partenaire. **Export PDF et Excel (.xlsx, une feuille par tableau)**.
- **Versements** aux investisseurs (fiche investisseur) : remboursement de capital, versement de bénéfice, apport supplémentaire ; rattachés à un véhicule ou non ; montant proposé = reste dû ; modification, suppression (admin). « Déjà versé » et « reste dû » partout (liste, fiche, onglet Financement du véhicule).
- **Relevé investisseur PDF** sur une période : capital engagé, résultat de la période et sa part, véhicules vendus (à reverser, déjà versé, reste dû), versements de la période.
- Export CSV du journal des paiements.
- Démo : un versement mensuel de résultat de location (Thomas Lefèvre).
- Tests : 112 tests unitaires (dont le résultat par période) ; parcours complet dans Chromium (44 vérifications : indicateurs, graphiques, filtres, cohérence du CA avec la base, exports PDF / Excel / CSV, versement et reste dû, relevé, liens des alertes, iPhone sans débordement) ; non-régression Phases 3 à 6.

## Phase 8 — livré

- **Portail investisseur** (lecture seule) : indicateurs (capital engagé, bénéfice prévisionnel, bénéfices réalisés, déjà versé, reste dû), ses véhicules (photo, statut, investi, bénéfice, part ou reste dû), fiche de chaque véhicule (sa part détaillée, rentabilité, location, dépenses par catégorie, ses versements), ses versements, son relevé PDF. Jamais le nom des autres investisseurs. Accès créé par l'admin (Réglages → Utilisateurs, rôle Investisseur) ; **aperçu admin** (« Voir son espace » sur la fiche investisseur). Connexion d'un investisseur → directement sur `/portail`.
- Cloisonnement vérifié côté serveur : pages de gestion, exports et PDF refusés ; véhicule d'un autre → 404 ; photos limitées à ses véhicules ; relevé du portail toujours le sien.
- **Application installable (PWA)** : manifeste, icônes (dont iPhone et « maskable »), service worker minimal (fichiers techniques seulement, aucune donnée privée en cache), page « Pas de connexion internet ».
- **Sauvegarde automatique quotidienne** (base + fichiers, 30 jours) :
  - serveur HestiaCP : `scripts/sauvegarde-serveur.sh` lancé à 3 h 30 par le minuteur systemd `vuca-crm-sauvegarde.timer` (installé par `installer-hestia.sh`, installation ET mise à jour), dossier `/var/backups/vuca-crm` (root, 700), copie du `.env` ; restauration `scripts/restaurer-serveur.sh <date>` (sauvegarde de sécurité avant, confirmation « oui ») ;
  - Docker : service `sauvegarde` (image postgres) dans `docker-compose.yml`, dossier `./sauvegardes`, `scripts/sauvegarde-docker.sh` / `restaurer-docker.sh`.
  - Testé : sauvegarde → modification → restauration (base et fichiers revenus), sur PostgreSQL local et avec de vrais conteneurs Docker.
- **Finitions** : README complet (fonctionnalités, téléphone et installation de l'application, sauvegardes et restauration, portail investisseur, premiers pas), `.env.example` (heure et durée des sauvegardes), favicon, textes « Phase N » retirés de l'interface, composants « bientôt » supprimés.
- Tests : 112 tests unitaires ; parcours Phase 8 dans Chromium (≈ 35 vérifications : création de l'accès, aperçu admin, connexion investisseur, cloisonnement, PWA, hors connexion) ; non-régression Phases 3 à 7.

## Déploiement VPS (19/10/2026)

- `scripts/installer-vps.sh` : installation prudente sur un VPS partagé (analyse sans modification → plan → confirmation « oui » → n'ajoute que ses fichiers). Modes : Caddy (ports libres), Traefik existant (étiquettes + réseau externe), nginx existant (nouveau fichier + certbot). Arrêt si configuration inconnue. `--simulation` et mode mise à jour.
- Domaine temporaire : `crm-vuca.<ip>.sslip.io`, SSL Let's Encrypt.
- Testé dans le bac à sable : 5 cas (ports libres, Traefik, nginx avec retour arrière, logiciel inconnu, mise à jour) ; routage HTTPS via Traefik vérifié de bout en bout.
- Serveur cible : **KVM 2** Hostinger (`srv1075545.hstgr.cloud`, 72.61.164.158), **Ubuntu 24.04 + HestiaCP**. Le gestionnaire Docker de Hostinger n'y est pas disponible et le connecteur ne permet pas d'exécuter de commandes.
- `scripts/installer-hestia.sh` : installation native (sans Docker) via les commandes Hestia (`v-add-web-domain`, modèle nginx `vuca-crm`, `v-add-letsencrypt-domain`). Testé dans le bac à sable avec une imitation de Hestia + vrai nginx : installation complète, reprise après interruption, HTTPS (modèle .stpl), connexion + envoi de fichier dans Chromium, mise à jour avec conservation des données.
- Domaine prévu : `crm-vuca.72-61-164-158.sslip.io`.
- 1er essai réel (19/10) : application construite et démarrée, mais Hestia n'a pas pu créer le domaine (« nginx restart failed »). Cause : **Caddy** (service système, démarré au boot du 17/10 21h30) tient les ports 80/443 ; le nginx de Hestia ne tourne plus depuis (désactivé, échecs au démarrage). Caddy ne sert que `srv1075545.hstgr.cloud` → appli Node sur 127.0.0.1:3000 ; **thefollowmovement.cloud (site Hestia/Apache, ports 8080/8443) est donc inaccessible depuis le 17/10** (erreur SSL) — antérieur à l'installation du CRM.
- `installer-hestia.sh` gère désormais ce cas : frontal détecté (nginx Hestia ou Caddy) ; avec Caddy : fichier `/etc/caddy/vuca-crm.caddy` + une ligne `import` dans le Caddyfile (sauvegarde, `caddy validate`, retour arrière), rechargement à chaud. Testé en reproduisant la situation du serveur (reprise depuis l'état interrompu, autre appli intacte, HTTPS, connexion navigateur).

## Décisions prises

- Phase 0 : les 10 recommandations acceptées (voir `docs/PHASE0_PROPOSITION.md` §5) :
  1. Pas de frais généraux hors véhicule en v1.
  2. Case « payée avec les recettes du véhicule » sur une dépense (`Depense.payeSurRecettes`) : réduit le résultat, ne compte comme investissement pour personne.
  3. Indemnité d'assurance = revenu du véhicule.
  4. Commission de gestion appliquée aussi au résultat de location.
  5. Hebdomadaire de 10 j = 1 semaine + 3 j au tarif journalier, plafonné au prix de 2 semaines.
  6. Mensuel : mois date à date, dernier mois entamé au prorata (tarif mensuel ÷ 30 × jours).
  7. PDF partagés via le bouton « Partager » du téléphone en v1.
  8. Cible : serveur en ligne ; développement et tests d'abord sur Mac.
  9. Ancienneté minimale du permis : 2 ans (alerte).
  10. Facture de vente de véhicule : oui, même modèle simple.
- Phase 1 :
  - Réglages réservés à l'ADMIN ; le GESTIONNAIRE gère partenaires (sans suppression) et, plus tard, véhicules/location.
  - L'admin peut ouvrir `/portail` pour vérifier ce que voit un investisseur.
  - Le client PostgreSQL n'est pas dans l'image de l'app : la sauvegarde (Phase 8) tournera dans un service dédié basé sur l'image postgres.
  - Données de démo chargées automatiquement au tout premier démarrage si `SEED_DEMO=true`.
- Phase 2 :
  - Statuts manuels : En préparation, En vente, Réservé, Disponible à la location, Immobilisé. « Vendu » passera par « Marquer comme vendu » (Phase 3), « En location » par les contrats (Phase 4), « Archivé » par le bouton Archiver.
  - Une ligne de financement par financeur ; date de participation = date d'achat.
  - Les paramètres de répartition (mode prorata / pourcentage fixe, commission de gestion) seront saisis en Phase 3 avec le moteur de calcul.
  - Blocs de démo chargés une seule fois (repères `demo:*` dans `Compteur`) ; avec `SEED_DEMO=true`, un nouveau bloc se charge à la mise à jour suivante. Supprimer des données de démo ne les fait pas revenir.
  - Export « Excel » = CSV compatible Excel FR ; un vrai fichier .xlsx viendra avec les rapports (Phase 7).
- Phase 3 :
  - Écart d'arrondi : à VUCA AUTO si elle est concernée, sinon au partenaire le plus engagé.
  - Mode « pourcentage fixe » : les % ne concernent que le bénéfice ; chacun récupère toujours son investissement.
  - « Déjà versé » = remboursements de capital + bénéfices versés sur ce véhicule (les apports supplémentaires sont ignorés). La saisie des versements arrive en Phase 7.
  - VUCA AUTO garde l'argent des ventes : pas de « reste dû » envers elle-même dans la liste des investisseurs.
  - Véhicule de location sans prix cible : bénéfice prévisionnel calculé sur la valeur estimée (+ revenus de location encaissés dès la Phase 6).
- Phase 4 :
  - Bloquant pour louer : liste noire, permis expiré. Simple alerte : permis récent, pièce d'identité expirée.
  - Hebdomadaire sans tarif journalier : jours restants au prorata du tarif hebdomadaire.
  - Contrat modifiable uniquement avant le départ ; les CGV restent celles du jour de la création.
  - Départ / retour (statuts En cours / Terminée, véhicule « En location ») : assistants de la Phase 5.
  - Anonymisation RGPD : réservée à l'admin, impossible avec une location réservée ou en cours.
- Phase 5 :
  - Signature : composant maison (canevas, au doigt), sans la dépendance react-signature-canvas ; PNG conservé tel quel.
  - Km inclus pour les km supplémentaires = durée prévue au contrat ; les jours de retard sont facturés à part (tarif journalier, sinon hebdo ÷ 7 ou mensuel ÷ 30).
  - Les frais des nouveaux dommages sont proposés à 0 € : à chiffrer (devis, franchise…).
  - Caution retenue = paiement « caution retenue » (revenu du véhicule) ; la saisie des autres paiements et le PDF de l'état des lieux arrivent en Phase 6.
  - Les montants affichent toujours l'espace des milliers (« 1 000,00 € ») côté navigateur comme côté serveur.
- Phase 6 :
  - Un reçu pour tout argent reçu (loyer, frais, caution retenue exclue) ; pas de reçu pour un remboursement.
  - Les frais supplémentaires (retour, PV, franchise) ne créent pas d'échéance : ils entrent dans le « reste à payer » et dans les locations terminées non soldées.
  - Loyer mensuel dû au jour d'échéance choisi qui suit le début de la période (ex. le 5 : période du 29/10 → due le 05/11), le 1er loyer au départ.
  - PDF en police Helvetica intégrée (pas de police à télécharger).
- Phase 7 :
  - Résultat d'une période : achat-revente → bénéfice compté le jour de la vente (prix de vente − achat − dépenses) ; location / mixte → loyers encaissés − charges à leur date, et à la vente prix de vente − prix d'achat. La somme des périodes redonne le bénéfice du véhicule (5.1 / 5.4).
  - Bénéfice par partenaire d'une période = résultat de chaque véhicule réparti selon ses règles (5.3, commission comprise).
  - Indemnité d'assurance comptée à la date du sinistre.
  - Filtre partenaire : véhicules où il a investi (ou a une part fixe) ; les montants affichés sont ceux des véhicules, avec sa part du bénéfice en plus.
  - Versement sans véhicule : réduit le reste dû global de l'investisseur. Pas de versement pour VUCA AUTO.
- Phase 8 :
  - Portail : l'investisseur voit sa part et les chiffres globaux du véhicule (prix, dépenses, bénéfice), pas les autres financeurs.
  - Pas de compte investisseur dans les données de démo (le serveur réel charge la démo : aucun mot de passe connu ne doit exister).
  - Sauvegardes : 3 h 30 chaque nuit, 30 jours, sur le même serveur ; conseil de copie régulière ailleurs (README).

## Questions ouvertes

Aucune.

## Bugs connus

Aucun.
