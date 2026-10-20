#!/usr/bin/env bash
# =====================================================================
#  VUCA AUTO CRM — sauvegarde quotidienne (serveur sans Docker, HestiaCP)
#  Lancée chaque nuit par le minuteur systemd « vuca-crm-sauvegarde.timer ».
#  À la main (en root) : bash /opt/vuca-crm/app/scripts/sauvegarde-serveur.sh
#
#  Contenu d'une sauvegarde (dossier /var/backups/vuca-crm, accès root) :
#    base-AAAA-MM-JJ_HHMMSS.dump       la base de données (format pg_dump)
#    fichiers-AAAA-MM-JJ_HHMMSS.tar.gz photos, justificatifs, signatures, logo
#    env-AAAA-MM-JJ_HHMMSS             les réglages secrets (.env)
#  Les sauvegardes de plus de 30 jours sont supprimées automatiquement.
#  Restauration : bash /opt/vuca-crm/app/scripts/restaurer-serveur.sh
# =====================================================================
set -euo pipefail

DOSSIER="${VUCA_SAUVEGARDES:-/var/backups/vuca-crm}"
BASE="${VUCA_BASE:-vuca_crm}"
STOCKAGE="${VUCA_STOCKAGE:-/var/lib/vuca-crm/storage}"
ENV_FICHIER="${VUCA_ENV:-/opt/vuca-crm/.env}"
GARDER_JOURS="${VUCA_GARDER_JOURS:-30}"
H=$(date +%Y-%m-%d_%H%M%S)

umask 077
mkdir -p "$DOSSIER"
chmod 700 "$DOSSIER"

echo "[$(date '+%d/%m/%Y %H:%M:%S')] Sauvegarde $H"

# 1. Base de données (fichier « .part » tant que ce n'est pas fini : jamais de sauvegarde à moitié écrite)
(cd /tmp && runuser -u postgres -- pg_dump -Fc "$BASE") >"$DOSSIER/base-$H.dump.part"
mv "$DOSSIER/base-$H.dump.part" "$DOSSIER/base-$H.dump"

# 2. Fichiers (photos, documents…)
if [[ -d "$STOCKAGE" ]]; then
  tar -czf "$DOSSIER/fichiers-$H.tar.gz.part" -C "$STOCKAGE" .
  mv "$DOSSIER/fichiers-$H.tar.gz.part" "$DOSSIER/fichiers-$H.tar.gz"
fi

# 3. Réglages secrets (nécessaires pour tout réinstaller sur un autre serveur)
[[ -f "$ENV_FICHIER" ]] && cp "$ENV_FICHIER" "$DOSSIER/env-$H"

# 4. Ménage : on garde les 30 derniers jours (et jamais moins de la dernière sauvegarde)
find "$DOSSIER" -maxdepth 1 -type f \( -name 'base-*.dump' -o -name 'fichiers-*.tar.gz' -o -name 'env-*' \) -mtime +"$GARDER_JOURS" -delete
find "$DOSSIER" -maxdepth 1 -type f -name '*.part' -mmin +600 -delete

TAILLE=$(du -sh "$DOSSIER" | cut -f1)
echo "Terminé : $DOSSIER ($TAILLE au total, $(ls "$DOSSIER"/base-*.dump | wc -l) sauvegarde(s) de la base)"
