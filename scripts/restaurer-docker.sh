#!/bin/sh
# =====================================================================
#  VUCA AUTO CRM — restauration avec Docker
#  1. docker compose stop app
#  2. docker compose exec sauvegarde /scripts/restaurer-docker.sh              (liste)
#     docker compose exec sauvegarde /scripts/restaurer-docker.sh 2026-10-20_033000
#  3. docker compose start app
# =====================================================================
set -eu
DOSSIER=/sauvegardes
if [ $# -eq 0 ]; then
  echo "Sauvegardes disponibles (de la plus récente à la plus ancienne) :"
  ls -1t "$DOSSIER"/base-*.dump 2>/dev/null | sed -E 's#.*/base-(.*)\.dump#  \1#' || echo "  (aucune)"
  exit 0
fi
H="$1"
[ -f "$DOSSIER/base-$H.dump" ] || { echo "Sauvegarde introuvable : base-$H.dump"; exit 1; }
echo "→ Sauvegarde de l'état actuel (au cas où)…"
/scripts/sauvegarde-docker.sh maintenant >/dev/null
echo "→ Restauration de la base…"
pg_restore -h db -U vuca -d vuca_crm --clean --if-exists --no-owner "$DOSSIER/base-$H.dump"
if [ -f "$DOSSIER/fichiers-$H.tar.gz" ]; then
  echo "→ Restauration des fichiers…"
  find /storage -mindepth 1 -delete
  tar -xzf "$DOSSIER/fichiers-$H.tar.gz" -C /storage
  chown -R 1000:1000 /storage
fi
echo "Restauration terminée : relancez l'application (docker compose start app)."
