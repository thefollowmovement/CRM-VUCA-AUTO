#!/usr/bin/env bash
# =====================================================================
#  VUCA AUTO CRM — installation / mise à jour sur un VPS (Ubuntu/Debian)
#
#  Conçu pour un serveur qui héberge DÉJÀ d'autres projets :
#   1. analyse le serveur SANS RIEN MODIFIER ;
#   2. affiche ce qu'il va faire et demande confirmation ;
#   3. n'ajoute que ses propres fichiers (dossier /opt/vuca-crm, conteneurs,
#      volumes et réseau préfixés « vuca-crm ») — aucun fichier existant
#      n'est modifié ;
#   4. s'arrête si la configuration du serveur n'est pas reconnue.
#
#  Usage (en root) :
#    bash installer-vps.sh                 # installe, ou met à jour si déjà installé
#    bash installer-vps.sh --simulation    # analyse seulement, ne change rien
#  Variables facultatives :
#    DOMAINE=crm.mondomaine.fr  BRANCHE=main  bash installer-vps.sh
# =====================================================================
set -euo pipefail

# En mise à jour, ce fichier est remplacé par sa nouvelle version pendant
# l'exécution : on travaille donc sur une copie temporaire.
if [[ -z "${VUCA_COPIE:-}" ]]; then
  COPIE=$(mktemp /tmp/installer-vps.XXXXXX.sh)
  cp "$0" "$COPIE"
  VUCA_COPIE=1 exec bash "$COPIE" "$@"
fi

DEPOT="https://github.com/thefollowmovement/CRM-VUCA-AUTO.git"
BRANCHE="${BRANCHE:-main}"
DOSSIER="/opt/vuca-crm"
PROJET="vuca-crm"              # nom du projet Docker Compose (préfixe des conteneurs)
FICHIER_INSTALL="$DOSSIER/.installation"
SIMULATION=false
[[ "${1:-}" == "--simulation" ]] && SIMULATION=true

# --- Affichage ---------------------------------------------------------
vert() { printf '\033[32m%s\033[0m\n' "$*"; }
jaune() { printf '\033[33m%s\033[0m\n' "$*"; }
rouge() { printf '\033[31m%s\033[0m\n' "$*"; }
titre() { printf '\n\033[1;34m== %s ==\033[0m\n' "$*"; }
arret() {
  rouge "ARRÊT : $*"
  rouge "Rien n'a été modifié sur ce point. Copiez tout ce qui est affiché ci-dessus et envoyez-le à Claude."
  exit 1
}
trap 'rouge "Erreur inattendue à la ligne $LINENO. Copiez ce qui est affiché et envoyez-le à Claude."' ERR

[[ $EUID -eq 0 ]] || arret "lancez ce script en root (ou avec sudo)."
command -v apt-get >/dev/null || arret "système non pris en charge (Ubuntu ou Debian attendu)."
# Sans « ss », impossible de savoir quels ports sont occupés : on ne devine pas.
command -v ss >/dev/null || arret "la commande « ss » est absente (paquet iproute2) : impossible de vérifier les ports utilisés."

# Processus qui écoute sur un port TCP (vide si libre).
ecoute_sur() { ss -ltnpH "( sport = :$1 )" 2>/dev/null | head -1; }
port_libre() { [[ -z "$(ecoute_sur "$1")" ]]; }

# Conteneur Docker qui publie un port de l'hôte.
conteneur_sur_port() {
  command -v docker >/dev/null || return 0
  docker ps --format '{{.Names}}|{{.Image}}|{{.Ports}}' 2>/dev/null |
    grep -E "(0\.0\.0\.0|\[::\]|:::):$1->" | head -1 || true
}

# =====================================================================
titre "1. Analyse du serveur (aucune modification)"
# =====================================================================
. /etc/os-release
echo "Système        : $PRETTY_NAME"
echo "Mémoire libre  : $(free -m | awk '/Mem:/ {print $7}') Mo"
echo "Disque libre   : $(df -h / | awk 'NR==2 {print $4}')"
if (( $(free -m | awk '/Mem:/ {print $7}') < 1200 )); then
  jaune "Attention : peu de mémoire libre. La construction de l'application peut échouer."
fi

IP=$(curl -4 -fsS --max-time 10 https://api.ipify.org || hostname -I | awk '{print $1}')
[[ "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || arret "adresse IP publique introuvable."
echo "IP publique    : $IP"

MISE_A_JOUR=false
if [[ -f "$FICHIER_INSTALL" ]]; then
  MISE_A_JOUR=true
  # shellcheck disable=SC1090
  . "$FICHIER_INSTALL"
  vert "VUCA AUTO CRM est déjà installé ($DOSSIER) → mode MISE À JOUR."
elif [[ -e "$DOSSIER" ]]; then
  arret "le dossier $DOSSIER existe déjà mais n'a pas été créé par ce script."
fi

if command -v docker >/dev/null; then
  DOCKER_OK=true
  echo "Docker         : $(docker --version | cut -d, -f1)"
  docker info >/dev/null 2>&1 || arret "Docker est installé mais ne répond pas (service arrêté ?)."
  docker compose version >/dev/null 2>&1 || arret "Docker est installé mais pas « docker compose » (plugin v2)."
  echo "Conteneurs déjà en service :"
  docker ps --format '   - {{.Names}} ({{.Image}}) {{.Ports}}' || true
else
  DOCKER_OK=false
  jaune "Docker         : absent → il sera installé (méthode officielle get.docker.com)."
fi

echo "Port 80        : $(ecoute_sur 80 || true)"
echo "Port 443       : $(ecoute_sur 443 || true)"

if [[ "$MISE_A_JOUR" == false ]]; then
  DOMAINE="${DOMAINE:-crm-vuca.${IP//./-}.sslip.io}"
  IP_DOMAINE=$(getent ahostsv4 "$DOMAINE" | awk 'NR==1 {print $1}' || true)
  echo "Domaine        : $DOMAINE → ${IP_DOMAINE:-introuvable}"
  [[ "$IP_DOMAINE" == "$IP" ]] || arret "le domaine $DOMAINE ne pointe pas vers ce serveur ($IP)."

  # Port interne de l'application (uniquement sur 127.0.0.1)
  APP_PORT=3100
  while ! port_libre "$APP_PORT"; do APP_PORT=$((APP_PORT + 1)); done

  # --- Qui gère déjà le web (ports 80/443) ? ---------------------------
  P80=$(ecoute_sur 80 || true)
  P443=$(ecoute_sur 443 || true)
  C443=$(conteneur_sur_port 443)
  MODE=""
  if [[ -z "$P80" && -z "$P443" ]]; then
    MODE="caddy"
  elif [[ -n "$C443" ]]; then
    IMAGE443=$(cut -d'|' -f2 <<<"$C443")
    NOM443=$(cut -d'|' -f1 <<<"$C443")
    echo "Le port 443 est tenu par le conteneur : $NOM443 ($IMAGE443)"
    if [[ "$IMAGE443" == *traefik* ]]; then
      MODE="traefik"
      ARGS=$(docker inspect -f '{{join .Args " "}} {{join .Config.Cmd " "}}' "$NOM443" 2>/dev/null || true)
      RESOLVEUR=$(grep -oE -- '--certificatesresolvers\.[A-Za-z0-9_-]+\.' <<<"$ARGS" | head -1 | cut -d. -f2 || true)
      ENTREE443=$(grep -oE -- '--entrypoints\.[A-Za-z0-9_-]+\.address=:443' <<<"$ARGS" | head -1 | cut -d. -f2 || true)
      RESEAU=$(grep -oE -- '--providers\.docker\.network=[A-Za-z0-9_.-]+' <<<"$ARGS" | head -1 | cut -d= -f2 || true)
      if [[ -z "$RESEAU" ]]; then
        RESEAU=$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$NOM443" |
          tr ' ' '\n' | grep -vE '^(bridge|host|none)?$' | head -1 || true)
      fi
      echo "   Traefik → résolveur SSL : ${RESOLVEUR:-?} · point d'entrée 443 : ${ENTREE443:-?} · réseau : ${RESEAU:-?}"
      if [[ -z "$RESOLVEUR" || -z "$ENTREE443" || -z "$RESEAU" ]]; then
        arret "Traefik détecté mais sa configuration n'a pas pu être lue automatiquement."
      fi
    else
      arret "un proxy Docker non reconnu ($IMAGE443) gère déjà les ports web."
    fi
  elif grep -q '"nginx"' <<<"$P80$P443"; then
    MODE="nginx"
    command -v nginx >/dev/null || arret "nginx semble actif mais la commande nginx est introuvable."
    nginx -t >/dev/null 2>&1 || arret "la configuration nginx actuelle comporte déjà une erreur (nginx -t). Je n'y touche pas."
    if [[ -d /etc/nginx/sites-available && -d /etc/nginx/sites-enabled ]]; then
      CONF_NGINX="/etc/nginx/sites-available/vuca-crm.conf"
      LIEN_NGINX="/etc/nginx/sites-enabled/vuca-crm.conf"
    else
      CONF_NGINX="/etc/nginx/conf.d/vuca-crm.conf"
      LIEN_NGINX=""
    fi
    [[ -e "$CONF_NGINX" ]] && arret "le fichier $CONF_NGINX existe déjà."
    grep -rqs "server_name[^;]*$DOMAINE" /etc/nginx/ && arret "le domaine $DOMAINE est déjà utilisé dans nginx."
  else
    arret "les ports web sont occupés par un logiciel non reconnu (voir « Port 80 / 443 » ci-dessus)."
  fi
fi

# =====================================================================
titre "2. Ce qui va être fait"
# =====================================================================
if [[ "$MISE_A_JOUR" == true ]]; then
  echo " • Télécharger la dernière version (branche $BRANCHE) dans $DOSSIER"
  echo " • Reconstruire et redémarrer UNIQUEMENT les conteneurs « $PROJET »"
  echo " • Les données (base, fichiers) et la configuration sont conservées."
else
  [[ "$DOCKER_OK" == false ]] && echo " • Installer Docker (méthode officielle)"
  echo " • Télécharger l'application (branche $BRANCHE) dans $DOSSIER"
  echo " • Créer $DOSSIER/.env avec des mots de passe aléatoires"
  echo " • Démarrer les conteneurs « $PROJET-app » et « $PROJET-db » (application sur 127.0.0.1:$APP_PORT, base non exposée)"
  case "$MODE" in
    caddy)
      echo " • Ports 80/443 libres → démarrer un conteneur Caddy ($PROJET-caddy) qui gère le HTTPS automatiquement"
      jaune "   (Caddy occupera les ports 80/443 : un futur site devra passer par lui.)" ;;
    traefik)
      echo " • Brancher l'application sur votre Traefik existant ($NOM443), sans modifier sa configuration"
      echo "   (ajout du conteneur au réseau « $RESEAU » + étiquettes Traefik ; certificat via « $RESOLVEUR »)" ;;
    nginx)
      echo " • Ajouter UN nouveau fichier nginx : $CONF_NGINX (aucun autre fichier touché)"
      echo " • Vérifier la configuration (nginx -t) avant de recharger nginx"
      echo " • Obtenir le certificat SSL avec certbot (installé si absent) pour ce seul domaine" ;;
  esac
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

# =====================================================================
titre "3. Installation"
# =====================================================================
if [[ "$DOCKER_OK" == false ]]; then
  echo "→ Installation de Docker…"
  curl -fsSL https://get.docker.com | sh
fi

if [[ "$MISE_A_JOUR" == true ]]; then
  echo "→ Téléchargement de la dernière version…"
  git -C "$DOSSIER" fetch --depth 1 origin "$BRANCHE"
  git -C "$DOSSIER" checkout -q -B "$BRANCHE" FETCH_HEAD
else
  command -v git >/dev/null || { apt-get update -qq && apt-get install -y -qq git; }
  echo "→ Téléchargement de l'application…"
  git clone --depth 1 --branch "$BRANCHE" "$DEPOT" "$DOSSIER"

  alea() { tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$1"; }
  umask 077
  cat >"$DOSSIER/.env" <<EOF
# Généré par installer-vps.sh le $(date '+%d/%m/%Y %H:%M') — ne pas partager.
POSTGRES_PASSWORD=$(alea 32)
AUTH_SECRET=$(alea 48)
AUTH_URL=https://$DOMAINE
AUTH_TRUST_HOST=true
SEED_DEMO=true
APP_ADRESSE=127.0.0.1
APP_PORT=$APP_PORT
DOMAINE=$DOMAINE
EOF
  umask 022

  # Fichier Compose spécifique à Traefik (généré, propre à ce serveur)
  if [[ "$MODE" == "traefik" ]]; then
    cat >"$DOSSIER/docker-compose.traefik.yml" <<EOF
# Généré par installer-vps.sh : branche l'application sur le Traefik existant.
services:
  app:
    networks: [default, proxy_existant]
    labels:
      - traefik.enable=true
      - traefik.docker.network=$RESEAU
      - traefik.http.routers.vuca-crm.rule=Host(\`$DOMAINE\`)
      - traefik.http.routers.vuca-crm.entrypoints=$ENTREE443
      - traefik.http.routers.vuca-crm.tls=true
      - traefik.http.routers.vuca-crm.tls.certresolver=$RESOLVEUR
      - traefik.http.services.vuca-crm.loadbalancer.server.port=3000
networks:
  proxy_existant:
    external: true
    name: $RESEAU
EOF
  fi

  cat >"$FICHIER_INSTALL" <<EOF
MODE=$MODE
DOMAINE=$DOMAINE
APP_PORT=$APP_PORT
BRANCHE=$BRANCHE
CONF_NGINX=${CONF_NGINX:-}
INSTALLE_LE="$(date '+%d/%m/%Y %H:%M')"
EOF
fi

# Fichiers Compose selon le mode
FICHIERS=(-f docker-compose.yml)
[[ "$MODE" == "caddy" ]] && FICHIERS+=(-f docker-compose.caddy.yml)
[[ "$MODE" == "traefik" ]] && FICHIERS+=(-f docker-compose.traefik.yml)

echo "→ Construction et démarrage (5 à 10 minutes la première fois)…"
cd "$DOSSIER"
docker compose -p "$PROJET" "${FICHIERS[@]}" up -d --build

echo "→ Attente du démarrage de l'application…"
for _ in $(seq 1 60); do
  curl -fsS -o /dev/null "http://127.0.0.1:$APP_PORT/connexion" && break
  sleep 3
done
curl -fsS -o /dev/null "http://127.0.0.1:$APP_PORT/connexion" ||
  arret "l'application ne répond pas. Logs : docker compose -p $PROJET logs app"
vert "Application démarrée."

# --- nginx : nouveau fichier + certificat ------------------------------
if [[ "$MISE_A_JOUR" == false && "$MODE" == "nginx" ]]; then
  echo "→ Configuration nginx (nouveau fichier $CONF_NGINX)…"
  cat >"$CONF_NGINX" <<EOF
# VUCA AUTO CRM — ajouté par installer-vps.sh
server {
    listen 80;
    server_name $DOMAINE;
    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
    }
}
EOF
  [[ -n "$LIEN_NGINX" ]] && ln -s "$CONF_NGINX" "$LIEN_NGINX"
  if ! nginx -t; then
    rm -f "$CONF_NGINX" ${LIEN_NGINX:+"$LIEN_NGINX"}
    arret "nginx a refusé la nouvelle configuration : elle a été retirée, nginx n'a pas été rechargé."
  fi
  systemctl reload nginx
  if ! command -v certbot >/dev/null; then
    echo "→ Installation de certbot…"
    apt-get update -qq && apt-get install -y -qq certbot python3-certbot-nginx
  fi
  echo "→ Certificat SSL…"
  certbot --nginx -d "$DOMAINE" --non-interactive --agree-tos \
    --register-unsafely-without-email --redirect ||
    arret "certbot n'a pas pu obtenir le certificat (le site reste accessible en http://$DOMAINE)."
fi

# --- Pare-feu ufw : ouvrir 80/443 seulement si Caddy les prend ----------
if [[ "$MISE_A_JOUR" == false && "$MODE" == "caddy" ]] && command -v ufw >/dev/null &&
  ufw status | grep -q "Status: active"; then
  echo "→ Ouverture des ports 80 et 443 dans ufw…"
  ufw allow 80/tcp >/dev/null && ufw allow 443/tcp >/dev/null && ufw allow 443/udp >/dev/null
fi

# =====================================================================
titre "4. Vérification HTTPS"
# =====================================================================
for _ in $(seq 1 20); do
  curl -fsS -o /dev/null --max-time 10 "https://$DOMAINE/connexion" && break
  sleep 6
done
if curl -fsS -o /dev/null --max-time 10 "https://$DOMAINE/connexion"; then
  vert "HTTPS opérationnel : https://$DOMAINE"
else
  jaune "Le HTTPS ne répond pas encore. Patientez 2 minutes puis ouvrez https://$DOMAINE"
  jaune "Si cela persiste, vérifiez que les ports 80 et 443 sont ouverts dans le pare-feu du panneau Hostinger."
fi

# =====================================================================
titre "Terminé"
# =====================================================================
if [[ "$MISE_A_JOUR" == false ]]; then
  MDP=$(docker compose -p "$PROJET" logs app 2>/dev/null | grep "Mot de passe :" | tail -1 | awk -F': ' '{print $2}' | tr -d ' \r')
  echo
  vert "Adresse        : https://$DOMAINE"
  vert "Email          : admin@vucaauto.fr"
  vert "Mot de passe   : ${MDP:-(voir : docker compose -p $PROJET logs app | grep -A5 COMPTE)}"
  jaune "Notez ce mot de passe maintenant : il ne sera plus affiché."
  jaune "Vous devrez en choisir un nouveau à la première connexion."
else
  vert "Mise à jour terminée : https://$DOMAINE"
fi
echo
echo "Mettre à jour plus tard : bash $DOSSIER/scripts/installer-vps.sh"
