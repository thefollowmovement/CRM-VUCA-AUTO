# PROGRESS — VUCA AUTO CRM

## Phases

| Phase | Contenu | Statut |
|---|---|---|
| 0 | Arborescence + schéma Prisma complet | ✅ Validée le 18/10/2026 |
| 1 | Socle : projet, Docker, base, auth, rôles, layout, navigation, réglages, partenaires, seed | ✅ Validée le 19/10/2026 (déployée sur le KVM 2) |
| 2 | Véhicules : CRUD, photos, documents, financement, statuts | 🟡 Livrée — en attente de validation |
| 3 | Dépenses + moteur de calcul + tests + rentabilité/répartition + vente | ⚪ À faire |
| 4 | Location : clients, contrats, disponibilités, planning, tarification | ⚪ À faire |
| 5 | État des lieux mobile, comparaison retour, frais, caution | ⚪ À faire |
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
- Tests : 56 tests unitaires (répartition sans perte, financement, immatriculation, VIN, échéances, CSV…) ; parcours complet dans Chromium (ordinateur + iPhone).

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

## Questions ouvertes

Aucune.

## Bugs connus

Aucun.
