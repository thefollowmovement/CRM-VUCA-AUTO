#!/usr/bin/env bash
# =====================================================================
#  VUCA AUTO — clé de l'API Claude pour la lecture automatique des PV
#
#  En root, sur le serveur :
#    bash /opt/vuca-crm/app/scripts/configurer-cle-anthropic.sh
#
#  Ce que fait le script (et rien d'autre) :
#   1. demande la clé (saisie masquée : elle ne s'affiche pas) ;
#   2. la vérifie auprès de l'API Anthropic ;
#   3. l'écrit dans /opt/vuca-crm/.env (ANTHROPIC_API_KEY=…), avec une copie de
#      sauvegarde du fichier, en gardant ses droits (lisible par root et le CRM) ;
#   4. redémarre le service vuca-crm.
#  La clé n'est jamais affichée, journalisée ni envoyée ailleurs qu'à l'API.
# =====================================================================
set -euo pipefail

ENV_FICHIER="${VUCA_ENV:-/opt/vuca-crm/.env}"
SERVICE="${VUCA_SERVICE:-vuca-crm}"

vert() { printf '\033[32m%s\033[0m\n' "$*"; }
jaune() { printf '\033[33m%s\033[0m\n' "$*"; }
rouge() { printf '\033[31m%s\033[0m\n' "$*"; }
arret() { rouge "ARRÊT : $*"; exit 1; }

[[ $EUID -eq 0 || -n "${VUCA_ENV:-}" ]] || arret "lancez ce script en root (terminal du serveur)."
[[ -f "$ENV_FICHIER" ]] || arret "fichier $ENV_FICHIER introuvable (le CRM est-il installé ?)."

echo "Collez la clé de l'API Claude (elle commence par sk-ant-), puis appuyez sur Entrée."
echo "Rien ne s'affiche pendant la saisie : c'est normal."
read -r -s -p "Clé : " CLE
echo
CLE="$(printf '%s' "$CLE" | tr -d '[:space:]')"
[[ -n "$CLE" ]] || arret "aucune clé saisie."
[[ "$CLE" == sk-ant-* ]] || arret "cette valeur ne ressemble pas à une clé API Anthropic (sk-ant-…)."

echo "→ Vérification de la clé auprès d'Anthropic…"
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 https://api.anthropic.com/v1/models \
  -H "x-api-key: $CLE" -H "anthropic-version: 2023-06-01" || true)
case "$CODE" in
  200) vert "Clé acceptée." ;;
  401|403) arret "clé refusée par Anthropic (code $CODE) : vérifiez-la dans console.anthropic.com." ;;
  *) jaune "Vérification impossible pour l'instant (code ${CODE:-aucun}) : la clé est enregistrée quand même." ;;
esac

SAUVEGARDE="$ENV_FICHIER.avant-cle-anthropic.$(date +%Y%m%d-%H%M%S)"
cp -p "$ENV_FICHIER" "$SAUVEGARDE"
chmod 600 "$SAUVEGARDE"
# Remplace la ligne existante, sinon l'ajoute (fichier réécrit en gardant propriétaire et droits).
TMP=$(mktemp)
grep -v '^ANTHROPIC_API_KEY=' "$ENV_FICHIER" >"$TMP" || true
printf 'ANTHROPIC_API_KEY=%s\n' "$CLE" >>"$TMP"
cat "$TMP" >"$ENV_FICHIER"
rm -f "$TMP"
unset CLE
vert "Clé enregistrée dans $ENV_FICHIER (sauvegarde : $SAUVEGARDE)."

if [[ -z "${VUCA_ENV:-}" ]]; then
  echo "→ Redémarrage du CRM…"
  systemctl restart "$SERVICE"
  sleep 3
  systemctl is-active --quiet "$SERVICE" && vert "CRM redémarré : la lecture automatique des avis est active." || arret "le service $SERVICE ne redémarre pas (journalctl -u $SERVICE)."
fi
echo "Vérifiez dans le CRM : Réglages › Amendes doit afficher « Clé configurée : oui »."
