# VUCA AUTO CRM

Application de gestion pour **VUCA AUTO** : achat-revente de véhicules, location (journalière, hebdomadaire, mensuelle), suivi des investisseurs et de la répartition des bénéfices.

**Ce que fait l'application**

- **Véhicules** : fiche complète, photos, documents, financement par VUCA AUTO et les investisseurs, entretien (CT, assurance, vidange), dommages, historique.
- **Dépenses et rentabilité** : chaque dépense est payée par un partenaire ; coût de revient, bénéfice, marge, ROI et répartition du bénéfice calculés automatiquement ; simulateur de prix de vente ; vente.
- **Location** : clients, contrats (prix calculé, options, caution), planning, états des lieux au téléphone (photos, schéma des dommages, signatures au doigt), retour avec frais proposés, échéancier, paiements et reçus, impayés, PV (avis scannés lus automatiquement par Claude, conducteur retrouvé d'après la location, délai de 45 jours suivi), sinistres, factures et PDF.
- **Pilotage** : dashboard (indicateurs, graphiques, alertes), rapports par période (PDF / Excel), versements aux investisseurs, relevés PDF.
- **Portail investisseur** : chaque investisseur voit ses véhicules et ses chiffres, en lecture seule.
- **Application installable** sur téléphone, **sauvegarde automatique** chaque nuit.

> Avancement et décisions : [`PROGRESS.md`](PROGRESS.md). Spécification : [`docs/CAHIER_DES_CHARGES.md`](docs/CAHIER_DES_CHARGES.md).

---

## 1. Installation sur Mac (pas à pas, pour débutant)

Vous aurez besoin d'une quinzaine de minutes. Tout se fait une seule fois.

### Étape 1 — Installer Docker Desktop

Docker est le logiciel qui fait tourner l'application et sa base de données, sans rien installer d'autre.

1. Allez sur <https://www.docker.com/products/docker-desktop/> et cliquez sur **Download for Mac**.
   - Mac récent (puce M1, M2, M3, M4…) : choisissez **Apple Silicon**.
   - Mac plus ancien (processeur Intel) : choisissez **Intel Chip**.
   - Pour savoir : menu  → **À propos de ce Mac** → ligne « Puce » ou « Processeur ».
2. Ouvrez le fichier téléchargé (`Docker.dmg`) et glissez l'icône **Docker** dans **Applications**.
3. Lancez **Docker** depuis le dossier Applications. Acceptez les conditions. Pas besoin de créer de compte (« Skip »).
4. Attendez que la petite baleine 🐳 en haut de l'écran, près de l'horloge, arrête de bouger : Docker est prêt.

### Étape 2 — Télécharger l'application

1. Sur la page GitHub du projet, cliquez sur le bouton vert **Code** puis **Download ZIP**.
2. Ouvrez le fichier ZIP téléchargé : un dossier `CRM-VUCA-AUTO-…` apparaît dans **Téléchargements**.
3. Renommez ce dossier en **`CRM-VUCA-AUTO`** et déplacez-le dans votre dossier personnel (la petite maison 🏠 dans le Finder).

### Étape 3 — Ouvrir le Terminal dans le bon dossier

1. Ouvrez l'application **Terminal** (touches `⌘ + Espace`, tapez `Terminal`, puis `Entrée`).
2. Copiez-collez cette commande puis appuyez sur `Entrée` :

   ```bash
   cd ~/CRM-VUCA-AUTO
   ```

   Elle signifie « aller dans le dossier CRM-VUCA-AUTO ». Rien ne s'affiche : c'est normal.

### Étape 4 — Créer le fichier de réglages `.env`

1. Copiez-collez cette commande puis `Entrée` :

   ```bash
   cp .env.example .env && open -e .env
   ```

   Elle crée le fichier `.env` à partir du modèle et l'ouvre dans TextEdit.
2. Dans TextEdit, sur la ligne `POSTGRES_PASSWORD=ChangezMoi2026`, remplacez `ChangezMoi2026` par un mot de passe de votre choix (**lettres et chiffres uniquement**, au moins 12 caractères). Vous n'aurez jamais à le retaper.
3. Enregistrez (`⌘ + S`) et fermez TextEdit.

### Étape 5 — Lancer l'application

Copiez-collez :

```bash
docker compose up -d
```

La première fois, cela prend **5 à 10 minutes** (Docker télécharge et prépare tout). Les fois suivantes : quelques secondes.
Quand le Terminal vous rend la main avec des lignes `Started` ou `Running`, c'est prêt.

### Étape 6 — Récupérer le mot de passe administrateur

Au tout premier démarrage, un mot de passe est créé pour le compte `admin@vucaauto.fr`. Pour l'afficher, copiez-collez :

```bash
docker compose logs app | grep -A5 "COMPTE ADMINISTRATEUR"
```

Notez le mot de passe affiché (format `Abcd-Efgh-Jkmn`). **Il ne sera plus jamais affiché.**

### Étape 7 — Se connecter

1. Ouvrez votre navigateur (Safari, Chrome…) à l'adresse : **<http://localhost:3000>**
2. Email : `admin@vucaauto.fr` — Mot de passe : celui de l'étape 6.
3. L'application vous demande aussitôt de **choisir votre propre mot de passe**.
4. Allez dans **Réglages** pour renseigner les informations de la société (adresse, SIRET, logo…).

🎉 C'est terminé. Des données de démonstration (investisseurs fictifs) sont chargées pour découvrir l'application.

---

## 2. Commandes utiles

Toujours depuis le Terminal, après `cd ~/CRM-VUCA-AUTO` :

| Je veux… | Commande |
|---|---|
| Démarrer l'application | `docker compose up -d` |
| Arrêter l'application | `docker compose stop` |
| Voir si elle tourne | `docker compose ps` |
| Voir les messages de l'application | `docker compose logs -f app` (quitter : `Ctrl + C`) |
| Faire une sauvegarde maintenant | `docker compose exec sauvegarde /scripts/sauvegarde-docker.sh maintenant` |
| Installer une nouvelle version | remplacer le dossier par la nouvelle version (garder votre `.env`), puis `docker compose up -d --build` |
| **Effacer toutes les données** et recharger la démo | `docker compose exec app npm run demo:reinitialiser` puis `docker compose restart app` ⚠️ irréversible |

> L'application redémarre automatiquement avec Docker Desktop. Pour qu'elle soit disponible dès l'allumage du Mac : Docker Desktop → ⚙️ Settings → General → cochez **Start Docker Desktop when you sign in**.

### Mot de passe administrateur perdu

Un autre administrateur peut le réinitialiser dans **Réglages → Utilisateurs** (icône 🔑).

---

## 3. Utiliser l'application sur téléphone

L'application s'utilise dans le navigateur du téléphone, et peut s'**installer comme une vraie application** (icône sur l'écran d'accueil, plein écran) :

- **iPhone (Safari)** : ouvrez l'adresse du CRM → bouton **Partager** (carré avec une flèche) → **Sur l'écran d'accueil** → **Ajouter**.
- **Android (Chrome)** : ouvrez l'adresse → menu **⋮** → **Installer l'application** (ou « Ajouter à l'écran d'accueil »).

Adresse à utiliser :

- **Serveur en ligne** (recommandé, fonctionne partout : parking, rue…) : l'adresse `https://…` du serveur (section 5).
- **Mac à la maison, téléphone sur le même Wi-Fi** : `http://<nom-du-mac>.local:3000` (nom du Mac : Réglages Système → Général → Partage). L'installation sur l'écran d'accueil demande une adresse `https`, donc un serveur en ligne.

Sans internet, l'application affiche une page « Pas de connexion internet » avec un bouton **Réessayer** (aucune donnée n'est gardée sur le téléphone).

---

## 4. Sauvegardes

Une **sauvegarde automatique** de la base de données et des fichiers (photos, justificatifs, signatures, logo) est faite **chaque nuit à 3 h 30**. Les sauvegardes de plus de **30 jours** sont supprimées automatiquement.

### Sur le serveur en ligne (HestiaCP — votre KVM 2)

Installée automatiquement par le script d'installation / de mise à jour.

| Je veux… | Commande (terminal du navigateur Hostinger, en root) |
|---|---|
| Voir les sauvegardes | `ls -lh /var/backups/vuca-crm` |
| Faire une sauvegarde maintenant | `bash /opt/vuca-crm/app/scripts/sauvegarde-serveur.sh` |
| Vérifier que la sauvegarde nocturne est programmée | `systemctl list-timers vuca-crm-sauvegarde.timer` |
| Lister les sauvegardes restaurables | `bash /opt/vuca-crm/app/scripts/restaurer-serveur.sh` |
| **Restaurer** une sauvegarde | `bash /opt/vuca-crm/app/scripts/restaurer-serveur.sh 2026-10-20_033000` (remplacez par une date de la liste, puis tapez `oui`) |

La restauration fait d'abord une sauvegarde de l'état actuel (au cas où), arrête l'application, remet la base et les fichiers de la date choisie, puis redémarre. Les anciens fichiers sont gardés dans un dossier `storage.avant-restauration-…` à supprimer quand tout est vérifié.

**Conseil** : de temps en temps, téléchargez une sauvegarde sur votre Mac (ou un disque externe) : si le serveur disparaissait, vous auriez une copie. Les trois fichiers d'une même date (`base-…dump`, `fichiers-…tar.gz`, `env-…`) suffisent pour tout réinstaller.

### Avec Docker (Mac)

Un service `sauvegarde` tourne à côté de l'application et écrit dans le dossier **`sauvegardes`** à côté de `docker-compose.yml` (visible dans le Finder).

| Je veux… | Commande (dans le dossier du projet) |
|---|---|
| Faire une sauvegarde maintenant | `docker compose exec sauvegarde /scripts/sauvegarde-docker.sh maintenant` |
| Lister les sauvegardes | `docker compose exec sauvegarde /scripts/restaurer-docker.sh` |
| **Restaurer** une sauvegarde | `docker compose stop app` puis `docker compose exec sauvegarde /scripts/restaurer-docker.sh 2026-10-20_033000` puis `docker compose start app` |

Le Mac doit être allumé à 3 h 30 pour la sauvegarde automatique (sinon, lancez-en une à la main). Ne lancez jamais `docker compose down -v` : le `-v` efface les données.

---

## 5. Portail investisseur

Chaque investisseur peut avoir son propre accès, **en lecture seule** : il ne voit que les véhicules qu'il finance et ses chiffres (capital engagé, bénéfices, déjà versé, reste dû, versements, relevé PDF), jamais les autres investisseurs.

1. **Réglages → Utilisateurs → Nouveau compte** : nom, email, rôle **Investisseur**, puis choisissez l'investisseur concerné.
2. Un mot de passe temporaire s'affiche : transmettez-le à l'investisseur avec l'adresse du CRM. Il choisira son propre mot de passe à la première connexion.
3. Pour voir exactement ce qu'il voit : fiche de l'investisseur → **Voir son espace**.

Pour couper un accès : **Réglages → Utilisateurs** → modifier le compte → décocher **Compte actif** (effet immédiat).

---

## 6. Premiers pas dans l'application

1. **Réglages** (admin) : informations de la société et logo (utilisés dans les PDF), conditions générales de location, mention des factures, options de location, check-list des états des lieux, seuils d'alerte, frais de retour.
2. **Investisseurs** : ajoutez les personnes qui financent les véhicules (VUCA AUTO existe déjà).
3. **Véhicules → Nouveau véhicule** : prix d'achat et qui a financé quoi ; type achat-revente, location ou mixte ; tarifs de location.
4. **Dépenses** : bouton **+** → Dépense, en indiquant qui a payé (photo du justificatif possible).
5. **Vendre** : fiche du véhicule → **Marquer comme vendu** : la répartition entre partenaires est calculée, puis enregistrez les **versements** sur la fiche de chaque investisseur.
6. **Louer** : **Location → Nouvelle location** (client, dates, véhicule disponible, prix calculé), puis **Départ** et **Retour** au téléphone (états des lieux), **Encaisser un paiement**, factures et PDF depuis la fiche du contrat.
7. **Dashboard** : chiffres de la période, alertes « À traiter » ; **Rapports** : bilan PDF / Excel à transmettre au comptable.

---

## 7. Installation sur un serveur (VPS Hostinger ou autre)

Le script `scripts/installer-vps.sh` installe l'application sur un VPS **qui héberge déjà d'autres projets**, sans les toucher :

1. il **analyse** le serveur sans rien modifier (Docker, ports 80/443, proxy déjà en place) ;
2. il **affiche ce qu'il va faire** et attend que vous tapiez `oui` ;
3. il n'ajoute que ses propres éléments : dossier `/opt/vuca-crm`, conteneurs et volumes `vuca-crm-…`, et au besoin **un seul** nouveau fichier nginx ;
4. il **s'arrête** si la configuration du serveur n'est pas reconnue.

Selon ce qu'il trouve :

| Sur le serveur | Ce que fait le script |
|---|---|
| Ports 80/443 libres | démarre un petit proxy Caddy qui gère le HTTPS automatiquement |
| Traefik dans Docker (ex. modèle n8n, Coolify) | branche l'application sur ce Traefik, sans modifier sa configuration |
| **HestiaCP** | passe par les commandes de Hestia (script `installer-hestia.sh`, voir ci-dessous) |
| nginx installé | ajoute un fichier `vuca-crm.conf`, vérifie (`nginx -t`), recharge, puis obtient le certificat avec certbot |
| Autre chose | s'arrête et n'installe rien |

**Domaine temporaire** : `crm-vuca.<votre-ip-avec-tirets>.sslip.io` (service gratuit qui pointe automatiquement vers l'IP du serveur), avec un vrai certificat SSL Let's Encrypt.

### Lancer l'installation

1. hPanel Hostinger → **VPS** → **Gérer** → bouton **Terminal du navigateur** (vous êtes connecté en `root`).
2. Copiez-collez cette ligne, puis `Entrée` :

   ```bash
   curl -fsSL https://raw.githubusercontent.com/thefollowmovement/CRM-VUCA-AUTO/claude/zealous-euler-5gd2q0/scripts/installer-vps.sh -o installer-vps.sh && BRANCHE=claude/zealous-euler-5gd2q0 bash installer-vps.sh
   ```

3. Lisez le résumé, tapez `oui`. Comptez 5 à 10 minutes.
4. À la fin s'affichent l'adresse `https://…sslip.io` et le mot de passe administrateur : **notez-le**.

Pour seulement voir ce que le script ferait : ajoutez `--simulation` à la fin de la commande.

### Serveur avec HestiaCP

Sur un serveur géré par HestiaCP, le script `scripts/installer-hestia.sh` (appelé automatiquement par `installer-vps.sh`) :

- installe l'application **sans Docker** (qui entre en conflit avec le pare-feu de Hestia) : Node.js privé dans `/opt/vuca-crm`, base PostgreSQL `vuca_crm`, service `vuca-crm` sur `127.0.0.1` uniquement, fichiers dans `/var/lib/vuca-crm` ;
- crée le domaine **avec les commandes de Hestia** et un modèle nginx dédié `vuca-crm` : le site apparaît dans le panneau Hestia, le certificat Let's Encrypt est géré et renouvelé par Hestia ;
- ne touche à aucun autre site ; en cas d'interruption, une nouvelle exécution retire ses propres éléments et recommence.

Commande (terminal du navigateur Hostinger, en root) :

```bash
curl -fsSL https://raw.githubusercontent.com/thefollowmovement/CRM-VUCA-AUTO/claude/zealous-euler-5gd2q0/scripts/installer-hestia.sh -o installer-hestia.sh && BRANCHE=claude/zealous-euler-5gd2q0 bash installer-hestia.sh
```

Mise à jour : `bash /opt/vuca-crm/app/scripts/installer-hestia.sh` · Journal : `journalctl -u vuca-crm -n 100`

### Mettre à jour plus tard

- Serveur **HestiaCP** (votre KVM 2) : `bash /opt/vuca-crm/app/scripts/installer-hestia.sh`
- Serveur avec Docker : `bash /opt/vuca-crm/scripts/installer-vps.sh`

Les données sont conservées. La mise à jour installe aussi la sauvegarde automatique si elle n'existe pas encore.

### Domaines : site public et CRM

La même application sert deux adresses :

| Adresse | Contenu |
|---|---|
| `https://vuca-auto.fr` | site vitrine public (véhicules à vendre), sans connexion |
| `https://www.vuca-auto.fr` | redirige vers `https://vuca-auto.fr` |
| `https://crm.vuca-auto.fr` | le CRM, avec connexion (l'ancienne adresse `crm-vuca.72-61-164-158.sslip.io` reste utilisable) |

**1. DNS** (chez Hostinger : Domaines → vuca-auto.fr → DNS / Nameservers). Trois enregistrements **A** vers l'IP du serveur — déjà en place :

| Type | Nom | Valeur | TTL |
|---|---|---|---|
| A | `@` | `72.61.164.158` | 14400 |
| A | `www` | `72.61.164.158` | 14400 |
| A | `crm` | `72.61.164.158` | 14400 |

Ne pas ajouter d'enregistrement **AAAA** (IPv6) tant que le serveur n'est pas configuré pour : les visiteurs en IPv6 tomberaient sur une erreur. Un changement de DNS peut mettre jusqu'à quelques heures à se propager.

**2. Serveur** (terminal du navigateur Hostinger, en root), après la mise à jour de l'application :

```bash
bash /opt/vuca-crm/app/scripts/configurer-domaines.sh
```

Le script enregistre les domaines dans `/opt/vuca-crm/.env`, vérifie que Caddy les sert (il ne modifie au besoin que le fichier du CRM `/etc/caddy/vuca-crm.caddy`, avec sauvegarde et retour arrière), redémarre l'application et vérifie les adresses. Caddy obtient et renouvelle tout seul les certificats HTTPS. Le script peut être relancé sans risque (par exemple après l'ajout de `www` dans le DNS).

**3. Vérifier** que tout répond :

```bash
for u in https://vuca-auto.fr https://www.vuca-auto.fr https://crm.vuca-auto.fr/connexion; do echo "$u → $(curl -s -o /dev/null -w '%{http_code}' $u)"; done
```

Attendu : `200`, `301` (redirection de www vers vuca-auto.fr), `200`. Si vuca-auto.fr répond `307`, le domaine du site n'est pas encore enregistré : lancez `configurer-domaines.sh` (ci-dessus).

Sur `vuca-auto.fr`, aucune page du CRM n'existe (pas d'écran de connexion, réponse « page introuvable ») et aucun cookie n'est posé.

### Ouvrir le site au public

Le site est **en maintenance** tant que vous ne l'ouvrez pas (« Notre site arrive bientôt »). La marche à suivre complète — sauvegarde, **retrait de la démonstration** (Réglages → Démonstration), vos informations, publication des voitures, mise en ligne, Google Search Console — est dans le **[guide du site](GUIDE_SITE.md)**. Dans le CRM, **Site web → Général** affiche la liste « Avant la mise en ligne ».

## 8. Amendes : import des avis et lecture automatique

Location → **PV** → **Importer** : déposez les scans des avis de contravention (PDF, JPG, PNG ou photo d'iPhone, **20 Mo maximum par fichier**). Un PDF de plusieurs avis est découpé page par page. Chaque page est lue par Claude (API Anthropic) **en tâche de fond** — rien à installer, pas de cron : la lecture tourne dans le serveur du CRM et reprend seule après un redémarrage. L'avis est ensuite rattaché à la location qui avait le véhicule au moment de l'infraction ; vous vérifiez tout dans **PV → À valider** (scan à gauche, champs modifiables, locataire proposé), puis **Valider la sélection** passe les PV « à désigner ».

### Clé de l'API Claude (une fois)

1. Sur [console.anthropic.com](https://console.anthropic.com) : créez un compte (moyen de paiement requis), puis **API keys → Create key**. Copiez la clé (elle commence par `sk-ant-`).
2. Dans le terminal du serveur (Hostinger → VPS → Terminal), copiez-collez :
   ```bash
   bash /opt/vuca-crm/app/scripts/configurer-cle-anthropic.sh
   ```
   Collez la clé quand le script la demande (**rien ne s'affiche pendant la saisie, c'est normal**), puis Entrée. Le script vérifie la clé, l'écrit dans `/opt/vuca-crm/.env` (copie de sauvegarde avant) et redémarre le CRM.
3. Dans le CRM : **Réglages → Amendes** doit afficher « Clé configurée : oui ». Les avis déjà déposés sont lus aussitôt.

La clé reste dans `.env` : elle n'est jamais affichée dans le CRM, envoyée au navigateur ni écrite dans les journaux. Avec Docker, ajoutez `ANTHROPIC_API_KEY=…` dans le fichier `.env` puis `docker compose up -d`.

### Dépendance système

Les miniatures des PDF utilisent `pdftoppm` (paquet `poppler-utils`), installé automatiquement par `installer-hestia.sh` (et présent dans l'image Docker). Sans lui, tout fonctionne mais les PDF s'ouvrent sans miniature. Installation manuelle : `apt-get install -y poppler-utils`.

### Réglages → Amendes

Raison sociale **exactement comme sur les avis** (sinon l'avis est signalé « adressé à un autre titulaire »), adresse du siège, email des confirmations ANTAI, frais de gestion par PV désigné (0 = aucun) et modèle utilisé (par défaut `claude-haiku-5-5`, rapide et économique). Champs vides = informations de Réglages → Société.

## 9. Pour les développeurs

Prérequis : Node.js 22, PostgreSQL 16+.

```bash
npm install              # dépendances (+ génère le client Prisma)
cp .env.example .env     # puis adapter DATABASE_URL (localhost)
npx prisma migrate dev   # crée / met à jour la base
npm run db:seed -- --demo
npm run dev              # http://localhost:3000
```

| Commande | Rôle |
|---|---|
| `npm test` | tests unitaires (Vitest) |
| `npm run typecheck` | vérification TypeScript |
| `npm run build` | construction de production |
| `npm run test:e2e:site` | parcours du site public dans un navigateur (site en ligne ; variables dans `e2e/site.e2e.mjs`) |
| `TEST_DATABASE_URL=… npm test` | ajoute le test d'intégration de l'import des PV (base de TEST remplie avec la démo, API Claude simulée) |
| `npx prisma migrate dev --name <nom>` | nouvelle migration après modification du schéma |

Structure du code, conventions et règles de calcul : [`CLAUDE.md`](CLAUDE.md).
