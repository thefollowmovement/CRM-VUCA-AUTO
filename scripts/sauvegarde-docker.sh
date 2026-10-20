#!/bin/sh
# =====================================================================
#  VUCA AUTO CRM — sauvegardes avec Docker (service « sauvegarde » de docker-compose.yml)
#  - Sans argument : attend chaque jour l'heure prévue (HEURE_SAUVEGARDE, 03:30 par défaut)
#  - « maintenant » : fait une sauvegarde tout de suite
#      docker compose exec sauvegarde /scripts/sauvegarde-docker.sh maintenant
#  Fichiers créés dans le dossier « sauvegardes » à côté de docker-compose.yml :
#    base-AAAA-MM-JJ_HHMMSS.dump et fichiers-AAAA-MM-JJ_HHMMSS.tar.gz (gardés 30 jours)
# =====================================================================
set -eu
DOSSIER=/sauvegardes
GARDER_JOURS="${GARDER_JOURS:-30}"
HEURE="${HEURE_SAUVEGARDE:-03:30}"

sauvegarder() {
  H=$(date +%Y-%m-%d_%H%M%S)
  echo "[$(date '+%d/%m/%Y %H:%M:%S')] Sauvegarde $H"
  pg_dump -h db -U vuca -d vuca_crm -Fc -f "$DOSSIER/base-$H.dump.part"
  mv "$DOSSIER/base-$H.dump.part" "$DOSSIER/base-$H.dump"
  tar -czf "$DOSSIER/fichiers-$H.tar.gz.part" -C /storage .
  mv "$DOSSIER/fichiers-$H.tar.gz.part" "$DOSSIER/fichiers-$H.tar.gz"
  find "$DOSSIER" -maxdepth 1 -type f \( -name 'base-*.dump' -o -name 'fichiers-*.tar.gz' \) -mtime +"$GARDER_JOURS" -delete
  find "$DOSSIER" -maxdepth 1 -type f -name '*.part' -mmin +600 -delete
  echo "Terminé."
}

mkdir -p "$DOSSIER"
if [ "${1:-}" = "maintenant" ]; then
  sauvegarder
  exit 0
fi

echo "Sauvegarde automatique chaque jour à $HEURE (conservation $GARDER_JOURS jours)."
while true; do
  maintenant=$(date +%s)
  cible=$(date -d "$(date +%Y-%m-%d) $HEURE" +%s)
  [ "$cible" -le "$maintenant" ] && cible=$((cible + 86400))
  sleep $((cible - maintenant))
  sauvegarder || echo "La sauvegarde a échoué, nouvel essai demain."
done
