# PROGRESS — VUCA AUTO CRM

## Phases

| Phase | Contenu | Statut |
|---|---|---|
| 0 | Arborescence + schéma Prisma complet | ✅ Validée le 18/10/2026 |
| 1 | Socle : projet, Docker, base, auth, rôles, layout, navigation, réglages, partenaires, seed | ✅ Validée le 19/10/2026 (déployée sur le KVM 2) |
| 2 | Véhicules : CRUD, photos, documents, financement, statuts | ✅ Validée le 19/10/2026 |
| 3 | Dépenses + moteur de calcul + tests + rentabilité/répartition + vente | ✅ Validée le 19/10/2026 |
| 4 | Location : clients, contrats, disponibilités, planning, tarification | ✅ Validée le 19/10/2026 |
| 5 | État des lieux mobile, comparaison retour, frais, caution | 🟡 Livrée — en attente de validation |
| 6 | Paiements, échéancier, impayés, PV, sinistres, PDF | ⚪ À faire |
| 7 | Dashboard, alertes, rapports, exports, relevés investisseurs, versements | ⚪ À faire |
| 8 | Portail investisseur, PWA, sauvegardes, finitions, README | ⚪ À faire |

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

## Questions ouvertes

Aucune.

## Bugs connus

Aucun.
