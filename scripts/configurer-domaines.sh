#!/usr/bin/env bash
# =====================================================================
#  VUCA AUTO — branchement des domaines (site public + CRM) sur le serveur
#
#  En root, après la mise à jour de l'application :
#    bash /opt/vuca-crm/app/scripts/configurer-domaines.sh
#  (domaines par défaut : vuca-auto.fr et crm.vuca-auto.fr ;
#   autres : SITE_DOMAIN=… CRM_DOMAIN=… bash …/configurer-domaines.sh)
#
#  Ce que fait le script (et rien d'autre) :
#   1. /opt/vuca-crm/.env : ajoute SITE_DOMAIN et CRM_DOMAIN, met AUTH_URL de côté
#      (chaque domaine du CRM — crm.vuca-auto.fr et l'alias sslip.io — gère alors
#      sa propre connexion) ; copie de sauvegarde avant modification ;
#   2. Caddy : vérifie que les domaines arrivent bien à l'application. S'ils sont
#      absents, les ajoute UNIQUEMENT dans /etc/caddy/vuca-crm.caddy (fichier du CRM),
#      avec sauvegarde, vérification « caddy validate » et retour arrière en cas d'erreur ;
#   3. redémarre le service vuca-crm et vérifie les deux domaines.
# =====================================================================
set -euo pipefail

SITE_DOMAIN="${SITE_DOMAIN:-vuca-auto.fr}"
CRM_DOMAIN="${CRM_DOMAIN:-crm.vuca-auto.fr}"
ENV_FICHIER="${VUCA_ENV:-/opt/vuca-crm/.env}"
REPERE="${VUCA_REPERE:-/opt/vuca-crm/.installation}"
CADDY_DIR="${VUCA_CADDY_DIR:-/etc/caddy}"
CADDY_VUCA="$CADDY_DIR/vuca-crm.caddy"
SERVICE="${VUCA_SERVICE:-vuca-crm}"
H=$(date +%Y%m%d-%H%M%S)

vert() { printf '\033[32m%s\033[0m\n' "$*"; }
jaune() { printf '\033[33m%s\033[0m\n' "$*"; }
rouge() { printf '\033[31m%s\033[0m\n' "$*"; }
arret() { rouge "ARRÊT : $*"; exit 1; }

[[ -f "$ENV_FICHIER" ]] || arret "fichier $ENV_FICHIER introuvable (le CRM est-il installé ?)."
APP_PORT=$(grep -E '^APP_PORT=' "$ENV_FICHIER" | tail -1 | cut -d= -f2 | tr -d ' "'"'" || true)
APP_PORT="${APP_PORT:-3000}"
ALIAS=$(grep -E '^DOMAINE=' "$REPERE" 2>/dev/null | cut -d= -f2 || true)

echo "Site public : $SITE_DOMAIN · CRM : $CRM_DOMAIN${ALIAS:+ · alias du CRM : $ALIAS} · application : 127.0.0.1:$APP_PORT"

# ---------------------------------------------------------------------
# 1. Fichier .env
# ---------------------------------------------------------------------
echo "→ Réglages ($ENV_FICHIER)…"
cp -p "$ENV_FICHIER" "$ENV_FICHIER.avant-domaines.$H"
definir() { # definir CLE VALEUR : remplace la ligne si elle existe, sinon l'ajoute
  if grep -qE "^$1=" "$ENV_FICHIER"; then sed -i "s|^$1=.*|$1=$2|" "$ENV_FICHIER"; else printf '%s=%s\n' "$1" "$2" >>"$ENV_FICHIER"; fi
}
definir SITE_DOMAIN "$SITE_DOMAIN"
definir CRM_DOMAIN "$CRM_DOMAIN"
definir AUTH_TRUST_HOST true
# AUTH_URL forcerait un seul domaine pour la connexion : on la met en commentaire
sed -i 's|^AUTH_URL=|# Désactivé le '"$(date +%d/%m/%Y)"' (domaines multiples) : AUTH_URL=|' "$ENV_FICHIER"
vert "   SITE_DOMAIN et CRM_DOMAIN enregistrés (copie : $ENV_FICHIER.avant-domaines.$H)."

# ---------------------------------------------------------------------
# 2. Caddy (serveur web devant l'application)
# ---------------------------------------------------------------------
echo "→ Caddy…"
if ! command -v caddy >/dev/null 2>&1; then
  jaune "   Caddy n'est pas installé ici : vérifiez vous-même que $SITE_DOMAIN et $CRM_DOMAIN mènent à 127.0.0.1:$APP_PORT."
else
  CONFIG_ACTUELLE=$(caddy adapt --config "$CADDY_DIR/Caddyfile" 2>/dev/null || true)
  manquants=()
  # www.<domaine> seulement s'il existe dans le DNS (sinon Caddy réclamerait un certificat en vain)
  CANDIDATS=("$SITE_DOMAIN" "$CRM_DOMAIN")
  getent hosts "www.$SITE_DOMAIN" >/dev/null 2>&1 && CANDIDATS+=("www.$SITE_DOMAIN")
  for d in "${CANDIDATS[@]}"; do
    grep -q "\"$d\"" <<<"$CONFIG_ACTUELLE" || manquants+=("$d")
  done
  if [[ ${#manquants[@]} -eq 0 ]]; then
    vert "   Les domaines sont déjà servis par Caddy : rien à modifier."
  elif [[ ! -f "$CADDY_VUCA" ]]; then
    jaune "   Domaines absents de Caddy (${manquants[*]}) et fichier $CADDY_VUCA introuvable."
    jaune "   Je ne modifie pas la configuration générale de Caddy : envoyez-moi ce message."
  else
    cp -p "$CADDY_VUCA" "$CADDY_VUCA.avant-domaines.$H"
    # La 1re ligne « adresse {  » du fichier du CRM reçoit les domaines manquants
    PREMIERE=$(grep -nE '^[^#[:space:]].*\{[[:space:]]*$' "$CADDY_VUCA" | head -1 | cut -d: -f1)
    [[ -n "$PREMIERE" ]] || arret "format inattendu de $CADDY_VUCA (aucune modification faite)."
    AJOUT=$(printf ', %s' "${manquants[@]}")
    sed -i "${PREMIERE}s|[[:space:]]*{[[:space:]]*\$|$AJOUT {|" "$CADDY_VUCA"
    if caddy validate --config "$CADDY_DIR/Caddyfile" >/dev/null 2>&1; then
      systemctl reload caddy
      vert "   Ajouté à $CADDY_VUCA : ${manquants[*]} (certificats HTTPS obtenus automatiquement par Caddy)."
    else
      cp -p "$CADDY_VUCA.avant-domaines.$H" "$CADDY_VUCA"
      caddy validate --config "$CADDY_DIR/Caddyfile" 2>&1 | tail -n 5 || true
      arret "Caddy a refusé la nouvelle configuration : l'ancienne a été remise, rien n'a changé côté Caddy."
    fi
  fi
fi

# ---------------------------------------------------------------------
# 3. Redémarrage et vérifications
# ---------------------------------------------------------------------
echo "→ Redémarrage de l'application…"
systemctl restart "$SERVICE"
for _ in $(seq 1 30); do
  curl -fs -o /dev/null -H "Host: $CRM_DOMAIN" "http://127.0.0.1:$APP_PORT/connexion" && break
  sleep 2
done

ECHECS=0
verifier() { # verifier LIBELLE DOMAINE CHEMIN CODE_ATTENDU [TEXTE_ATTENDU]
  local corps code
  corps=$(curl -s -H "Host: $2" -w '\n%{http_code}' "http://127.0.0.1:$APP_PORT$3" || true)
  code=$(tail -n1 <<<"$corps")
  if [[ "$code" == "$4" ]] && { [[ -z "${5:-}" ]] || grep -q "$5" <<<"$corps"; }; then
    vert "   ✔ $1"
  else
    rouge "   ✘ $1 (réponse $code)"; ECHECS=$((ECHECS + 1))
  fi
}
echo "→ Vérifications…"
verifier "$SITE_DOMAIN : accueil du site" "$SITE_DOMAIN" "/" 200
verifier "$SITE_DOMAIN : le CRM est invisible (/dashboard → 404)" "$SITE_DOMAIN" "/dashboard" 404
verifier "$SITE_DOMAIN : pas d'écran de connexion (/connexion → 404)" "$SITE_DOMAIN" "/connexion" 404
verifier "$CRM_DOMAIN : écran de connexion" "$CRM_DOMAIN" "/connexion" 200 "Mot de passe"
[[ -n "$ALIAS" ]] && verifier "$ALIAS : écran de connexion (alias)" "$ALIAS" "/connexion" 200 "Mot de passe"
for d in "$SITE_DOMAIN" "$CRM_DOMAIN"; do
  if curl -fs -o /dev/null --max-time 15 "https://$d/robots.txt"; then vert "   ✔ https://$d répond"; else jaune "   … https://$d ne répond pas encore (DNS ou certificat en cours) : réessayez dans quelques minutes."; fi
done

echo
if [[ $ECHECS -eq 0 ]]; then
  vert "Terminé. Site : https://$SITE_DOMAIN · CRM : https://$CRM_DOMAIN"
else
  rouge "$ECHECS vérification(s) en échec : envoyez-moi tout ce qui est affiché ci-dessus."
  exit 1
fi
