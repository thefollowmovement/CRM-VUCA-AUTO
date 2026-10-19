#!/usr/bin/env bash
# =====================================================================
#  VUCA AUTO CRM — installation / mise à jour sur un serveur HestiaCP
#
#  Pensé pour un serveur qui héberge DÉJÀ d'autres sites :
#   1. analyse le serveur SANS RIEN MODIFIER ;
#   2. affiche ce qu'il va faire et demande confirmation (« oui ») ;
#   3. n'ajoute que ses propres éléments :
#        - dossier /opt/vuca-crm (application + Node.js privé)
#        - utilisateur système « vuca-crm », service systemd « vuca-crm »
#        - base PostgreSQL « vuca_crm » (PostgreSQL installé s'il est absent)
#        - un domaine web créé PAR LES COMMANDES DE HESTIA, avec un modèle
#          nginx « vuca-crm » et un certificat Let's Encrypt géré par Hestia ;
#   4. ne modifie aucun site ni aucun fichier existant ;
#   5. s'arrête si quelque chose n'est pas conforme à ce qu'il attend.
#
#  Usage (en root) :
#    bash installer-hestia.sh                # installe, ou met à jour
#    bash installer-hestia.sh --simulation   # analyse seulement
#  Variables facultatives : DOMAINE=crm.mondomaine.fr  BRANCHE=main  UTILISATEUR_HESTIA=<compte Hestia>
# =====================================================================
set -euo pipefail

# En mise à jour, ce fichier est remplacé pendant l'exécution : on travaille sur une copie.
if [[ -z "${VUCA_COPIE:-}" ]]; then
  COPIE=$(mktemp /tmp/installer-hestia.XXXXXX.sh)
  cp "$0" "$COPIE"
  VUCA_COPIE=1 exec bash "$COPIE" "$@"
fi

DEPOT="https://github.com/thefollowmovement/CRM-VUCA-AUTO.git"
BRANCHE="${BRANCHE:-main}"
RACINE="/opt/vuca-crm"
APP="$RACINE/app"
NODE_DIR="$RACINE/node"
ENV_FICHIER="$RACINE/.env"
FICHIER_INSTALL="$RACINE/.installation"
DONNEES="/var/lib/vuca-crm"
JOURNAL="/var/log/vuca-crm-installation.log"
UTILISATEUR_SYS="vuca-crm"
SERVICE="vuca-crm"
BASE="vuca_crm"
MODELE="vuca-crm"
UTILISATEUR_HESTIA="${UTILISATEUR_HESTIA:-}"   # détecté automatiquement si vide
export HESTIA="/usr/local/hestia"
VBIN="$HESTIA/bin"
SIMULATION=false
[[ "${1:-}" == "--simulation" ]] && SIMULATION=true

vert() { printf '\033[32m%s\033[0m\n' "$*"; }
jaune() { printf '\033[33m%s\033[0m\n' "$*"; }
rouge() { printf '\033[31m%s\033[0m\n' "$*"; }
titre() { printf '\n\033[1;34m== %s ==\033[0m\n' "$*"; }
arret() {
  rouge "ARRÊT : $*"
  rouge "Copiez tout ce qui est affiché ci-dessus et envoyez-le à Claude."
  exit 1
}
trap 'rouge "Erreur inattendue à la ligne $LINENO. Copiez ce qui est affiché et envoyez-le à Claude."' ERR

[[ $EUID -eq 0 ]] || arret "lancez ce script en root."
[[ -d "$HESTIA" && -x "$VBIN/v-list-user" ]] || arret "HestiaCP introuvable sur ce serveur (utilisez installer-vps.sh)."
command -v ss >/dev/null || arret "la commande « ss » est absente : impossible de vérifier les ports."

port_libre() { [[ -z "$(ss -ltnH "( sport = :$1 )" 2>/dev/null)" ]]; }
# Exécute une commande en tant qu'utilisateur de l'application, avec Node.js privé et le .env.
en_appli() {
  runuser -u "$UTILISATEUR_SYS" -- env -i HOME="$RACINE" PATH="$NODE_DIR/bin:/usr/bin:/bin" \
    NEXT_TELEMETRY_DISABLED=1 bash -c "set -a; . '$ENV_FICHIER'; set +a; cd '$APP'; $1"
}
ecrire_repere() {
  cat >"$FICHIER_INSTALL" <<FIN
ETAT=$1
DOMAINE=$DOMAINE
APP_PORT=$APP_PORT
BRANCHE=$BRANCHE
UTILISATEUR_HESTIA=$UTILISATEUR_HESTIA
DATE_ETAT="$(date '+%d/%m/%Y %H:%M')"
FIN
}
pg() { (cd /tmp && runuser -u postgres -- psql -v ON_ERROR_STOP=1 -tA "$@"); }
git_appli() { runuser -u "$UTILISATEUR_SYS" -- env HOME="$RACINE" git "$@"; }

# =====================================================================
titre "1. Analyse du serveur (aucune modification)"
# =====================================================================
. /etc/os-release
HCONF="$HESTIA/conf/hestia.conf"
lire_conf() { grep -E "^$1=" "$HCONF" | head -1 | cut -d= -f2 | tr -d "'\"" || true; }
WEB_SYSTEM=$(lire_conf WEB_SYSTEM)
PROXY_SYSTEM=$(lire_conf PROXY_SYSTEM)
DB_SYSTEM=$(lire_conf DB_SYSTEM)
VERSION_HESTIA=$(lire_conf VERSION)
echo "Système        : $PRETTY_NAME ($(uname -m))"
echo "HestiaCP       : ${VERSION_HESTIA:-?} — web : ${WEB_SYSTEM:-?} · proxy : ${PROXY_SYSTEM:-aucun} · bases : ${DB_SYSTEM:-?}"
echo "Mémoire libre  : $(free -m | awk '/Mem:/ {print $7}') Mo · disque libre : $(df -h / | awk 'NR==2 {print $4}')"

case "$(uname -m)" in
  x86_64) ARCH_NODE="linux-x64" ;;
  aarch64) ARCH_NODE="linux-arm64" ;;
  *) arret "architecture $(uname -m) non prise en charge." ;;
esac

# Où placer le modèle nginx selon la configuration de Hestia
if [[ "$PROXY_SYSTEM" == "nginx" ]]; then
  TYPE_MODELE="proxy"                                   # nginx devant Apache
  DOSSIER_MODELES="$HESTIA/data/templates/web/nginx"
  PORT_HTTP="%proxy_port%"; PORT_HTTPS="%proxy_ssl_port%"
elif [[ "$WEB_SYSTEM" == "nginx" ]]; then
  TYPE_MODELE="web"                                     # nginx seul (php-fpm)
  DOSSIER_MODELES="$HESTIA/data/templates/web/nginx/php-fpm"
  PORT_HTTP="%web_port%"; PORT_HTTPS="%web_ssl_port%"
else
  arret "configuration web de Hestia non reconnue (ni proxy nginx, ni nginx seul)."
fi
[[ -d "$DOSSIER_MODELES" ]] || arret "dossier des modèles Hestia introuvable : $DOSSIER_MODELES"
# Si nginx refuse déjà sa propre configuration, Hestia ne pourra ajouter aucun domaine :
# on s'arrête avant toute modification et on montre l'erreur (sans y toucher).
if ! SORTIE_NGINX=$(nginx -t 2>&1); then
  echo "$SORTIE_NGINX" | grep -vi "warn" | tail -n 5
  arret "la configuration nginx actuelle du serveur est déjà en erreur (ci-dessus). Je n'y touche pas."
fi
echo "nginx          : configuration valide"
echo "Modèles nginx  : $DOSSIER_MODELES (type $TYPE_MODELE)"

# Compte Hestia qui portera le domaine : celui d'une installation précédente,
# sinon le compte administrateur du panneau (rôle « admin »), sinon le seul compte existant.
COMPTES=$(find "$HESTIA/data/users" -mindepth 2 -maxdepth 2 -name user.conf -printf '%h\n' 2>/dev/null | xargs -rn1 basename | sort)
echo "Comptes Hestia : $(tr '\n' ' ' <<<"$COMPTES")"
if [[ -z "$UTILISATEUR_HESTIA" && -f "$FICHIER_INSTALL" ]]; then
  UTILISATEUR_HESTIA=$(grep -E '^UTILISATEUR_HESTIA=' "$FICHIER_INSTALL" | cut -d= -f2 || true)
fi
if [[ -z "$UTILISATEUR_HESTIA" ]]; then
  ADMINS=$(grep -lE "^ROLE='?admin'?" "$HESTIA"/data/users/*/user.conf 2>/dev/null | xargs -rn1 dirname | xargs -rn1 basename || true)
  if [[ $(grep -c . <<<"$ADMINS") -eq 1 ]]; then
    UTILISATEUR_HESTIA=$ADMINS
  elif [[ $(grep -c . <<<"$COMPTES") -eq 1 ]]; then
    UTILISATEUR_HESTIA=$COMPTES
  else
    arret "plusieurs comptes Hestia possibles. Relancez en précisant le compte, par exemple : UTILISATEUR_HESTIA=nomducompte bash installer-hestia.sh"
  fi
fi
"$VBIN/v-list-user" "$UTILISATEUR_HESTIA" plain >/dev/null 2>&1 ||
  arret "le compte Hestia « $UTILISATEUR_HESTIA » n'existe pas (comptes disponibles ci-dessus)."
echo "Compte Hestia utilisé : $UTILISATEUR_HESTIA (le domaine du CRM lui sera rattaché)"

MISE_A_JOUR=false
REPRISE=false
ETAT=""
if [[ -f "$FICHIER_INSTALL" ]]; then
  # shellcheck disable=SC1090
  . "$FICHIER_INSTALL"
fi
if [[ "$ETAT" == "terminee" ]]; then
  MISE_A_JOUR=true
  vert "VUCA AUTO CRM est déjà installé → mode MISE À JOUR (domaine $DOMAINE)."
else
  if [[ "$ETAT" == "en_cours" ]]; then
    REPRISE=true
    jaune "Une installation précédente s'est interrompue : ses éléments (vuca-crm uniquement) seront retirés, puis l'installation relancée."
  else
    [[ -e "$RACINE" ]] && arret "le dossier $RACINE existe déjà mais n'a pas été créé par ce script."
    id "$UTILISATEUR_SYS" >/dev/null 2>&1 && arret "l'utilisateur système $UTILISATEUR_SYS existe déjà."
    [[ -e "/etc/systemd/system/$SERVICE.service" ]] && arret "le service $SERVICE existe déjà."
    ls "$DOSSIER_MODELES/$MODELE".* >/dev/null 2>&1 && arret "un modèle nginx « $MODELE » existe déjà dans Hestia."
  fi

  IP=$(curl -4 -fs --max-time 10 https://api.ipify.org || hostname -I | awk '{print $1}')
  [[ "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || arret "adresse IP publique introuvable."
  [[ "$REPRISE" == true ]] || DOMAINE="${DOMAINE:-crm-vuca.${IP//./-}.sslip.io}"
  IP_DOMAINE=$(getent ahostsv4 "$DOMAINE" | awk 'NR==1 {print $1}' || true)
  echo "IP publique    : $IP"
  echo "Domaine        : $DOMAINE → ${IP_DOMAINE:-introuvable}"
  [[ "$IP_DOMAINE" == "$IP" ]] || arret "le domaine $DOMAINE ne pointe pas vers ce serveur."
  if [[ "$REPRISE" == false ]] && "$VBIN/v-list-web-domain" "$UTILISATEUR_HESTIA" "$DOMAINE" plain >/dev/null 2>&1; then
    arret "le domaine $DOMAINE existe déjà dans Hestia."
  fi

  if [[ "$REPRISE" == false || -z "${APP_PORT:-}" ]]; then
    APP_PORT=3100
    while ! port_libre "$APP_PORT"; do APP_PORT=$((APP_PORT + 1)); done
  fi
  echo "Port interne   : 127.0.0.1:$APP_PORT"

  if command -v psql >/dev/null; then
    PG_PRESENT=true
    systemctl is-active --quiet postgresql ||
      arret "PostgreSQL est installé mais arrêté. Je n'y touche pas : démarrez-le ou contactez Claude."
    echo "PostgreSQL     : déjà installé ($(psql --version | awk '{print $3}'))"
    if [[ "$REPRISE" == false ]]; then
      [[ "$(pg -c "select 1 from pg_roles where rolname='$BASE'")" == "1" ]] && arret "le rôle PostgreSQL $BASE existe déjà."
      [[ "$(pg -c "select 1 from pg_database where datname='$BASE'")" == "1" ]] && arret "la base PostgreSQL $BASE existe déjà."
    fi
  else
    PG_PRESENT=false
    jaune "PostgreSQL     : absent → il sera installé (paquets Ubuntu, écoute en local uniquement)."
  fi
fi

# =====================================================================
titre "2. Ce qui va être fait"
# =====================================================================
if [[ "$MISE_A_JOUR" == true ]]; then
  echo " • Télécharger la dernière version (branche $BRANCHE)"
  echo " • Reconstruire l'application, appliquer les migrations de la base, redémarrer le service $SERVICE"
  echo " • Données, configuration et domaine Hestia conservés."
else
  [[ "$REPRISE" == true ]] && echo " • Retirer les éléments de l'installation interrompue (service, dossier, base, domaine « vuca-crm »)"
  [[ "$PG_PRESENT" == false ]] && echo " • Installer PostgreSQL (apt install postgresql)"
  echo " • Créer l'utilisateur système « $UTILISATEUR_SYS » et le dossier $RACINE"
  echo " • Installer Node.js 22 dans $NODE_DIR (privé, n'affecte pas le reste du serveur)"
  echo " • Télécharger l'application (branche $BRANCHE) et la construire"
  echo " • Créer la base PostgreSQL « $BASE » avec un mot de passe aléatoire"
  echo " • Créer le service systemd « $SERVICE » (application sur 127.0.0.1:$APP_PORT uniquement)"
  echo " • Dans Hestia : ajouter le modèle nginx « $MODELE », créer le domaine $DOMAINE"
  echo "   pour l'utilisateur $UTILISATEUR_HESTIA, puis le certificat SSL Let's Encrypt"
  echo " • Aucun autre site, modèle ou fichier existant n'est modifié."
  echo
  vert "Adresse de l'application : https://$DOMAINE"
fi

if [[ "$SIMULATION" == true ]]; then
  vert $'\nSimulation terminée : rien n\'a été modifié.'
  exit 0
fi
echo
read -r -p "Continuer ? Tapez « oui » puis Entrée : " REPONSE || REPONSE=""
[[ "$REPONSE" == "oui" ]] || { jaune "Annulé, rien n'a été modifié."; exit 0; }
touch "$JOURNAL" && chmod 600 "$JOURNAL"
echo "=== $(date '+%d/%m/%Y %H:%M') ===" >>"$JOURNAL"

# =====================================================================
titre "3. Installation"
# =====================================================================
installer_node() {
  echo "→ Node.js 22…"
  local tmp liste fichier
  tmp=$(mktemp -d)
  liste=$(curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt)
  fichier=$(grep -E "node-v22\.[0-9.]+-$ARCH_NODE\.tar\.xz$" <<<"$liste" | awk '{print $2}' | head -1)
  [[ -n "$fichier" ]] || arret "version de Node.js introuvable."
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/$fichier" -o "$tmp/$fichier"
  (cd "$tmp" && grep " $fichier\$" <<<"$liste" | sha256sum -c --quiet -) || arret "empreinte de Node.js invalide."
  rm -rf "$NODE_DIR.nouveau" && mkdir -p "$NODE_DIR.nouveau"
  tar -xJf "$tmp/$fichier" -C "$NODE_DIR.nouveau" --strip-components=1
  rm -rf "$NODE_DIR" && mv "$NODE_DIR.nouveau" "$NODE_DIR"
  rm -rf "$tmp"
}

# Retire UNIQUEMENT les éléments créés par une installation interrompue de ce script.
nettoyer_reprise() {
  echo "→ Nettoyage de l'installation interrompue…"
  systemctl disable --now "$SERVICE" >/dev/null 2>&1 || true
  rm -f "/etc/systemd/system/$SERVICE.service"
  systemctl daemon-reload || true
  if "$VBIN/v-list-web-domain" "$UTILISATEUR_HESTIA" "$DOMAINE" plain >/dev/null 2>&1; then
    "$VBIN/v-delete-web-domain" "$UTILISATEUR_HESTIA" "$DOMAINE" >/dev/null || true
  fi
  rm -f "$DOSSIER_MODELES/$MODELE.tpl" "$DOSSIER_MODELES/$MODELE.stpl"
  if command -v psql >/dev/null; then
    pg -c "DROP DATABASE IF EXISTS $BASE;" >/dev/null
    pg -c "DROP ROLE IF EXISTS $BASE;" >/dev/null
  fi
  rm -rf /opt/vuca-crm /var/lib/vuca-crm
  if id "$UTILISATEUR_SYS" >/dev/null 2>&1; then userdel "$UTILISATEUR_SYS"; fi
}

etape() {
  local libelle=$1 commande=$2
  echo "→ $libelle…"
  if ! en_appli "$commande" >>"$JOURNAL" 2>&1; then
    tail -n 30 "$JOURNAL"
    arret "échec de l'étape « $libelle » (journal complet : $JOURNAL)."
  fi
}

construire() {
  etape "Installation des dépendances (quelques minutes)" "npm ci --no-audit --no-fund --loglevel=error"
  etape "Construction de l'application" "npm run build"
  etape "Mise à jour de la base de données" "npx prisma migrate deploy"
}

if [[ "$MISE_A_JOUR" == true ]]; then
  installer_node
  echo "→ Téléchargement de la dernière version…"
  git_appli -C "$APP" fetch --depth 1 origin "$BRANCHE"
  git_appli -C "$APP" checkout -q -B "$BRANCHE" FETCH_HEAD
  construire
  etape "Données de base" "npx tsx prisma/seed/index.ts"
  systemctl restart "$SERVICE"
else
  echo "→ Paquets système nécessaires…"
  PAQUETS=(git curl xz-utils)
  [[ "$PG_PRESENT" == false ]] && PAQUETS+=(postgresql)
  apt-get update -qq >>"$JOURNAL" 2>&1 || true
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${PAQUETS[@]}" >>"$JOURNAL" 2>&1 ||
    arret "échec de l'installation des paquets (journal : $JOURNAL)."
  systemctl enable --now postgresql >/dev/null 2>&1 || true

  if [[ "$REPRISE" == true ]]; then nettoyer_reprise; fi

  echo "→ Utilisateur système et dossiers…"
  mkdir -p "$RACINE"
  # Repère « en cours » : permet de reprendre proprement si l'installation s'interrompt.
  ecrire_repere en_cours
  useradd --system --home-dir "$RACINE" --shell /usr/sbin/nologin "$UTILISATEUR_SYS"
  mkdir -p "$DONNEES/storage"
  chown "$UTILISATEUR_SYS:$UTILISATEUR_SYS" "$RACINE" "$DONNEES" "$DONNEES/storage"
  chmod 750 "$DONNEES"

  installer_node

  echo "→ Téléchargement de l'application…"
  git_appli clone -q --depth 1 --branch "$BRANCHE" "$DEPOT" "$APP"

  echo "→ Base de données…"
  alea() { tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$1" || true; }
  MDP_BASE=$(alea 32)
  pg -c "CREATE ROLE $BASE LOGIN PASSWORD '$MDP_BASE';" >/dev/null
  pg -c "CREATE DATABASE $BASE OWNER $BASE;" >/dev/null

  umask 027
  cat >"$ENV_FICHIER" <<EOF
# Généré par installer-hestia.sh le $(date '+%d/%m/%Y %H:%M') — ne pas partager.
DATABASE_URL=postgresql://$BASE:$MDP_BASE@127.0.0.1:5432/$BASE
AUTH_SECRET=$(alea 48)
AUTH_URL=https://$DOMAINE
AUTH_TRUST_HOST=true
STORAGE_DIR=$DONNEES/storage
SEED_DEMO=true
APP_PORT=$APP_PORT
TZ=Europe/Paris
EOF
  umask 022
  chown "root:$UTILISATEUR_SYS" "$ENV_FICHIER"
  chmod 640 "$ENV_FICHIER"

  construire

  echo "→ Données de base et compte administrateur…"
  SORTIE_SEED=$(en_appli "npx tsx prisma/seed/index.ts" 2>>"$JOURNAL") ||
    arret "échec de l'initialisation des données (journal : $JOURNAL)."
  MDP_ADMIN=$(grep "Mot de passe :" <<<"$SORTIE_SEED" | head -1 | awk -F': ' '{print $2}' | tr -d ' \r' || true)

  echo "→ Service systemd…"
  cat >"/etc/systemd/system/$SERVICE.service" <<EOF
# VUCA AUTO CRM — créé par installer-hestia.sh
[Unit]
Description=VUCA AUTO CRM
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$UTILISATEUR_SYS
WorkingDirectory=$APP
EnvironmentFile=$ENV_FICHIER
Environment=NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PATH=$NODE_DIR/bin:/usr/bin:/bin
ExecStart=$NODE_DIR/bin/node node_modules/next/dist/bin/next start -H 127.0.0.1 -p \${APP_PORT}
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
ProtectSystem=full
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable --now "$SERVICE" >/dev/null 2>&1

fi

echo "→ Attente du démarrage de l'application…"
for _ in $(seq 1 40); do
  curl -fs -o /dev/null "http://127.0.0.1:$APP_PORT/connexion" && break
  sleep 3
done
curl -fs -o /dev/null "http://127.0.0.1:$APP_PORT/connexion" ||
  arret "l'application ne répond pas. Journal : journalctl -u $SERVICE -n 50"
vert "Application démarrée."

# --- Hestia : modèle nginx, domaine, SSL -------------------------------
if [[ "$MISE_A_JOUR" == false ]]; then
  echo "→ Modèle nginx « $MODELE » dans Hestia…"
  ENTETES_PROXY="        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_read_timeout 120s;"
  cat >"$DOSSIER_MODELES/$MODELE.tpl" <<EOF
# VUCA AUTO CRM — modèle ajouté par installer-hestia.sh (application Node.js sur 127.0.0.1:$APP_PORT)
server {
    listen      %ip%:$PORT_HTTP;
    server_name %domain_idn% %alias_idn%;
    client_max_body_size 20m;

    include %home%/%user%/conf/web/%domain%/nginx.forcessl.conf*;

    location / {
$ENTETES_PROXY
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /error/ {
        alias %home%/%user%/web/%domain%/document_errors/;
    }

    include %home%/%user%/conf/web/%domain%/nginx.conf_*;
}
EOF
  cat >"$DOSSIER_MODELES/$MODELE.stpl" <<EOF
# VUCA AUTO CRM — modèle ajouté par installer-hestia.sh (application Node.js sur 127.0.0.1:$APP_PORT)
server {
    listen      %ip%:$PORT_HTTPS ssl;
    server_name %domain_idn% %alias_idn%;
    client_max_body_size 20m;

    ssl_certificate     %ssl_pem%;
    ssl_certificate_key %ssl_key%;

    include %home%/%user%/conf/web/%domain%/nginx.hsts.conf*;

    location / {
$ENTETES_PROXY
        proxy_set_header X-Forwarded-Proto https;
    }

    location /error/ {
        alias %home%/%user%/web/%domain%/document_errors/;
    }

    include %home%/%user%/conf/web/%domain%/nginx.ssl.conf_*;
}
EOF

  annuler_hestia() {
    "$VBIN/v-delete-web-domain" "$UTILISATEUR_HESTIA" "$DOMAINE" >/dev/null 2>&1 || true
    rm -f "$DOSSIER_MODELES/$MODELE.tpl" "$DOSSIER_MODELES/$MODELE.stpl"
  }

  echo "→ Création du domaine $DOMAINE dans Hestia…"
  "$VBIN/v-add-web-domain" "$UTILISATEUR_HESTIA" "$DOMAINE" >>"$JOURNAL" 2>&1 ||
    { tail -n 8 "$JOURNAL"; annuler_hestia; arret "Hestia a refusé la création du domaine (message ci-dessus ; rien n'a été laissé dans Hestia)."; }
  # Hestia ajoute un alias « www. » par défaut : inutile ici.
  "$VBIN/v-delete-web-domain-alias" "$UTILISATEUR_HESTIA" "$DOMAINE" "www.$DOMAINE" no >/dev/null 2>&1 || true

  if [[ "$TYPE_MODELE" == "proxy" ]]; then
    "$VBIN/v-change-web-domain-proxy-tpl" "$UTILISATEUR_HESTIA" "$DOMAINE" "$MODELE" >>"$JOURNAL" 2>&1 || CHANGEMENT_KO=1
  else
    "$VBIN/v-change-web-domain-tpl" "$UTILISATEUR_HESTIA" "$DOMAINE" "$MODELE" >>"$JOURNAL" 2>&1 || CHANGEMENT_KO=1
  fi
  if [[ -n "${CHANGEMENT_KO:-}" ]] || ! nginx -t >/dev/null 2>&1; then
    annuler_hestia
    nginx -t >/dev/null 2>&1 && systemctl reload nginx
    tail -n 8 "$JOURNAL"
    arret "le modèle nginx n'a pas pu être appliqué : le domaine et le modèle ont été retirés."
  fi

  echo "→ Certificat SSL Let's Encrypt (via Hestia)…"
  if "$VBIN/v-add-letsencrypt-domain" "$UTILISATEUR_HESTIA" "$DOMAINE" >>"$JOURNAL" 2>&1; then
    vert "Certificat SSL obtenu."
    "$VBIN/v-add-web-domain-ssl-force" "$UTILISATEUR_HESTIA" "$DOMAINE" >/dev/null 2>&1 || true
  else
    tail -n 5 "$JOURNAL"
    jaune "Le certificat n'a pas pu être obtenu pour l'instant (le site répond en http://$DOMAINE)."
    jaune "Vous pourrez réessayer dans Hestia : Web → $DOMAINE → SSL → Let's Encrypt."
  fi
fi

[[ "$MISE_A_JOUR" == false ]] && ecrire_repere terminee

# =====================================================================
titre "4. Vérification"
# =====================================================================
if curl -fs -o /dev/null --max-time 15 "https://$DOMAINE/connexion"; then
  vert "HTTPS opérationnel : https://$DOMAINE"
else
  jaune "https://$DOMAINE ne répond pas encore : réessayez dans 2 minutes."
fi

titre "Terminé"
if [[ "$MISE_A_JOUR" == false ]]; then
  vert "Adresse        : https://$DOMAINE"
  vert "Email          : admin@vucaauto.fr"
  vert "Mot de passe   : ${MDP_ADMIN:-(introuvable — contactez Claude)}"
  jaune "Notez ce mot de passe maintenant : il ne sera plus affiché."
  jaune "Vous devrez en choisir un nouveau à la première connexion."
else
  vert "Mise à jour terminée : https://$DOMAINE"
fi
echo
echo "Mettre à jour plus tard : bash $APP/scripts/installer-hestia.sh"
echo "Journal de l'application : journalctl -u $SERVICE -n 100"
