# VUCA AUTO CRM

Application de gestion pour **VUCA AUTO** : achat-revente de véhicules, location (journalière, hebdomadaire, mensuelle), suivi des investisseurs et de la répartition des bénéfices.

> État d'avancement : voir [`PROGRESS.md`](PROGRESS.md). Spécification complète : [`docs/CAHIER_DES_CHARGES.md`](docs/CAHIER_DES_CHARGES.md).

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
| Installer une nouvelle version | remplacer le dossier par la nouvelle version (garder votre `.env`), puis `docker compose up -d --build` |
| **Effacer toutes les données** et recharger la démo | `docker compose exec app npm run demo:reinitialiser` puis `docker compose restart app` ⚠️ irréversible |

> L'application redémarre automatiquement avec Docker Desktop. Pour qu'elle soit disponible dès l'allumage du Mac : Docker Desktop → ⚙️ Settings → General → cochez **Start Docker Desktop when you sign in**.

### Mot de passe administrateur perdu

Un autre administrateur peut le réinitialiser dans **Réglages → Utilisateurs** (icône 🔑).

---

## 3. Utiliser l'application sur téléphone

- **Sur le même Wi-Fi que le Mac** : ouvrez `http://<nom-du-mac>.local:3000` sur le téléphone (le nom du Mac se trouve dans Réglages Système → Général → Partage).
- **Partout (parking, rue…)** : installez l'application sur un serveur en ligne (voir section 5). C'est la solution recommandée pour les états des lieux.

---

## 4. Sauvegardes

La sauvegarde automatique quotidienne (base + fichiers, conservation 30 jours) et la procédure de restauration arrivent en **Phase 8**.
En attendant, vos données sont conservées dans deux volumes Docker (`donnees_postgres` et `fichiers`) qui survivent aux arrêts et redémarrages. Ne lancez jamais `docker compose down -v` : le `-v` efface ces volumes.

---

## 5. Installation sur un serveur (VPS Hostinger ou autre)

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

```bash
bash /opt/vuca-crm/scripts/installer-vps.sh
```

Les données sont conservées ; seuls les conteneurs `vuca-crm` sont reconstruits.

### Passer à un vrai nom de domaine

Faites pointer le domaine (enregistrement A) vers l'IP du serveur, puis contactez Claude : il faudra ajuster `AUTH_URL` dans `/opt/vuca-crm/.env` et la configuration du proxy.

## 6. Pour les développeurs

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
| `npx prisma migrate dev --name <nom>` | nouvelle migration après modification du schéma |

Structure du code, conventions et règles de calcul : [`CLAUDE.md`](CLAUDE.md).
